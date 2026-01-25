package handlers

import (
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/astral/kg-server-web-gui/internal/agent"
	"github.com/astral/kg-server-web-gui/internal/api/response"
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
		return c.JSON(response.Error("Instance monitor not found"))
	}

	running, pid, err := proc.IsRunning()
	if err != nil {
		return c.Status(500).JSON(response.Error(err.Error()))
	}
	return c.JSON(response.Success(fiber.Map{
		"running": running,
		"pid":     pid,
	}))
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
	resMap := fiber.Map{
		"history":  history,
		"health":   health,
		"watchdog": h.Watchdog.IsEnabled(),
	}

	// Flatten SystemStats into response for backward compatibility
	if stats != nil {
		resMap["cpuPercent"] = stats.CPUPercent
		resMap["memoryUsed"] = stats.MemoryUsed
		resMap["memoryTotal"] = stats.MemoryTotal
		resMap["memoryPercent"] = stats.MemoryPercent
		resMap["diskUsed"] = stats.DiskUsed
		resMap["diskTotal"] = stats.DiskTotal
		resMap["diskPercent"] = stats.DiskPercent
		resMap["networkBytesIn"] = stats.NetworkBytesIn
		resMap["networkBytesOut"] = stats.NetworkBytesOut
	}

	return c.JSON(response.Success(resMap))
}

// SendRcon sends an RCON command to the server instance
func (h *ApiHandlers) SendRcon(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(response.Error("ID required"))
	}

	var req struct {
		Command string `json:"command"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(response.Error("Invalid request body"))
	}

	resp, err := h.Manager.SendRconCommand(id, req.Command)
	if err != nil {
		return c.Status(500).JSON(response.Error(err.Error()))
	}

	h.recordCommand(req.Command)

	return c.JSON(response.Success(fiber.Map{
		"response": resp,
	}))
}

// GetCrashes returns the list of detected crash events
func (h *ApiHandlers) GetCrashes(c *fiber.Ctx) error {
	return c.JSON(response.Success(h.Watchdog.GetCrashes()))
}

// GetCommandHistory returns the recent RCON command history
func (h *ApiHandlers) GetCommandHistory(c *fiber.Ctx) error {
	path := filepath.Join(h.Manager.GetDataPath(), "command_history.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return c.JSON(response.Success([]string{}))
	}
	var history []string
	json.Unmarshal(data, &history)
	return c.JSON(response.Success(history))
}

func (h *ApiHandlers) recordCommand(cmd string) {
	path := filepath.Join(h.Manager.GetDataPath(), "command_history.json")
	var history []string
	if data, err := os.ReadFile(path); err == nil {
		json.Unmarshal(data, &history)
	}

	// Add to front, limit to 100
	history = append([]string{cmd}, history...)
	if len(history) > 100 {
		history = history[:100]
	}

	data, _ := json.MarshalIndent(history, "", "  ")
	os.WriteFile(path, data, 0644)
}
