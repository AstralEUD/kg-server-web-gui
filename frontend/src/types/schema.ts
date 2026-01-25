// Shared Types from Backend

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface ServerConfig {
    bindAddress?: string;
    bindPort?: number;
    publicAddress?: string;
    publicPort?: number;
    a2s?: A2SConfig;
    game: GameConfig;
    operating?: OperatingConfig;
}

export interface A2SConfig {
    address?: string;
    port?: number;
}

export interface GameConfig {
    name: string;
    password?: string;
    passwordAdmin?: string;
    rconPassword?: string;
    rconPort?: number;
    scenarioId: string;
    maxPlayers: number;
    visible: boolean;
    crossPlatform: boolean;
    gameProperties: GameProps;
    mods?: ModEntry[];
    modsRequiredByDefault: boolean;
}

export interface GameProps {
    serverMaxViewDistance: number;
    serverMinGrassDistance: number;
    networkViewDistance: number;
    disableThirdPerson: boolean;
    fastValidation: boolean;
    battlEye: boolean;
    VONDisableUI: boolean;
    VONDisableDirectSpeechUI: boolean;
    VONCanTransmitCrossFaction: boolean;
    persistence?: PersistenceConfig;
    missionHeader?: Record<string, any>;
}

export interface PersistenceConfig {
    autoSaveInterval: number;
}

export interface ModEntry {
    modId: string;
    name?: string;
    version?: string;
    required?: boolean;
}

export interface OperatingConfig {
    lobbyPlayerSynchronise: boolean;
    playerSaveTime: number;
    aiLimit: number;
    slotReservationTimeout: number;
    disableServerShutdown: boolean;
    disableCrashReporter: boolean;
    disableAI: boolean;
    joinQueue: {
        maxSize: number;
    };
    disableNavmeshStreaming?: string[];
}

export interface ServerInstance {
    id: string;
    name: string;
    path: string;
    version: string;
    status: string; // "running" | "stopped" | "installing"
    pid: number;
    port: number;
    rconPort: number;
    autoRestart: boolean;
    watchdog: boolean;
}

export interface ResourceData {
    timestamp: string;
    cpu: number;
    ram: number;
    disk: number;
    netIn: number;
    netOut: number;
    fps: number;
    players: number;
    uptime: number;
}

export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    source: string;
}
