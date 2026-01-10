package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type ConfigManager struct {
	mu sync.Mutex
}

func NewConfigManager() *ConfigManager {
	return &ConfigManager{}
}

// ReadConfig reads JSON config into a map
func (m *ConfigManager) ReadConfig(path string) (map[string]interface{}, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var data map[string]interface{}
	decoder := json.NewDecoder(f)
	if err := decoder.Decode(&data); err != nil {
		return nil, err
	}
	return data, nil
}

// WriteConfig writes JSON config atomically
func (m *ConfigManager) WriteConfig(path string, data map[string]interface{}) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Validate before write
	if err := m.ValidateConfig(data); err != nil {
		return err
	}

	// 1. Marshal to bytes
	bytes, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}

	// 2. Write to temp file
	dir := filepath.Dir(path)
	tmpFile, err := os.CreateTemp(dir, "server.json.tmp")
	if err != nil {
		return err
	}
	defer os.Remove(tmpFile.Name()) // Clean up if something fails

	if _, err := tmpFile.Write(bytes); err != nil {
		tmpFile.Close()
		return err
	}
	tmpFile.Close()

	// 3. Rename (Atomic replace)
	// Backup first? (Optional, maybe handled by calling Backup function separately)
	if err := os.Rename(tmpFile.Name(), path); err != nil {
		return err
	}

	return nil
}

// ValidateConfig performs basic schema checks
func (m *ConfigManager) ValidateConfig(data map[string]interface{}) error {
	// Check root keys
	// Reforger config usually has top level keys or "game" key depending on version/structure.
	// Usually: { "server": {...}, "game": {...} }

	if _, ok := data["game"]; !ok {
		// Just a warning or strict error?
		// "game" section is required for mission/mods.
		// Let's enforce it.
		return fmt.Errorf("missing 'game' section in server.json")
	}

	return nil
}

// BackupConfig creates a timestamped copy
func (m *ConfigManager) BackupConfig(path string) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	input, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}

	backupPath := fmt.Sprintf("%s.backup.%d", path, time.Now().Unix())
	if err := os.WriteFile(backupPath, input, 0644); err != nil {
		return "", err
	}

	return backupPath, nil
}
