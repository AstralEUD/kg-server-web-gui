package agent

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
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

// Color constants
const (
	ColorGreen  = 0x00FF00
	ColorRed    = 0xFF0000
	ColorYellow = 0xFFFF00
	ColorBlue   = 0x0000FF
)
