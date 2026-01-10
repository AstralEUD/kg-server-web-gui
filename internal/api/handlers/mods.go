package handlers

import (
	"github.com/astral/kg-server-web-gui/internal/agent"
	"github.com/gofiber/fiber/v2"
)

// ListInstalledMods scans the addons directory
func (h *ApiHandlers) ListInstalledMods(c *fiber.Ctx) error {
	path := c.Query("path", "C:\\saves\\addons")

	mods, err := agent.ScanAddons(path)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(mods)
}
