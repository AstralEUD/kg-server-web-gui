package auth

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type Session struct {
	Token     string    `json:"token"`
	UserID    string    `json:"userId"`
	Username  string    `json:"username"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type SessionManager struct {
	mu       sync.RWMutex
	sessions map[string]*Session
	dataPath string
	ttl      time.Duration
}

func NewSessionManager(dataPath string) *SessionManager {
	sm := &SessionManager{
		sessions: make(map[string]*Session),
		dataPath: dataPath,
		ttl:      24 * time.Hour, // 24 hour sessions
	}
	sm.Load()
	go sm.cleanupLoop()
	return sm
}

func (sm *SessionManager) Load() error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	path := filepath.Join(sm.dataPath, "sessions.json")
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	var sessions []*Session
	if err := json.Unmarshal(data, &sessions); err != nil {
		return err
	}

	now := time.Now()
	for _, s := range sessions {
		if s.ExpiresAt.After(now) {
			sm.sessions[s.Token] = s
		}
	}
	return nil
}

func (sm *SessionManager) Save() error {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	var sessions []*Session
	for _, s := range sm.sessions {
		sessions = append(sessions, s)
	}

	data, err := json.MarshalIndent(sessions, "", "  ")
	if err != nil {
		return err
	}

	os.MkdirAll(sm.dataPath, 0755)
	return os.WriteFile(filepath.Join(sm.dataPath, "sessions.json"), data, 0644)
}

func (sm *SessionManager) Create(user *User) *Session {
	sm.mu.Lock()
	token := generateToken()
	session := &Session{
		Token:     token,
		UserID:    user.ID,
		Username:  user.Username,
		Role:      user.Role,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(sm.ttl),
	}
	sm.sessions[token] = session
	sm.mu.Unlock()
	sm.Save()
	return session
}

func (sm *SessionManager) Validate(token string) *Session {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	session, exists := sm.sessions[token]
	if !exists {
		return nil
	}

	if time.Now().After(session.ExpiresAt) {
		go sm.Delete(token)
		return nil
	}

	return session
}

func (sm *SessionManager) Delete(token string) {
	sm.mu.Lock()
	delete(sm.sessions, token)
	sm.mu.Unlock()
	sm.Save()
}

func (sm *SessionManager) cleanupLoop() {
	ticker := time.NewTicker(15 * time.Minute)
	for range ticker.C {
		sm.cleanup()
	}
}

func (sm *SessionManager) cleanup() {
	sm.mu.Lock()
	now := time.Now()
	for token, session := range sm.sessions {
		if now.After(session.ExpiresAt) {
			delete(sm.sessions, token)
		}
	}
	sm.mu.Unlock()
	sm.Save()
}

func generateToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
