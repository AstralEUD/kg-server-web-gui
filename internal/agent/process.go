package agent

import (
	"bufio"
	"bytes"
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/astral/kg-server-web-gui/internal/logs"
	"github.com/shirou/gopsutil/v3/process"
)

// ResourceData holds a snapshot of process metrics
type ResourceData struct {
	Time     time.Time `json:"time"`
	CPU      float64   `json:"cpu"` // Percent
	MemoryMB float64   `json:"memoryMb"`
}

// ProcessMonitor handles server process control
type ProcessMonitor struct {
	Executable string
	ServerPath string // Full path to server executable

	// Monitoring
	history     []ResourceData
	historyLock sync.RWMutex
	stopMonitor chan struct{}
}

func NewProcessMonitor(exeName string) *ProcessMonitor {
	if exeName == "" {
		exeName = "ArmaReforgerServer.exe"
	}
	pm := &ProcessMonitor{
		Executable: exeName,
		history:    make([]ResourceData, 0),
	}
	pm.StartMonitoring()
	return pm
}

// StartMonitoring begins background collection of metrics
func (p *ProcessMonitor) StartMonitoring() {
	if p.stopMonitor != nil {
		return
	}
	p.stopMonitor = make(chan struct{})

	go func() {
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-p.stopMonitor:
				return
			case <-ticker.C:
				p.collectMetrics()
			}
		}
	}()
}

func (p *ProcessMonitor) collectMetrics() {
	running, pid, err := p.IsRunning()
	if err != nil || !running {
		// Record zero if not running
		p.addHistory(ResourceData{Time: time.Now(), CPU: 0, MemoryMB: 0})
		return
	}

	proc, err := process.NewProcess(int32(pid))
	if err != nil {
		return
	}

	// CPU percent
	cpu, _ := proc.CPUPercent() // This might block or need previous call data, gopsutil handles it often

	// Memory
	memInfo, err := proc.MemoryInfo()
	mem := 0.0
	if err == nil {
		mem = float64(memInfo.RSS) / 1024 / 1024 // Bytes -> MB
	}

	p.addHistory(ResourceData{
		Time:     time.Now(),
		CPU:      cpu,
		MemoryMB: mem,
	})
}

func (p *ProcessMonitor) addHistory(data ResourceData) {
	p.historyLock.Lock()
	defer p.historyLock.Unlock()

	p.history = append(p.history, data)
	// Keep last 60 points (2 mins roughly if 2s interval) -> actually 120 secs
	// Let's keep 100 points
	if len(p.history) > 100 {
		p.history = p.history[len(p.history)-100:]
	}
}

// GetResourceHistory returns the collected metrics
func (p *ProcessMonitor) GetResourceHistory() []ResourceData {
	p.historyLock.RLock()
	defer p.historyLock.RUnlock()

	// Return copy
	result := make([]ResourceData, len(p.history))
	copy(result, p.history)
	return result
}

// SetServerPath sets the full path to the server executable
func (p *ProcessMonitor) SetServerPath(path string) {
	p.ServerPath = path
}

// IsRunning checks if the server is running and returns the PID
func (p *ProcessMonitor) IsRunning() (bool, int, error) {
	cmd := exec.Command("tasklist", "/FI", fmt.Sprintf("IMAGENAME eq %s", p.Executable), "/FO", "CSV", "/NH")
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return false, 0, err
	}

	output := out.String()
	if strings.Contains(output, "No tasks are running") || strings.Contains(output, "정보:") {
		return false, 0, nil
	}

	parts := strings.Split(output, ",")
	if len(parts) >= 2 {
		var pid int
		fmt.Sscanf(strings.Trim(parts[1], "\""), "%d", &pid)
		return true, pid, nil
	}

	return false, 0, nil
}

// Stop gracefully stops the server
func (p *ProcessMonitor) Stop() error {
	running, pid, err := p.IsRunning()
	if err != nil {
		return err
	}
	if !running {
		return nil
	}

	err = exec.Command("taskkill", "/PID", fmt.Sprintf("%d", pid), "/T").Run()
	if err != nil {
		return p.ForceKill(pid)
	}

	for i := 0; i < 10; i++ {
		if r, _, _ := p.IsRunning(); !r {
			return nil
		}
		time.Sleep(500 * time.Millisecond)
	}

	return p.ForceKill(pid)
}

func (p *ProcessMonitor) ForceKill(pid int) error {
	return exec.Command("taskkill", "/F", "/PID", fmt.Sprintf("%d", pid), "/T").Run()
}

// Start launches the server with arguments
func (p *ProcessMonitor) Start(path string, args []string) error {
	if r, _, _ := p.IsRunning(); r {
		return fmt.Errorf("서버가 이미 실행 중입니다")
	}

	// Use provided path or ServerPath or default
	exePath := path
	if exePath == "" {
		exePath = p.ServerPath
	}
	if exePath == "" {
		return fmt.Errorf("서버 경로가 설정되지 않았습니다. 환경 설정에서 서버 경로를 지정해주세요")
	}

	// Verify path exists
	if !filepath.IsAbs(exePath) {
		// Try to resolve it if it's relative to current dir
		abs, err := filepath.Abs(exePath)
		if err == nil {
			exePath = abs
		} else {
			return fmt.Errorf("서버 경로는 절대 경로여야 합니다: %s", exePath)
		}
	}

	cmd := exec.Command(exePath, args...)
	cmd.Dir = filepath.Dir(exePath)

	// Capture stdout and stderr
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("서버 시작 실패: %w", err)
	}

	// Stream logs in goroutines
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			logs.GlobalLogs.Info(scanner.Text())
		}
	}()

	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			logs.GlobalLogs.Error(scanner.Text())
		}
	}()

	// Monitor process exit in background to prevent zombies
	go func() {
		if err := cmd.Wait(); err != nil {
			logs.GlobalLogs.Error(fmt.Sprintf("[%s] 서버 비정상 종료: %v", p.Executable, err))
		} else {
			logs.GlobalLogs.Info(fmt.Sprintf("[%s] 서버가 종료되었습니다.", p.Executable))
		}
	}()

	return nil
}
