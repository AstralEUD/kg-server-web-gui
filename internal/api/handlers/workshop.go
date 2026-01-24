package handlers

import (
	"github.com/astral/kg-server-web-gui/internal/workshop"
	"github.com/gofiber/fiber/v2"
)

// SearchWorkshop searches for mods
func (h *ApiHandlers) SearchWorkshop(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" {
		query = c.Query("search")
	}

	results, err := workshop.SearchWorkshop(query)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(results)
}

// GetWorkshopInfo returns details for a specific mod
func (h *ApiHandlers) GetWorkshopInfo(c *fiber.Ctx) error {
	id := c.Params("id")
	info, err := workshop.GetAddonInfo(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(info)
}

// ResolveDependencies finds all sub-dependencies for given mod IDs
func (h *ApiHandlers) ResolveDependencies(c *fiber.Ctx) error {
	var req struct {
		IDs []string `json:"ids"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	results, err := workshop.ResolveDependencies(req.IDs)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(results)
}
