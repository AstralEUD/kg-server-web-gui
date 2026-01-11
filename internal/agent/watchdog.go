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
	discord  *DiscordClient
	enabled  bool
	check    *time.Ticker
	stopChan chan struct{}

	// Multi-instance tracking
	instances map[string]*WatchedInstance
}

type WatchedInstance struct {
	ID           string
	Args         []string
	Process      *ProcessMonitor
	RestartCount int
	LastRestart  time.Time
}

func NewWatchdog(discord *DiscordClient) *Watchdog {
	return &Watchdog{
		discord:   discord,
		instances: make(map[string]*WatchedInstance),
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

	w.instances[id] = &WatchedInstance{
		ID:      id,
		Args:    args,
		Process: proc,
	}
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

	for _, inst := range w.instances {
		w.checkInstance(inst)
	}
}

func (w *Watchdog) checkInstance(inst *WatchedInstance) {
	running, _, err := inst.Process.IsRunning()
	if err != nil {
		logs.GlobalLogs.Error(fmt.Sprintf("Watchdog check failed for %s: %v", inst.ID, err))
		return
	}

	if !running {
		// Detect Crash
		now := time.Now()

		// Reset restart count if last restart was > 5 mins ago
		if now.Sub(inst.LastRestart) > 5*time.Minute {
			inst.RestartCount = 0
		}

		if inst.RestartCount >= 3 {
			logs.GlobalLogs.Error(fmt.Sprintf("Watchdog gave up on %s: Too many restarts.", inst.ID))
			// Don't disable global watchdog, just maybe log error strictly?
			// Or maybe we need per-instance enabled flag?
			// For now, just spamming log is bad. Let's just return.
			// Ideally we should alert once and stop trying for this instance.
			return
		}

		logs.GlobalLogs.Warn(fmt.Sprintf("Watchdog detected server %s down! Restarting... (%d/3)", inst.ID, inst.RestartCount+1))
		w.discord.SendMessage("⚠️ Server Crash Detected", fmt.Sprintf("Server **%s** is down. Restarting... (Attempt %d/3)", inst.ID, inst.RestartCount+1), ColorYellow)

		// Restart
		if err := inst.Process.Start("", inst.Args); err != nil {
			logs.GlobalLogs.Error(fmt.Sprintf("Watchdog restart failed for %s: %v", inst.ID, err))
			w.discord.SendMessage("❌ Restart Failed", fmt.Sprintf("Failed to restart server %s: %v", inst.ID, err), ColorRed)
		} else {
			logs.GlobalLogs.Info(fmt.Sprintf("Watchdog restarted server %s successfully.", inst.ID))
			w.discord.SendMessage("✅ Server Restored", fmt.Sprintf("Watchdog successfully restarted **%s**.", inst.ID), ColorGreen)
			inst.LastRestart = now
			inst.RestartCount++
		}
	}
}
