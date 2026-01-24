package agent

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/bwmarrin/discordgo"
)

type DiscordClient struct {
	WebhookURL string
}

func NewDiscordClient(webhookURL string) *DiscordClient {
	return &DiscordClient{WebhookURL: webhookURL}
}

// SendMessage sends a structured embed message to Discord
func (d *DiscordClient) SendMessage(title, description string, color int) error {
	if d.WebhookURL == "" {
		return nil // No webhook configured, silent skip
	}

	payload := map[string]interface{}{
		"embeds": []map[string]interface{}{
			{
				"title":       title,
				"description": description,
				"color":       color,
				"timestamp":   time.Now().Format(time.RFC3339),
				"footer": map[string]string{
					"text": "Arma Reforger Server Manager",
				},
			},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := http.Post(d.WebhookURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("discord webhook failed with status: %d", resp.StatusCode)
	}

	return nil
}

type DiscordBot struct {
	session   *discordgo.Session
	channelID string
	enabled   bool
	onCommand func(cmd string, args []string) (string, error)
}

func NewDiscordBot(token, channelID string, enabled bool) (*DiscordBot, error) {
	if !enabled || token == "" {
		return &DiscordBot{enabled: false}, nil
	}

	dg, err := discordgo.New("Bot " + token)
	if err != nil {
		return nil, err
	}

	bot := &DiscordBot{
		session:   dg,
		channelID: channelID,
		enabled:   true,
	}

	dg.AddHandler(bot.messageCreate)
	dg.Identify.Intents = discordgo.IntentsGuildMessages

	if err := dg.Open(); err != nil {
		return nil, err
	}

	return bot, nil
}

func (b *DiscordBot) SetOnCommand(fn func(cmd string, args []string) (string, error)) {
	b.onCommand = fn
}

func (b *DiscordBot) Close() {
	if b.session != nil {
		b.session.Close()
	}
}

func (b *DiscordBot) messageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {
	if m.Author.ID == s.State.User.ID {
		return
	}

	if b.channelID != "" && m.ChannelID != b.channelID {
		return
	}

	if !strings.HasPrefix(m.Content, "!") {
		return
	}

	parts := strings.Fields(m.Content[1:])
	if len(parts) == 0 {
		return
	}

	cmd := strings.ToLower(parts[0])
	args := parts[1:]

	if b.onCommand != nil {
		resp, err := b.onCommand(cmd, args)
		if err != nil {
			s.ChannelMessageSend(m.ChannelID, "❌ Error: "+err.Error())
		} else if resp != "" {
			s.ChannelMessageSend(m.ChannelID, resp)
		}
	}
}

// Color constants
const (
	ColorGreen  = 0x00FF00
	ColorRed    = 0xFF0000
	ColorYellow = 0xFFFF00
	ColorBlue   = 0x0000FF
)
