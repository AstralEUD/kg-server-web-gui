package handlers

import (
	"github.com/astral/kg-server-web-gui/internal/profile"
	"github.com/gofiber/fiber/v2"
)

type ProfileHandler struct {
	manager *profile.ProfileManager
}

func NewProfileHandler(pm *profile.ProfileManager) *ProfileHandler {
	return &ProfileHandler{manager: pm}
}

func (h *ProfileHandler) List(c *fiber.Ctx) error {
	return c.JSON(h.manager.List())
}

func (h *ProfileHandler) Get(c *fiber.Ctx) error {
	id := c.Params("id")
	p := h.manager.Get(id)
	if p == nil {
		return c.Status(404).JSON(fiber.Map{"error": "profile not found"})
	}
	return c.JSON(p)
}

func (h *ProfileHandler) Create(c *fiber.Ctx) error {
	var p profile.Profile
	if err := c.BodyParser(&p); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.manager.Create(&p); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(p)
}

func (h *ProfileHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.manager.Delete(id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "deleted"})
}

func (h *ProfileHandler) SetActive(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.manager.SetActive(id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "activated"})
}

func (h *ProfileHandler) GetActive(c *fiber.Ctx) error {
	p := h.manager.GetActive()
	if p == nil {
		return c.Status(404).JSON(fiber.Map{"error": "no active profile"})
	}
	return c.JSON(p)
}
