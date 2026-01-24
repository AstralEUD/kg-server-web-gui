package rcon

import (
	"fmt"
	"time"

	"github.com/astral/kg-server-web-gui/internal/agent"
	"github.com/astral/kg-server-web-gui/internal/logs"
	"github.com/astral/kg-server-web-gui/internal/server"
)

type PlayerMonitor struct {
	instanceMgr *server.InstanceManager
	discord     *agent.DiscordClient
	// instanceID -> BEGUID -> PlayerName
	lastPlayers map[string]map[string]string
	stopChan    chan struct{}
}

func NewPlayerMonitor(im *server.InstanceManager, discord *agent.DiscordClient) *PlayerMonitor {
	return &PlayerMonitor{
		instanceMgr: im,
		discord:     discord,
		lastPlayers: make(map[string]map[string]string),
		stopChan:    make(chan struct{}),
	}
}

func (pm *PlayerMonitor) Start() {
	go pm.loop()
}

func (pm *PlayerMonitor) Stop() {
	close(pm.stopChan)
}

func (pm *PlayerMonitor) loop() {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	logs.GlobalLogs.Info("Player Monitor Loop Started")

	for {
		select {
		case <-pm.stopChan:
			return
		case <-ticker.C:
			pm.checkPlayers()
		}
	}
}

func (pm *PlayerMonitor) checkPlayers() {
	instances := pm.instanceMgr.List()

	for _, inst := range instances {
		if inst.Status != "running" {
			// If server stopped, clear cache
			if _, ok := pm.lastPlayers[inst.ID]; ok {
				delete(pm.lastPlayers, inst.ID)
			}
			continue
		}

		currentPlayers, err := pm.instanceMgr.GetPlayers(inst.ID)
		if err != nil {
			// RCON might fail temporarily, skip this tick
			continue
		}

		// Initialize cache if needed
		if _, ok := pm.lastPlayers[inst.ID]; !ok {
			pm.lastPlayers[inst.ID] = make(map[string]string)
			// Initial population (don't notify on first run to avoid spam)
			for _, p := range currentPlayers {
				pm.lastPlayers[inst.ID][p.BEGUID] = p.Name
			}
			continue
		}

		lastSnapshot := pm.lastPlayers[inst.ID]
		currentSnapshot := make(map[string]string)

		// Detect Joins
		for _, p := range currentPlayers {
			currentSnapshot[p.BEGUID] = p.Name
			if _, exists := lastSnapshot[p.BEGUID]; !exists {
				// Player Joined
				pm.discord.SendMessage("➕ 플레이어 입장", fmt.Sprintf("**%s** 님이 서버(%s)에 접속했습니다.", p.Name, inst.Name), agent.ColorGreen)
				logs.GlobalLogs.Info(fmt.Sprintf("[%s] Player Joined: %s", inst.ID, p.Name))
			}
		}

		// Detect Leaves
		for beguid, name := range lastSnapshot {
			if _, exists := currentSnapshot[beguid]; !exists {
				// Player Left
				pm.discord.SendMessage("➖ 플레이어 퇴장", fmt.Sprintf("**%s** 님이 서버(%s)에서 나갔습니다.", name, inst.Name), agent.ColorRed)
				logs.GlobalLogs.Info(fmt.Sprintf("[%s] Player Left: %s", inst.ID, name))
			}
		}

		// Update cache
		pm.lastPlayers[inst.ID] = currentSnapshot
	}
}
