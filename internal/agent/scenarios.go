package agent

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

type Scenario struct {
	ID   string `json:"scenarioId"`
	Name string `json:"name"`
}

// ListScenarios executes the server with -listScenarios and parses output
func ListScenarios(serverPath string, addonDirs []string) ([]Scenario, error) {
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

	return parseScenarios(out.String(), addonDirs), nil
}

func parseScenarios(output string, addonDirs []string) []Scenario {
	// Vanilla Scenarios
	vanilla := []Scenario{
		{ID: "{59AD59368755F41A}Missions/21_GM_Eden.conf", Name: "Game Master: Everon"},
		{ID: "{9002C691D8861B56}Missions/23_Campaign_North_Central.conf", Name: "Conflict: Arland"},
		{ID: "{59AD59368755F41A}Missions/23_Campaign.conf", Name: "Conflict: Everon"},
		{ID: "{59AD59368755F41A}Missions/CombatOps.conf", Name: "Combat Ops: Everon"},
		{ID: "{9002C691D8861B56}Missions/CombatOps_Arland.conf", Name: "Combat Ops: Arland"},
	}

	scenariosMap := make(map[string]Scenario)
	for _, s := range vanilla {
		scenariosMap[s.ID] = s
	}

	// Regex for {GUID}Missions/Name.conf
	re := regexp.MustCompile(`\{[A-F0-9-]+\}Missions/[^\s]+\.conf`)

	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		match := re.FindString(line)
		if match != "" {
			parts := strings.Split(match, "/")
			name := match
			if len(parts) > 1 {
				name = parts[len(parts)-1]
				name = strings.TrimSuffix(name, ".conf")
			}

			// Only add if not already present (prioritize CLI output if we want? or Vanilla?
			// Actually if CLI finds it, it might have same ID but different name display?
			// Let's overwrite with CLI found ones as they verify presence.
			scenariosMap[match] = Scenario{ID: match, Name: name}
		}
	}

	// Add manual scan results
	manualParams := ScanScenariosFromAddons(addonDirs)
	for _, s := range manualParams {
		if _, exists := scenariosMap[s.ID]; !exists {
			scenariosMap[s.ID] = s
		}
	}

	// Convert map to slice
	var scenarios []Scenario
	// First add vanilla ones to ensure order (if they exist in map)
	for _, v := range vanilla {
		if s, ok := scenariosMap[v.ID]; ok {
			scenarios = append(scenarios, s)
			delete(scenariosMap, v.ID)
		}
	}
	// Add remaining
	for _, s := range scenariosMap {
		scenarios = append(scenarios, s)
	}

	return scenarios
}

// ScanScenariosFromAddons manually scans addon directories for .conf files
func ScanScenariosFromAddons(roots []string) []Scenario {
	var scenarios []Scenario
	nameRegex := regexp.MustCompile(`m_sName\s+"([^"]+)"`)

	for _, root := range roots {
		_ = filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
			if err != nil {
				return nil
			}
			// Look for addon.gproj to identify mod root
			if !d.IsDir() && strings.ToLower(d.Name()) == "addon.gproj" {
				// Found a mod root
				modDir := filepath.Dir(path)
				dirName := filepath.Base(modDir)
				parts := strings.Split(dirName, "_")
				var guid string
				if len(parts) > 1 {
					guid = parts[len(parts)-1]
				} else {
					return nil // Can't determine GUID, skip
				}

				// Check Missions folder
				missionsDir := filepath.Join(modDir, "Missions")
				if _, err := os.Stat(missionsDir); err == nil {
					// Walk Missions dir
					_ = filepath.WalkDir(missionsDir, func(mPath string, mD os.DirEntry, mErr error) error {
						if mErr == nil && !mD.IsDir() && strings.HasSuffix(strings.ToLower(mD.Name()), ".conf") {
							// Found a scenario config
							relPath, _ := filepath.Rel(modDir, mPath)
							relPath = strings.ReplaceAll(relPath, "\\", "/")
							id := fmt.Sprintf("{%s}%s", guid, relPath)

							// Try to find name in file
							name := strings.TrimSuffix(mD.Name(), ".conf") // Default name
							content, err := os.ReadFile(mPath)
							if err == nil {
								match := nameRegex.FindSubmatch(content)
								if len(match) > 1 {
									name = string(match[1])
								}
							}

							scenarios = append(scenarios, Scenario{ID: id, Name: name})
						}
						return nil
					})
				}
			}
			return nil
		})
	}
	return scenarios
}
