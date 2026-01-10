package handlers

import "github.com/gofiber/fiber/v2"

// GetConfig reads server.json
func (h *ApiHandlers) GetConfig(c *fiber.Ctx) error {
	path := c.Query("path", "server.json") // Security risk? For local tool, acceptable.

	data, err := h.Config.ReadConfig(path)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(data)
}

// SaveConfig writes server.json
func (h *ApiHandlers) SaveConfig(c *fiber.Ctx) error {
	path := c.Query("path", "server.json")

	var data map[string]interface{}
	if err := c.BodyParser(&data); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.Config.WriteConfig(path, data); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "saved"})
}
