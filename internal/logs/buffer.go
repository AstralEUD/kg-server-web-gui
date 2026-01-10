package logs

import (
	"sync"
	"time"
)

type LogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Level     string    `json:"level"` // info, warn, error
	Message   string    `json:"message"`
}

// LogBuffer is a thread-safe ring buffer for server logs
type LogBuffer struct {
	mu       sync.RWMutex
	entries  []LogEntry
	capacity int
}

func NewLogBuffer(capacity int) *LogBuffer {
	return &LogBuffer{
		entries:  make([]LogEntry, 0, capacity),
		capacity: capacity,
	}
}

func (b *LogBuffer) Add(level, message string) {
	b.mu.Lock()
	defer b.mu.Unlock()

	entry := LogEntry{
		Timestamp: time.Now(),
		Level:     level,
		Message:   message,
	}

	if len(b.entries) >= b.capacity {
		// Remove oldest entry
		b.entries = b.entries[1:]
	}
	b.entries = append(b.entries, entry)
}

func (b *LogBuffer) Info(message string) {
	b.Add("info", message)
}

func (b *LogBuffer) Warn(message string) {
	b.Add("warn", message)
}

func (b *LogBuffer) Error(message string) {
	b.Add("error", message)
}

// GetAll returns all log entries
func (b *LogBuffer) GetAll() []LogEntry {
	b.mu.RLock()
	defer b.mu.RUnlock()

	result := make([]LogEntry, len(b.entries))
	copy(result, b.entries)
	return result
}

// GetSince returns logs after the given timestamp
func (b *LogBuffer) GetSince(since time.Time) []LogEntry {
	b.mu.RLock()
	defer b.mu.RUnlock()

	var result []LogEntry
	for _, e := range b.entries {
		if e.Timestamp.After(since) {
			result = append(result, e)
		}
	}
	return result
}

// Clear removes all logs
func (b *LogBuffer) Clear() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.entries = make([]LogEntry, 0, b.capacity)
}

// Count returns the number of entries
func (b *LogBuffer) Count() int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.entries)
}

// Global log buffer instance
var GlobalLogs = NewLogBuffer(1000)
