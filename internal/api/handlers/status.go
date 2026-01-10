package handlers

import (
	"github.com/astral/kg-server-web-gui/internal/monitor"
	"github.com/gofiber/fiber/v2"
)

// GetStatus returns the current server process status
func (h *ApiHandlers) GetStatus(c *fiber.Ctx) error {
	running, pid, err := h.Process.IsRunning()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"running": running,
		"pid":     pid,
	})
}

// GetResources returns system resource usage
func (h *ApiHandlers) GetResources(c *fiber.Ctx) error {
	stats, err := monitor.GetSystemStats()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(stats)
}
