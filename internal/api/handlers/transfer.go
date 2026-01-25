package handlers

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"

	"github.com/astral/kg-server-web-gui/internal/api/response"
	"github.com/astral/kg-server-web-gui/internal/settings"
	"github.com/gofiber/fiber/v2"
)

type BackupData struct {
	Version   string                `json:"version"`
	Timestamp time.Time             `json:"timestamp"`
	Settings  *settings.AppSettings `json:"settings"`
	Mappings  interface{}           `json:"mappings,omitempty"`
	Jobs      interface{}           `json:"jobs,omitempty"`
}

// ExportSettings exports all main configuration files as a single JSON
func (h *ApiHandlers) ExportSettings(c *fiber.Ctx) error {
	dataPath := h.Manager.GetDataPath()

	backup := BackupData{
		Version:   "1.0",
		Timestamp: time.Now(),
		Settings:  h.Settings.Get(),
	}

	// Load Mappings
	mappingPath := filepath.Join(dataPath, "map_mappings.json")
	if data, err := os.ReadFile(mappingPath); err == nil {
		var mappings interface{}
		json.Unmarshal(data, &mappings)
		backup.Mappings = mappings
	}

	// Load Jobs
	jobsPath := filepath.Join(dataPath, "jobs.json")
	if data, err := os.ReadFile(jobsPath); err == nil {
		var jobs interface{}
		json.Unmarshal(data, &jobs)
		backup.Jobs = jobs
	}

	return c.JSON(response.Success(backup))
}

// ImportSettings imports application configuration
func (h *ApiHandlers) ImportSettings(c *fiber.Ctx) error {
	var backup BackupData
	if err := c.BodyParser(&backup); err != nil {
		return c.Status(400).JSON(response.Error("Invalid backup data"))
	}

	dataPath := h.Manager.GetDataPath()

	// 1. Update Settings
	if backup.Settings != nil {
		h.Settings.Update(backup.Settings)
	}

	// 2. Save Mappings
	if backup.Mappings != nil {
		mappingPath := filepath.Join(dataPath, "map_mappings.json")
		data, _ := json.MarshalIndent(backup.Mappings, "", "  ")
		os.WriteFile(mappingPath, data, 0644)
	}

	// 3. Save Jobs
	if backup.Jobs != nil {
		jobsPath := filepath.Join(dataPath, "jobs.json")
		data, _ := json.MarshalIndent(backup.Jobs, "", "  ")
		os.WriteFile(jobsPath, data, 0644)
	}

	return c.JSON(response.Success(fiber.Map{"status": "success", "message": "Settings imported successfully. Restart may be required."}))
}

// ValidateConfig validates a server.json content
func (h *ApiHandlers) ValidateConfig(c *fiber.Ctx) error {
	var req struct {
		Content string `json:"content"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(response.Error(err.Error()))
	}

	var cfg interface{}
	if err := json.Unmarshal([]byte(req.Content), &cfg); err != nil {
		return c.Status(400).JSON(response.Success(fiber.Map{"valid": false, "error": err.Error()}))
	}

	// Basic check for required fields in Arma Reforger server.json
	rawMap, ok := cfg.(map[string]interface{})
	if !ok {
		return c.JSON(response.Success(fiber.Map{"valid": false, "error": "Not a JSON object"}))
	}

	// Check game section
	game, ok := rawMap["game"].(map[string]interface{})
	if !ok {
		return c.JSON(response.Success(fiber.Map{"valid": false, "error": "'game' section missing"}))
	}

	if _, exists := game["scenarioId"]; !exists {
		return c.JSON(response.Success(fiber.Map{"valid": true, "warning": "scenarioId is missing, but JSON is valid"}))
	}

	return c.JSON(response.Success(fiber.Map{"valid": true}))
}
