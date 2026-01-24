# Task: Arma Reforger Panel v3.0.0 Major Release

## 1. Final Audit & Bug Fixes
- [x] **[Discord]** Fix `inst.Running` error in `bot.go`
- [x] **[Discord]** Enhance commands to support `!start [id]`, `!stop [id]`, `!status [id]`
- [x] **[Server]** Clean up `instance_rcon.go` (remove accidental comments)
- [x] **[Server]** Ensure `InstanceManager.Get()` returns fresh status

## 2. Release Preparation
- [x] **[Version]** Update version to `v3.0.0` in Backend (`main.go`)
- [x] **[Version]** Update version to `3.0.0` in Frontend (`package.json`)
- [x] **[Build]** Run a final build check (Frontend + Backend)

## 3. Deployment & Communication
- [x] **[Protocol]** Create `implementation_plan.md`
- [x] **[Protocol]** Update `walkthrough.md`
- [x] **[Release]** Finalize Release
