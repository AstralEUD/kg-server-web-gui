package handlers

import (
	"github.com/astral/kg-server-web-gui/internal/workshop"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type CollectionHandler struct {
	Manager *workshop.CollectionManager
}

func NewCollectionHandler(mgr *workshop.CollectionManager) *CollectionHandler {
	return &CollectionHandler{Manager: mgr}
}

// ListCollections returns all saved collections
func (h *CollectionHandler) ListCollections(c *fiber.Ctx) error {
	cols, err := h.Manager.GetCollections()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(cols)
}

// SaveCollection creates or updates a collection
func (h *CollectionHandler) SaveCollection(c *fiber.Ctx) error {
	var col workshop.Collection
	if err := c.BodyParser(&col); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	if col.ID == "" {
		col.ID = uuid.New().String()
	}

	if err := h.Manager.SaveCollection(col); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(col)
}

// DeleteCollection removes a collection
func (h *CollectionHandler) DeleteCollection(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "ID required"})
	}

	if err := h.Manager.DeleteCollection(id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "deleted"})
}
