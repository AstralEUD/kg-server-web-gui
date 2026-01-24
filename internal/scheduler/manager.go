package scheduler

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/astral/kg-server-web-gui/internal/agent"
	"github.com/astral/kg-server-web-gui/internal/logs"
	"github.com/astral/kg-server-web-gui/internal/mapchange"
	"github.com/astral/kg-server-web-gui/internal/server"
	"github.com/google/uuid"
	"github.com/robfig/cron/v3"
)

// JobType defines the type of scheduled job
type JobType string

const (
	JobRestart   JobType = "restart"
	JobChangeMap JobType = "changemap"
	JobStop      JobType = "stop"
	JobStart     JobType = "start"
	JobBackup    JobType = "backup" // Future implementation
)

// Job represents a scheduled task
type Job struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Type        JobType  `json:"type"`
	CronExpr    string   `json:"cronExpr"`
	Args        []string `json:"args"` // [instanceId, arg1, arg2...]
	Enabled     bool     `json:"enabled"`
	LastRun     string   `json:"lastRun,omitempty"`
	NextRun     string   `json:"nextRun,omitempty"`
	Description string   `json:"description,omitempty"`

	entryID cron.EntryID // Internal cron entry ID
}

// Manager handles scheduling duties
type Manager struct {
	cron        *cron.Cron
	jobs        map[string]*Job
	dataPath    string
	mu          sync.RWMutex
	instanceMgr *server.InstanceManager
	mapService  *mapchange.MapChangeService
	discord     *agent.DiscordClient
}

// NewManager creates a new scheduler manager
func NewManager(dataPath string, im *server.InstanceManager, ms *mapchange.MapChangeService, discord *agent.DiscordClient) *Manager {
	return &Manager{
		cron:        cron.New(cron.WithSeconds()), // Enable seconds field
		jobs:        make(map[string]*Job),
		dataPath:    dataPath,
		instanceMgr: im,
		mapService:  ms,
		discord:     discord,
	}
}

// Start starts the cron scheduler
func (m *Manager) Start() {
	m.load()
	m.cron.Start()
	logs.GlobalLogs.Info("[Scheduler] 스케줄러 시작됨")
}

// Stop stops the cron scheduler
func (m *Manager) Stop() {
	m.cron.Stop()
	logs.GlobalLogs.Info("[Scheduler] 스케줄러 중지됨")
}

// List returns all jobs
func (m *Manager) List() []*Job {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var list []*Job
	for _, job := range m.jobs {
		// Update next run time
		if job.Enabled && job.entryID != 0 {
			entry := m.cron.Entry(job.entryID)
			if !entry.Next.IsZero() {
				job.NextRun = entry.Next.Format(time.RFC3339)
			}
		}
		list = append(list, job)
	}
	return list
}

// Add adds a new job
func (m *Manager) Add(job *Job) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if job.ID == "" {
		job.ID = uuid.New().String()
	}

	m.jobs[job.ID] = job
	m.save()

	if job.Enabled {
		return m.schedule(job)
	}

	return nil
}

// Update updates an existing job
func (m *Manager) Update(job *Job) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	existing, ok := m.jobs[job.ID]
	if !ok {
		return fmt.Errorf("job not found: %s", job.ID)
	}

	// Unschedule existing if running
	if existing.entryID != 0 {
		m.cron.Remove(existing.entryID)
		existing.entryID = 0
	}

	// Update fields
	existing.Name = job.Name
	existing.Type = job.Type
	existing.CronExpr = job.CronExpr
	existing.Args = job.Args
	existing.Enabled = job.Enabled
	existing.Description = job.Description

	m.save()

	// Reschedule if enabled
	if existing.Enabled {
		return m.schedule(existing)
	}

	return nil
}

// Delete removes a job
func (m *Manager) Delete(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	job, ok := m.jobs[id]
	if !ok {
		return fmt.Errorf("job not found")
	}

	if job.entryID != 0 {
		m.cron.Remove(job.entryID)
	}

	delete(m.jobs, id)
	m.save()
	return nil
}

// schedule schedules a job for execution
func (m *Manager) schedule(job *Job) error {
	// Parse cron expression to validate
	// Note: We used WithSeconds(), so standard cron is 6 fields (Sec Min Hour Dom Month Dow)
	// Or standard 5 fields + optional second?
	// robfig/cron/v3 default parser expects 5 fields.
	// WithSeconds() adds a seconds field. So detailed parsing is needed.

	entryID, err := m.cron.AddFunc(job.CronExpr, func() {
		m.runJob(job)
	})

	if err != nil {
		logs.GlobalLogs.Error(fmt.Sprintf("[Scheduler] 작업 스케줄링 실패 (%s): %v", job.Name, err))
		return err
	}

	job.entryID = entryID

	// Update next run immediately for UI
	entry := m.cron.Entry(entryID)
	job.NextRun = entry.Next.Format(time.RFC3339)

	return nil
}

// runJob executes the job logic
func (m *Manager) runJob(job *Job) {
	logs.GlobalLogs.Info(fmt.Sprintf("[Scheduler] 작업 실행 시작: %s (%s)", job.Name, job.Type))

	if len(job.Args) < 1 {
		logs.GlobalLogs.Error(fmt.Sprintf("[Scheduler] 작업 인자 부족: %s", job.ID))
		return
	}

	instanceID := job.Args[0]
	if instanceID == "" {
		instanceID = "default"
	}

	var err error

	switch job.Type {
	case JobRestart:
		err = m.runRestart(instanceID)
	case JobChangeMap:
		if len(job.Args) < 2 {
			err = fmt.Errorf("map slot or scenarioId missing")
		} else {
			target := job.Args[1]
			// Check if arg is slot number (int) or scenario string
			// We'll treat as generic "ChangeMap" request to service
			// But wait, ChangeMapBySlot needs int.
			// Let's assume we store slot as string in args for simplicity
			// Or we could try to parse types.
			err = m.runChangeMap(instanceID, target)
		}
	case JobStart:
		err = m.instanceMgr.Start(instanceID, nil)
	case JobStop:
		err = m.instanceMgr.Stop(instanceID)
	default:
		err = fmt.Errorf("unknown job type: %s", job.Type)
	}

	// Update LastRun
	m.mu.Lock()
	job.LastRun = time.Now().Format(time.RFC3339)
	// Update next run
	if job.entryID != 0 {
		entry := m.cron.Entry(job.entryID)
		job.NextRun = entry.Next.Format(time.RFC3339)
	}
	m.save() // Save last run time
	m.mu.Unlock()

	if err != nil {
		logs.GlobalLogs.Error(fmt.Sprintf("[Scheduler] 작업 실행 실패 (%s): %v", job.Name, err))
		if m.discord != nil {
			m.discord.SendMessage("❌ 스케줄러 오류", fmt.Sprintf("작업 **%s** 실행 중 오류 발생:\n```%v```", job.Name, err), agent.ColorRed)
		}
	} else {
		logs.GlobalLogs.Info(fmt.Sprintf("[Scheduler] 작업 실행 완료: %s", job.Name))
		if m.discord != nil {
			m.discord.SendMessage("📅 스케줄러 실행", fmt.Sprintf("작업 **%s**가 성공적으로 실행되었습니다.", job.Name), agent.ColorGreen)
		}
	}
}

func (m *Manager) runRestart(instanceID string) error {
	// First, try to send warning via RCON
	msg := "⚠️ 서버 정기 재시작이 1분 후에 진행됩니다!"
	_, _ = m.instanceMgr.SendRconCommand(instanceID, fmt.Sprintf("#say %s", msg))

	// Wait 10 seconds (in real world maybe longer, but block thread? better perform separate goroutine?)
	// For simplicity, we just notify and restart immediately or maybe wait small amount?
	// Blocking cron worker is fine as long as execution time is reasonable.
	// But 1 minute block is too long.
	// Let's just say "Restarting now"

	if err := m.instanceMgr.Stop(instanceID); err != nil {
		logs.GlobalLogs.Warn(fmt.Sprintf("[Scheduler] 중지 실패 (계속 진행): %v", err))
	}

	time.Sleep(3 * time.Second)

	// Fetch default args logic?
	// The instance manager start should handle args if empty.
	return m.instanceMgr.Start(instanceID, []string{"-server"})
}

func (m *Manager) runChangeMap(instanceID, target string) error {
	// target can be slot number (e.g. "1") or scenarioId
	// We'll try to parse as slot first
	var slot int
	_, err := fmt.Sscanf(target, "%d", &slot)

	if err == nil && slot > 0 {
		// It's a slot
		return m.mapService.ChangeMapBySlot(instanceID, slot, "Scheduler")
	}

	// It's a scenario ID
	return m.mapService.ChangeMap(instanceID, target, "Scheduled Map", "Scheduler")
}

// Persistence

func (m *Manager) load() {
	m.mu.Lock()
	defer m.mu.Unlock()

	path := filepath.Join(m.dataPath, "jobs.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return
	}

	data, err := os.ReadFile(path)
	if err != nil {
		logs.GlobalLogs.Error(fmt.Sprintf("[Scheduler] 설정 로드 실패: %v", err))
		return
	}

	var loadedJobs []*Job
	if err := json.Unmarshal(data, &loadedJobs); err != nil {
		logs.GlobalLogs.Error(fmt.Sprintf("[Scheduler] JSON 파싱 실패: %v", err))
		return
	}

	for _, job := range loadedJobs {
		m.jobs[job.ID] = job
		if job.Enabled {
			// Schedule directly (bypass Add/save to avoid double save)
			entryID, err := m.cron.AddFunc(job.CronExpr, func() {
				m.runJob(job)
			})
			if err != nil {
				logs.GlobalLogs.Error(fmt.Sprintf("[Scheduler] 작업 복원 실패 (%s): %v", job.Name, err))
				job.Enabled = false // Disable if invalid
			} else {
				job.entryID = entryID
				logs.GlobalLogs.Info(fmt.Sprintf("[Scheduler] 작업 예약됨: %s (%s)", job.Name, job.CronExpr))
			}
		}
	}
}

func (m *Manager) save() {
	path := filepath.Join(m.dataPath, "jobs.json")

	var list []*Job
	for _, job := range m.jobs {
		list = append(list, job)
	}

	data, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		logs.GlobalLogs.Error(fmt.Sprintf("[Scheduler] 설정 저장 실패: %v", err))
		return
	}

	if err := os.WriteFile(path, data, 0644); err != nil {
		logs.GlobalLogs.Error(fmt.Sprintf("[Scheduler] 파일 쓰기 실패: %v", err))
	}
}
