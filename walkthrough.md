# Walkthrough: Github Release 자동화 수정 및 v1.0.1 배포

## 수정 내역

### 1. GitHub Action 권한 수정
- `.github/workflows/release.yml` 파일에 `permissions: contents: write` 설정을 추가하였습니다.
- 이 설정이 없으면 GITHUB_TOKEN이 Release를 생성하거나 파일을 업로드할 권한이 없어 배포가 실패하게 됩니다.

### 2. `.gitignore` 패턴 수정 및 누락 파일 복구
- 기존 `.gitignore`의 `server/` 패턴이 너무 광범위하여 `cmd/server/`와 `internal/server/` 등의 소스 코드 디렉토리까지 무시하고 있었습니다.
- 이를 `/server/` (루트 기준)로 수정하여 소스 코드가 Git에 정상적으로 포함되도록 하였습니다.
- 이로 인해 누락되었던 `cmd/server/main.go` 및 관련 internal 파일들이 레포지토리에 추가되었습니다.

### 3. 버전 업데이트 (v1.0.1)
- `cmd/server/main.go` 및 `frontend/package.json`의 버전을 `1.0.1`로 업데이트하였습니다.

## 결과 확인
- `v1.0.1` 태그와 함께 커밋이 푸쉬되었습니다.
- 이제 GitHub Actions가 정상적으로 작동하여 **Release**가 생성되고 `ServerManager.exe` 파일이 업로드될 것입니다.
