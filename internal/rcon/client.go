package rcon

import (
	"fmt"

	"github.com/james4k/rcon"
)

type Client struct {
	Address  string
	Password string
	Conn     *rcon.RemoteConsole
}

func NewClient(address, password string) *Client {
	return &Client{
		Address:  address,
		Password: password,
	}
}

func (c *Client) Connect() error {
	conn, err := rcon.Dial(c.Address, c.Password)
	if err != nil {
		return err
	}
	c.Conn = conn
	return nil
}

func (c *Client) Close() error {
	if c.Conn != nil {
		return c.Conn.Close()
	}
	return nil
}

func (c *Client) Send(command string) (string, error) {
	if c.Conn == nil {
		if err := c.Connect(); err != nil {
			return "", fmt.Errorf("failed to connect to RCON: %w", err)
		}
	}

	reqID, err := c.Conn.Write(command)
	if err != nil {
		c.Conn.Close()
		c.Conn = nil
		return "", fmt.Errorf("failed to write command: %w", err)
	}

	resp, reqIDResp, err := c.Conn.Read()
	if err != nil {
		c.Conn.Close()
		c.Conn = nil
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if reqID != reqIDResp {
		// Mismatch ID, possibly safe to ignore in simple cli but worth noting
	}

	return resp, nil
}
