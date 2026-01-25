package config

// ServerConfig represents the complete Arma Reforger server.json structure
type ServerConfig struct {
	BindAddress   string           `json:"bindAddress,omitempty"`
	BindPort      int              `json:"bindPort,omitempty"`
	PublicAddress string           `json:"publicAddress,omitempty"`
	PublicPort    int              `json:"publicPort,omitempty"`
	A2S           *A2SConfig       `json:"a2s,omitempty"`
	Rcon          *RconConfig      `json:"rcon,omitempty"`
	Game          GameConfig       `json:"game"`
	Operating     *OperatingConfig `json:"operating,omitempty"`
}

type RconConfig struct {
	Address    string   `json:"address"`
	Port       int      `json:"port,omitempty"`
	Password   string   `json:"password,omitempty"`
	Permission string   `json:"permission,omitempty"` // monitor, admin, etc.
	Blacklist  []string `json:"blacklist,omitempty"`
	Whitelist  []string `json:"whitelist,omitempty"`
}

type GameConfig struct {
	Name          string `json:"name"`
	Password      string `json:"password,omitempty"`
	PasswordAdmin string `json:"passwordAdmin,omitempty"`
	RconPassword  string `json:"rconPassword,omitempty"`
	RconPort      int    `json:"rconPort,omitempty"`
	// Admins             []string `json:"admins,omitempty"` // Deprecated/Separate config
	ScenarioID    string `json:"scenarioId"`
	MaxPlayers    int    `json:"maxPlayers"`
	Visible       bool   `json:"visible"`
	CrossPlatform bool   `json:"crossPlatform"`
	// SupportedPlatforms []string `json:"supportedPlatforms,omitempty"` // Engine warning

	GameProperties GameProps `json:"gameProperties"`

	Mods                  []ModEntry `json:"mods,omitempty"`
	ModsRequiredByDefault bool       `json:"modsRequiredByDefault"`
}

type GameProps struct {
	ServerMaxViewDistance      int  `json:"serverMaxViewDistance"`
	ServerMinGrassDistance     int  `json:"serverMinGrassDistance"`
	NetworkViewDistance        int  `json:"networkViewDistance"`
	DisableThirdPerson         bool `json:"disableThirdPerson"`
	FastValidation             bool `json:"fastValidation"`
	BattlEye                   bool `json:"battlEye"`
	VONDisableUI               bool `json:"VONDisableUI"`
	VONDisableDirectSpeechUI   bool `json:"VONDisableDirectSpeechUI"`
	VONCanTransmitCrossFaction bool `json:"VONCanTransmitCrossFaction"`

	Persistence   PersistenceConfig   `json:"persistence,omitempty"`
	MissionHeader MissionHeaderConfig `json:"missionHeader,omitempty"`
}

type PersistenceConfig struct {
	AutoSaveInterval int `json:"autoSaveInterval"`
}

// MissionHeaderConfig uses map to preserve all custom fields (COE2, etc.)
type MissionHeaderConfig = map[string]any

// Custom Unmarshal for MissionHeader to capture all fields?
// For now let's just use map[string]interface{} or specific struct if we want.
// User sample: m_sName, m_sAuthor, m_sDescription, m_sDetails, m_iPlayerCount, etc.
// Let's use a struct with fields matching the user sample for now.

type ModEntry struct {
	ModID    string `json:"modId"`
	Name     string `json:"name,omitempty"`
	Version  string `json:"version,omitempty"` // For info
	Required bool   `json:"required,omitempty"`
}

type A2SConfig struct {
	Address string `json:"address"`
	Port    int    `json:"port,omitempty"`
}

type OperatingConfig struct {
	LobbyPlayerSynchronise bool `json:"lobbyPlayerSynchronise"`
	PlayerSaveTime         int  `json:"playerSaveTime"`
	AILimit                int  `json:"aiLimit"`
	SlotReservationTimeout int  `json:"slotReservationTimeout"`
	DisableServerShutdown  bool `json:"disableServerShutdown"`
	DisableCrashReporter   bool `json:"disableCrashReporter"`
	DisableAI              bool `json:"disableAI"`

	JoinQueue JoinQueueConfig `json:"joinQueue"`

	DisableNavmeshStreaming []string `json:"disableNavmeshStreaming,omitempty"` // Array in user sample
}

type JoinQueueConfig struct {
	MaxSize int `json:"maxSize"`
}

// AdvancedSettings represents Longbow-style advanced server launch parameters
type AdvancedSettings struct {
	// Limit Server Max FPS
	LimitServerMaxFPS bool `json:"limitServerMaxFPS"`
	MaxFPS            int  `json:"maxFPS,omitempty"`

	// Auto Restart
	AutoRestart bool   `json:"autoRestart"`
	RestartTime string `json:"restartTime,omitempty"` // HH:MM format

	// Verify and Repair Addons
	VerifyRepairAddons bool `json:"verifyRepairAddons"`

	// Restart on Game Destroyed
	RestartOnGameDestroyed bool `json:"restartOnGameDestroyed"`

	// Auto Reload Scenario
	AutoReloadScenario     bool `json:"autoReloadScenario"`
	ReloadScenarioInterval int  `json:"reloadScenarioInterval,omitempty"` // seconds

	// Load Session Save
	LoadSessionSave bool   `json:"loadSessionSave"`
	SessionSavePath string `json:"sessionSavePath,omitempty"`

	// No Backend
	NoBackend bool `json:"noBackend"`

	// Auto Shutdown
	AutoShutdown bool `json:"autoShutdown"`

	// Log Writing
	LogWriting bool   `json:"logWriting"`
	LogLevel   string `json:"logLevel,omitempty"` // normal, warning, error, fatal

	// Override Port
	OverridePort bool `json:"overridePort"`
	Port         int  `json:"port,omitempty"`

	// Network Dynamic Simulation
	NetworkDynamicSimulation bool `json:"networkDynamicSimulation"`
	NetworkDynamicSimValue   int  `json:"networkDynamicSimValue,omitempty"`

	// Spatial Map Resolution
	SpatialMapResolution bool `json:"spatialMapResolution"`
	SpatialMapResValue   int  `json:"spatialMapResValue,omitempty"`

	// Staggering Budget
	StaggeringBudget      bool `json:"staggeringBudget"`
	StaggeringBudgetValue int  `json:"staggeringBudgetValue,omitempty"`

	// AI Partial Sim
	AIPartialSim bool `json:"aiPartialSim"`

	// Force Recreate Database
	ForceRecreateDatabase bool `json:"forceRecreateDatabase"`

	// Debugger
	DebuggerAddress      bool   `json:"debuggerAddress"`
	DebuggerAddressValue string `json:"debuggerAddressValue,omitempty"`
	DebuggerPort         bool   `json:"debuggerPort"`
	DebuggerPortValue    int    `json:"debuggerPortValue,omitempty"`

	// Shaders
	DisableShadersGeneration bool `json:"disableShadersGeneration"`
	ForceGenerateShaders     bool `json:"forceGenerateShaders"`

	// BPI Encode as Long Job
	BPIEncodeAsLongJob bool `json:"bpiEncodeAsLongJob"`

	// Worker Counts
	ShortWorkerCount      bool `json:"shortWorkerCount"`
	ShortWorkerCountValue int  `json:"shortWorkerCountValue,omitempty"`
	LongWorkerCount       bool `json:"longWorkerCount"`
	LongWorkerCountValue  int  `json:"longWorkerCountValue,omitempty"`

	// Freeze Check
	FreezeCheck          bool   `json:"freezeCheck"`
	FreezeCheckValue     int    `json:"freezeCheckValue,omitempty"` // seconds
	FreezeCheckMode      bool   `json:"freezeCheckMode"`
	FreezeCheckModeValue string `json:"freezeCheckModeValue,omitempty"` // crash, restart

	// Force Disable Night Grab
	ForceDisableNightGrab bool `json:"forceDisableNightGrab"`

	// Experimental / UPnP / Keep Up to Date
	UseExperimentalServer bool `json:"useExperimentalServer"`
	UseUPnP               bool `json:"useUPnP"`
	KeepServerUpToDate    bool `json:"keepServerUpToDate"`
}
