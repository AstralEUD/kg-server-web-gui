package discord

import (
	"fmt"
	"strconv"
	"strings"
	"sync"

	"github.com/astral/kg-server-web-gui/internal/logs"
	"github.com/astral/kg-server-web-gui/internal/mapchange"
	"github.com/astral/kg-server-web-gui/internal/server"
	"github.com/bwmarrin/discordgo"
)

// Bot represents a Discord bot for handling chat commands
type Bot struct {
	session     *discordgo.Session
	mapService  *mapchange.MapChangeService
	instanceMgr *server.InstanceManager
	channelID   string
	instanceID  string // Server instance to control (default: "default")
	running     bool
	mu          sync.RWMutex
}

// NewBot creates a new Discord bot
func NewBot(token, channelID string, mapService *mapchange.MapChangeService, instanceMgr *server.InstanceManager) (*Bot, error) {
	if token == "" {
		return nil, fmt.Errorf("Discord Bot 토큰이 설정되지 않았습니다")
	}

	session, err := discordgo.New("Bot " + token)
	if err != nil {
		return nil, fmt.Errorf("Discord 세션 생성 실패: %w", err)
	}

	bot := &Bot{
		session:     session,
		mapService:  mapService,
		instanceMgr: instanceMgr,
		channelID:   channelID,
		instanceID:  "default",
	}

	// Register message handler
	session.AddHandler(bot.handleMessage)

	// Set intents for reading messages
	session.Identify.Intents = discordgo.IntentsGuildMessages | discordgo.IntentsMessageContent

	return bot, nil
}

// Start starts the Discord bot
func (b *Bot) Start() error {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.running {
		return nil
	}

	if err := b.session.Open(); err != nil {
		return fmt.Errorf("Discord 연결 실패: %w", err)
	}

	b.running = true
	logs.GlobalLogs.Info("[DiscordBot] Bot 연결됨")
	return nil
}

// Stop stops the Discord bot
func (b *Bot) Stop() error {
	b.mu.Lock()
	defer b.mu.Unlock()

	if !b.running {
		return nil
	}

	b.running = false
	logs.GlobalLogs.Info("[DiscordBot] Bot 연결 종료")
	return b.session.Close()
}

// IsRunning returns whether the bot is running
func (b *Bot) IsRunning() bool {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.running
}

// SetInstanceID sets the server instance to control
func (b *Bot) SetInstanceID(id string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.instanceID = id
}

// handleMessage handles incoming Discord messages
func (b *Bot) handleMessage(s *discordgo.Session, m *discordgo.MessageCreate) {
	// Ignore messages from the bot itself
	if m.Author.ID == s.State.User.ID {
		return
	}

	// If channel ID is specified, only respond in that channel
	if b.channelID != "" && m.ChannelID != b.channelID {
		return
	}

	// Check for command prefix
	content := strings.TrimSpace(m.Content)
	if !strings.HasPrefix(content, "!") {
		return
	}

	parts := strings.Fields(content)
	if len(parts) == 0 {
		return
	}

	cmd := strings.ToLower(parts[0])
	args := parts[1:]

	switch cmd {
	case "!start":
		b.handleStartCommand(s, m, args)
	case "!stop":
		b.handleStopCommand(s, m, args)
	case "!status":
		b.handleStatusCommand(s, m, args)
	case "!map":
		b.handleMapCommand(s, m, args)
	case "!maps":
		b.handleMapsCommand(s, m)
	case "!mapnow", "!currentmap":
		b.handleCurrentMapCommand(s, m)
	case "!help", "!bothelp":
		b.handleHelpCommand(s, m)
	}
}

func (b *Bot) handleStatusCommand(s *discordgo.Session, m *discordgo.MessageCreate, args []string) {
	b.mu.RLock()
	id := b.instanceID
	b.mu.RUnlock()

	if len(args) > 0 {
		id = args[0]
	}

	inst := b.instanceMgr.Get(id)
	if inst == nil {
		s.ChannelMessageSend(m.ChannelID, fmt.Sprintf("❌ 서버 인스턴스 '%s'를 찾을 수 없습니다.", id))
		return
	}

	status := "🔴 중지됨"
	if inst.Status == "running" {
		status = fmt.Sprintf("🟢 실행 중 (PID: %d)", inst.PID)
	}

	s.ChannelMessageSend(m.ChannelID, fmt.Sprintf("📊 **서버 상태 [%s]**\n상태: %s", id, status))
}

func (b *Bot) handleStartCommand(s *discordgo.Session, m *discordgo.MessageCreate, args []string) {
	b.mu.RLock()
	id := b.instanceID
	b.mu.RUnlock()

	// If argument provided, use it as instance ID
	if len(args) > 0 {
		id = args[0]
	}

	inst := b.instanceMgr.Get(id)
	if inst == nil {
		s.ChannelMessageSend(m.ChannelID, fmt.Sprintf("❌ 서버 인스턴스 '%s'를 찾을 수 없습니다.", id))
		return
	}

	if inst.Status == "running" {
		s.ChannelMessageSend(m.ChannelID, fmt.Sprintf("⚠️ 서버 '%s'가 이미 실행 중입니다.", id))
		return
	}

	s.ChannelMessageSend(m.ChannelID, fmt.Sprintf("🚀 서버 **%s** 시작 중...", id))
	if err := b.instanceMgr.Start(id, []string{"-server"}); err != nil {
		s.ChannelMessageSend(m.ChannelID, "❌ 시작 실패: "+err.Error())
	}
}

func (b *Bot) handleStopCommand(s *discordgo.Session, m *discordgo.MessageCreate, args []string) {
	b.mu.RLock()
	id := b.instanceID
	b.mu.RUnlock()

	if len(args) > 0 {
		id = args[0]
	}

	inst := b.instanceMgr.Get(id)
	if inst == nil {
		s.ChannelMessageSend(m.ChannelID, fmt.Sprintf("❌ 서버 인스턴스 '%s'를 찾을 수 없습니다.", id))
		return
	}

	s.ChannelMessageSend(m.ChannelID, fmt.Sprintf("🛑 서버 **%s** 중지 중...", id))
	if err := b.instanceMgr.Stop(id); err != nil {
		s.ChannelMessageSend(m.ChannelID, "❌ 중지 실패: "+err.Error())
	}
}

// handleMapCommand handles the !map <slot> command
func (b *Bot) handleMapCommand(s *discordgo.Session, m *discordgo.MessageCreate, args []string) {
	if len(args) < 1 {
		s.ChannelMessageSend(m.ChannelID, "❌ 사용법: `!map <슬롯번호>`\n예: `!map 1`")
		return
	}

	slot, err := strconv.Atoi(args[0])
	if err != nil {
		s.ChannelMessageSend(m.ChannelID, "❌ 유효하지 않은 슬롯 번호입니다. 숫자를 입력해주세요.")
		return
	}

	// Get mapping first to show name
	mapping := b.mapService.GetMappingManager().Get(slot)
	if mapping == nil {
		s.ChannelMessageSend(m.ChannelID, fmt.Sprintf("❌ 슬롯 %d에 등록된 맵이 없습니다.\n`!maps`로 목록을 확인하세요.", slot))
		return
	}

	// Send processing message
	s.ChannelMessageSend(m.ChannelID, fmt.Sprintf("🔄 맵 변경 중: **%s** (슬롯 %d)...", mapping.Name, slot))

	b.mu.RLock()
	instanceID := b.instanceID
	b.mu.RUnlock()

	requester := fmt.Sprintf("Discord (%s)", m.Author.Username)

	if err := b.mapService.ChangeMapBySlot(instanceID, slot, requester); err != nil {
		s.ChannelMessageSend(m.ChannelID, fmt.Sprintf("❌ 맵 변경 실패: %s", err.Error()))
		return
	}

	// Success message is sent via webhook, but we can also confirm here
	s.ChannelMessageSend(m.ChannelID, fmt.Sprintf("✅ 맵 변경 완료: **%s**\n서버가 재시작됩니다.", mapping.Name))
}

// handleMapsCommand handles the !maps command
func (b *Bot) handleMapsCommand(s *discordgo.Session, m *discordgo.MessageCreate) {
	maps := b.mapService.ListMaps()

	if len(maps) == 0 {
		s.ChannelMessageSend(m.ChannelID, "📋 등록된 맵이 없습니다.\n웹 UI에서 맵 매핑을 추가해주세요.")
		return
	}

	var builder strings.Builder
	builder.WriteString("📋 **등록된 맵 목록**\n")
	builder.WriteString("```\n")
	for _, mp := range maps {
		builder.WriteString(fmt.Sprintf(" %d. %s\n", mp.Slot, mp.Name))
	}
	builder.WriteString("```\n")
	builder.WriteString("사용법: `!map <슬롯번호>`")

	s.ChannelMessageSend(m.ChannelID, builder.String())
}

// handleCurrentMapCommand handles the !mapnow command
func (b *Bot) handleCurrentMapCommand(s *discordgo.Session, m *discordgo.MessageCreate) {
	b.mu.RLock()
	instanceID := b.instanceID
	b.mu.RUnlock()

	mapping, scenarioID, err := b.mapService.GetCurrentMap(instanceID)
	if err != nil {
		s.ChannelMessageSend(m.ChannelID, fmt.Sprintf("❌ 현재 맵 조회 실패: %s", err.Error()))
		return
	}

	if mapping != nil {
		s.ChannelMessageSend(m.ChannelID, fmt.Sprintf("🗺️ **현재 맵**: %s (슬롯 %d)\n`%s`", mapping.Name, mapping.Slot, scenarioID))
	} else {
		s.ChannelMessageSend(m.ChannelID, fmt.Sprintf("🗺️ **현재 맵**: 등록되지 않은 맵\n`%s`", scenarioID))
	}
}

// handleHelpCommand handles the help command
func (b *Bot) handleHelpCommand(s *discordgo.Session, m *discordgo.MessageCreate) {
	help := `**🎮 Arma Reforger 봇 도움말**

` + "```" + `
!status       - 서버 상태 확인
!start        - 서버 시작
!stop         - 서버 중지
!maps         - 등록된 맵 목록
!map <슬롯>    - 맵 변경 및 재시작
!mapnow       - 현재 실행 중인 맵
!help         - 이 도움말 표시
` + "```" + `
`
	s.ChannelMessageSend(m.ChannelID, help)
}
