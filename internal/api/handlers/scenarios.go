package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

// ListScenarios executes listing via CLI
func (h *ApiHandlers) ListScenarios(c *fiber.Ctx) error {
	serverPath := c.Query("serverPath", "ArmaReforgerServer.exe")
	addonsPath := c.Query("addonsPath", "C:\\saves\\addons")

	// Support multiple addon paths? usually simple csv or multiple params
	// keeping simple: one path
	addonDirs := []string{addonsPath}
	if strings.Contains(addonsPath, ";") {
		addonDirs = strings.Split(addonsPath, ";")
	}

	scenarios, err := h.Process.ListScenarios(serverPath, addonDirs)
	if err != nil {
		// Just log error but return what we have? or fail?
		// CLI might return error code even if it prints scenarios.
		return c.Status(500).JSON(fiber.Map{"error": err.Error(), "scenarios": scenarios})
	}

	return c.JSON(scenarios)
}
