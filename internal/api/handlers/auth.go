package handlers

import (
	"github.com/astral/kg-server-web-gui/internal/api/response"
	"github.com/astral/kg-server-web-gui/internal/auth"
	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	users    *auth.UserManager
	sessions *auth.SessionManager
}

func NewAuthHandler(um *auth.UserManager, sm *auth.SessionManager) *AuthHandler {
	return &AuthHandler{users: um, sessions: sm}
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(response.Error("invalid request"))
	}

	user, err := h.users.Authenticate(req.Username, req.Password)
	if err != nil {
		return c.Status(401).JSON(response.Error(err.Error()))
	}

	session := h.sessions.Create(user)

	// Set cookie
	c.Cookie(&fiber.Cookie{
		Name:     "auth_token",
		Value:    session.Token,
		HTTPOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: "Lax",
		MaxAge:   86400, // 24 hours
	})

	return c.JSON(response.Success(fiber.Map{
		"token":    session.Token,
		"username": user.Username,
		"role":     user.Role,
	}))
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	token := c.Get("Authorization")
	if token == "" {
		token = c.Cookies("auth_token")
	}

	if token != "" {
		h.sessions.Delete(token)
	}

	c.ClearCookie("auth_token")
	c.ClearCookie("auth_token")
	return c.JSON(response.Success(fiber.Map{"status": "logged out"}))
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	return c.JSON(response.Success(fiber.Map{
		"userId":   c.Locals("userId"),
		"username": c.Locals("username"),
		"role":     c.Locals("role"),
	}))
}

func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	var req struct {
		OldPassword string `json:"oldPassword"`
		NewPassword string `json:"newPassword"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(response.Error("invalid request"))
	}

	userId, ok := c.Locals("userId").(string)
	if !ok || userId == "" {
		return c.Status(401).JSON(response.Error("unauthorized"))
	}
	user := h.users.GetByID(userId)
	if user == nil {
		return c.Status(404).JSON(response.Error("user not found"))
	}

	// Verify old password
	_, err := h.users.Authenticate(user.Username, req.OldPassword)
	if err != nil {
		return c.Status(401).JSON(response.Error("incorrect current password"))
	}

	if err := h.users.ChangePassword(userId, req.NewPassword); err != nil {
		return c.Status(500).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(fiber.Map{"status": "password changed"}))
}

// Admin endpoints
func (h *AuthHandler) ListUsers(c *fiber.Ctx) error {
	users := h.users.List()
	// Remove password hashes from response
	var safeUsers []fiber.Map
	for _, u := range users {
		safeUsers = append(safeUsers, fiber.Map{
			"id":        u.ID,
			"username":  u.Username,
			"role":      u.Role,
			"createdAt": u.CreatedAt,
		})
	}
	return c.JSON(response.Success(safeUsers))
}

func (h *AuthHandler) CreateUser(c *fiber.Ctx) error {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(response.Error("invalid request"))
	}

	if req.Role == "" {
		req.Role = "user"
	}

	user, err := h.users.Create(req.Username, req.Password, req.Role)
	if err != nil {
		return c.Status(400).JSON(response.Error(err.Error()))
	}

	return c.Status(201).JSON(response.Success(fiber.Map{
		"id":       user.ID,
		"username": user.Username,
		"role":     user.Role,
	}))
}

func (h *AuthHandler) DeleteUser(c *fiber.Ctx) error {
	id := c.Params("id")

	// Prevent self-deletion
	currentUserId, _ := c.Locals("userId").(string)
	if id == currentUserId {
		return c.Status(400).JSON(response.Error("cannot delete yourself"))
	}

	if err := h.users.Delete(id); err != nil {
		return c.Status(404).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(fiber.Map{"status": "deleted"}))
}
