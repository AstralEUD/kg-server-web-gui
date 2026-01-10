# Task: 통합 v1.0.3 개발 (버그 수정 + 기능 확장)

## 0. 긴급 버그 수정 (Server Start Failure)
- [ ] **[Server]** 경로 설정 인식 불가 문제 해결 [ ]
    - [ ] `internal/api/handlers/status.go` 또는 `restart.go`의 시작 로직 점검
    - [ ] `settings.json` 로드 및 유효성 검사 로직 수정

## 1. 버그 수정 및 안정화
- [ ] **[Auth]** 인증 우회 문제 해결 (`AuthProvider` 수정) [ ]
- [ ] **[Config]** 중복 Config 정리 (`next.config.ts` 삭제) [ ]
- [ ] **[Saves]** 세이브 페이지 클라이언트 에러 수정 (`frontend/src/app/saves/page.tsx`) [ ]

## 2. 기능 확장
- [ ] **[Dashboard]** 시스템 리소스(CPU/RAM/Disk/Net) 모니터링 [ ]
    - [ ] Backend: `gopsutil` 추가 및 `/api/status/resources` 구현
    - [ ] Frontend: 리소스 위젯 추가
- [ ] **[Workshop]** 모드 관리 강화 [ ]
    - [ ] 상세 정보(버전, 날짜) 및 의존성 표시
    - [ ] 모드 추가 시 의존성 자동 추가 로직
- [ ] **[Mission]** 미션 헤더 Raw 에디터 구현 [ ]
- [ ] **[Preset]** 서버 프로필(Profile) 시스템 구축 [ ]
    - [ ] Preset 구조체 확장 (Server Config + Mods + Scenarios)
    - [ ] UI에서 프로필 전환 기능 구현
- [ ] **[Environment]** 경로 자동 감지 [ ]
- [ ] **[UI]** 콘솔 창 확대 [ ]

## 3. 배포
- [ ] 버전 v1.0.3 업데이트 및 Release [ ]
