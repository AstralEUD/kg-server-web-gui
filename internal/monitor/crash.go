package monitor

import (
	"log"
	"sync"
	"time"
)

// CrashMonitor watches server process and auto-restarts on crash
type CrashMonitor struct {
	mu            sync.Mutex
	enabled       bool
	checkInterval time.Duration
	ticker        *time.Ticker
	stopChan      chan struct{}
	isRunning     func() (bool, int, error)
	onCrash       func() error
	lastPID       int
	wasRunning    bool
}

func NewCrashMonitor(isRunning func() (bool, int, error), onCrash func() error) *CrashMonitor {
	return &CrashMonitor{
		checkInterval: 5 * time.Second,
		isRunning:     isRunning,
		onCrash:       onCrash,
		stopChan:      make(chan struct{}),
	}
}

func (m *CrashMonitor) Enable() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.enabled {
		return
	}

	m.enabled = true
	m.ticker = time.NewTicker(m.checkInterval)

	// Check initial state
	running, pid, _ := m.isRunning()
	m.wasRunning = running
	m.lastPID = pid

	go func() {
		for {
			select {
			case <-m.ticker.C:
				m.check()
			case <-m.stopChan:
				return
			}
		}
	}()

	log.Println("Crash monitor enabled")
}

func (m *CrashMonitor) Disable() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.enabled {
		return
	}

	m.enabled = false
	if m.ticker != nil {
		m.ticker.Stop()
	}
	close(m.stopChan)
	m.stopChan = make(chan struct{})

	log.Println("Crash monitor disabled")
}

func (m *CrashMonitor) check() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.enabled {
		return
	}

	running, pid, err := m.isRunning()
	if err != nil {
		log.Printf("Crash monitor check error: %v", err)
		return
	}

	// Detect crash: was running, now not running (and we didn't stop it intentionally)
	if m.wasRunning && !running {
		log.Printf("Server crash detected! (Was PID %d)", m.lastPID)

		// Attempt restart
		if err := m.onCrash(); err != nil {
			log.Printf("Auto-restart after crash failed: %v", err)
		} else {
			log.Println("Server restarted successfully after crash")
		}
	}

	m.wasRunning = running
	m.lastPID = pid
}

func (m *CrashMonitor) NotifyIntentionalStop() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.wasRunning = false
}

func (m *CrashMonitor) Status() map[string]interface{} {
	m.mu.Lock()
	defer m.mu.Unlock()

	return map[string]interface{}{
		"enabled":    m.enabled,
		"wasRunning": m.wasRunning,
		"lastPID":    m.lastPID,
	}
}
