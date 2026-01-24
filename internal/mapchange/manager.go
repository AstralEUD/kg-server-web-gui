package mapchange

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

// MapMapping represents a slot to scenario mapping
type MapMapping struct {
	Slot       int    `json:"slot"`       // 1, 2, 3...
	ScenarioID string `json:"scenarioId"` // {GUID}Missions/xxx.conf
	Name       string `json:"name"`       // Display name
}

// MappingManager handles map slot mappings
type MappingManager struct {
	mu       sync.RWMutex
	mappings []MapMapping
	dataPath string
}

// NewMappingManager creates a new mapping manager
func NewMappingManager(dataPath string) *MappingManager {
	m := &MappingManager{
		mappings: []MapMapping{},
		dataPath: dataPath,
	}
	m.Load()
	return m
}

// Load loads mappings from disk
func (m *MappingManager) Load() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	path := filepath.Join(m.dataPath, "map_mappings.json")
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	return json.Unmarshal(data, &m.mappings)
}

// Save saves mappings to disk
func (m *MappingManager) Save() error {
	m.mu.RLock()
	defer m.mu.RUnlock()

	data, err := json.MarshalIndent(m.mappings, "", "  ")
	if err != nil {
		return err
	}

	os.MkdirAll(m.dataPath, 0755)
	return os.WriteFile(filepath.Join(m.dataPath, "map_mappings.json"), data, 0644)
}

// List returns all mappings
func (m *MappingManager) List() []MapMapping {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]MapMapping, len(m.mappings))
	copy(result, m.mappings)
	return result
}

// Get returns a mapping by slot
func (m *MappingManager) Get(slot int) *MapMapping {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, mapping := range m.mappings {
		if mapping.Slot == slot {
			return &mapping
		}
	}
	return nil
}

// Add adds or updates a mapping
func (m *MappingManager) Add(mapping MapMapping) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Check if slot already exists
	for i, existing := range m.mappings {
		if existing.Slot == mapping.Slot {
			m.mappings[i] = mapping
			return m.saveUnlocked()
		}
	}

	// Add new
	m.mappings = append(m.mappings, mapping)
	return m.saveUnlocked()
}

// Remove removes a mapping by slot
func (m *MappingManager) Remove(slot int) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for i, mapping := range m.mappings {
		if mapping.Slot == slot {
			m.mappings = append(m.mappings[:i], m.mappings[i+1:]...)
			return m.saveUnlocked()
		}
	}
	return nil
}

// GetByScenarioID finds a mapping by scenario ID
func (m *MappingManager) GetByScenarioID(scenarioID string) *MapMapping {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, mapping := range m.mappings {
		if mapping.ScenarioID == scenarioID {
			return &mapping
		}
	}
	return nil
}

// saveUnlocked saves without acquiring lock (caller must hold lock)
func (m *MappingManager) saveUnlocked() error {
	data, err := json.MarshalIndent(m.mappings, "", "  ")
	if err != nil {
		return err
	}

	os.MkdirAll(m.dataPath, 0755)
	return os.WriteFile(filepath.Join(m.dataPath, "map_mappings.json"), data, 0644)
}
