package agent

import (
	"bytes"
	"fmt"
	"os/exec"
	"regexp"
	"strings"
)

type Scenario struct {
	ID   string `json:"scenarioId"`
	Name string `json:"name"`
}

// ListScenarios executes the server with -listScenarios and parses output
func (p *ProcessMonitor) ListScenarios(serverPath string, addonDirs []string) ([]Scenario, error) {
	// Construct arguments
	// ArmaReforgerServer.exe -addonsDir "..." -listScenarios
	// Note: It might need -profile to be set to load user mods?
	// Usually: -config "..." -addonsDir "..." -listScenarios

	args := []string{"-listScenarios"}

	for _, dir := range addonDirs {
		args = append(args, "-addonsDir", dir)
	}

	cmd := exec.Command(serverPath, args...)

	// We need to capture stdout/stderr
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out // Sometimes it prints to stderr

	// It might start the engine, print, and exit.
	if err := cmd.Run(); err != nil {
		// If it returns non-zero, it might still have printed scenarios.
		// Reforger sometimes exits with code 0, sometimes 1 depending on version/config availability.
		// We'll inspect output regardless, but log error.
		fmt.Printf("Warning: listScenarios exited with: %v\n", err)
	}

	return parseScenarios(out.String()), nil
}

func parseScenarios(output string) []Scenario {
	var scenarios []Scenario

	// Regex for {GUID}Missions/Name.conf
	// Example: {595F2BF2F4E}Missions/Coop_Fallujah.conf
	re := regexp.MustCompile(`\{[A-F0-9-]+\}Missions/[^\s]+\.conf`)

	lines := strings.Split(output, "\n")
	for _, line := range lines {
		// Clean line
		line = strings.TrimSpace(line)

		match := re.FindString(line)
		if match != "" {
			// Extract name from path for display
			// e.g. "Missions/Coop_Fallujah.conf" -> "Coop_Fallujah"
			parts := strings.Split(match, "/")
			name := match
			if len(parts) > 1 {
				name = parts[len(parts)-1]
				name = strings.TrimSuffix(name, ".conf")
			}

			scenarios = append(scenarios, Scenario{
				ID:   match,
				Name: name,
			})
		}
	}

	return scenarios
}
