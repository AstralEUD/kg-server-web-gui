package profile

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// Profile represents a server configuration profile
type Profile struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	ServerExePath   string    `json:"serverExePath"`
	ConfigPath      string    `json:"configPath"`
	AddonsPath      string    `json:"addonsPath"`
	SteamCMDPath    string    `json:"steamcmdPath"`
	ProfilePath     string    `json:"profilePath"` // -profile argument
	SavesPath       string    `json:"savesPath"`
	IsActive        bool      `json:"isActive"`
	UseExperimental bool      `json:"useExperimental"`
	UseUPnP         bool      `json:"useUPnP"`
	KeepUpToDate    bool      `json:"keepUpToDate"`
	CreatedAt       time.Time `json:"createdAt"`
}

type ProfileManager struct {
	mu       sync.RWMutex
	profiles map[string]*Profile
	dataPath string
}

func NewProfileManager(dataPath string) *ProfileManager {
	pm := &ProfileManager{
		profiles: make(map[string]*Profile),
		dataPath: dataPath,
	}
	pm.Load()
	return pm
}

func (pm *ProfileManager) Load() error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	path := filepath.Join(pm.dataPath, "profiles.json")
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	var profiles []*Profile
	if err := json.Unmarshal(data, &profiles); err != nil {
		return err
	}

	for _, p := range profiles {
		pm.profiles[p.ID] = p
	}
	return nil
}

func (pm *ProfileManager) Save() error {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	return pm.saveLocked()
}

// saveLocked saves without acquiring lock - caller must hold lock
func (pm *ProfileManager) saveLocked() error {
	var profiles []*Profile
	for _, p := range pm.profiles {
		profiles = append(profiles, p)
	}

	data, err := json.MarshalIndent(profiles, "", "  ")
	if err != nil {
		return err
	}

	os.MkdirAll(pm.dataPath, 0755)
	return os.WriteFile(filepath.Join(pm.dataPath, "profiles.json"), data, 0644)
}

func (pm *ProfileManager) Create(p *Profile) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	// Fix #19: Set CreatedAt if not already set
	if p.CreatedAt.IsZero() {
		p.CreatedAt = time.Now()
	}
	pm.profiles[p.ID] = p
	return pm.saveLocked()
}

func (pm *ProfileManager) Get(id string) *Profile {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	return pm.profiles[id]
}

func (pm *ProfileManager) List() []*Profile {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	var list []*Profile
	for _, p := range pm.profiles {
		list = append(list, p)
	}
	return list
}

func (pm *ProfileManager) Delete(id string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	delete(pm.profiles, id)
	return pm.saveLocked()
}

func (pm *ProfileManager) SetActive(id string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	for pid := range pm.profiles {
		pm.profiles[pid].IsActive = (pid == id)
	}
	return pm.saveLocked()
}

func (pm *ProfileManager) GetActive() *Profile {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	for _, p := range pm.profiles {
		if p.IsActive {
			return p
		}
	}
	return nil
}
