# Walkthrough - 로그인 무한 리다이렉트 수정 및 v3.1.6 릴리즈 완료

로그인 시 발생하는 무한 리다이렉트 문제를 해결하고 v3.1.6 bugfix 버전을 릴리즈하였습니다.

## 작업 내용

### 1. 로그인 403 Forbidden 오류 수정 (v3.1.5)
- **원인**: Next.js 정적 빌드 시 `/login.html`과 `/login/` 폴더가 동시에 존재할 경우, Go Fiber 서버가 디렉토리로 오인하여 403 오류를 반환 현상 해결.
- **해결**: `next.config.mjs`에 `trailingSlash: true` 적용.

### 2. 로그인 무한 리다이렉트 수정 (v3.1.6)
- **증상**: 로그인 후 메인 페이지와 로그인 페이지가 무한 반복되는 현상.
- **원인**: 레거시 `auth_token`이 로컬 스토리지에 남아있어 클라이언트는 로그인 상태로 판단하지만, 실제 쿠키가 없어 서버는 401을 반환함. 401 핸들러가 스토리지를 비우지 않고 리다이렉트만 수행하여 루프 발생.
- **해결**:
    - `api.ts`: 401 에러(Unauthorized) 발생 시 `localStorage`의 인증 정보(`username`, `role`, `auth_token`)를 즉시 삭제하도록 수정.
    - `auth-provider.tsx`: 더 이상 사용하지 않는 `auth_token` 의존성을 제거하고, `username` 유무만으로 클라이언트 로그인 상태를 관리하도록 로직 개선.

### 3. 버전 업데이트 및 릴리즈
- `frontend/package.json`: 버전을 `3.1.6`으로 업데이트.
- `cmd/server/main.go`: `Version` 상수를 `3.1.6`으로 업데이트.
- **Git Release**: 변경사항 커밋 및 `v3.1.6` 태그 생성 후 원격 저장소 푸시 완료.

### 4. 서버 구동 실패 수정 (시나리오 Mod 누락) (Hotfix)
- **증상**: 시나리오 선택 후 서버 시작 시 `MissionHeader::ReadMissionHeader cannot read mission file` 에러 발생.
- **원인**: 프론트엔드에서 시나리오를 적용할 때, 해당 시나리오를 제공하는 Mod가 `server.json`의 `mods` 목록에 자동으로 추가되지 않아 엔진이 미션 파일을 찾지 못함.
- **해결**:
    - `scenarios/page.tsx`: 시나리오 적용(`applyScenario`) 시 해당 시나리오의 `modId`를 확인하고, `mods` 목록에 없으면 자동으로 추가하는 로직 구현.

## 검증 결과
- **설정 변경**: `trailingSlash: true` 적용 확인.
- **Hotfix 적용**: `api.ts` 및 `auth-provider.tsx` 수정 완료.
- **Scenario Fix**: `scenarios/page.tsx` 로직 수정 완료.
- **Git Push**: `main` 브랜치 및 `v3.1.6` 태그 푸시 성공.

## 다음 단계
- 빌드된 결과물을 실제 서버에 적용하여 로그인 페이지 접속 여부 최종 확인.
