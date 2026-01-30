# Walkthrough - 바닐라 시나리오 완벽 수정 (v3.1.9 완료)

서버 바이너리(`ArmaReforgerServer.exe`)를 직접 분석하여 정확한 바닐라 시나리오 GUID를 확보하고, 이를 적용한 v3.1.9 버전을 릴리즈하였습니다.

## 작업 내용

### 1. 로그인 403 Forbidden 오류 수정 (v3.1.5)
- **해결**: `trailingSlash: true` 설정 적용.

### 2. 로그인 무한 리다이렉트 수정 (v3.1.6)
- **해결**: 401 에러 시 로컬 스토리지 초기화.

### 3. 서버 구동 및 시나리오 로딩 오류 수정 (v3.1.7)
- **해결**: 프론트엔드(`scenarios/page.tsx`)에서 시나리오 적용 시 Mod 자동 추가 로직 구현.

### 4. 바닐라 시나리오 GUID 최종 수정 (v3.1.9)
- **원인**: v3.1.8에서 적용한 프로젝트 GUID(`{58D0...}`)가 실제 미션 리소스 GUID와 일치하지 않음. 바닐라 미션들은 각자 고유한 GUID를 가지고 있음이 확인됨.
- **해결**: `ArmaReforgerServer.exe -listScenarios` 명령을 통해 실제 로드되는 정확한 GUID와 경로를 추출하여 `internal/agent/scenarios.go`에 적용.
    - 예: Conflict Arland → `{C41618FD18E9D714}Missions/23_Campaign_Arland.conf`
- **버전**: `3.1.9`로 업데이트 및 백엔드 재빌드 완료.
- **Git Release**: `v3.1.9` 태그 생성 및 푸시.



## 검증 결과
- **설정 변경**: `trailingSlash: true` 적용 확인.
- **Hotfix 적용**: `api.ts` 및 `auth-provider.tsx` 수정 확인.
- **Scenario Fix**: 정확한 GUID(`{C416...}` 등) 적용 확인 (v3.1.9).
- **Git Push**: `v3.1.9` 태그 푸시 성공.

## 다음 단계
- 실제 서버 환경에서 시나리오 변경 후 정상 구동 여부 최종 확인.
