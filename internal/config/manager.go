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

// ReadConfig reads JSON config into ServerConfig struct
func (m *ConfigManager) ReadConfig(path string) (*ServerConfig, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return &ServerConfig{}, nil
		}
		return nil, err
	}
	defer f.Close()

	var data ServerConfig
	decoder := json.NewDecoder(f)
	if err := decoder.Decode(&data); err != nil {
		return nil, err
	}
	return &data, nil
}

// WriteConfig writes JSON config from ServerConfig struct
func (m *ConfigManager) WriteConfig(path string, data *ServerConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// 1. Marshal to bytes
	bytes, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}

	// 2. Write to temp file
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	tmpFile, err := os.CreateTemp(dir, "server.json.tmp")
	if err != nil {
		return err
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.Write(bytes); err != nil {
		tmpFile.Close()
		return err
	}
	tmpFile.Close()

	// 3. Rename (Atomic replace)
	if err := os.Rename(tmpFile.Name(), path); err != nil {
		return err
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
