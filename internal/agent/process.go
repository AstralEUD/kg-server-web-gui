package agent

import (
	"bytes"
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// ProcessMonitor handles server process control
type ProcessMonitor struct {
	Executable string
	ServerPath string // Full path to server executable
}

func NewProcessMonitor(exeName string) *ProcessMonitor {
	if exeName == "" {
		exeName = "ArmaReforgerServer.exe"
	}
	return &ProcessMonitor{Executable: exeName}
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

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("서버 시작 실패: %w", err)
	}

	return nil
}
