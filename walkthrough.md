# Walkthrough - 로그인 Forbidden 오류 수정 및 v3.1.5 릴리즈 완료

로그인 페이지 접속 시 발생하던 403 Forbidden 오류를 해결하고 v3.1.5 bugfix 버전을 릴리즈하였습니다.

## 작업 내용

### 1. 로그인 403 Forbidden 오류 수정
- **원인**: Next.js 정적 빌드 시 `/login.html`과 `/login/` 폴더가 동시에 존재할 경우, Go Fiber 서버가 디렉토리로 오인하여 403 오류를 반환하는 현상 확인.
- **해결**: `frontend/next.config.mjs`에 `trailingSlash: true` 옵션을 적용하여 `/login/index.html` 구조로 명확히 생성되도록 수정.

### 2. 버전 업데이트 및 릴리즈
- `frontend/package.json`: 버전을 `3.1.4`에서 `3.1.5`로 업데이트.
- `cmd/server/main.go`: `Version` 상수를 `3.1.5`로 업데이트.
- **Git Release**: 변경사항 커밋 및 `v3.1.5` 태그 생성 후 원격 저장소 푸시 완료.

### 3. 로그인 무한 리다이렉트 (Hotfix)
- **증상**: 로그인 후 메인 페이지와 로그인 페이지가 무한 반복되는 현상.
- **원인**: 레거시 `auth_token`이 로컬 스토리지에 남아있어 클라이언트는 로그인 상태로 판단하지만, 실제 쿠키가 없어 서버는 401을 반환함. 401 핸들러가 스토리지를 비우지 않고 리다이렉트만 수행하여 루프 발생.
- **해결**:
    - `api.ts`: 401 에러 발생 시 `localStorage`의 모든 인증 정보(`username`, `role`, `auth_token`)를 삭제하도록 수정.
    - `auth-provider.tsx`: 더 이상 사용하지 않는 `auth_token` 의존성을 제거하고 `username`만으로 클라이언트 로그인 상태를 판단하도록 로직 간소화.

## 검증 결과
- **설정 변경**: `trailingSlash: true` 적용 확인.
- **Git Push**: `main` 브랜치 및 `v3.1.5` 태그 푸시 성공.
- **Hotfix 적용**: `api.ts` 및 `auth-provider.tsx` 수정 완료.

## 다음 단계
- 빌드된 결과물을 실제 서버에 적용하여 로그인 페이지 접속 여부 최종 확인.
