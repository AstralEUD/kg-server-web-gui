package preset

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type ModEntry struct {
	ModID   string `json:"modId"`
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
}

type ScenarioMapping struct {
	Slot       int    `json:"slot"`
	ScenarioID string `json:"scenarioId"`
	Name       string `json:"name,omitempty"`
}

type Preset struct {
	ID               string            `json:"id"`
	Name             string            `json:"name"`
	Description      string            `json:"description,omitempty"`
	Config           map[string]any    `json:"config"`           // server.json content
	Mods             []ModEntry        `json:"mods"`             // Enabled mods (from config)
	CollectionItems  []any             `json:"collectionItems"`  // My List items (raw json to avoid circular dep with workshop)
	ScenarioMappings []ScenarioMapping `json:"scenarioMappings"` // !kgmission mappings
	ActiveScenario   string            `json:"activeScenario"`   // Current scenario
	CreatedAt        time.Time         `json:"createdAt"`
	UpdatedAt        time.Time         `json:"updatedAt"`
}

type PresetManager struct {
	mu       sync.RWMutex
	presets  map[string]*Preset
	dataPath string
}

func NewPresetManager(dataPath string) *PresetManager {
	pm := &PresetManager{
		presets:  make(map[string]*Preset),
		dataPath: dataPath,
	}
	pm.Load()
	return pm
}

func (pm *PresetManager) Load() error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	path := filepath.Join(pm.dataPath, "presets.json")
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	var presets []*Preset
	if err := json.Unmarshal(data, &presets); err != nil {
		return err
	}

	for _, p := range presets {
		pm.presets[p.ID] = p
	}
	return nil
}

func (pm *PresetManager) Save() error {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	var presets []*Preset
	for _, p := range pm.presets {
		presets = append(presets, p)
	}

	data, err := json.MarshalIndent(presets, "", "  ")
	if err != nil {
		return err
	}

	os.MkdirAll(pm.dataPath, 0755)
	return os.WriteFile(filepath.Join(pm.dataPath, "presets.json"), data, 0644)
}

func (pm *PresetManager) Create(p *Preset) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	p.CreatedAt = time.Now()
	p.UpdatedAt = time.Now()
	pm.presets[p.ID] = p
	return pm.Save()
}

func (pm *PresetManager) Get(id string) *Preset {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	return pm.presets[id]
}

func (pm *PresetManager) List() []*Preset {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	var list []*Preset
	for _, p := range pm.presets {
		list = append(list, p)
	}
	return list
}

func (pm *PresetManager) Update(id string, updated *Preset) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	if _, exists := pm.presets[id]; !exists {
		return os.ErrNotExist
	}

	updated.ID = id
	updated.UpdatedAt = time.Now()
	pm.presets[id] = updated
	return pm.Save()
}

func (pm *PresetManager) Delete(id string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	delete(pm.presets, id)
	return pm.Save()
}
