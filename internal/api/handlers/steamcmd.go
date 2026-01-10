package handlers

import (
	"os/exec"

	"github.com/gofiber/fiber/v2"
)

// SteamCMD handles SteamCMD operations
type SteamCMDHandler struct {
	SteamCMDPath string
	InstallDir   string
}

func NewSteamCMDHandler(steamcmdPath, installDir string) *SteamCMDHandler {
	return &SteamCMDHandler{
		SteamCMDPath: steamcmdPath,
		InstallDir:   installDir,
	}
}

// DownloadServer downloads the Arma Reforger server via SteamCMD
func (h *SteamCMDHandler) DownloadServer(c *fiber.Ctx) error {
	// App ID for Arma Reforger Dedicated Server
	const appID = "1874900"

	args := []string{
		"+force_install_dir", h.InstallDir,
		"+login", "anonymous",
		"+app_update", appID, "validate",
		"+quit",
	}

	cmd := exec.Command(h.SteamCMDPath, args...)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error":  err.Error(),
			"output": string(output),
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"output": string(output),
	})
}

// UpdateServer updates the server
func (h *SteamCMDHandler) UpdateServer(c *fiber.Ctx) error {
	return h.DownloadServer(c) // Same logic for update
}

// ValidateServer validates server files
func (h *SteamCMDHandler) ValidateServer(c *fiber.Ctx) error {
	return h.DownloadServer(c) // validate flag is included
}
