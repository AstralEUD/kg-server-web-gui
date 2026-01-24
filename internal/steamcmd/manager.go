package steamcmd

import (
	"archive/zip"
	"bufio"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/astral/kg-server-web-gui/internal/logs"
)

const steamCmdURL = "https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip"

// Manager handles SteamCMD operations
type Manager struct {
	mu           sync.Mutex
	baseDir      string
	steamcmdPath string
	installDir   string
	isRunning    bool
}

func NewManager(baseDir, installDir string) *Manager {
	return &Manager{
		baseDir:      baseDir,
		steamcmdPath: filepath.Join(baseDir, "steamcmd", "steamcmd.exe"),
		installDir:   installDir,
	}
}

// EnsureSteamCMD downloads SteamCMD if not present
func (m *Manager) EnsureSteamCMD() error {
	if _, err := os.Stat(m.steamcmdPath); err == nil {
		return nil // Already exists
	}

	logs.GlobalLogs.Info("SteamCMD not found, downloading...")

	steamcmdDir := filepath.Dir(m.steamcmdPath)
	if err := os.MkdirAll(steamcmdDir, 0755); err != nil {
		return fmt.Errorf("failed to create steamcmd directory: %w", err)
	}

	// Download steamcmd.zip
	zipPath := filepath.Join(steamcmdDir, "steamcmd.zip")
	resp, err := http.Get(steamCmdURL)
	if err != nil {
		return fmt.Errorf("failed to download SteamCMD: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("download failed with status: %d", resp.StatusCode)
	}

	zipFile, err := os.Create(zipPath)
	if err != nil {
		return err
	}
	if _, err := io.Copy(zipFile, resp.Body); err != nil {
		zipFile.Close()
		return err
	}
	zipFile.Close()

	// Extract zip
	logs.GlobalLogs.Info("Extracting SteamCMD...")
	if err := extractZip(zipPath, steamcmdDir); err != nil {
		return fmt.Errorf("failed to extract SteamCMD: %w", err)
	}

	os.Remove(zipPath)
	logs.GlobalLogs.Info("SteamCMD installed successfully")
	return nil
}

// DownloadServer downloads/updates Arma Reforger Dedicated Server
func (m *Manager) DownloadServer(experimental bool) error {
	m.mu.Lock()
	if m.isRunning {
		m.mu.Unlock()
		return fmt.Errorf("SteamCMD is already running")
	}
	m.isRunning = true
	m.mu.Unlock()

	defer func() {
		m.mu.Lock()
		m.isRunning = false
		m.mu.Unlock()
	}()

	// Ensure SteamCMD is installed
	if err := m.EnsureSteamCMD(); err != nil {
		logs.GlobalLogs.Error(fmt.Sprintf("Failed to setup SteamCMD: %v", err))
		return err
	}

	// Arma Reforger Dedicated Server App ID
	appID := "1874900"
	if experimental {
		appID = "1874901" // Experimental branch
	}

	// Create install directory
	os.MkdirAll(m.installDir, 0755)

	args := []string{
		"+force_install_dir", m.installDir,
		"+login", "anonymous",
		"+app_update", appID, "validate",
		"+quit",
	}

	logs.GlobalLogs.Info(fmt.Sprintf("Starting SteamCMD: %s %s", m.steamcmdPath, strings.Join(args, " ")))

	cmd := exec.Command(m.steamcmdPath, args...)
	cmd.Dir = filepath.Dir(m.steamcmdPath)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		logs.GlobalLogs.Error(fmt.Sprintf("Failed to start SteamCMD: %v", err))
		return err
	}

	// Stream output to logs
	go m.streamOutput(stdout)
	go m.streamOutput(stderr)

	if err := cmd.Wait(); err != nil {
		logs.GlobalLogs.Error(fmt.Sprintf("SteamCMD exited with error: %v", err))
		return err
	}

	logs.GlobalLogs.Info("SteamCMD completed successfully")
	return nil
}

// Update is an alias for DownloadServer
func (m *Manager) UpdateServer(experimental bool) error {
	return m.DownloadServer(experimental)
}

// IsRunning returns if SteamCMD is currently running
func (m *Manager) IsRunning() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.isRunning
}

// CheckInstalled checks if server is installed
func (m *Manager) CheckInstalled() bool {
	serverExe := filepath.Join(m.installDir, "ArmaReforgerServer.exe")
	_, err := os.Stat(serverExe)
	return err == nil
}

// SteamCMDInstalled checks if SteamCMD itself is available
func (m *Manager) SteamCMDInstalled() bool {
	_, err := os.Stat(m.steamcmdPath)
	return err == nil
}

func (m *Manager) streamOutput(r io.Reader) {
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.TrimSpace(line) != "" {
			logs.GlobalLogs.Info(fmt.Sprintf("[SteamCMD] %s", line))
		}
	}
}

func extractZip(src, dest string) error {
	r, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer r.Close()

	// Clean and get absolute path of destination
	dest, err = filepath.Abs(dest)
	if err != nil {
		return err
	}

	for _, f := range r.File {
		// Fix #8: Zip Slip protection
		fpath := filepath.Join(dest, f.Name)

		// Ensure the file path is within the destination directory
		if !strings.HasPrefix(filepath.Clean(fpath), filepath.Clean(dest)+string(os.PathSeparator)) {
			return fmt.Errorf("illegal file path in zip: %s", f.Name)
		}

		if f.FileInfo().IsDir() {
			os.MkdirAll(fpath, 0755)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(fpath), 0755); err != nil {
			return err
		}

		outFile, err := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			return err
		}

		_, err = io.Copy(outFile, rc)
		outFile.Close()
		rc.Close()
		if err != nil {
			return err
		}
	}
	return nil
}
