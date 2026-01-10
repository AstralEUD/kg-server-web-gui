package handlers

import (
	"github.com/astral/kg-server-web-gui/internal/config"
	"github.com/astral/kg-server-web-gui/internal/workshop"
	"github.com/gofiber/fiber/v2"
)

// GetConfig reads server.json
func (h *ApiHandlers) GetConfig(c *fiber.Ctx) error {
	path := c.Query("path", "server.json") // Security risk? For local tool, acceptable.

	data, err := h.Config.ReadConfig(path)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(data)
}

// SaveConfig writes server.json
func (h *ApiHandlers) SaveConfig(c *fiber.Ctx) error {
	path := c.Query("path", "server.json")

	var data config.ServerConfig
	if err := c.BodyParser(&data); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.Config.WriteConfig(path, &data); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "saved"})
}

// EnrichModsRequest is the request body for EnrichMods
type EnrichModsRequest struct {
	Mods []struct {
		ModID string `json:"modId"`
		Name  string `json:"name"`
	} `json:"mods"`
}

// EnrichModsResponse returns enriched mod data
type EnrichModsResponse struct {
	Mods      []EnrichedMod      `json:"mods"`
	Scenarios []EnrichedScenario `json:"scenarios"`
}

type EnrichedMod struct {
	ModID        string   `json:"modId"`
	Name         string   `json:"name"`
	Dependencies []string `json:"dependencies"`
}

type EnrichedScenario struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	ModID string `json:"modId"`
}

// EnrichMods crawls workshop for mod dependencies and scenarios
func (h *ApiHandlers) EnrichMods(c *fiber.Ctx) error {
	var req EnrichModsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	resp := EnrichModsResponse{
		Mods:      make([]EnrichedMod, 0),
		Scenarios: make([]EnrichedScenario, 0),
	}

	// Import workshop package
	for _, mod := range req.Mods {
		enriched := EnrichedMod{
			ModID:        mod.ModID,
			Name:         mod.Name,
			Dependencies: []string{},
		}

		// Try to fetch from workshop (best effort, don't fail entire request)
		info, err := workshop.GetAddonInfo(mod.ModID)
		if err == nil && info != nil {
			if info.Name != "" {
				enriched.Name = info.Name
			}
			for _, dep := range info.Dependencies {
				enriched.Dependencies = append(enriched.Dependencies, dep.ID)
			}
			// Add scenarios from this mod
			for _, scenario := range info.Scenarios {
				resp.Scenarios = append(resp.Scenarios, EnrichedScenario{
					ID:    scenario.ID,
					Name:  scenario.Name,
					ModID: mod.ModID,
				})
			}
		}

		resp.Mods = append(resp.Mods, enriched)
	}

	return c.JSON(resp)
}
