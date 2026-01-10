package auth

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

func AuthMiddleware(sm *SessionManager) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Skip auth for login endpoint
		if c.Path() == "/api/auth/login" || c.Path() == "/api/health" {
			return c.Next()
		}

		// Skip for static files
		if !strings.HasPrefix(c.Path(), "/api") {
			return c.Next()
		}

		// Get token from header or cookie
		token := c.Get("Authorization")
		if token == "" {
			token = c.Cookies("auth_token")
		}

		// Remove "Bearer " prefix if present
		token = strings.TrimPrefix(token, "Bearer ")

		if token == "" {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}

		session := sm.Validate(token)
		if session == nil {
			return c.Status(401).JSON(fiber.Map{"error": "invalid or expired session"})
		}

		// Store user info in context
		c.Locals("userId", session.UserID)
		c.Locals("username", session.Username)
		c.Locals("role", session.Role)

		return c.Next()
	}
}

func AdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		role := c.Locals("role")
		if role != "admin" {
			return c.Status(403).JSON(fiber.Map{"error": "admin access required"})
		}
		return c.Next()
	}
}
