package handlers

import (
	"github.com/astral/kg-server-web-gui/internal/api/response"
	"github.com/astral/kg-server-web-gui/internal/saves"
	"github.com/gofiber/fiber/v2"
)

type SavesHandler struct {
	manager *saves.SaveManager
}

func NewSavesHandler(sm *saves.SaveManager) *SavesHandler {
	return &SavesHandler{manager: sm}
}

func (h *SavesHandler) ListSaves(c *fiber.Ctx) error {
	list, err := h.manager.ListSaves()
	if err != nil {
		return c.Status(500).JSON(response.Error(err.Error()))
	}
	return c.JSON(response.Success(list))
}

func (h *SavesHandler) ListBackups(c *fiber.Ctx) error {
	list, err := h.manager.ListBackups()
	if err != nil {
		return c.Status(500).JSON(response.Error(err.Error()))
	}
	return c.JSON(response.Success(list))
}

func (h *SavesHandler) CreateBackup(c *fiber.Ctx) error {
	var req struct {
		SaveName string `json:"saveName"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(response.Error(err.Error()))
	}

	path, err := h.manager.CreateBackup(req.SaveName)
	if err != nil {
		return c.Status(500).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(fiber.Map{"backupPath": path}))
}

func (h *SavesHandler) RestoreBackup(c *fiber.Ctx) error {
	var req struct {
		BackupName string `json:"backupName"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(response.Error(err.Error()))
	}

	if err := h.manager.RestoreBackup(req.BackupName); err != nil {
		return c.Status(500).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(fiber.Map{"status": "restored"}))
}

func (h *SavesHandler) DeleteSave(c *fiber.Ctx) error {
	name := c.Params("name")
	isBackup := c.Query("backup") == "true"

	if err := h.manager.DeleteSave(name, isBackup); err != nil {
		return c.Status(500).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(fiber.Map{"status": "deleted"}))
}
