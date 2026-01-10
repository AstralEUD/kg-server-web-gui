package api

import (
	"os"
	"path/filepath"
	"time"

	"github.com/astral/kg-server-web-gui/internal/agent"
	"github.com/astral/kg-server-web-gui/internal/api/handlers"
	"github.com/astral/kg-server-web-gui/internal/auth"
	"github.com/astral/kg-server-web-gui/internal/config"
	"github.com/astral/kg-server-web-gui/internal/logs"
	"github.com/astral/kg-server-web-gui/internal/preset"
	"github.com/astral/kg-server-web-gui/internal/profile"
	"github.com/astral/kg-server-web-gui/internal/saves"
	"github.com/astral/kg-server-web-gui/internal/server"
	"github.com/astral/kg-server-web-gui/internal/settings"
	"github.com/astral/kg-server-web-gui/internal/steamcmd"
	"github.com/astral/kg-server-web-gui/internal/workshop"
	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App) {
	// Get working directory for absolute paths
	workDir, _ := os.Getwd()
	dataPath := filepath.Join(workDir, "data")
	savesPath := filepath.Join(workDir, "saves")
	backupsPath := filepath.Join(workDir, "backups")
	serverPath := filepath.Join(workDir, "server")

	// Initialize managers
	userManager := auth.NewUserManager(dataPath)
	sessionManager := auth.NewSessionManager(dataPath)
	settingsMgr := settings.NewSettingsManager(dataPath)
	instanceMgr := server.NewInstanceManager(dataPath)
	proc := agent.NewProcessMonitor("ArmaReforgerServer.exe")
	cfg := config.NewConfigManager()
	pm := profile.NewProfileManager(dataPath)
	sm := saves.NewSaveManager(savesPath, backupsPath)
	steamcmdMgr := steamcmd.NewManager(workDir, serverPath)
	presetMgr := preset.NewPresetManager(dataPath)
	collectionMgr := workshop.NewCollectionManager(dataPath)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userManager, sessionManager)

	baseHandlers := handlers.NewApiHandlers(proc, cfg)
	profileHandler := handlers.NewProfileHandler(pm)
	savesHandler := handlers.NewSavesHandler(sm)
	collectionHandler := handlers.NewCollectionHandler(collectionMgr)

	api := app.Group("/api")

	// Public routes (no auth required)
	api.Post("/auth/login", authHandler.Login)
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// Apply auth middleware to all other API routes
	api.Use(auth.AuthMiddleware(sessionManager))

	// Auth routes
	api.Post("/auth/logout", authHandler.Logout)
	api.Get("/auth/me", authHandler.Me)
	api.Post("/auth/password", authHandler.ChangePassword)

	// Admin-only user management
	adminApi := api.Group("/admin", auth.AdminMiddleware())
	adminApi.Get("/users", authHandler.ListUsers)
	adminApi.Post("/users", authHandler.CreateUser)
	adminApi.Delete("/users/:id", authHandler.DeleteUser)

	// Settings API
	api.Get("/settings", func(c *fiber.Ctx) error {
		return c.JSON(settingsMgr.Get())
	})
	api.Post("/settings", func(c *fiber.Ctx) error {
		var s settings.AppSettings
		if err := c.BodyParser(&s); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		if err := settingsMgr.Update(&s); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "saved"})
	})

	// Server Instances API (multi-server)
	api.Get("/servers", func(c *fiber.Ctx) error {
		return c.JSON(instanceMgr.List())
	})
	api.Get("/servers/:id", func(c *fiber.Ctx) error {
		inst := instanceMgr.Get(c.Params("id"))
		if inst == nil {
			return c.Status(404).JSON(fiber.Map{"error": "서버를 찾을 수 없습니다"})
		}
		return c.JSON(inst)
	})
	api.Post("/servers", func(c *fiber.Ctx) error {
		var inst server.ServerInstance
		if err := c.BodyParser(&inst); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		if err := instanceMgr.Create(&inst); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(201).JSON(inst)
	})
	api.Put("/servers/:id", func(c *fiber.Ctx) error {
		var updates server.ServerInstance
		if err := c.BodyParser(&updates); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		if err := instanceMgr.Update(c.Params("id"), &updates); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "updated"})
	})
	api.Delete("/servers/:id", func(c *fiber.Ctx) error {
		if err := instanceMgr.Delete(c.Params("id")); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "deleted"})
	})
	api.Post("/servers/:id/start", func(c *fiber.Ctx) error {
		var req struct {
			Args []string `json:"args"`
		}
		c.BodyParser(&req)
		if err := instanceMgr.Start(c.Params("id"), req.Args); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "started"})
	})
	api.Post("/servers/:id/stop", func(c *fiber.Ctx) error {
		if err := instanceMgr.Stop(c.Params("id")); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "stopped"})
	})

	// Legacy Status & Server Control (for backward compatibility)
	api.Get("/status", baseHandlers.GetStatus)
	api.Post("/server/start", func(c *fiber.Ctx) error {
		// Use default server instance
		var req struct {
			Args []string `json:"args"`
		}
		c.BodyParser(&req)
		logs.GlobalLogs.Info("서버 시작 요청")

		// Force config argument if not present
		hasConfig := false
		for _, arg := range req.Args {
			if arg == "-config" {
				hasConfig = true
				break
			}
		}
		if !hasConfig {
			configPath, _ := filepath.Abs("server.json")
			req.Args = append(req.Args, "-config", configPath)
			// Also add other default args if needed: -profile, -addonDownloadDir
			// profilePath, _ := filepath.Abs("StartProfile")
			// req.Args = append(req.Args, "-profile", profilePath)
		}

		if err := instanceMgr.Start("default", req.Args); err != nil {
			logs.GlobalLogs.Error("서버 시작 실패: " + err.Error())
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "started"})
	})
	api.Post("/server/stop", func(c *fiber.Ctx) error {
		logs.GlobalLogs.Info("서버 중지 요청")
		if err := instanceMgr.Stop("default"); err != nil {
			logs.GlobalLogs.Error("서버 중지 실패: " + err.Error())
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "stopped"})
	})
	api.Post("/server/restart", func(c *fiber.Ctx) error {
		logs.GlobalLogs.Info("서버 재시작 요청")
		instanceMgr.Stop("default")
		return c.JSON(fiber.Map{"status": "restarting"})
	})

	// Config
	api.Get("/config", baseHandlers.GetConfig)
	api.Post("/config", baseHandlers.SaveConfig)

	// Mods
	api.Get("/mods", baseHandlers.ListInstalledMods)
	api.Get("/workshop/search", baseHandlers.SearchWorkshop)
	api.Get("/workshop/search", baseHandlers.SearchWorkshop)
	api.Get("/workshop/:id", baseHandlers.GetWorkshopInfo)

	// Collections
	api.Get("/collections", collectionHandler.ListCollections)
	api.Post("/collections", collectionHandler.SaveCollection)
	api.Delete("/collections/:id", collectionHandler.DeleteCollection)

	// Scenarios
	api.Get("/scenarios", baseHandlers.ListScenarios)

	// Profiles
	api.Get("/profiles", profileHandler.List)
	api.Get("/profiles/active", profileHandler.GetActive)
	api.Get("/profiles/:id", profileHandler.Get)
	api.Post("/profiles", profileHandler.Create)
	api.Delete("/profiles/:id", profileHandler.Delete)
	api.Post("/profiles/:id/activate", profileHandler.SetActive)

	// Saves
	api.Get("/saves", savesHandler.ListSaves)
	api.Get("/saves/backups", savesHandler.ListBackups)
	api.Post("/saves/backup", savesHandler.CreateBackup)
	api.Post("/saves/restore", savesHandler.RestoreBackup)
	api.Delete("/saves/:name", savesHandler.DeleteSave)

	// SteamCMD
	api.Post("/steamcmd/download", func(c *fiber.Ctx) error {
		var req struct {
			Experimental bool   `json:"experimental"`
			ServerID     string `json:"serverId"`
		}
		c.BodyParser(&req)

		go steamcmdMgr.DownloadServer(req.Experimental)
		return c.JSON(fiber.Map{"status": "다운로드 시작됨"})
	})
	api.Get("/steamcmd/status", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"running":           steamcmdMgr.IsRunning(),
			"serverInstalled":   steamcmdMgr.CheckInstalled(),
			"steamcmdInstalled": steamcmdMgr.SteamCMDInstalled(),
		})
	})

	// Presets
	api.Get("/presets", func(c *fiber.Ctx) error {
		return c.JSON(presetMgr.List())
	})
	api.Get("/presets/:id", func(c *fiber.Ctx) error {
		p := presetMgr.Get(c.Params("id"))
		if p == nil {
			return c.Status(404).JSON(fiber.Map{"error": "프리셋을 찾을 수 없습니다"})
		}
		return c.JSON(p)
	})
	api.Post("/presets", func(c *fiber.Ctx) error {
		var p preset.Preset
		if err := c.BodyParser(&p); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		if err := presetMgr.Create(&p); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(201).JSON(p)
	})
	api.Put("/presets/:id", func(c *fiber.Ctx) error {
		var p preset.Preset
		if err := c.BodyParser(&p); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		if err := presetMgr.Update(c.Params("id"), &p); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(p)
	})
	api.Delete("/presets/:id", func(c *fiber.Ctx) error {
		if err := presetMgr.Delete(c.Params("id")); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "삭제됨"})
	})
	api.Post("/presets/:id/apply", func(c *fiber.Ctx) error {
		p := presetMgr.Get(c.Params("id"))
		if p == nil {
			return c.Status(404).JSON(fiber.Map{"error": "프리셋을 찾을 수 없습니다"})
		}
		// Apply preset config - convert to map[string]interface{}
		configPath := filepath.Join(workDir, "server.json")
		if err := cfg.WriteConfig(configPath, p.Config); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		logs.GlobalLogs.Info("프리셋 적용됨: " + p.Name)
		return c.JSON(fiber.Map{"status": "적용됨"})
	})

	// Logs
	api.Get("/logs", func(c *fiber.Ctx) error {
		sinceStr := c.Query("since")
		if sinceStr != "" {
			since, err := time.Parse(time.RFC3339, sinceStr)
			if err == nil {
				return c.JSON(logs.GlobalLogs.GetSince(since))
			}
		}
		return c.JSON(logs.GlobalLogs.GetAll())
	})
	api.Delete("/logs", func(c *fiber.Ctx) error {
		logs.GlobalLogs.Clear()
		return c.JSON(fiber.Map{"status": "cleared"})
	})
}
