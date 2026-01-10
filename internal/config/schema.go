package config

// ServerConfig represents the complete Arma Reforger server.json structure
// Based on Longbow tool and official documentation
type ServerConfig struct {
	// Root level (used for direct parameters)
	DedicatedServerID string `json:"dedicatedServerId,omitempty"`
	Region            string `json:"region,omitempty"`
	GameHostBindAddr  string `json:"gameHostBindAddress,omitempty"`
	GameHostBindPort  int    `json:"gameHostBindPort,omitempty"`
	GameHostRegPort   int    `json:"gameHostRegisterBindPort,omitempty"`
	AdminPassword     string `json:"adminPassword,omitempty"`

	// Game section
	Game GameConfig `json:"game"`

	// A2S (Steam Query) section
	A2S A2SConfig `json:"a2s,omitempty"`

	// RCON section
	RCON RCONConfig `json:"rcon,omitempty"`

	// Operating section
	Operating OperatingConfig `json:"operating,omitempty"`
}

type GameConfig struct {
	Name                  string     `json:"name"`
	Password              string     `json:"password,omitempty"`
	ScenarioID            string     `json:"scenarioId"`
	MaxPlayers            int        `json:"maxPlayers"`
	Visible               bool       `json:"visible"`
	CrossPlatform         bool       `json:"crossPlatform"`
	SupportedPlatforms    []string   `json:"supportedPlatforms,omitempty"`
	GameProperties        GameProps  `json:"gameProperties"`
	Mods                  []ModEntry `json:"mods,omitempty"`
	ModsRequiredByDefault bool       `json:"modsRequiredByDefault"`

	// Admins
	Admins []string `json:"admins,omitempty"`

	// VON settings
	DisableVON                 bool `json:"disableVON"`
	VONDisableUI               bool `json:"VONDisableUI"`
	VONDisableDirectSpeechUI   bool `json:"VONDisableDirectSpeechUI"`
	VONCanTransmitCrossFaction bool `json:"VONCanTransmitCrossFaction"`

	// BattlEye
	BattlEye bool `json:"battlEye"`

	// Third person
	DisableThirdPerson bool `json:"disableThirdPerson"`

	// Fast validation
	FastValidation bool `json:"fastValidation"`

	// Lobby settings
	LobbyPlayerSynchronise bool `json:"lobbyPlayerSynchronise"`
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
}

type ModEntry struct {
	ModID    string `json:"modId"`
	Name     string `json:"name,omitempty"`
	Version  string `json:"version,omitempty"`
	Required bool   `json:"required,omitempty"`
}

type A2SConfig struct {
	Address string `json:"address,omitempty"`
	Port    int    `json:"port,omitempty"`
}

type RCONConfig struct {
	Address    string   `json:"address,omitempty"`
	Port       int      `json:"port,omitempty"`
	Password   string   `json:"password,omitempty"`
	MaxClients int      `json:"maxClients,omitempty"`
	Permission string   `json:"permission,omitempty"` // ADMIN, MONITOR
	Blacklist  []string `json:"blacklist,omitempty"`
	Whitelist  []string `json:"whitelist,omitempty"`
}

type OperatingConfig struct {
	// Auto save settings
	AutoSaveInterval int      `json:"interval,omitempty"` // minutes
	Databases        []string `json:"databases,omitempty"`
	Storages         []string `json:"storages,omitempty"`

	// Player settings
	PlayerSaveTime         int `json:"playerSaveTime,omitempty"`
	SlotReservationTimeout int `json:"slotReservationTimeout,omitempty"`

	// Disable settings
	DisableAI                       bool `json:"disableAI,omitempty"`
	DisableServerShutdown           bool `json:"disableServerShutdown,omitempty"`
	DisableNavmeshStreaming         bool `json:"disableNavmeshStreaming,omitempty"`
	DisableSpecificNavmeshStreaming int  `json:"disableSpecificNavmeshStreaming,omitempty"`
	DisableCrashReporter            bool `json:"disableCrashReporter,omitempty"`

	// AI settings
	AILimit int `json:"aiLimit,omitempty"`

	// Queue settings
	JoinQueueMaxSize int `json:"joinQueueMaxSize,omitempty"`

	// Hive ID
	HiveID string `json:"hiveID,omitempty"`
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
