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
	"github.com/astral/kg-server-web-gui/internal/settings"
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
	mu          sync.RWMutex
	instances   map[string]*ServerInstance
	monitors    map[string]*agent.ProcessMonitor
	dataPath    string
	settingsMgr *settings.SettingsManager

	// Integrations
	watchdog *agent.Watchdog
	discord  *agent.DiscordClient
}

func NewInstanceManager(
	dataPath string,
	sm *settings.SettingsManager,
	wd *agent.Watchdog,
	discord *agent.DiscordClient,
) *InstanceManager {
	im := &InstanceManager{
		instances:   make(map[string]*ServerInstance),
		monitors:    make(map[string]*agent.ProcessMonitor),
		dataPath:    dataPath,
		settingsMgr: sm,
		watchdog:    wd,
		discord:     discord,
	}
	im.Load()
	return im
}

func (im *InstanceManager) GetDataPath() string {
	return im.dataPath
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
	inst, exists := im.instances[id]
	if !exists {
		im.mu.RUnlock()
		return nil
	}
	im.mu.RUnlock()

	// Update status from monitor
	if monitor, ok := im.monitors[id]; ok {
		running, pid, _ := monitor.IsRunning()
		if running {
			inst.Status = "running"
			inst.PID = pid
		} else {
			inst.Status = "stopped"
			inst.PID = 0
		}
	}
	return inst
}

// GetMonitor returns the process monitor for the given instance ID
func (im *InstanceManager) GetMonitor(id string) *agent.ProcessMonitor {
	im.mu.RLock()
	defer im.mu.RUnlock()
	return im.monitors[id]
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

// ... existing Load, Save, List, Get, Create, Delete ...

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

	// Fix #23: Ensure default instance always exists
	if _, exists := im.instances["default"]; !exists {
		im.instances["default"] = &ServerInstance{
			ID:        "default",
			Name:      "기본 서버",
			Status:    "stopped",
			CreatedAt: time.Now(),
			Settings:  make(map[string]string),
		}
		im.monitors["default"] = agent.NewProcessMonitor("ArmaReforgerServer.exe")
	}

	return nil
}

func (im *InstanceManager) Start(id string, args []string) error {
	// Resolve full arguments based on id and user input
	fullArgs := im.ResolveServerArgs(id, args)

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
		// Fallback to global settings
		if im.settingsMgr != nil {
			settings := im.settingsMgr.Get()
			if settings.ServerPath != "" {
				inst.Path = settings.ServerPath
			}
		}
	}

	if inst.Path == "" {
		return fmt.Errorf("서버 경로가 설정되지 않았습니다. 환경 설정에서 경로를 지정해주세요")
	}

	serverExe := filepath.Join(inst.Path, "ArmaReforgerServer.exe")
	logs.GlobalLogs.Info(fmt.Sprintf("[%s] 서버 시작 중: %s", inst.Name, serverExe))

	// Register with Watchdog before starting
	if im.watchdog != nil {
		im.watchdog.RegisterInstance(id, serverExe, fullArgs, monitor)
	}

	if err := monitor.Start(serverExe, fullArgs); err != nil {
		logs.GlobalLogs.Error(fmt.Sprintf("[%s] 서버 시작 실패: %v", inst.Name, err))
		if im.discord != nil {
			im.discord.SendMessage("❌ Start Failed", fmt.Sprintf("Failed to start server %s: %v", inst.Name, err), agent.ColorRed)
		}
		return err
	}

	now := time.Now()
	inst.LastStarted = &now
	inst.Status = "running"
	logs.GlobalLogs.Info(fmt.Sprintf("[%s] 서버가 시작되었습니다", inst.Name))

	if im.discord != nil {
		im.discord.SendMessage("✅ Server Started", fmt.Sprintf("Server **%s** is now online.", inst.Name), agent.ColorGreen)
	}

	return nil
}

// ResolveServerArgs injects mandatory arguments like -config, -profile, -addonDownloadDir if missing
func (im *InstanceManager) ResolveServerArgs(id string, userArgs []string) []string {
	args := append([]string{}, userArgs...) // Copy

	hasConfig := false
	hasProfile := false
	hasAddons := false
	hasHeadless := false

	for _, arg := range args {
		switch arg {
		case "-config":
			hasConfig = true
		case "-profile":
			hasProfile = true
		case "-addonDownloadDir":
			hasAddons = true
		case "-server":
			hasHeadless = true
		}
	}

	if !hasHeadless {
		args = append(args, "-server")
	}

	workDir, _ := os.Getwd()

	// 1. Config Path
	if !hasConfig {
		configPath := "server.json"
		if id != "default" {
			im.mu.RLock()
			if inst, ok := im.instances[id]; ok && inst.ConfigPath != "" {
				configPath = inst.ConfigPath
			}
			im.mu.RUnlock()
		}
		absConfig, _ := filepath.Abs(configPath)
		args = append(args, "-config", absConfig)
	}

	// 2. Profile Path
	if !hasProfile {
		profileRoot := filepath.Join(workDir, "profile")
		profilePath := profileRoot
		if id != "default" {
			profilePath = filepath.Join(profileRoot, id)
		}
		absProfile, _ := filepath.Abs(profilePath)
		os.MkdirAll(absProfile, 0755)
		args = append(args, "-profile", absProfile)
	}

	// 3. Addons Path
	if !hasAddons {
		addonPath := filepath.Join(workDir, "addons")
		if im.settingsMgr != nil {
			s := im.settingsMgr.Get()
			if s.AddonsPath != "" {
				addonPath = s.AddonsPath
			}
		}
		absAddons, _ := filepath.Abs(addonPath)
		args = append(args, "-addonDownloadDir", absAddons)
	}

	return args
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

	// Disable watchdog temporarily if it's the active instance
	// Ideally we should track which instance watchdog is watching, but for now we assume single active watchdog
	if im.watchdog != nil {
		// Just stop monitoring? Or tell it "expected stop"
		// If we set Enabled=false global, it stays false.
		// We should probably rely on the watchdog check loop to see if we manually stopped it?
		// But Watchdog checks IsRunning(). If we Stop(), IsRunning becomes false -> Watchdog triggers restart.
		// So we MUST disable watchdog before stopping.
		// But SetEnabled(false) is persistent...
		// Refined Watchdog logic needed: "Pause" or "ExpectStop".
		// For MVP, let's just SetEnabled(false) if enabled, and rely on user to re-enable?
		// No, that's bad UX.
		// Let's assume the user Stops the server intentinally.
		// If Watchdog is enabled globally, we should maybe pause it?

		// Simpler approach: If we stop via API, we acknowledge it.
		// BUT Watchdog runs in background.
		// Let's SetEnabled(false) here, and if the user Starts again, the UI/Settings should decide?
		// No, Start() doesn't re-enable it.

		// Let's hack: If manually stopping, user implies "I don't want it running".
		// So disabling Watchdog is correct behavior for "Stop Server".
		if im.watchdog.IsEnabled() {
			logs.GlobalLogs.Info("Stopping server manually - Watchdog paused.")
			im.watchdog.SetEnabled(false)
			// NOTE: This will turn off the toggle in Settings UI if UI polls this state?
			// We need to sync this state back to SettingsManager if we want persistence.
			// But Watchdog struct has its own enabled state.
			// Let's leave it as is: Manual Stop = Disable Watchdog.
		}
	}

	if err := monitor.Stop(); err != nil {
		return err
	}

	inst.Status = "stopped"
	logs.GlobalLogs.Info(fmt.Sprintf("[%s] 서버가 중지되었습니다", inst.Name))

	if im.discord != nil {
		im.discord.SendMessage("🛑 Server Stopped", fmt.Sprintf("Server **%s** has been stopped manually.", inst.Name), agent.ColorYellow)
	}

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
