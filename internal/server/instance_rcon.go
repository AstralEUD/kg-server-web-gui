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
	"github.com/james4k/rcon"
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

	// configPath is already set safely above
	if configPath == "" {
		// Fallback for default instance
		if id == "default" && im.settingsMgr != nil {
			s := im.settingsMgr.Get()
			if s.ServerPath != "" {
				// Try common locations
				// Usually config is passed via -config
				// If we don't know the config, we can't find RCON password easily unless we parse the command line args?
				// But we store args in Watchdog, not here easily.
				// Let's assume ConfigPath MUST be set for RCON to work, or default to "server.json" in server root?
				configPath = filepath.Join(s.ServerPath, "server.json") // Reasonable default
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

	if cfg.Game.RconPassword == "" {
		return "", fmt.Errorf("RCON password not set in config")
	}
	if cfg.Game.RconPort == 0 {
		return "", fmt.Errorf("RCON port not set in config")
	}

	address := fmt.Sprintf("127.0.0.1:%d", cfg.Game.RconPort)
	client, err := rcon.Dial(address, cfg.Game.RconPassword)
	if err != nil {
		return "", fmt.Errorf("failed to connect to RCON: %w", err)
	}
	defer client.Close()

	reqID, err := client.Write(command)
	if err != nil {
		return "", fmt.Errorf("failed to send RCON command: %w", err)
	}

	resp, respID, err := client.Read()
	if err != nil {
		return "", fmt.Errorf("failed to read RCON response: %w", err)
	}

	if reqID != respID {
		return "", fmt.Errorf("RCON response ID mismatch: expected %d, got %d", reqID, respID)
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
