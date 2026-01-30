# Walkthrough - 시나리오 로딩 오류 수정 및 v3.1.7 릴리즈 완료

시나리오 선택 시 필요한 모드가 누락되어 서버가 구동되지 않던 문제를 해결하고 v3.1.7 버전을 릴리즈하였습니다.

## 작업 내용

### 1. 로그인 403 Forbidden 오류 수정 (v3.1.5)
- **원인**: Next.js 정적 빌드 시 파일/폴더 이름 충돌로 인한 403 에러.
- **해결**: `trailingSlash: true` 설정 적용.

### 2. 로그인 무한 리다이렉트 수정 (v3.1.6)
- **원인**: 만료된 `auth_token`이 남아있어 발생하는 무한 루프.
- **해결**: 401 에러 시 로컬 스토리지 초기화 로직 추가.

### 3. 서버 구동 및 시나리오 로딩 오류 수정 (v3.1.7)
- **증상**: `MissionHeader::ReadMissionHeader cannot read mission file` 에러로 서버 시작 불가.
- **원인**: 시나리오 선택 시 해당 미션이 포함된 Mod가 `server.json`에 자동으로 등록되지 않음.
- **해결**: `scenarios/page.tsx`에서 시나리오 적용 시 관련 Mod를 `mods` 목록에 자동 추가하도록 수정.

### 4. 버전 업데이트 및 릴리즈
- `frontend/package.json`: 버전을 `3.1.7`로 업데이트.
- `cmd/server/main.go`: `Version` 상수를 `3.1.7`으로 업데이트.
- **Git Release**: 변경사항 커밋 및 `v3.1.7` 태그 생성 후 원격 저장소 푸시 완료.

## 검증 결과
- **설정 변경**: `trailingSlash: true` 적용 확인.
- **Hotfix 적용**: `api.ts` 및 `auth-provider.tsx` 수정 확인.
- **Scenario Fix**: 시나리오 적용 시 Mod 자동 추가 확인.
- **Git Push**: `v3.1.7` 태그 푸시 성공.

## 다음 단계
- 실제 서버 환경에서 시나리오 변경 후 정상 구동 여부 최종 확인.
