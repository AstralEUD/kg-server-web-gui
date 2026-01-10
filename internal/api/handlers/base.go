package handlers

import (
	"github.com/astral/kg-server-web-gui/internal/agent"
	"github.com/astral/kg-server-web-gui/internal/config"
)

type ApiHandlers struct {
	Process *agent.ProcessMonitor
	Config  *config.ConfigManager
	// We can add SQLite DB here later
}

func NewApiHandlers(proc *agent.ProcessMonitor, cfg *config.ConfigManager) *ApiHandlers {
	return &ApiHandlers{
		Process: proc,
		Config:  cfg,
	}
}
