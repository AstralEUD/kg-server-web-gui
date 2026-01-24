package scheduler

import (
	"log"
	"sync"
	"time"
)

// RestartScheduler handles automatic server restarts
type RestartScheduler struct {
	mu            sync.Mutex
	enabled       bool
	restartTime   string // Format: "HH:MM" (24h)
	lastTriggered string // Prevent multiple triggers in same minute
	ticker        *time.Ticker
	stopChan      chan struct{}
	onRestart     func() error
}

func NewRestartScheduler(onRestart func() error) *RestartScheduler {
	return &RestartScheduler{
		onRestart: onRestart,
		stopChan:  make(chan struct{}),
	}
}

func (s *RestartScheduler) SetSchedule(timeStr string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.restartTime = timeStr
	s.lastTriggered = "" // Reset when schedule changes
}

func (s *RestartScheduler) Enable() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.enabled {
		return
	}

	s.enabled = true
	s.ticker = time.NewTicker(30 * time.Second) // Check every 30 seconds

	go func() {
		for {
			select {
			case <-s.ticker.C:
				s.checkAndRestart()
			case <-s.stopChan:
				return
			}
		}
	}()

	log.Printf("Restart scheduler enabled for %s", s.restartTime)
}

func (s *RestartScheduler) Disable() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.enabled {
		return
	}

	s.enabled = false
	if s.ticker != nil {
		s.ticker.Stop()
	}
	close(s.stopChan)
	s.stopChan = make(chan struct{})

	log.Println("Restart scheduler disabled")
}

func (s *RestartScheduler) checkAndRestart() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.enabled || s.restartTime == "" {
		return
	}

	now := time.Now()
	currentTime := now.Format("15:04")

	// Fix #16: Prevent multiple triggers in same minute
	if currentTime == s.restartTime && s.lastTriggered != currentTime {
		s.lastTriggered = currentTime
		log.Printf("Scheduled restart triggered at %s", s.restartTime)
		if err := s.onRestart(); err != nil {
			log.Printf("Scheduled restart failed: %v", err)
		}
	}
}

func (s *RestartScheduler) Status() map[string]interface{} {
	s.mu.Lock()
	defer s.mu.Unlock()

	return map[string]interface{}{
		"enabled":     s.enabled,
		"restartTime": s.restartTime,
	}
}
