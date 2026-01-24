package rcon

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/astral/kg-server-web-gui/internal/logs"
	"github.com/astral/kg-server-web-gui/internal/mapchange"
	"github.com/astral/kg-server-web-gui/internal/server"
)

// ChatMonitor monitors in-game chat for commands via RCON
type ChatMonitor struct {
	instanceMgr  *server.InstanceManager
	mapService   *mapchange.MapChangeService
	instanceID   string
	pollInterval time.Duration
	running      bool
	stopChan     chan struct{}
	mu           sync.RWMutex

	// Track last message to avoid duplicates
	lastMessageTime time.Time
}

// NewChatMonitor creates a new chat monitor
func NewChatMonitor(im *server.InstanceManager, ms *mapchange.MapChangeService) *ChatMonitor {
	return &ChatMonitor{
		instanceMgr:  im,
		mapService:   ms,
		instanceID:   "default",
		pollInterval: 5 * time.Second, // Poll every 5 seconds
		stopChan:     make(chan struct{}),
	}
}

// Start starts the chat monitoring loop
func (m *ChatMonitor) Start() {
	m.mu.Lock()
	if m.running {
		m.mu.Unlock()
		return
	}
	m.running = true
	m.stopChan = make(chan struct{})
	m.mu.Unlock()

	logs.GlobalLogs.Info("[RconMonitor] 채팅 모니터링 시작")

	go m.pollLoop()
}

// Stop stops the chat monitoring
func (m *ChatMonitor) Stop() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.running {
		return
	}

	m.running = false
	close(m.stopChan)
	logs.GlobalLogs.Info("[RconMonitor] 채팅 모니터링 중지")
}

// IsRunning returns whether the monitor is running
func (m *ChatMonitor) IsRunning() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.running
}

// SetInstanceID sets the server instance to monitor
func (m *ChatMonitor) SetInstanceID(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.instanceID = id
}

// pollLoop continuously polls for chat messages
func (m *ChatMonitor) pollLoop() {
	ticker := time.NewTicker(m.pollInterval)
	defer ticker.Stop()

	// First, enable console debug to get chat messages
	m.enableConsoleDebug()

	for {
		select {
		case <-m.stopChan:
			return
		case <-ticker.C:
			m.checkForCommands()
		}
	}
}

// enableConsoleDebug enables console output forwarding via RCON
func (m *ChatMonitor) enableConsoleDebug() {
	m.mu.RLock()
	instanceID := m.instanceID
	m.mu.RUnlock()

	// Try to enable console debug output
	// This forwards server console prints to the RCON client
	_, err := m.instanceMgr.SendRconCommand(instanceID, "#debugon Console")
	if err != nil {
		logs.GlobalLogs.Warn(fmt.Sprintf("[RconMonitor] Console 디버그 활성화 실패: %v", err))
	}
}

// checkForCommands checks for new chat commands
func (m *ChatMonitor) checkForCommands() {
	m.mu.RLock()
	instanceID := m.instanceID
	m.mu.RUnlock()

	// Get server status/console output
	// Note: This is a simplified approach. Real implementation might need
	// to keep a persistent RCON connection and read continuously.
	resp, err := m.instanceMgr.SendRconCommand(instanceID, "")
	if err != nil {
		// Server might be offline, ignore
		return
	}

	// Parse chat messages from response
	messages := m.parseChatMessages(resp)

	for _, msg := range messages {
		m.processMessage(msg)
	}
}

// ChatMessage represents a parsed chat message
type ChatMessage struct {
	PlayerName string
	Content    string
	Timestamp  time.Time
}

// parseChatMessages parses chat messages from RCON output
func (m *ChatMonitor) parseChatMessages(output string) []ChatMessage {
	var messages []ChatMessage

	// Chat message pattern varies by server configuration
	// Common formats:
	// [Global] PlayerName: message
	// PlayerName: message
	// etc.

	lines := strings.Split(output, "\n")
	chatPattern := regexp.MustCompile(`(?:\[.*?\]\s*)?(\w+):\s*(.+)`)

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		matches := chatPattern.FindStringSubmatch(line)
		if len(matches) >= 3 {
			playerName := matches[1]
			content := strings.TrimSpace(matches[2])

			// Only process command messages
			if strings.HasPrefix(content, "!") {
				messages = append(messages, ChatMessage{
					PlayerName: playerName,
					Content:    content,
					Timestamp:  time.Now(),
				})
			}
		}
	}

	return messages
}

// processMessage processes a chat command message
func (m *ChatMonitor) processMessage(msg ChatMessage) {
	content := strings.TrimSpace(msg.Content)
	if !strings.HasPrefix(content, "!") {
		return
	}

	parts := strings.Fields(content)
	if len(parts) == 0 {
		return
	}

	cmd := strings.ToLower(parts[0])
	args := parts[1:]

	m.mu.RLock()
	instanceID := m.instanceID
	m.mu.RUnlock()

	switch cmd {
	case "!map":
		m.handleMapCommand(instanceID, msg.PlayerName, args)
	case "!maps":
		m.handleMapsCommand(instanceID)
	case "!mapnow":
		m.handleCurrentMapCommand(instanceID)
	}
}

// handleMapCommand handles the in-game !map command
func (m *ChatMonitor) handleMapCommand(instanceID, playerName string, args []string) {
	if len(args) < 1 {
		m.sendGameMessage(instanceID, "사용법: !map <슬롯번호> (예: !map 1)")
		return
	}

	slot, err := strconv.Atoi(args[0])
	if err != nil {
		m.sendGameMessage(instanceID, "유효하지 않은 슬롯 번호입니다.")
		return
	}

	mapping := m.mapService.GetMappingManager().Get(slot)
	if mapping == nil {
		m.sendGameMessage(instanceID, fmt.Sprintf("슬롯 %d에 등록된 맵이 없습니다.", slot))
		return
	}

	m.sendGameMessage(instanceID, fmt.Sprintf("맵 변경 중: %s... 서버가 재시작됩니다!", mapping.Name))

	requester := fmt.Sprintf("게임내 (%s)", playerName)
	if err := m.mapService.ChangeMapBySlot(instanceID, slot, requester); err != nil {
		logs.GlobalLogs.Error(fmt.Sprintf("[RconMonitor] 맵 변경 실패: %v", err))
	}
}

// handleMapsCommand handles the in-game !maps command
func (m *ChatMonitor) handleMapsCommand(instanceID string) {
	maps := m.mapService.ListMaps()

	if len(maps) == 0 {
		m.sendGameMessage(instanceID, "등록된 맵이 없습니다.")
		return
	}

	var parts []string
	for _, mp := range maps {
		parts = append(parts, fmt.Sprintf("%d:%s", mp.Slot, mp.Name))
	}

	msg := "맵 목록: " + strings.Join(parts, ", ")
	m.sendGameMessage(instanceID, msg)
}

// handleCurrentMapCommand handles the in-game !mapnow command
func (m *ChatMonitor) handleCurrentMapCommand(instanceID string) {
	mapping, _, err := m.mapService.GetCurrentMap(instanceID)
	if err != nil {
		m.sendGameMessage(instanceID, "현재 맵 조회 실패")
		return
	}

	if mapping != nil {
		m.sendGameMessage(instanceID, fmt.Sprintf("현재 맵: %s (슬롯 %d)", mapping.Name, mapping.Slot))
	} else {
		m.sendGameMessage(instanceID, "현재 맵: 등록되지 않은 맵")
	}
}

// sendGameMessage sends a message to all players in-game via RCON
func (m *ChatMonitor) sendGameMessage(instanceID, message string) {
	// Use #say command to broadcast message
	cmd := fmt.Sprintf("#say [MapBot] %s", message)
	_, err := m.instanceMgr.SendRconCommand(instanceID, cmd)
	if err != nil {
		logs.GlobalLogs.Warn(fmt.Sprintf("[RconMonitor] 메시지 전송 실패: %v", err))
	}
}
