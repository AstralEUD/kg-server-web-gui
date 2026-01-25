package server

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/astral/kg-server-web-gui/internal/config"
	"github.com/multiplay/go-battleye"
)

func (im *InstanceManager) SendRconCommand(id string, command string) (string, error) {
	var configPath string

	im.mu.RLock()
	inst, exists := im.instances[id]
	if exists {
		configPath = inst.ConfigPath
	}
	im.mu.RUnlock()

	if !exists {
		return "", fmt.Errorf("instance not found: %s", id)
	}

	if configPath == "" {
		if id == "default" && im.settingsMgr != nil {
			s := im.settingsMgr.Get()
			if s.ServerPath != "" {
				configPath = filepath.Join(s.ServerPath, "server.json")
			}
		}
	}

	if configPath == "" {
		return "", fmt.Errorf("configuration file not specified for instance")
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		return "", fmt.Errorf("failed to read config file (%s): %w", configPath, err)
	}

	var cfg config.ServerConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return "", fmt.Errorf("failed to parse config file: %w", err)
	}

	// BattlEye RCON uses different config fields usually?
	// But our schema maps rcon settings to RconConfig.
	// We should use the new RconConfig struct if available, or fallback to Game.Rcon*

	// Try new RCON struct first
	var rconHost, rconPass string
	var rconPort int

	if cfg.Rcon != nil {
		rconHost = cfg.Rcon.Address
		rconPort = cfg.Rcon.Port
		rconPass = cfg.Rcon.Password
	}

	if rconHost == "" {
		rconHost = "127.0.0.1"
	}

	// Fallback to legacy location if new one is empty
	if rconPort == 0 && cfg.Game.RconPort != 0 {
		rconPort = cfg.Game.RconPort
		rconPass = cfg.Game.RconPassword
	}

	if rconPass == "" {
		return "", fmt.Errorf("RCON password not set in config")
	}
	if rconPort == 0 {
		return "", fmt.Errorf("RCON port not set in config")
	}

	address := fmt.Sprintf("%s:%d", rconHost, rconPort)

	// BattlEye RCON Connection
	c, err := battleye.NewClient(address, rconPass)
	if err != nil {
		return "", fmt.Errorf("failed to connect to BattlEye RCON: %w", err)
	}
	defer c.Close()

	resp, err := c.Exec(command)
	if err != nil {
		return "", fmt.Errorf("failed to execute command: %w", err)
	}

	return resp, nil
}

type ServerMetrics struct {
	FPS         float64  `json:"fps"`
	PlayerCount int      `json:"playerCount"`
	Players     []string `json:"players"`
}

type Player struct {
	Index  int    `json:"index"`
	Name   string `json:"name"`
	IP     string `json:"ip"`
	UID    string `json:"uid"`
	BEGUID string `json:"beguid"`
}

var playersRegex = regexp.MustCompile(`^(\d+)\s+(.*?)\s+([0-9\.:]+)\s+(\d+)\s+([A-Za-z0-9]+)$`)

func (im *InstanceManager) GetPlayers(id string) ([]Player, error) {
	resp, err := im.SendRconCommand(id, "players")
	if err != nil {
		return nil, err
	}

	var players []Player
	lines := strings.Split(resp, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "Index") || strings.HasPrefix(line, "---") {
			continue
		}

		// Simple space split might fail if name has spaces. Use Regex or handle carefully.
		// Arma Reforger output format might be:
		// Index   Name            IP              UID               BEGUID
		// 0       User Name       127.0.0.1:0     123456789         BE123...
		// Let's assume standard whitespace separation for now, but name is tricky.
		// Using fields is risky if name has spaces. But usually Index is first.

		// Attempt to assume last 3 fields are IP, UID, BEGUID.
		// Rest in middle is Name. First is Index.
		fields := strings.Fields(line)
		if len(fields) < 5 {
			continue
		}

		idx, _ := strconv.Atoi(fields[0])
		beguid := fields[len(fields)-1]
		uid := fields[len(fields)-2]
		ip := fields[len(fields)-3]

		// Name is everything between index and IP
		// Reconstruct name from fields[1 : len-3]
		nameParts := fields[1 : len(fields)-3]
		name := strings.Join(nameParts, " ")

		players = append(players, Player{
			Index:  idx,
			Name:   name,
			IP:     ip,
			UID:    uid,
			BEGUID: beguid,
		})
	}

	return players, nil
}

func (im *InstanceManager) KickPlayer(id string, playerIndex int, reason string) error {
	cmd := fmt.Sprintf("kick %d %s", playerIndex, reason)
	_, err := im.SendRconCommand(id, cmd)
	return err
}

func (im *InstanceManager) BanPlayer(id string, input string, reason string) error {
	// input can be index, name, or uid? Usually BEGUID or Index for ban
	// Reforger console: ban <player> [reason] [duration]
	cmd := fmt.Sprintf("ban %s %s", input, reason)
	_, err := im.SendRconCommand(id, cmd)
	return err
}

func (im *InstanceManager) GetServerMetrics(id string) (*ServerMetrics, error) {
	// Get players using the new helper
	players, err := im.GetPlayers(id)
	if err != nil {
		// Log error but continue with empty players?
		// For metrics, we might want to fail or return partial
		players = []Player{}
	}

	// Parsing FPS from 'status'
	// Output: "Load: 10%  FPS: 59.9  Players: 5/64" (Example)
	fps := 0.0
	statusResp, err := im.SendRconCommand(id, "status")
	if err == nil {
		// Parse FPS
		// Simple regex for FPS: [\d\.]+
		// Need robust parsing based on actual output
		// Let's assume it contains "FPS: X"
		if strings.Contains(statusResp, "FPS:") {
			parts := strings.Split(statusResp, "FPS:")
			if len(parts) > 1 {
				fmt.Sscanf(parts[1], "%f", &fps)
			}
		}
	}

	playerNames := make([]string, len(players))
	for i, p := range players {
		playerNames[i] = p.Name
	}

	metrics := &ServerMetrics{
		FPS:         fps,
		PlayerCount: len(players),
		Players:     playerNames,
	}

	return metrics, nil
}
