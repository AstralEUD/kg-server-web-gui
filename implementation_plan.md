# Implementation Plan: v1.0.3 통합 업데이트

## 개요
인증 및 세이브 페이지의 긴급 버그 수정과 대시보드 리소스 모니터링, 워크샵 관리 등 주요 기능 확장을 모두 포함하여 v1.0.3으로 통합 배포합니다. 또한, "경로 설정 미인식"으로 인한 서버 시작 실패 문제도 함께 해결합니다.

## 🐛 버그 수정

### 1. Server Start Failure (Path Issue)
- **증상**: Settings에서 경로를 설정했음에도 서버 시작 시 경로 미설정 에러 발생.
- **원인 분석**: `ProcessManager`가 `SettingsManager`의 최신 상태를 참조하지 않거나, 초기화 시점에만 설정을 로드하고 런타임 변경 사항을 반영하지 못할 가능성.
- **수정**:
    - `internal/agent/process.go`: StartServer 호출 시마다 `SettingsManager`에서 최신 경로를 조회하도록 수정.
    - `internal/server/instance.go`: 만약 인스턴스 시작 로직이 분리되어 있다면 해당 부분도 점검. (현재 `process.go`가 메인으로 보임)

### 2. Auth Bypass
- **수정**: `frontend/src/components/auth-provider.tsx`에서 인증 실패 시 렌더링 차단 (return null).

### 3. Saves Page Crash
- **수정**: `frontend/src/app/saves/page.tsx`의 `formatDate` 함수에서 유효하지 않은 날짜 처리 추가.

### 4. Config Cleanup
- **수정**: `frontend/next.config.ts` 삭제.

## 🚀 기능 확장

### 1. Dashboard Resource Monitor
- **Backend**: `github.com/shirou/gopsutil` 사용. `/api/status/resources` 엔드포인트 구현 (CPU %, RAM 사용량/전체, Disk 사용량, Network Send/Recv).
- **Frontend**: `recharts` 또는 간단한 CSS 게이지 바를 사용하여 대시보드 상단에 리소스 상태 표시.

### 2. Workshop & Mods
- **Backend (`internal/workshop`)**:
    - `scraper.go`: Steam Workshop 페이지 파싱 로직 보강 (버전, 업데이트 날짜, 의존성 목록).
    - 모드 추가 시 의존성 재귀 탐색 및 일괄 추가 로직 구현.
- **Frontend**:
    - 모드 카드에 버전, 업데이트 날짜 표시.
    - 검색 결과에서 의존성 툴팁 표시.

### 3. Mission Header Editor
- **Frontend**: 기존 Form 입력을 `textarea` 기반의 JSON Editor로 교체. JSON 파싱 유효성 검사 경고 표시.

### 4. Server Profiles (Presets)
- **Architecture**: `internal/preset/manager.go` 구조체 변경.
    - `Preset` -> `Profile`
    - 필드: `ID`, `Name`, `ServerConfig` (json content), `Mods` ([]ModEntry), `ActiveScenario` (ID).
- **Frontend**: 사이드바 또는 상단 네비게이션에 "프로필 선택" 드롭다운 추가. 선택 시 해당 프로필의 설정/모드/시나리오를 로드하고 활성화.

### 5. Path Auto-detect
- **Backend (`internal/settings/manager.go`)**:
    - Windows 레지스트리 조회 (`golang.org/x/sys/windows/registry`) 추가.
    - Steam 설치 경로 쿼리 후 `Arma Reforger Server` 경로 추론.

### 6. UI Polish
- **Console**: 로그 영역 높이 늘리기 및 자동 스크롤 개선.

## ⚠️ User Review Required
- **프로필 시스템**: 기존 "프리셋" 데이터가 있다면 마이그레이션이 필요할 수 있습니다. (기존 데이터 삭제 후 재생성 권장)
