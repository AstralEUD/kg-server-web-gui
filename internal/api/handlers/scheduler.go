package handlers

import (
	"github.com/astral/kg-server-web-gui/internal/api/response"
	"github.com/astral/kg-server-web-gui/internal/scheduler"
	"github.com/gofiber/fiber/v2"
)

type SchedulerHandler struct {
	manager *scheduler.Manager
}

func NewSchedulerHandler(manager *scheduler.Manager) *SchedulerHandler {
	return &SchedulerHandler{manager: manager}
}

// ListJobs returns all jobs
func (h *SchedulerHandler) ListJobs(c *fiber.Ctx) error {
	return c.JSON(response.Success(h.manager.List()))
}

// AddJob adds a new job
func (h *SchedulerHandler) AddJob(c *fiber.Ctx) error {
	var job scheduler.Job
	if err := c.BodyParser(&job); err != nil {
		return c.Status(400).JSON(response.Error(err.Error()))
	}

	if job.Name == "" || job.CronExpr == "" || job.Type == "" {
		return c.Status(400).JSON(response.Error("필수 필드 누락"))
	}

	if err := h.manager.Add(&job); err != nil {
		return c.Status(500).JSON(response.Error(err.Error()))
	}

	return c.Status(201).JSON(response.Success(job))
}

// UpdateJob updates an existing job
func (h *SchedulerHandler) UpdateJob(c *fiber.Ctx) error {
	id := c.Params("id")
	var job scheduler.Job
	if err := c.BodyParser(&job); err != nil {
		return c.Status(400).JSON(response.Error(err.Error()))
	}

	job.ID = id // Ensure ID matches URL

	if err := h.manager.Update(&job); err != nil {
		return c.Status(500).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(job))
}

// DeleteJob deletes a job
func (h *SchedulerHandler) DeleteJob(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.manager.Delete(id); err != nil {
		return c.Status(500).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(fiber.Map{"status": "deleted"}))
}
