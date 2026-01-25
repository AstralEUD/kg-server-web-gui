package handlers

import (
	"github.com/astral/kg-server-web-gui/internal/api/response"
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
	return c.JSON(response.Success(h.manager.List()))
}

func (h *ProfileHandler) Get(c *fiber.Ctx) error {
	id := c.Params("id")
	p := h.manager.Get(id)
	if p == nil {
		return c.Status(404).JSON(response.Error("profile not found"))
	}
	return c.JSON(response.Success(p))
}

func (h *ProfileHandler) Create(c *fiber.Ctx) error {
	var p profile.Profile
	if err := c.BodyParser(&p); err != nil {
		return c.Status(400).JSON(response.Error(err.Error()))
	}

	if err := h.manager.Create(&p); err != nil {
		return c.Status(500).JSON(response.Error(err.Error()))
	}

	return c.Status(201).JSON(response.Success(p))
}

func (h *ProfileHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.manager.Delete(id); err != nil {
		return c.Status(500).JSON(response.Error(err.Error()))
	}
	return c.JSON(response.Success(fiber.Map{"status": "deleted"}))
}

func (h *ProfileHandler) SetActive(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.manager.SetActive(id); err != nil {
		return c.Status(500).JSON(response.Error(err.Error()))
	}
	return c.JSON(response.Success(fiber.Map{"status": "activated"}))
}

func (h *ProfileHandler) GetActive(c *fiber.Ctx) error {
	p := h.manager.GetActive()
	if p == nil {
		return c.Status(404).JSON(response.Error("no active profile"))
	}
	return c.JSON(response.Success(p))
}
