package handlers

import (
	"github.com/astral/kg-server-web-gui/internal/agent"
	"github.com/astral/kg-server-web-gui/internal/config"
	"github.com/astral/kg-server-web-gui/internal/settings"
)

type ApiHandlers struct {
	Process  *agent.ProcessMonitor
	Config   *config.ConfigManager
	Settings *settings.SettingsManager
}

func NewApiHandlers(proc *agent.ProcessMonitor, cfg *config.ConfigManager, settings *settings.SettingsManager) *ApiHandlers {
	return &ApiHandlers{
		Process:  proc,
		Config:   cfg,
		Settings: settings,
	}
}
