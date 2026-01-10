package agent

import (
	"fmt"
	"sync"
	"time"

	"github.com/astral/kg-server-web-gui/internal/logs"
)

// Watchdog monitors the server process and restarts it if it crashes
type Watchdog struct {
	mu       sync.RWMutex
	process  *ProcessMonitor
	discord  *DiscordClient
	enabled  bool
	check    *time.Ticker
	stopChan chan struct{}

	// Auto-restart tracking
	lastRestart  time.Time
	restartCount int

	// Server Instance ID/Args to restart with
	instanceID string
	startArgs  []string
}

func NewWatchdog(discord *DiscordClient) *Watchdog {
	return &Watchdog{
		discord: discord,
	}
}

func (w *Watchdog) SetEnabled(enabled bool) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.enabled = enabled
	if enabled {
		logs.GlobalLogs.Info("Watchdog enabled")
		if w.check == nil {
			w.StartMonitoring()
		}
	} else {
		logs.GlobalLogs.Info("Watchdog disabled")
		w.StopMonitoring()
	}
}

func (w *Watchdog) IsEnabled() bool {
	w.mu.RLock()
	defer w.mu.RUnlock()
	return w.enabled
}

// RegisterInstance registers the arguments and monitor needed to restart the server
func (w *Watchdog) RegisterInstance(id string, args []string, proc *ProcessMonitor) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.instanceID = id
	w.startArgs = args
	w.process = proc // Update the monitor being watched
}

func (w *Watchdog) StartMonitoring() {
	if w.check != nil {
		return
	}
	w.check = time.NewTicker(10 * time.Second) // Check every 10 seconds
	w.stopChan = make(chan struct{})

	go func() {
		for {
			select {
			case <-w.check.C:
				w.checkProcess()
			case <-w.stopChan:
				return
			}
		}
	}()
}

func (w *Watchdog) StopMonitoring() {
	if w.check != nil {
		w.check.Stop()
		w.check = nil
		close(w.stopChan)
	}
}

func (w *Watchdog) checkProcess() {
	w.mu.Lock()
	defer w.mu.Unlock()

	if !w.enabled {
		return
	}

	running, _, err := w.process.IsRunning()
	if err != nil {
		logs.GlobalLogs.Error(fmt.Sprintf("Watchdog check failed: %v", err))
		return
	}

	// If server is NOT running but Watchdog IS enabled, we assume it crashed
	// (Unless the user explicitly stopped it - the user stop handler should disable watchdog momentarily or we need a status flag)
	// For now, we rely on the InstanceManager to enable/disable Watchdog when starting/stopping.

	if !running {
		// Detect Crash
		now := time.Now()

		// Reset restart count if last restart was > 5 mins ago
		if now.Sub(w.lastRestart) > 5*time.Minute {
			w.restartCount = 0
		}

		if w.restartCount >= 3 {
			logs.GlobalLogs.Error("Watchdog gave up: Too many restarts in short period.")
			w.discord.SendMessage("❌ Server Crash", "Server crashed repeatedly. Watchdog disabled to prevent loop.", ColorRed)
			w.enabled = false // Disable to prevent loop
			return
		}

		logs.GlobalLogs.Warn(fmt.Sprintf("Watchdog detected server down! Restarting... (%d/3)", w.restartCount+1))
		w.discord.SendMessage("⚠️ Server Crash Detected", fmt.Sprintf("Server is down. Restarting... (Attempt %d/3)", w.restartCount+1), ColorYellow)

		// Restart
		if err := w.process.Start("", w.startArgs); err != nil {
			logs.GlobalLogs.Error(fmt.Sprintf("Watchdog restart failed: %v", err))
			w.discord.SendMessage("❌ Restart Failed", fmt.Sprintf("Failed to restart server: %v", err), ColorRed)
		} else {
			logs.GlobalLogs.Info("Watchdog restarted server successfully.")
			w.discord.SendMessage("✅ Server Restored", "Watchdog successfully restarted the server.", ColorGreen)
			w.lastRestart = now
			w.restartCount++
		}
	} else {
		// Running fine, maybe reset restart count?
		// No, keep 5 min window logic.
	}
}
