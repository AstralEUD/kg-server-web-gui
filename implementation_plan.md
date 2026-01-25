# Implementation Plan - 시스템 전반 재점검 및 리팩토링

사용자가 지적한 "엉성한" 시스템 구성을 개선하기 위해, 백엔드와 프론트엔드 전반에 걸쳐 아키텍처를 재정비하고 안정성을 강화합니다.

## User Review Required
> [!IMPORTANT]
> **API 응답 구조 변경**: 모든 API 응답을 `{ success: boolean, data: any, error: string }` 형태의 표준 래퍼로 감싸도록 변경할 예정입니다. 이는 프론트엔드 코드 수정이 동반되어야 합니다.
> **Watchdog 로직 변경**: 수동으로 서버를 정지할 경우, 해당 인스턴스의 감시만 일시 중지하도록 개선합니다.

## Proposed Changes

### 1. Backend Architecture (Go)

#### [MODIFY] `internal/agent/watchdog.go`
- **목표**: 수동 정지와 크래시 구분
- **변경**:
  - `WatchedInstance` 구조체에 `Active` (bool) 필드 추가.
  - `RegisterInstance` 시 `Active = true` 설정.
  - `StopMonitoring(instanceId)` 메서드 추가 (개별 중지).
  - 감시 루프에서 `Active`가 `true`인 경우에만 재시작 시도.

#### [MODIFY] `internal/server/instance.go`
- **목표**: 인스턴스 종료 시 Watchdog과 연동 개선
- **변경**:
  - `Stop(id)` 메서드에서 글로벌 `SetEnabled(false)` 대신 Watchdog의 `PauseMonitoring(id)` 호출.
  - `Start(id)` 메서드에서 Watchdog의 `ResumeMonitoring(id)` 호출.

#### [NEW] `internal/api/response.go`
- **목표**: 표준화된 API 응답 구조 정의
- **내용**:
  ```go
  type ApiResponse struct {
      Success bool   `json:"success"`
      Data    any    `json:"data,omitempty"`
      Error   string `json:"error,omitempty"`
  }
  ```

### 2. Frontend Architecture (Next.js)

#### [MODIFY] `src/lib/api.ts`
- **목표**: 타입 안정성 및 에러 핸들링 강화
- **변경**:
  - 제네릭 타입 지원: `apiFetch<T>(...)`
  - 응답 인터셉터 추가: `res.ok`가 아니거나 `success: false`일 경우 자동으로 에러 throw.
  - `toast` 알림 통합 옵션 추가.

#### [NEW] `src/types/schema.ts`
- **목표**: 백엔드와 프론트엔드 모델 동기화
- **내용**: `server.json` 및 주요 모델에 대한 TypeScript 인터페이스 정의를 한 곳으로 통합 (`app/**/*.tsx`에 산재된 인터페이스 제거).

### 3. Component Refactoring

#### [MODIFY] `src/app/config/page.tsx`
- **목표**: 거인 컴포넌트 분할
- **변경**: 탭별로 컴포넌트(`ConfigGeneral`, `ConfigNetwork` 등)를 분리하여 가독성 및 유지보수성 향상.

## Verification Plan

### Automated Tests
- `npm run build`: 프론트엔드 타입 에러 검출.
- `go build`: 백엔드 컴파일 확인.

### Manual Verification
1.  **서버 라이프사이클**: 시작 -> 수동 중지 -> (재시작 안 함 확인) -> 시작 -> (강제 종료) -> (자동 재시작 확인).
2.  **설정 저장**: 웹에서 설정 변경 후 `server.json`에 올바른 구조로 저장되는지 확인.
3.  **UI 반응**: API 에러 발생 시 UI에 적절한 토스트 메시지가 뜨는지 확인.
