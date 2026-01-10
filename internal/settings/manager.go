package settings

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"golang.org/x/sys/windows/registry"
)

// AppSettings stores global application settings
type AppSettings struct {
	// Server paths
	ServerPath   string `json:"serverPath"`   // Path to ArmaReforgerServer.exe
	AddonsPath   string `json:"addonsPath"`   // Path to addons directory
	ProfilesPath string `json:"profilesPath"` // Path to profiles directory

	// SteamCMD
	SteamCMDPath string `json:"steamcmdPath"` // Path to steamcmd directory

	// Multi-server support
	DefaultServerName string `json:"defaultServerName"` // Default server instance name
}

// SettingsManager handles saving/loading settings
type SettingsManager struct {
	mu       sync.RWMutex
	settings *AppSettings
	filePath string
}

func NewSettingsManager(dataPath string) *SettingsManager {
	sm := &SettingsManager{
		filePath: filepath.Join(dataPath, "settings.json"),
		settings: &AppSettings{},
	}
	sm.Load()
	return sm
}

func (sm *SettingsManager) Load() error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	data, err := os.ReadFile(sm.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			// Set defaults
			sm.settings = &AppSettings{
				ServerPath:        "",
				AddonsPath:        "",
				ProfilesPath:      "",
				SteamCMDPath:      "",
				DefaultServerName: "default",
			}
			return nil
		}
		return err
	}

	if err := json.Unmarshal(data, sm.settings); err != nil {
		return err
	}

	// Auto-detect if server path is empty
	if sm.settings.ServerPath == "" {
		// 1. Try common paths
		commonPaths := []string{
			`C:\Program Files (x86)\Steam\steamapps\common\Arma Reforger Server`,
			`C:\Program Files\Steam\steamapps\common\Arma Reforger Server`,
			`D:\SteamLibrary\steamapps\common\Arma Reforger Server`,
		}

		found := false
		for _, p := range commonPaths {
			if _, err := os.Stat(filepath.Join(p, "ArmaReforgerServer.exe")); err == nil {
				sm.settings.ServerPath = p
				found = true
				break
			}
		}

		// 2. Try Registry (InstallLocation)
		if !found {
			k, err := registry.OpenKey(registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Steam App 1874900`, registry.QUERY_VALUE)
			if err == nil {
				defer k.Close()
				path, _, err := k.GetStringValue("InstallLocation")
				if err == nil && path != "" {
					sm.settings.ServerPath = path
					found = true
				}
			}
		}

		if found {
			sm.Save() // Save the detected path
		}
	}

	return nil
}

func (sm *SettingsManager) Save() error {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	data, err := json.MarshalIndent(sm.settings, "", "  ")
	if err != nil {
		return err
	}

	os.MkdirAll(filepath.Dir(sm.filePath), 0755)
	return os.WriteFile(sm.filePath, data, 0644)
}

func (sm *SettingsManager) Get() *AppSettings {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	// Return a copy
	copy := *sm.settings
	return &copy
}

func (sm *SettingsManager) Update(settings *AppSettings) error {
	sm.mu.Lock()
	sm.settings = settings
	sm.mu.Unlock()
	return sm.Save()
}
