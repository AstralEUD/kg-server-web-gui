package workshop

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// CollectionItem represents a mod in a collection
type CollectionItem struct {
	ModID   string   `json:"modId"`
	Name    string   `json:"name"`
	Version string   `json:"version,omitempty"`
	Deps    []string `json:"deps,omitempty"` // Dependency ModIDs
}

// Collection represents a user-defined group of mods
type Collection struct {
	ID        string           `json:"id"` // Unique ID (e.g., UUID or simple name)
	Name      string           `json:"name"`
	Items     []CollectionItem `json:"items"`
	CreatedAt time.Time        `json:"createdAt"`
	UpdatedAt time.Time        `json:"updatedAt"`
}

type CollectionManager struct {
	mu       sync.RWMutex
	dataPath string
}

func NewCollectionManager(dataPath string) *CollectionManager {
	return &CollectionManager{
		dataPath: dataPath,
	}
}

func (cm *CollectionManager) loadCollections() ([]Collection, error) {
	path := filepath.Join(cm.dataPath, "collections.json")
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return []Collection{}, nil
		}
		return nil, err
	}

	var collections []Collection
	if err := json.Unmarshal(data, &collections); err != nil {
		return nil, err
	}
	return collections, nil
}

func (cm *CollectionManager) saveCollections(collections []Collection) error {
	path := filepath.Join(cm.dataPath, "collections.json")
	data, err := json.MarshalIndent(collections, "", "  ")
	if err != nil {
		return err
	}

	// Ensure directory exists
	os.MkdirAll(cm.dataPath, 0755)

	return os.WriteFile(path, data, 0644)
}

// GetCollections returns all collections
func (cm *CollectionManager) GetCollections() ([]Collection, error) {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	return cm.loadCollections()
}

// SaveCollection adds or updates a collection
func (cm *CollectionManager) SaveCollection(col Collection) error {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	collections, err := cm.loadCollections()
	if err != nil {
		return err
	}

	found := false
	for i, c := range collections {
		if c.ID == col.ID {
			col.UpdatedAt = time.Now()
			// Preserve CreatedAt
			col.CreatedAt = c.CreatedAt
			collections[i] = col
			found = true
			break
		}
	}

	if !found {
		col.CreatedAt = time.Now()
		col.UpdatedAt = time.Now()
		collections = append(collections, col)
	}

	return cm.saveCollections(collections)
}

// DeleteCollection removes a collection by ID
func (cm *CollectionManager) DeleteCollection(id string) error {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	collections, err := cm.loadCollections()
	if err != nil {
		return err
	}

	newCollections := []Collection{}
	for _, c := range collections {
		if c.ID != id {
			newCollections = append(newCollections, c)
		}
	}

	return cm.saveCollections(newCollections)
}
