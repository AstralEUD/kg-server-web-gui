package handlers

import (
	"github.com/astral/kg-server-web-gui/internal/agent"
	"github.com/astral/kg-server-web-gui/internal/workshop"
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

// GetWorkshopInfo fetches addon info from Arma Platform
func (h *ApiHandlers) GetWorkshopInfo(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "id required"})
	}

	info, err := workshop.GetAddonInfo(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(info)
}

// SearchWorkshop searches the Arma Platform workshop
func (h *ApiHandlers) SearchWorkshop(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" {
		return c.Status(400).JSON(fiber.Map{"error": "query required"})
	}

	results, err := workshop.SearchWorkshop(query)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(results)
}
