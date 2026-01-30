# Walkthrough - 시나리오 및 바닐라 미션 로딩 오류 수정 (v3.1.8 완료)

서버 구동 실패 원인이었던 시나리오 Mod 누락 문제와 바닐라 미션 GUID 불일치 문제를 해결하고 v3.1.8 버전을 릴리즈하였습니다.

## 작업 내용

### 1. 로그인 403 Forbidden 오류 수정 (v3.1.5)
- **원인**: Next.js 정적 빌드 403 에러.
- **해결**: `trailingSlash: true` 설정 적용.

### 2. 로그인 무한 리다이렉트 수정 (v3.1.6)
- **원인**: 만료된 `auth_token`으로 인한 무한 루프.
- **해결**: 401 에러 시 로컬 스토리지 초기화.

### 3. 서버 구동 및 시나리오 로딩 오류 수정 (v3.1.7)
- **증상**: `MissionHeader` 에러로 서버 시작 불가.
- **원인**: 시나리오 선택 시 Mod 자동 등록 누락.
- **해결**: 프론트엔드(`scenarios/page.tsx`)에서 시나리오 적용 시 Mod 자동 추가 로직 구현.

### 4. 바닐라 시나리오 GUID 수정 및 릴리즈 (v3.1.8)
- **증상**: 기본(Vanilla) 시나리오 선택 시 에러 발생.
- **원인**: 백엔드(`internal/agent/scenarios.go`)의 하드코딩된 GUID가 구버전임.
- **해결**: **v3.1.8**에서 바닐라 시나리오 GUID를 `{58D0FB3206B6F859}`로 일괄 업데이트 및 백엔드 재빌드.
- **버전**: `frontend/package.json` 및 `cmd/server/main.go`를 `3.1.8`로 업데이트.
- **Git Release**: `v3.1.8` 태그 생성 및 푸시 완료.



## 검증 결과
- **설정 변경**: `trailingSlash: true` 적용 확인.
- **Hotfix 적용**: `api.ts` 및 `auth-provider.tsx` 수정 확인.
- **Scenario Fix**: Frontend(Mod 자동 추가) 및 Backend(GUID 수정) 적용 확인.
- **Git Push**: `v3.1.8` 태그 푸시 성공.

## 다음 단계
- 실제 서버 환경에서 시나리오 변경 후 정상 구동 여부 최종 확인.
