package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
)

// GetPlayers returns the list of players for a server instance
func (h *ApiHandlers) GetPlayers(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		id = "default"
	}

	players, err := h.Manager.GetPlayers(id)
	if err != nil {
		// Log error but might return empty list if RCON is not ready
		// But error 500 is safer to indicate failure
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(players)
}

// KickPlayer kicks a player from the server
func (h *ApiHandlers) KickPlayer(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Server ID required"})
	}

	var req struct {
		Index  int    `json:"index"`
		Reason string `json:"reason"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Reason == "" {
		req.Reason = "Kicked by admin"
	}

	if err := h.Manager.KickPlayer(id, req.Index, req.Reason); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Failed to kick: %v", err)})
	}

	return c.JSON(fiber.Map{"status": "kicked", "index": req.Index})
}

// BanPlayer bans a player from the server
func (h *ApiHandlers) BanPlayer(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Server ID required"})
	}

	var req struct {
		Identifier string `json:"identifier"` // Index, Name, or UID
		Reason     string `json:"reason"`
		Duration   string `json:"duration,omitempty"` // Not used yet by backend method, but might be useful
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Identifier == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Identifier required (index, name, or uid)"})
	}
	if req.Reason == "" {
		req.Reason = "Banned by admin"
	}

	if err := h.Manager.BanPlayer(id, req.Identifier, req.Reason); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Failed to ban: %v", err)})
	}

	return c.JSON(fiber.Map{"status": "banned", "identifier": req.Identifier})
}
