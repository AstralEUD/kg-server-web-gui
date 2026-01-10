// Append this to the end of the file or appropriate location
func (im *InstanceManager) SendRconCommand(id string, command string) (string, error) {
	im.mu.RLock()
	inst, exists := im.instances[id]
	im.mu.RUnlock()

	if !exists {
		return "", fmt.Errorf("instance not found: %s", id)
	}

	configPath := inst.ConfigPath
	if configPath == "" {
		// Fallback for default instance
		if id == "default" && im.settingsMgr != nil {
			s := im.settingsMgr.Get()
			if s.ServerPath != "" {
				// Try common locations
				// Usually config is passed via -config
				// If we don't know the config, we can't find RCON password easily unless we parse the command line args?
				// But we store args in Watchdog, not here easily.
				// Let's assume ConfigPath MUST be set for RCON to work, or default to "server.json" in server root?
				configPath = filepath.Join(s.ServerPath, "server.json") // Reasonable default
			}
		}
	}

	if configPath == "" {
		return "", fmt.Errorf("configuration file not specified for instance")
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		return "", fmt.Errorf("failed to read config file (%s): %w", configPath, err)
	}

	var cfg config.ServerConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return "", fmt.Errorf("failed to parse config file: %w", err)
	}

	if cfg.Game.RconPassword == "" {
		return "", fmt.Errorf("RCON password not set in config")
	}
	if cfg.Game.RconPort == 0 {
		return "", fmt.Errorf("RCON port not set in config")
	}

	address := fmt.Sprintf("127.0.0.1:%d", cfg.Game.RconPort)
	client := rcon.NewClient(address, cfg.Game.RconPassword)
	defer client.Close()

	return client.Send(command)
}
