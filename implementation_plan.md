# Implementation Plan: Github Release 자동화 수정 및 신규 배포

## 개요
현재 GitHub Action에서 태그는 생성되나 Release가 생성되지 않는 문제를 해결하고, 버전을 1.0.1로 업데이트하여 재배포합니다.

## 변경 사항

### 1. GitHub Action 설정 수정 (`.github/workflows/release.yml`)
- `permissions: contents: write`를 추가하여 GITHUB_TOKEN이 Release를 생성할 수 있는 권한을 부여합니다.
- `softprops/action-gh-release@v2` 액션을 사용하여 안정적인 Release 생성을 보장합니다.

### 2. 버전 업데이트
- `cmd/server/main.go`: `const Version = "1.0.0"` -> `"1.0.1"`
- `frontend/package.json`: `"version": "1.0.0"` -> `"1.0.1"`

### 3. 배포 절차
- 변경 사항 커밋
- `v1.0.1` 태그 생성
- 메인 브랜치와 태그 푸쉬

## 검증 전략
- 로컬에서 빌드가 정상적으로 수행되는지 확인 (필요 시)
- GitHub Actions 탭에서 Release 생성 여부 및 빌드 결과물(ServerManager.exe) 업로드 확인
