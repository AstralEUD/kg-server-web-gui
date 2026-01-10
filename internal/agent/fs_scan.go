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
	Dependencies []string `json:"dependencies"`
}

// Project represents addon.gproj XML structure
type Project struct {
	XMLName      xml.Name `xml:"Project"`
	Properties   []Prop   `xml:"Property"`
	Dependencies Deps     `xml:"Dependencies"`
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
				// ModID is usually the GUID in the folder name or inside gproj.
				// By convention, folder is "Name_GUID".
				// But let's trust gproj or folder name parsing.
				// For now, let's extract GUID from folder path if possible, or assume gproj has it (it often doesn't).
				// We'll extract from parent dir name: "MyMod_595F2BF2F4E" -> "595F2BF2F4E"

				dirName := filepath.Base(filepath.Dir(path))
				parts := strings.Split(dirName, "_")
				if len(parts) > 1 {
					mod.ModID = parts[len(parts)-1] // Last part is usually GUID
				}

				mod.Path = filepath.Dir(path)
				mods = append(mods, mod)
			}
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
	// Method 1: <Dependencies><Dependency value="..."/></Dependencies>
	for _, d := range proj.Dependencies.Items {
		mod.Dependencies = append(mod.Dependencies, d.Value)
	}

	// Method 2: <Property name="Dependencies" value="GUI1,GUID2" /> (Old format?)
	// If needed we can check Properties for "Dependencies" CSV string.

	return mod, nil
}
