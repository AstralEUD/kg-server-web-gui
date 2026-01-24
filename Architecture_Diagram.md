# Architecture & Data Flow Diagrams (v3.0.0)

## 1. System Architecture (Single-Binary)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            🌐 Frontend (Next.js)                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐   │
│  │  Dashboard   │────│Config Editor │────│   Workshop   │────│ MobileNav│   │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────┘   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                               REST API / WebSocket
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                               📦 Backend (Go)                               │
│  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐   │
│  │   REST Handlers  │      │  InstanceManager │      │   ProcessMonitor │   │
│  └────────┬─────────┘      └────────┬─────────┘      └────────┬─────────┘   │
│           │                         │                         │             │
│  ┌────────▼─────────────────────────▼─────────────────────────▼──────────┐  │
│  │                        💼 Business Logic (Services)                   │  │
│  │  • InstanceManager: Multi-server lifecycle Control                    │  │
│  │  • Agent/Process: tasklist/taskkill integration                       │  │
│  │  • Workshop: Scraper for dependencies & images                        │  │
│  │  • Auth/Users: JSON-based authentication                              │  │
│  │  • Discord Bot: !start, !stop, !status commands                       │  │
│  └─────┬────────────────────────────┬────────────────────────────┬───────┘  │
│        │                            │                            │          │
│  ┌─────▼─────┐                ┌─────▼─────┐                ┌─────▼─────┐    │
│  │ JSON Storage│              │ RCON Client │              │  Discord  │    │
│  │ (Flat Files)│              │ (3rd party) │              │    API    │    │
│  └─────┬─────┘                └─────┬─────┘                └─────┬─────┘    │
└────────│────────────────────────────│────────────────────────────│──────────┘
         │                            │                            │
         │                ┌───────────▼───────────┐                │
         │                │ ArmaReforgerServer.exe│                │
         │                └───────────▲───────────┘                │
         │                            │                            │
         └────────────────────────────┴────────────────────────────┘
```

## 2. Server Control Flow (Multi-Instance)

1. **Request**: UI or Discord sends command `!start server_a`.
2. **InstanceManager**: Locates instance `server_a` using its ID.
3. **ResolveArgs**: Automatically injects `-config`, `-profile`, and `-addonDownloadDir` specific to `server_a`.
4. **ProcessMonitor**: Executes `tasklist` to check for collision, then starts `ArmaReforgerServer.exe`.
5. **Watchdog**: Registers the PID and monitors for unexpected exits.
6. **Notification**: Discord bot sends "✅ Server Started" message.

## 3. Workshop Scraping & Scenario Enrichment

1. **Query**: Client requests `/api/scenarios`.
2. **Agent**: Runs `ArmaReforgerServer.exe -listScenarios` and parses output.
3. **Enrichment**:
   - For each scenario, identifies its `ModID`.
   - Parallel calls to `workshop.GetAddonInfo(ModID)`.
   - Scraper parses `https://reforger.armaplatform.com/workshop/` for `og:image`.
4. **Response**: Returns JSON list of scenarios with `ImageURL` for UI rendering.

## 4. RCON Metrics Collection

1. **Ticker**: UI or background task polls for metrics.
2. **RCON**: Backend dials local RCON port (found in `server.json`).
3. **Commands**: Sends `status` and `players`.
4. **Parsing**:
   - Extracts FPS from `status` response.
   - Extracts player list, UID, and BEGUID from `players` table.
5. **UI**: Displays live FPS graph and interactive player management list.
