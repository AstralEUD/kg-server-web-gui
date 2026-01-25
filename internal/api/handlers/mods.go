package handlers

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/astral/kg-server-web-gui/internal/agent"
	"github.com/astral/kg-server-web-gui/internal/api/response"
	"github.com/gofiber/fiber/v2"
)

// ListInstalledMods scans the addons directory
func (h *ApiHandlers) ListInstalledMods(c *fiber.Ctx) error {
	// Prioritize Settings, fallback to query or default
	path := h.Settings.Get().AddonsPath
	if path == "" {
		path = "addons"
	}

	// Ensure absolute path
	absPath, err := filepath.Abs(path)
	if err == nil {
		path = absPath
	}

	mods, err := agent.ScanAddons(path)
	if err != nil {
		// Just log error and return empty if it's just "not found" to prevent UI freakout?
		// But ScanAddons returns error only on WalkDir failure.
		return c.Status(500).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(mods))
}

// DeleteMod deletes an installed mod
func (h *ApiHandlers) DeleteMod(c *fiber.Ctx) error {
	modId := c.Params("id")
	if modId == "" {
		return c.Status(400).JSON(response.Error("Mod ID required"))
	}

	// STRICT: Only delete from configured addons path
	path := h.Settings.Get().AddonsPath
	if path == "" {
		path = "addons"
	}

	mods, err := agent.ScanAddons(path)
	if err != nil {
		return c.Status(500).JSON(response.Error(err.Error()))
	}

	for _, mod := range mods {
		if mod.ModID == modId {
			// Found it. Delete mod.Path
			// Safety check: ensure mod.Path is inside addons base path
			rel, err := filepath.Rel(path, mod.Path)
			if err != nil || strings.Contains(rel, "..") {
				return c.Status(403).JSON(response.Error("Invalid mod path: outside of addons directory"))
			}

			// Additional check: Ensure we are deleting a directory that looks like a mod (optional but good)
			// But scan already filtered for addon.gproj presence.

			if err := os.RemoveAll(mod.Path); err != nil {
				return c.Status(500).JSON(response.Error("Failed to delete mod: " + err.Error()))
			}
			return c.JSON(response.Success(fiber.Map{"status": "deleted", "modId": modId}))
		}
	}

	return c.Status(404).JSON(response.Error("Mod not found in configured path"))
}
