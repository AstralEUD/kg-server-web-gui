package handlers

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"github.com/astral/kg-server-web-gui/internal/api/response"
	"github.com/gofiber/fiber/v2"
)

type ModCategoryHandler struct {
	FilePath string
	mu       sync.RWMutex
}

func NewModCategoryHandler(dataDir string) *ModCategoryHandler {
	return &ModCategoryHandler{
		FilePath: filepath.Join(dataDir, "mod_categories.json"),
	}
}

// Map: ModID -> Category
type ModCategories map[string]string

func (h *ModCategoryHandler) GetCategories(c *fiber.Ctx) error {
	h.mu.RLock()
	defer h.mu.RUnlock()

	data, err := os.ReadFile(h.FilePath)
	if os.IsNotExist(err) {
		return c.JSON(response.Success(make(ModCategories)))
	}
	if err != nil {
		return c.Status(500).JSON(response.Error(err.Error()))
	}

	var categories ModCategories
	if err := json.Unmarshal(data, &categories); err != nil {
		return c.JSON(response.Success(make(ModCategories)))
	}

	return c.JSON(response.Success(categories))
}

func (h *ModCategoryHandler) SetCategory(c *fiber.Ctx) error {
	var req struct {
		ModID    string `json:"modId"`
		Category string `json:"category"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(response.Error("Invalid request"))
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	// Read existing
	categories := make(ModCategories)
	data, err := os.ReadFile(h.FilePath)
	if err == nil {
		json.Unmarshal(data, &categories)
	}

	// Update
	if req.Category == "" {
		delete(categories, req.ModID)
	} else {
		categories[req.ModID] = req.Category
	}

	// Write back
	newData, err := json.MarshalIndent(categories, "", "  ")
	if err != nil {
		return c.Status(500).JSON(response.Error("Failed to serialize"))
	}

	if err := os.WriteFile(h.FilePath, newData, 0644); err != nil {
		return c.Status(500).JSON(response.Error("Failed to save"))
	}

	return c.JSON(response.Success(categories))
}
