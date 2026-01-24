package metrics

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/astral/kg-server-web-gui/internal/logs"
	"github.com/astral/kg-server-web-gui/internal/server"
)

// DataPoint represents a single metric record
type DataPoint struct {
	Timestamp time.Time `json:"timestamp"`
	CPU       float64   `json:"cpu"`
	RAM       uint64    `json:"ram"` // in MB
	Players   int       `json:"players"`
	FPS       float64   `json:"fps"`
}

type Manager struct {
	dataPath    string
	instanceMgr *server.InstanceManager
	stopChan    chan struct{}
	mu          sync.RWMutex
}

func NewManager(dataPath string, im *server.InstanceManager) *Manager {
	return &Manager{
		dataPath:    filepath.Join(dataPath, "metrics"),
		instanceMgr: im,
		stopChan:    make(chan struct{}),
	}
}

func (m *Manager) Start() {
	os.MkdirAll(m.dataPath, 0755)
	go m.collectLoop()
	logs.GlobalLogs.Info("[Metrics] 메트릭 수집기 시작됨")
}

func (m *Manager) Stop() {
	close(m.stopChan)
}

func (m *Manager) collectLoop() {
	// Collect every 5 minutes
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	// Initial collection
	m.collectAll()

	for {
		select {
		case <-m.stopChan:
			return
		case <-ticker.C:
			m.collectAll()
		}
	}
}

func (m *Manager) collectAll() {
	instances := m.instanceMgr.List()
	for _, inst := range instances {
		m.collectForInstance(inst.ID)
	}
}

func (m *Manager) collectForInstance(id string) {
	// Get process info from monitor
	proc := m.instanceMgr.GetMonitor(id)
	if proc == nil {
		return
	}

	running, _, _ := proc.IsRunning()
	if !running {
		// Even if not running, we might want to record zero values to show downtime
		// But usually it's better to just skip or record zeros if it was running recently.
		// For now, let's only record if running to save space.
		return
	}

	// Get latest resource info from monitor's history or live?
	// Monitor has a history buffer. Let's get the latest point.
	history := proc.GetResourceHistory()
	if len(history) == 0 {
		return
	}
	latest := history[len(history)-1]

	// Get RCON metrics (Players, FPS)
	rconMetrics, err := m.instanceMgr.GetServerMetrics(id)
	var players int
	var fps float64
	if err == nil && rconMetrics != nil {
		players = rconMetrics.PlayerCount
		fps = rconMetrics.FPS
	}

	point := DataPoint{
		Timestamp: time.Now(),
		CPU:       latest.CPU,
		RAM:       latest.Memory / (1024 * 1024), // Convert to MB
		Players:   players,
		FPS:       fps,
	}

	m.savePoint(id, point)
}

func (m *Manager) savePoint(id string, point DataPoint) {
	m.mu.Lock()
	defer m.mu.Unlock()

	fileName := fmt.Sprintf("%s_%s.json", id, time.Now().Format("2006-01-02"))
	path := filepath.Join(m.dataPath, fileName)

	var points []DataPoint
	if _, err := os.Stat(path); err == nil {
		data, _ := os.ReadFile(path)
		json.Unmarshal(data, &points)
	}

	// Keep only last 24 hours of points in the day file?
	// Or just append. 5 min * 24 hours = 288 points. Small.
	points = append(points, point)

	data, _ := json.Marshal(points)
	os.WriteFile(path, data, 0644)
}

// GetHistory returns metrics for a specific date
func (m *Manager) GetHistory(id string, date string) ([]DataPoint, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	fileName := fmt.Sprintf("%s_%s.json", id, date)
	path := filepath.Join(m.dataPath, fileName)

	if _, err := os.Stat(path); os.IsNotExist(err) {
		return []DataPoint{}, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var points []DataPoint
	if err := json.Unmarshal(data, &points); err != nil {
		return nil, err
	}

	return points, nil
}
