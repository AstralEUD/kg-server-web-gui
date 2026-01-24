package mapchange

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/astral/kg-server-web-gui/internal/agent"
	"github.com/astral/kg-server-web-gui/internal/config"
	"github.com/astral/kg-server-web-gui/internal/logs"
	"github.com/astral/kg-server-web-gui/internal/server"
	"github.com/astral/kg-server-web-gui/internal/settings"
)

// MapChangeService handles map changes from all channels (Discord, RCON, Web)
type MapChangeService struct {
	instanceMgr *server.InstanceManager
	configMgr   *config.ConfigManager
	settingsMgr *settings.SettingsManager
	discord     *agent.DiscordClient
	mappingMgr  *MappingManager
}

// NewMapChangeService creates a new map change service
func NewMapChangeService(
	instanceMgr *server.InstanceManager,
	configMgr *config.ConfigManager,
	settingsMgr *settings.SettingsManager,
	discord *agent.DiscordClient,
	mappingMgr *MappingManager,
) *MapChangeService {
	return &MapChangeService{
		instanceMgr: instanceMgr,
		configMgr:   configMgr,
		settingsMgr: settingsMgr,
		discord:     discord,
		mappingMgr:  mappingMgr,
	}
}

// ChangeMapBySlot changes map by slot number
func (s *MapChangeService) ChangeMapBySlot(instanceID string, slot int, requester string) error {
	mapping := s.mappingMgr.Get(slot)
	if mapping == nil {
		return fmt.Errorf("슬롯 %d에 등록된 맵이 없습니다", slot)
	}

	return s.ChangeMap(instanceID, mapping.ScenarioID, mapping.Name, requester)
}

// ChangeMap changes the map to the specified scenario
func (s *MapChangeService) ChangeMap(instanceID, scenarioID, mapName, requester string) error {
	logs.GlobalLogs.Info(fmt.Sprintf("[MapChange] 맵 변경 요청: %s → %s (요청자: %s)", instanceID, mapName, requester))

	// 1. Get config path
	configPath := s.getConfigPath(instanceID)
	if configPath == "" {
		return fmt.Errorf("설정 파일 경로를 찾을 수 없습니다")
	}

	// 2. Load current config
	data, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("설정 파일 로드 실패: %w", err)
	}

	var cfg map[string]interface{}
	if err := json.Unmarshal(data, &cfg); err != nil {
		return fmt.Errorf("설정 파일 파싱 실패: %w", err)
	}

	// 3. Update scenarioId
	game, ok := cfg["game"].(map[string]interface{})
	if !ok {
		game = make(map[string]interface{})
		cfg["game"] = game
	}

	oldScenario := ""
	if old, ok := game["scenarioId"].(string); ok {
		oldScenario = old
	}
	game["scenarioId"] = scenarioID

	// 4. Save config
	newData, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("설정 파일 직렬화 실패: %w", err)
	}

	if err := os.WriteFile(configPath, newData, 0644); err != nil {
		return fmt.Errorf("설정 파일 저장 실패: %w", err)
	}

	logs.GlobalLogs.Info(fmt.Sprintf("[MapChange] 설정 업데이트 완료: %s → %s", oldScenario, scenarioID))

	// 5. Restart server
	if err := s.restartServer(instanceID); err != nil {
		return fmt.Errorf("서버 재시작 실패: %w", err)
	}

	// 6. Send Discord notification
	if s.discord != nil {
		s.discord.SendMessage(
			"🗺️ 맵 변경됨",
			fmt.Sprintf("**%s**\n요청자: %s\n시나리오: `%s`", mapName, requester, scenarioID),
			agent.ColorBlue,
		)
	}

	logs.GlobalLogs.Info(fmt.Sprintf("[MapChange] 맵 변경 완료: %s", mapName))
	return nil
}

// ListMaps returns all registered map mappings
func (s *MapChangeService) ListMaps() []MapMapping {
	return s.mappingMgr.List()
}

// GetCurrentMap returns the current map for an instance
func (s *MapChangeService) GetCurrentMap(instanceID string) (*MapMapping, string, error) {
	configPath := s.getConfigPath(instanceID)
	if configPath == "" {
		return nil, "", fmt.Errorf("설정 파일 경로를 찾을 수 없습니다")
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, "", fmt.Errorf("설정 파일 로드 실패: %w", err)
	}

	var cfg config.ServerConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, "", fmt.Errorf("설정 파일 파싱 실패: %w", err)
	}

	currentScenario := cfg.Game.ScenarioID
	mapping := s.mappingMgr.GetByScenarioID(currentScenario)

	return mapping, currentScenario, nil
}

// getConfigPath returns the config file path for an instance
func (s *MapChangeService) getConfigPath(instanceID string) string {
	if instanceID == "default" {
		workDir, _ := os.Getwd()
		return workDir + "/server.json"
	}

	inst := s.instanceMgr.Get(instanceID)
	if inst != nil && inst.ConfigPath != "" {
		return inst.ConfigPath
	}

	return ""
}

// restartServer restarts the game server
func (s *MapChangeService) restartServer(instanceID string) error {
	// First, stop the server
	if err := s.instanceMgr.Stop(instanceID); err != nil {
		logs.GlobalLogs.Warn(fmt.Sprintf("[MapChange] 서버 중지 실패 (무시): %v", err))
	}

	// Wait a bit for clean shutdown
	time.Sleep(2 * time.Second)

	// Get the instance to retrieve stored args
	inst := s.instanceMgr.Get(instanceID)
	if inst == nil && instanceID != "default" {
		return fmt.Errorf("인스턴스를 찾을 수 없습니다: %s", instanceID)
	}

	// Start with default args (the router will inject proper paths)
	args := []string{"-server"}

	if err := s.instanceMgr.Start(instanceID, args); err != nil {
		return fmt.Errorf("서버 시작 실패: %w", err)
	}

	return nil
}

// GetMappingManager returns the mapping manager for direct access
func (s *MapChangeService) GetMappingManager() *MappingManager {
	return s.mappingMgr
}
