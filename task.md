# Task: 시스템 전반 재점검 및 리팩토링 (System Health Check & Refactoring)

사용자의 요청에 따라 "엉성한" 부분을 식별하고 시스템의 안정성, 일관성, 완성도를 높이기 위한 대규모 점검 및 수정 작업입니다.

## 1. 현황 분석 및 계획 (Analysis & Planning)
- [x] 시스템 아키텍처 및 코드 구조 분석 (백엔드/프론트엔드) [x]
- [x] 데이터 모델 일관성 검토 (`server.json` vs UI vs 내부 로직) [x]
- [x] 사용자 경험(UX) 및 UI 일관성 점검 [x]
- [x] 구현 계획서 (`implementation_plan.md`) 작성 및 승인 요청 [x]

## 2. 백엔드 리팩토링 (Backend Refactoring)
- [x] `internal/api`: 핸들러 구조 표준화 및 에러 응답 통일 [x]
- [x] `internal/config`: 설정 스키마 검증 로직 강화 및 기본값 관리 개선 [x]
- [x] `internal/server`: 프로세스 관리 및 모니터링 로직 안정화 (Races, Zombies 방지) [x]
- [x] `internal/agent`: 외부 프로세스(RCON, SteamCMD) 연동 로직 견고화 (Watchdog 개선 포함) [x]

## 3. 프론트엔드 리팩토링 (Frontend Refactoring)
- [x] API 통신 계층 (`src/lib/api.ts`) 개선 및 타입 안정성 확보 [x]
- [x] 컴포넌트 구조 재정비 (중복 제거, 재사용성 향상) [x]
- [x] 상태 관리 최적화 (불필요한 리렌더링 방지, 즉각적인 UI 피드백) [x]
- [x] UI/UX 개선 (로딩 상태, 에러 메시지, 레이아웃 일관성) [x]

## 4. 통합 테스트 및 검증 (Integration & Verification)
- [x] 전체 빌드 및 배포 사이클 테스트 [x]
- [x] 주요 시나리오(서버 시작/중지, 설정 변경, 모드 관리) E2E 테스트 (수동) [x]
- [x] 회귀 테스트 및 최종 버그 수정 [x]

## 5. 로그인 기능 점검 (Login Debugging)
- [x] 로그인 관련 코드 분석 (Frontend/Backend) [x]
- [x] API 호출 및 인증 흐름 검증 [x]
- [x] 쿠키/세션 처리 로직 확인 [x]
- [x] 문제 해결 및 검증 [x]
