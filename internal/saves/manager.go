package saves

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"time"
)

// SaveFile represents a server save file
type SaveFile struct {
	Name     string    `json:"name"`
	Path     string    `json:"path"`
	Size     int64     `json:"size"`
	Modified time.Time `json:"modified"`
	IsBackup bool      `json:"isBackup"`
}

// SaveManager handles server save files
type SaveManager struct {
	savesPath  string
	backupPath string
}

func NewSaveManager(savesPath, backupPath string) *SaveManager {
	return &SaveManager{
		savesPath:  savesPath,
		backupPath: backupPath,
	}
}

func (m *SaveManager) ListSaves() ([]SaveFile, error) {
	var saves []SaveFile

	entries, err := os.ReadDir(m.savesPath)
	if err != nil {
		if os.IsNotExist(err) {
			return saves, nil
		}
		return nil, err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		saves = append(saves, SaveFile{
			Name:     entry.Name(),
			Path:     filepath.Join(m.savesPath, entry.Name()),
			Size:     info.Size(),
			Modified: info.ModTime(),
			IsBackup: false,
		})
	}

	// Sort by modification time, newest first
	sort.Slice(saves, func(i, j int) bool {
		return saves[i].Modified.After(saves[j].Modified)
	})

	return saves, nil
}

func (m *SaveManager) ListBackups() ([]SaveFile, error) {
	var backups []SaveFile

	entries, err := os.ReadDir(m.backupPath)
	if err != nil {
		if os.IsNotExist(err) {
			return backups, nil
		}
		return nil, err
	}

	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}

		backups = append(backups, SaveFile{
			Name:     entry.Name(),
			Path:     filepath.Join(m.backupPath, entry.Name()),
			Size:     info.Size(),
			Modified: info.ModTime(),
			IsBackup: true,
		})
	}

	sort.Slice(backups, func(i, j int) bool {
		return backups[i].Modified.After(backups[j].Modified)
	})

	return backups, nil
}

func (m *SaveManager) CreateBackup(saveName string) (string, error) {
	srcPath := filepath.Join(m.savesPath, saveName)

	timestamp := time.Now().Format("20060102_150405")
	backupName := saveName + "_backup_" + timestamp
	dstPath := filepath.Join(m.backupPath, backupName)

	// Ensure backup directory exists
	if err := os.MkdirAll(m.backupPath, 0755); err != nil {
		return "", err
	}

	// Copy file
	input, err := os.ReadFile(srcPath)
	if err != nil {
		return "", err
	}

	if err := os.WriteFile(dstPath, input, 0644); err != nil {
		return "", err
	}

	return dstPath, nil
}

func (m *SaveManager) RestoreBackup(backupName string) error {
	srcPath := filepath.Join(m.backupPath, backupName)

	// Extract original name (remove _backup_timestamp)
	// Simple approach: just use backup name directly for restore target
	dstPath := filepath.Join(m.savesPath, backupName)

	input, err := os.ReadFile(srcPath)
	if err != nil {
		return err
	}

	return os.WriteFile(dstPath, input, 0644)
}

func (m *SaveManager) DeleteSave(name string, isBackup bool) error {
	var path string
	if isBackup {
		path = filepath.Join(m.backupPath, name)
	} else {
		path = filepath.Join(m.savesPath, name)
	}
	return os.Remove(path)
}

func (m *SaveManager) GetSaveDetails(name string) (map[string]interface{}, error) {
	path := filepath.Join(m.savesPath, name)

	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}

	// Try to read as JSON for metadata
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var content map[string]interface{}
	json.Unmarshal(data, &content) // Ignore errors, might not be JSON

	return map[string]interface{}{
		"name":     name,
		"size":     info.Size(),
		"modified": info.ModTime(),
		"content":  content,
	}, nil
}
