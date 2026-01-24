package handlers

import (
	"github.com/astral/kg-server-web-gui/internal/mapchange"
	"github.com/gofiber/fiber/v2"
)

// MapHandler handles map-related API endpoints
type MapHandler struct {
	mapService *mapchange.MapChangeService
}

// NewMapHandler creates a new map handler
func NewMapHandler(mapService *mapchange.MapChangeService) *MapHandler {
	return &MapHandler{
		mapService: mapService,
	}
}

// ListMappings returns all map slot mappings
func (h *MapHandler) ListMappings(c *fiber.Ctx) error {
	return c.JSON(h.mapService.ListMaps())
}

// AddMapping adds or updates a map mapping
func (h *MapHandler) AddMapping(c *fiber.Ctx) error {
	var mapping mapchange.MapMapping
	if err := c.BodyParser(&mapping); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	if mapping.Slot <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "슬롯 번호는 1 이상이어야 합니다"})
	}
	if mapping.ScenarioID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "시나리오 ID는 필수입니다"})
	}
	if mapping.Name == "" {
		mapping.Name = "Map " + string(rune('0'+mapping.Slot))
	}

	if err := h.mapService.GetMappingManager().Add(mapping); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(mapping)
}

// RemoveMapping removes a map mapping by slot
func (h *MapHandler) RemoveMapping(c *fiber.Ctx) error {
	slot, err := c.ParamsInt("slot")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "유효하지 않은 슬롯 번호"})
	}

	if err := h.mapService.GetMappingManager().Remove(slot); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "삭제됨"})
}

// ApplyMap applies a map by slot number (changes scenarioId and restarts server)
func (h *MapHandler) ApplyMap(c *fiber.Ctx) error {
	slot, err := c.ParamsInt("slot")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "유효하지 않은 슬롯 번호"})
	}

	// Get requester from session if available
	requester := "Web UI"
	if user := c.Locals("user"); user != nil {
		if u, ok := user.(map[string]interface{}); ok {
			if username, ok := u["username"].(string); ok {
				requester = username
			}
		}
	}

	// Get instance ID from query or default
	instanceID := c.Query("instance", "default")

	if err := h.mapService.ChangeMapBySlot(instanceID, slot, requester); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	mapping := h.mapService.GetMappingManager().Get(slot)
	return c.JSON(fiber.Map{
		"status":  "맵 변경됨",
		"slot":    slot,
		"name":    mapping.Name,
		"message": "서버가 재시작됩니다",
	})
}

// GetCurrentMap returns the current map for a server instance
func (h *MapHandler) GetCurrentMap(c *fiber.Ctx) error {
	instanceID := c.Params("id", "default")

	mapping, scenarioID, err := h.mapService.GetCurrentMap(instanceID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	result := fiber.Map{
		"scenarioId": scenarioID,
	}

	if mapping != nil {
		result["slot"] = mapping.Slot
		result["name"] = mapping.Name
	}

	return c.JSON(result)
}

// ApplyMapByScenario applies a map by direct scenario ID
func (h *MapHandler) ApplyMapByScenario(c *fiber.Ctx) error {
	var req struct {
		ScenarioID string `json:"scenarioId"`
		Name       string `json:"name"`
		InstanceID string `json:"instanceId"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	if req.ScenarioID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "시나리오 ID는 필수입니다"})
	}
	if req.Name == "" {
		req.Name = "Custom Map"
	}
	if req.InstanceID == "" {
		req.InstanceID = "default"
	}

	requester := "Web UI"
	if user := c.Locals("user"); user != nil {
		if u, ok := user.(map[string]interface{}); ok {
			if username, ok := u["username"].(string); ok {
				requester = username
			}
		}
	}

	if err := h.mapService.ChangeMap(req.InstanceID, req.ScenarioID, req.Name, requester); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status":     "맵 변경됨",
		"scenarioId": req.ScenarioID,
		"message":    "서버가 재시작됩니다",
	})
}
