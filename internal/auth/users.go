package auth

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"passwordHash"`
	Role         string    `json:"role"` // admin, user
	CreatedAt    time.Time `json:"createdAt"`
}

type UserManager struct {
	mu       sync.RWMutex
	users    map[string]*User
	dataPath string
}

func NewUserManager(dataPath string) *UserManager {
	um := &UserManager{
		users:    make(map[string]*User),
		dataPath: dataPath,
	}
	um.Load()
	um.ensureDefaultAdmin()
	return um
}

func (um *UserManager) ensureDefaultAdmin() {
	um.mu.RLock()
	hasAdmin := false
	for _, u := range um.users {
		if u.Role == "admin" {
			hasAdmin = true
			break
		}
	}
	um.mu.RUnlock()

	if !hasAdmin {
		um.Create("admin", "admin123!", "admin")
	}
}

func (um *UserManager) Load() error {
	um.mu.Lock()
	defer um.mu.Unlock()

	path := filepath.Join(um.dataPath, "users.json")
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	var users []*User
	if err := json.Unmarshal(data, &users); err != nil {
		return err
	}

	for _, u := range users {
		um.users[u.ID] = u
	}
	return nil
}

func (um *UserManager) Save() error {
	um.mu.RLock()
	defer um.mu.RUnlock()

	var users []*User
	for _, u := range um.users {
		users = append(users, u)
	}

	data, err := json.MarshalIndent(users, "", "  ")
	if err != nil {
		return err
	}

	os.MkdirAll(um.dataPath, 0755)
	return os.WriteFile(filepath.Join(um.dataPath, "users.json"), data, 0644)
}

func (um *UserManager) Create(username, password, role string) (*User, error) {
	um.mu.Lock()

	// Check if username exists
	for _, u := range um.users {
		if u.Username == username {
			um.mu.Unlock()
			return nil, errors.New("username already exists")
		}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		um.mu.Unlock()
		return nil, err
	}

	id := generateID()
	user := &User{
		ID:           id,
		Username:     username,
		PasswordHash: string(hash),
		Role:         role,
		CreatedAt:    time.Now(),
	}

	um.users[id] = user
	um.mu.Unlock()
	um.Save()
	return user, nil
}

func (um *UserManager) Authenticate(username, password string) (*User, error) {
	um.mu.RLock()
	defer um.mu.RUnlock()

	for _, u := range um.users {
		if u.Username == username {
			if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
				return nil, errors.New("invalid password")
			}
			return u, nil
		}
	}
	return nil, errors.New("user not found")
}

func (um *UserManager) GetByID(id string) *User {
	um.mu.RLock()
	defer um.mu.RUnlock()
	return um.users[id]
}

func (um *UserManager) List() []*User {
	um.mu.RLock()
	defer um.mu.RUnlock()

	var list []*User
	for _, u := range um.users {
		list = append(list, u)
	}
	return list
}

func (um *UserManager) Delete(id string) error {
	um.mu.Lock()

	if _, exists := um.users[id]; !exists {
		um.mu.Unlock()
		return errors.New("user not found")
	}
	delete(um.users, id)
	um.mu.Unlock()
	return um.Save()
}

func (um *UserManager) ChangePassword(id, newPassword string) error {
	um.mu.Lock()

	user, exists := um.users[id]
	if !exists {
		um.mu.Unlock()
		return errors.New("user not found")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		um.mu.Unlock()
		return err
	}

	user.PasswordHash = string(hash)
	um.mu.Unlock()
	return um.Save()
}

func generateID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
