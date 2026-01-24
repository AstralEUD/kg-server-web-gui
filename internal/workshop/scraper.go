package workshop

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

// AddonInfo represents metadata from Arma Platform Workshop
type AddonInfo struct {
	ID           string       `json:"id"`   // e.g., "61C769418AA32E81"
	Name         string       `json:"name"` // e.g., "COE2 - Worthy Islands"
	Summary      string       `json:"summary"`
	Description  string       `json:"description"`
	Version      string       `json:"version"`
	LastUpdated  string       `json:"lastUpdated"`
	License      string       `json:"license"`
	Tags         []string     `json:"tags"`
	ImageURL     string       `json:"imageUrl"`
	Dependencies []Dependency `json:"dependencies"`
	Scenarios    []Scenario   `json:"scenarios"`
}

type Dependency struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	URL  string `json:"url"`
}

type Scenario struct {
	ID   string `json:"scenarioId"` // e.g., "{CC1F3802A3EDDBD1}Missions/COE2_WorthyIslands.conf"
	Name string `json:"name"`
}

const baseURL = "https://reforger.armaplatform.com/workshop"

// GetAddonInfo fetches addon details from Arma Platform
func GetAddonInfo(addonID string) (*AddonInfo, error) {
	// The addonID can be just the ID or full slug (ID-Name)
	url := fmt.Sprintf("%s/%s", baseURL, addonID)

	info, err := scrapeAddonPage(url)
	if err != nil {
		return nil, fmt.Errorf("failed to scrape addon: %w", err)
	}

	// Fetch scenarios
	scenariosURL := fmt.Sprintf("%s/scenarios", url)
	scenarios, err := scrapeScenarios(scenariosURL)
	if err == nil {
		info.Scenarios = scenarios
	}

	return info, nil
}

func scrapeAddonPage(url string) (*AddonInfo, error) {
	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("failed to fetch page: %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	info := &AddonInfo{}

	// Extract ID from URL (format: /workshop/61C769418AA32E81-Name)
	urlParts := strings.Split(url, "/")
	if len(urlParts) > 0 {
		slug := urlParts[len(urlParts)-1]
		idParts := strings.SplitN(slug, "-", 2)
		if len(idParts) > 0 {
			info.ID = idParts[0]
		}
	}

	// Title (h1)
	info.Name = strings.TrimSpace(doc.Find("h1").First().Text())

	// Image (og:image or first big image)
	img, exists := doc.Find("meta[property='og:image']").Attr("content")
	if exists {
		info.ImageURL = img
	} else {
		// Fallback to searching for an image in the workshop card or main content
		imgSrc, exists := doc.Find("img[src*='/workshop/']").First().Attr("src")
		if exists {
			info.ImageURL = imgSrc
		}
	}

	// Summary (in code block after Summary heading)
	doc.Find("h2").Each(func(i int, s *goquery.Selection) {
		if strings.TrimSpace(s.Text()) == "Summary" {
			code := s.Next()
			if code.Is("pre") || code.Is("code") {
				info.Summary = strings.TrimSpace(code.Text())
			}
		}
		if strings.TrimSpace(s.Text()) == "Description" {
			code := s.Next()
			if code.Is("pre") || code.Is("code") {
				info.Description = strings.TrimSpace(code.Text())
			}
		}
	})

	// Dependencies (links under ## Dependencies)
	inDeps := false
	doc.Find("h2, a").Each(func(i int, s *goquery.Selection) {
		if s.Is("h2") {
			inDeps = strings.TrimSpace(s.Text()) == "Dependencies"
			return
		}
		if inDeps && s.Is("a") {
			href, exists := s.Attr("href")
			if exists && strings.Contains(href, "/workshop/") && !strings.Contains(href, "?tags=") {
				dep := Dependency{
					Name: strings.TrimSpace(s.Text()),
					URL:  href,
				}
				// Extract ID from href
				depParts := strings.Split(href, "/")
				if len(depParts) > 0 {
					slug := depParts[len(depParts)-1]
					idParts := strings.SplitN(slug, "-", 2)
					if len(idParts) > 0 {
						dep.ID = idParts[0]
					}
				}
				info.Dependencies = append(info.Dependencies, dep)
			}
		}
	})

	// Tags (links with ?tags=)
	doc.Find("a[href*='?tags=']").Each(func(i int, s *goquery.Selection) {
		tag := strings.TrimSpace(s.Text())
		if tag != "" {
			info.Tags = append(info.Tags, tag)
		}
	})

	// License
	doc.Find("a[href*='licenses']").Each(func(i int, s *goquery.Selection) {
		info.License = strings.TrimSpace(s.Text())
	})

	return info, nil
}

func scrapeScenarios(url string) ([]Scenario, error) {
	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("failed to fetch scenarios: %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	var scenarios []Scenario

	// Look for scenario IDs in format {GUID}Missions/xxx.conf
	re := regexp.MustCompile(`\{[A-F0-9]+\}Missions/[^\s"<>]+\.conf`)

	html, _ := doc.Html()
	matches := re.FindAllString(html, -1)

	seen := make(map[string]bool)
	for _, match := range matches {
		if seen[match] {
			continue
		}
		seen[match] = true

		// Extract name from path
		parts := strings.Split(match, "/")
		name := match
		if len(parts) > 1 {
			name = strings.TrimSuffix(parts[len(parts)-1], ".conf")
		}

		scenarios = append(scenarios, Scenario{
			ID:   match,
			Name: name,
		})
	}

	// Also check h2 headings on scenarios page for names
	doc.Find("h2").Each(func(i int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		if text != "" && !strings.HasPrefix(text, "COE2") { // Avoid duplicate title
			// This might be a scenario name
		}
	})

	return scenarios, nil
}

// SearchWorkshop searches the Arma Platform workshop
func SearchWorkshop(query string) ([]AddonInfo, error) {
	url := fmt.Sprintf("%s?search=%s", baseURL, query)

	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	var results []AddonInfo

	// Find addon cards/links
	doc.Find("a[href*='/workshop/']").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if !exists || strings.Contains(href, "?") {
			return
		}

		// Extract ID and name from href
		parts := strings.Split(href, "/")
		if len(parts) < 1 {
			return
		}
		slug := parts[len(parts)-1]
		idParts := strings.SplitN(slug, "-", 2)
		if len(idParts) < 2 {
			return
		}

		results = append(results, AddonInfo{
			ID:   idParts[0],
			Name: strings.TrimSpace(s.Text()),
		})
	})

	return results, nil
}

// ResolveDependencies recursively finds all dependencies for a list of root addons
func ResolveDependencies(rootIDs []string) ([]AddonInfo, error) {
	resolved := make(map[string]AddonInfo)
	pending := append([]string{}, rootIDs...)
	processed := make(map[string]bool)

	// Maximum depth to prevent infinite loops (rare but possible)
	for depth := 0; depth < 5 && len(pending) > 0; depth++ {
		var nextPending []string
		for _, id := range pending {
			if processed[id] {
				continue
			}
			processed[id] = true

			// Fetch info for this addon
			info, err := GetAddonInfo(id)
			if err != nil {
				continue // Skip failed items
			}

			// Add to resolved map (avoid duplicates)
			if _, exists := resolved[id]; !exists {
				resolved[id] = *info
			}

			// Add dependencies to next batch
			for _, dep := range info.Dependencies {
				if !processed[dep.ID] {
					nextPending = append(nextPending, dep.ID)
				}
			}
		}
		pending = nextPending
	}

	var result []AddonInfo
	for _, info := range resolved {
		result = append(result, info)
	}
	return result, nil
}
