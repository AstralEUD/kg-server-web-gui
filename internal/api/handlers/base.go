package handlers

import (
	"github.com/astral/kg-server-web-gui/internal/agent"
	"github.com/astral/kg-server-web-gui/internal/config"
	"github.com/astral/kg-server-web-gui/internal/monitor"
	"github.com/astral/kg-server-web-gui/internal/server"
	"github.com/astral/kg-server-web-gui/internal/settings"
	"github.com/gofiber/fiber/v2"
)

type ApiHandlers struct {
	Manager  *server.InstanceManager
	Config   *config.ConfigManager
	Settings *settings.SettingsManager
	Watchdog *agent.Watchdog
	Discord  *agent.DiscordClient
}

func NewApiHandlers(
	mgr *server.InstanceManager,
	cfg *config.ConfigManager,
	settings *settings.SettingsManager,
	wd *agent.Watchdog,
	discord *agent.DiscordClient,
) *ApiHandlers {
	return &ApiHandlers{
		Manager:  mgr,
		Config:   cfg,
		Settings: settings,
		Watchdog: wd,
		Discord:  discord,
	}
}

// GetStatus returns the server process status
func (h *ApiHandlers) GetStatus(c *fiber.Ctx) error {
	id := c.Query("id", "default")
	proc := h.Manager.GetMonitor(id)

	// If monitor not found, attempt to verify if instance exists; if so, maybe it's just not created in map (shouldn't happen if Load works)
	// But if we return error 500, frontend might break. Return stopped and 0 pid if not found but safe?
	if proc == nil {
		return c.JSON(fiber.Map{"running": false, "pid": 0, "error": "Instance monitor not found"})
	}

	running, pid, err := proc.IsRunning()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"running": running,
		"pid":     pid,
	})
}

// GetResources returns the server resource usage history and health
func (h *ApiHandlers) GetResources(c *fiber.Ctx) error {
	// Get System Stats (Preserve existing functionality)
	stats, err := monitor.GetSystemStats()
	if err != nil {
		// Log error but continue
	}

	id := c.Query("id", "default")
	proc := h.Manager.GetMonitor(id)

	var history []agent.ResourceData
	health := "offline"

	if proc != nil {
		history = proc.GetResourceHistory()
		running, _, _ := proc.IsRunning()
		if running {
			health = "healthy"
		}
	}

	// Create a map merging both
	response := fiber.Map{
		"history":  history,
		"health":   health,
		"watchdog": h.Watchdog.IsEnabled(),
	}

	// Flatten SystemStats into response for backward compatibility
	if stats != nil {
		response["cpuPercent"] = stats.CPUPercent
		response["memoryUsed"] = stats.MemoryUsed
		response["memoryTotal"] = stats.MemoryTotal
		response["memoryPercent"] = stats.MemoryPercent
		response["diskUsed"] = stats.DiskUsed
		response["diskTotal"] = stats.DiskTotal
		response["diskPercent"] = stats.DiskPercent
		response["networkBytesIn"] = stats.NetworkBytesIn
		response["networkBytesOut"] = stats.NetworkBytesOut
	}

	return c.JSON(response)
}

// SendRcon sends an RCON command to the server instance
func (h *ApiHandlers) SendRcon(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "ID required"})
	}

	var req struct {
		Command string `json:"command"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	resp, err := h.Manager.SendRconCommand(id, req.Command)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"response": resp,
	})
}
