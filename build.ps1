$ErrorActionPreference = "Stop"

Write-Host "--- Frontend 빌드 시작 ---" -ForegroundColor Cyan
Set-Location frontend
npm install
npm run build
Set-Location ..

Write-Host "`n--- Frontend 빌드 결과 복사 ---" -ForegroundColor Cyan
$targetDir = "cmd/server/frontend_build"
if (Test-Path $targetDir) {
    Remove-Item -Recurse -Force $targetDir
}
New-Item -ItemType Directory -Path $targetDir | Out-Null
Copy-Item -Recurse frontend/out/* $targetDir

Write-Host "`n--- Go 백엔드 빌드 시작 (ServerManager.exe) ---" -ForegroundColor Cyan
go build -ldflags="-s -w" -o ServerManager.exe ./cmd/server

Write-Host "`n--- 빌드 완료! ---" -ForegroundColor Green
Write-Host "실행 파일: ServerManager.exe"
