package agent

import (
	"encoding/xml"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// Mod represents a local mod
type Mod struct {
	Name         string   `json:"name"`
	ModID        string   `json:"modId"`
	Version      string   `json:"version"`
	Path         string   `json:"path"`
	Size         int64    `json:"size"`
	Dependencies []string `json:"dependencies"`
}

// Project represents addon.gproj XML structure
type Project struct {
	XMLName    xml.Name `xml:"Project"`
	Properties []Prop   `xml:"Property"`
	Deps       Deps     `xml:"Dependencies"`
}

type Prop struct {
	Name  string `xml:"name,attr"`
	Value string `xml:"value,attr"`
}

type Deps struct {
	Items []Dep `xml:"Dependency"`
}

type Dep struct {
	Value string `xml:"value,attr"`
}

// getDirSize calculates the total size of a directory recursively
func getDirSize(path string) int64 {
	var size int64
	filepath.WalkDir(path, func(_ string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if !d.IsDir() {
			info, err := d.Info()
			if err == nil {
				size += info.Size()
			}
		}
		return nil
	})
	return size
}

// ScanAddons recursively scans for addon.gproj
func ScanAddons(root string) ([]Mod, error) {
	var mods []Mod

	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if strings.ToLower(d.Name()) == "addon.gproj" {
			mod, err := parseGproj(path)
			if err == nil {
				mod.Path = filepath.Dir(path)
				mod.Size = getDirSize(mod.Path)

				// Extract GUID from folder name: "MyMod_595F2BF2F4E" -> "595F2BF2F4E"
				dirName := filepath.Base(mod.Path)
				parts := strings.Split(dirName, "_")
				if len(parts) > 1 {
					// Use the last part as GUID if it looks like one (hexadecimal)
					potentialID := parts[len(parts)-1]
					mod.ModID = potentialID
				} else if mod.ModID == "" {
					// Fallback: use directory name if no GUID found and not set in gproj
					mod.ModID = dirName
				}

				mods = append(mods, mod)
			}
			// Once we find addon.gproj, we don't need to scan deeper in THIS directory
			// but WalkDir doesn't support skipping subtrees easily from a file.
			// However, addon.gproj is usually at the root of a mod.
		}
		return nil
	})

	return mods, err
}

func parseGproj(path string) (Mod, error) {
	f, err := os.Open(path)
	if err != nil {
		return Mod{}, err
	}
	defer f.Close()

	byteValue, _ := io.ReadAll(f)

	var proj Project
	if err := xml.Unmarshal(byteValue, &proj); err != nil {
		return Mod{}, err
	}

	mod := Mod{}
	for _, p := range proj.Properties {
		if p.Name == "ProjectName" {
			mod.Name = p.Value
		}
		if p.Name == "ProjectVersion" {
			mod.Version = p.Value
		}
	}

	// Collect dependencies
	for _, d := range proj.Deps.Items {
		mod.Dependencies = append(mod.Dependencies, d.Value)
	}

	return mod, nil
}
