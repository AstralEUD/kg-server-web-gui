package main

import (
	"embed"
	"flag"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/astral/kg-server-web-gui/internal/api"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

const Version = "3.0.5"

//go:embed all:frontend_build
var frontendFS embed.FS

func main() {
	// Parse flags
	port := flag.String("port", "3000", "Port to run the server on")
	dev := flag.Bool("dev", false, "Run in development mode (no embedded frontend)")
	flag.Parse()

	log.Printf("Arma Reforger Manager %s starting...", Version)

	// Initialize Fiber
	app := fiber.New(fiber.Config{
		AppName:               "Arma Reforger Manager",
		DisableStartupMessage: false,
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOriginsFunc: func(origin string) bool {
			return true // Allow all origins dynamically for credentials
		},
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true,
	}))

	// API Routes
	api.SetupRoutes(app)

	// Static Frontend Serving
	if !*dev {
		// Get the embedded filesystem with the correct subpath
		subFS, err := fs.Sub(frontendFS, "frontend_build")
		if err != nil {
			log.Fatal("Failed to get frontend_build subdirectory:", err)
		}

		// Serve static files
		app.Use("/", filesystem.New(filesystem.Config{
			Root:         http.FS(subFS),
			Browse:       false,
			Index:        "index.html",
			NotFoundFile: "index.html", // SPA fallback
		}))

		// SPA Fallback: serve index.html for routes not matching files
		app.Use(func(c *fiber.Ctx) error {
			path := c.Path()
			// Skip API routes
			if strings.HasPrefix(path, "/api") {
				return c.Status(404).JSON(fiber.Map{"error": "not found"})
			}
			// Serve index.html for SPA routes
			data, err := fs.ReadFile(subFS, "index.html")
			if err != nil {
				return c.Status(500).SendString("Internal Server Error")
			}
			c.Set("Content-Type", "text/html")
			return c.Send(data)
		})
	} else {
		log.Println("Running in DEV mode. Frontend not served by Go.")
	}

	// Graceful Shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		log.Println("Gracefully shutting down...")
		app.Shutdown()
	}()

	// Start Server
	log.Printf("Server starting on http://localhost:%s", *port)
	if err := app.Listen(":" + *port); err != nil {
		log.Panic(err)
	}
}
