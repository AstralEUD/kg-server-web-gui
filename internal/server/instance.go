package server

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/astral/kg-server-web-gui/internal/agent"
	"github.com/astral/kg-server-web-gui/internal/logs"
)

// ServerInstance represents a single server instance
type ServerInstance struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Path        string            `json:"path"`       // Path to server directory
	ConfigPath  string            `json:"configPath"` // Path to server.json
	Status      string            `json:"status"`     // running, stopped, error
	PID         int               `json:"pid"`
	CreatedAt   time.Time         `json:"createdAt"`
	LastStarted *time.Time        `json:"lastStarted,omitempty"`
	Settings    map[string]string `json:"settings"` // Additional settings
}

// InstanceManager manages multiple server instances
type InstanceManager struct {
	mu        sync.RWMutex
	instances map[string]*ServerInstance
	monitors  map[string]*agent.ProcessMonitor
	dataPath  string
}

func NewInstanceManager(dataPath string) *InstanceManager {
	im := &InstanceManager{
		instances: make(map[string]*ServerInstance),
		monitors:  make(map[string]*agent.ProcessMonitor),
		dataPath:  dataPath,
	}
	im.Load()
	return im
}

func (im *InstanceManager) Load() error {
	im.mu.Lock()
	defer im.mu.Unlock()

	path := filepath.Join(im.dataPath, "servers.json")
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			// Create default instance
			im.instances["default"] = &ServerInstance{
				ID:        "default",
				Name:      "기본 서버",
				Status:    "stopped",
				CreatedAt: time.Now(),
				Settings:  make(map[string]string),
			}
			// Fix: Initialize monitor for default instance
			im.monitors["default"] = agent.NewProcessMonitor("ArmaReforgerServer.exe")
			return nil
		}
		return err
	}

	var instances []*ServerInstance
	if err := json.Unmarshal(data, &instances); err != nil {
		return err
	}

	for _, inst := range instances {
		im.instances[inst.ID] = inst
		im.monitors[inst.ID] = agent.NewProcessMonitor("ArmaReforgerServer.exe")
	}
	return nil
}

func (im *InstanceManager) Save() error {
	im.mu.RLock()
	defer im.mu.RUnlock()

	var instances []*ServerInstance
	for _, inst := range im.instances {
		instances = append(instances, inst)
	}

	data, err := json.MarshalIndent(instances, "", "  ")
	if err != nil {
		return err
	}

	os.MkdirAll(im.dataPath, 0755)
	return os.WriteFile(filepath.Join(im.dataPath, "servers.json"), data, 0644)
}

func (im *InstanceManager) List() []*ServerInstance {
	im.mu.RLock()
	defer im.mu.RUnlock()

	var list []*ServerInstance
	for _, inst := range im.instances {
		// Update status from monitor
		if monitor, ok := im.monitors[inst.ID]; ok {
			running, pid, _ := monitor.IsRunning()
			if running {
				inst.Status = "running"
				inst.PID = pid
			} else {
				inst.Status = "stopped"
				inst.PID = 0
			}
		}
		list = append(list, inst)
	}
	return list
}

func (im *InstanceManager) Get(id string) *ServerInstance {
	im.mu.RLock()
	defer im.mu.RUnlock()
	return im.instances[id]
}

func (im *InstanceManager) Create(inst *ServerInstance) error {
	im.mu.Lock()
	defer im.mu.Unlock()

	if _, exists := im.instances[inst.ID]; exists {
		return fmt.Errorf("서버 ID가 이미 존재합니다: %s", inst.ID)
	}

	inst.CreatedAt = time.Now()
	inst.Status = "stopped"
	if inst.Settings == nil {
		inst.Settings = make(map[string]string)
	}

	im.instances[inst.ID] = inst
	im.monitors[inst.ID] = agent.NewProcessMonitor("ArmaReforgerServer.exe")

	return im.Save()
}

func (im *InstanceManager) Delete(id string) error {
	im.mu.Lock()
	defer im.mu.Unlock()

	if id == "default" {
		return fmt.Errorf("기본 서버는 삭제할 수 없습니다")
	}

	delete(im.instances, id)
	delete(im.monitors, id)

	return im.Save()
}

func (im *InstanceManager) Start(id string, args []string) error {
	im.mu.Lock()
	inst, exists := im.instances[id]
	if !exists {
		im.mu.Unlock()
		return fmt.Errorf("서버를 찾을 수 없습니다: %s", id)
	}
	im.mu.Unlock()

	monitor := im.monitors[id]
	if monitor == nil {
		return fmt.Errorf("서버 모니터를 찾을 수 없습니다: %s", id)
	}

	if inst.Path == "" {
		return fmt.Errorf("서버 경로가 설정되지 않았습니다. 환경 설정에서 경로를 지정해주세요")
	}

	serverExe := filepath.Join(inst.Path, "ArmaReforgerServer.exe")
	logs.GlobalLogs.Info(fmt.Sprintf("[%s] 서버 시작 중: %s", inst.Name, serverExe))

	if err := monitor.Start(serverExe, args); err != nil {
		logs.GlobalLogs.Error(fmt.Sprintf("[%s] 서버 시작 실패: %v", inst.Name, err))
		return err
	}

	now := time.Now()
	inst.LastStarted = &now
	inst.Status = "running"
	logs.GlobalLogs.Info(fmt.Sprintf("[%s] 서버가 시작되었습니다", inst.Name))

	return nil
}

func (im *InstanceManager) Stop(id string) error {
	im.mu.RLock()
	inst, exists := im.instances[id]
	if !exists {
		im.mu.RUnlock()
		return fmt.Errorf("서버를 찾을 수 없습니다: %s", id)
	}
	im.mu.RUnlock()

	monitor := im.monitors[id]
	if monitor == nil {
		return fmt.Errorf("서버 모니터를 찾을 수 없습니다: %s", id)
	}

	logs.GlobalLogs.Info(fmt.Sprintf("[%s] 서버 중지 중...", inst.Name))

	if err := monitor.Stop(); err != nil {
		return err
	}

	inst.Status = "stopped"
	logs.GlobalLogs.Info(fmt.Sprintf("[%s] 서버가 중지되었습니다", inst.Name))

	return nil
}

func (im *InstanceManager) Update(id string, updates *ServerInstance) error {
	im.mu.Lock()
	defer im.mu.Unlock()

	inst, exists := im.instances[id]
	if !exists {
		return fmt.Errorf("서버를 찾을 수 없습니다: %s", id)
	}

	if updates.Name != "" {
		inst.Name = updates.Name
	}
	if updates.Path != "" {
		inst.Path = updates.Path
	}
	if updates.ConfigPath != "" {
		inst.ConfigPath = updates.ConfigPath
	}
	if updates.Settings != nil {
		inst.Settings = updates.Settings
	}

	return im.Save()
}
