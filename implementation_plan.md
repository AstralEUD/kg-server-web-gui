# Implementation Plan: v3.0.0 Major Release

## Overview
This plan focuses on finalizing the Arma Reforger Panel for a major stable release. It addresses minor bugs identified during the audit and prepares the versioning for v3.0.0.

## 🐛 Bug Fixes & Improvements

### 1. Discord Bot Fixes
- **File**: `internal/discord/bot.go`
- **Fix**: Replace non-existent `inst.Running` with `inst.Status == "running"`.
- **Improvement**: Allow commands to take an optional instance ID.
    - `!start [id]` -> Starts instance `id`.
    - `!stop [id]` -> Stops instance `id`.
    - `!status [id]` -> Checks status of instance `id`.
    - Fallback to the bot's configured `instanceID` (default: "default") if no ID is provided.

### 2. Instance Manager Stability
- **File**: `internal/server/instance.go`
- **Improvement**: Update `Get(id)` to dynamically check the monitor for status, ensuring fresh data is returned.
- **File**: `internal/server/instance_rcon.go`
- **Cleanup**: Remove accidental AI meta-comments from the file.

### 3. Versioning
- **Files**: `cmd/server/main.go`, `frontend/package.json`
- **Action**: Update versions to `3.0.0`.

## 🚀 Release Strategy
1. Apply code fixes.
2. Verify frontend and backend build.
3. Update walkthrough documentation.
4. Prepare for major release.

## ⚠️ Risks
- Automated status updates in `Get()` might add slight overhead if called very frequently, but since it uses cached values from the monitor ticker, it should be fast.
