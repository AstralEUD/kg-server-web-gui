# 🌌 Arma Reforger Server Manager - Task List

## 📋 현재 상태
- [ ] Arma Reforger Server 실행 시 미션 로드 실패 문제 분석 및 해결 `[/]`
    - [x] 로그 분석: `MissionHeader::ReadMissionHeader cannot read mission file` 확인
    - [ ] `server.json` 생성 로직 확인
    - [ ] 워크샵 미션 경로(ScenarioId) 유효성 검사 로직 확인
    - [ ] 실제 파일 시스템상에 모드가 존재하는지 확인하는 로직 검토
- [ ] 워크샵 미션 불러오기 기능 개선
    - [ ] Workshop API 연동 부분 확인
    - [ ] 미션 선택 시 `scenarioId`가 올바르게 입력되는지 확인
- [ ] 로그인 페이지 403 Forbidden 오류 수정
    - [x] 원인 파악 및 수정 (Next.js export 구조 vs Go Fiber filesystem 충돌 해결)
    - [x] `next.config.mjs`에 `trailingSlash: true` 적용

