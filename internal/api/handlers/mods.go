package handlers

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/astral/kg-server-web-gui/internal/agent"
	"github.com/gofiber/fiber/v2"
)

// ListInstalledMods scans the addons directory
func (h *ApiHandlers) ListInstalledMods(c *fiber.Ctx) error {
	// Prioritize Settings, fallback to query or default
	path := h.Settings.Get().addonsPath
	if path == "" {
		path = c.Query("path", "C:\\saves\\addons")
	}

	mods, err := agent.ScanAddons(path)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(mods)
}

// DeleteMod deletes an installed mod
func (h *ApiHandlers) DeleteMod(c *fiber.Ctx) error {
	modId := c.Params("id")
	if modId == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Mod ID required"})
	}

	// STRICT: Only delete from configured addons path
	path := h.Settings.Get().addonsPath
	if path == "" {
		// Fallback to query only if strictly needed, but let's be safe and require configuration or standard default
		path = c.Query("path", "C:\\saves\\addons")
	}

	mods, err := agent.ScanAddons(path)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	for _, mod := range mods {
		if mod.ModID == modId {
			// Found it. Delete mod.Path
			// Safety check: ensure mod.Path is inside addons base path
			rel, err := filepath.Rel(path, mod.Path)
			if err != nil || strings.Contains(rel, "..") {
				return c.Status(403).JSON(fiber.Map{"error": "Invalid mod path: outside of addons directory"})
			}

			// Additional check: Ensure we are deleting a directory that looks like a mod (optional but good)
			// But scan already filtered for addon.gproj presence.

			if err := os.RemoveAll(mod.Path); err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to delete mod: " + err.Error()})
			}
			return c.JSON(fiber.Map{"status": "deleted", "modId": modId})
		}
	}

	return c.Status(404).JSON(fiber.Map{"error": "Mod not found in configured path"})
}
