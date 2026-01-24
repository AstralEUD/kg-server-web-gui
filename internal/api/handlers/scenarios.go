package handlers

import (
	"strings"
	"sync"
	"time"

	"github.com/astral/kg-server-web-gui/internal/agent"
	"github.com/astral/kg-server-web-gui/internal/workshop"
	"github.com/gofiber/fiber/v2"
)

// ListScenarios executes listing via CLI
func (h *ApiHandlers) ListScenarios(c *fiber.Ctx) error {
	settings := h.Settings.Get()
	serverPath := c.Query("serverPath", settings.ServerPath)
	addonsPath := c.Query("addonsPath", settings.AddonsPath)

	if serverPath == "" {
		serverPath = "ArmaReforgerServer.exe"
	}

	// Support multiple addon paths? usually simple csv or multiple params
	// keeping simple: one path
	addonDirs := []string{addonsPath}
	if strings.Contains(addonsPath, ";") {
		addonDirs = strings.Split(addonsPath, ";")
	}

	scenarios, err := agent.ListScenarios(serverPath, addonDirs)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error(), "scenarios": scenarios})
	}

	// Enrichment: Fetch workshop images in parallel
	type EnrichedScenario struct {
		agent.Scenario
		ImageURL string `json:"imageUrl,omitempty"`
	}

	results := make([]EnrichedScenario, len(scenarios))
	var wg sync.WaitGroup

	// Cache for addon info to avoid redundant requests for same mod's scenarios
	addonCache := make(map[string]string)
	var cacheMu sync.Mutex

	for i, s := range scenarios {
		wg.Add(1)
		results[i] = EnrichedScenario{Scenario: s}

		go func(idx int, modID string) {
			defer wg.Done()
			if modID == "" {
				return
			}

			cacheMu.Lock()
			img, ok := addonCache[modID]
			cacheMu.Unlock()

			if ok {
				results[idx].ImageURL = img
				return
			}

			info, err := workshop.GetAddonInfo(modID)
			if err == nil && info.ImageURL != "" {
				results[idx].ImageURL = info.ImageURL
				cacheMu.Lock()
				addonCache[modID] = info.ImageURL
				cacheMu.Unlock()
			}
		}(i, s.ModID)
	}

	// Set a timeout for enrichment
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(3 * time.Second):
		// Proceed with partial results if too slow
	}

	return c.JSON(results)
}
