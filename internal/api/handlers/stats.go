package handlers

import (
	"time"

	"github.com/astral/kg-server-web-gui/internal/metrics"
	"github.com/gofiber/fiber/v2"
)

type StatsHandler struct {
	manager *metrics.Manager
}

func NewStatsHandler(manager *metrics.Manager) *StatsHandler {
	return &StatsHandler{manager: manager}
}

// GetHistory returns metrics for a specific instance and date
func (h *StatsHandler) GetHistory(c *fiber.Ctx) error {
	id := c.Query("id", "default")
	date := c.Query("date", time.Now().Format("2006-01-02"))

	points, err := h.manager.GetHistory(id, date)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(points)
}

// GetUptime returns basic uptime statistics
func (h *StatsHandler) GetUptime(c *fiber.Ctx) error {
	id := c.Query("id", "default")
	// For simplicity, we calculate uptime from today's metrics
	// Uptime = points where CPU/RAM > 0
	date := time.Now().Format("2006-01-02")
	points, err := h.manager.GetHistory(id, date)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	if len(points) == 0 {
		return c.JSON(fiber.Map{
			"uptimePercent": 0,
			"points":        0,
			"online":        0,
		})
	}

	onlineCount := 0
	for _, p := range points {
		if p.CPU > 0 || p.RAM > 0 {
			onlineCount++
		}
	}

	uptimePercent := (float64(onlineCount) / float64(len(points))) * 100

	return c.JSON(fiber.Map{
		"uptimePercent": uptimePercent,
		"totalPoints":   len(points),
		"onlinePoints":  onlineCount,
	})
}
