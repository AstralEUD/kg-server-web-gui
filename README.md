# Arma Reforger Server Manager (KG-Server-Web-GUI)

Arma Reforger 전용 서버를 쉽고 효율적으로 관리하기 위한 웹 기반 관리 도구입니다. 복잡한 CLI 명령어나 JSON 설정 파일을 직접 수정하는 수고 없이, 직관적인 대시보드를 통해 서버를 모니터링하고 설정할 수 있습니다.

![Go Version](https://img.shields.io/badge/go-1.23-blue.svg) ![Next.js](https://img.shields.io/badge/next.js-15.0-black.svg) ![License](https://img.shields.io/badge/license-Proprietary-red.svg)

## ✨ 주요 기능 (Key Features)

### 🖥️ 통합 대시보드 (Dashboard)
- **실시간 리소스 모니터링**: CPU, RAM, Disk, Network 사용량을 실시간 차트로 확인
- **프로세스 제어**: 서버 시작, 중지, 재시작 및 프로세스 상태(PID) 확인
- **빠른 프로필 전환**: 저장된 서버 설정을 원클릭으로 적용 (Scenario, Mods 등)
- **콘솔 뷰어**: 실시간 서버 로그 스트리밍 및 자동 스크롤 기능

### ⚙️ 설정 관리 (Configuration)
- **시각적 에디터**: `server.json` 파일의 복잡한 구조를 UI 폼으로 제공
- **고급 설정**: 네트워크, 게임 플레이, AI 제한, 저장 주기 등 상세 설정 지원
- **검증 로직**: 잘못된 설정 값을 방지하고 JSON 구조 무결성 보장

### 📦 워크샵 모드 관리 (Workshop Manager)
- **모드 검색**: Arma Reforger 창작마당(Workshop) 모드 검색 및 상세 정보 확인
- **의존성 자동 해결**: 모드 추가 시 필수 의존성 모드를 자동으로 감지하여 추가
- **버전 관리**: 설치된 모드의 버전 및 업데이트 상태 확인

### 📁 프로필 및 프리셋 (Profiles)
- **다중 설정 저장**: 상황(작전, 훈련, 테스트)에 맞는 서버 구성을 프로필로 저장
- **시나리오 관리**: 바닐라 시나리오 및 커스텀 미션 선택

---

## 🛠️ 기술 스택 (Tech Stack)

### Backend
- **Language**: Go (Golang)
- **Framework**: Fiber v2
- **Features**: 
  - Embedded Frontend (Single Binary Deployment)
  - Process Management (Win32 API/Exec)
  - WebSocket/SSE for real-time logs

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Styling**: TailwindCSS v4, Shadcn/UI
- **State**: React Hooks, SWR

---

## 🚀 설치 및 실행 (Installation)

### 사전 요구 사항 (Prerequisites)
- Windows OS (Server 2019+ or Windows 10/11)
- [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD) (자동 설치 지원 예정이나, 사전 설치 권장)
- Go 1.23+ (직접 빌드 시)
- Node.js 20+ (직접 빌드 시)

### 빌드 가이드 (Build)

1. **저장소 클론**
   ```bash
   git clone https://github.com/AstralEUD/kg-server-web-gui.git
   cd kg-server-web-gui
   ```

2. **프론트엔드 빌드**
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```
   > `cmd/server/frontend_build` 폴더로 빌드 결과물이 자동 복사됩니다.

3. **백엔드(통합) 빌드**
   ```bash
   # Windows
   go build -ldflags="-s -w" -o ServerManager.exe ./cmd/server
   ```

4. **실행**
   - 생성된 `ServerManager.exe` 파일 실행
   - 브라우저에서 `http://localhost:3000` 접속

---

## ⚠️ 라이선스 (License)

**Copyright (c) 2024-2026 Astral. All Rights Reserved.**

이 프로젝트의 소스 코드는 **비공개(Proprietary)** 라이선스를 따릅니다.
허가 없이 무단으로 복제, 배포, 수정 및 상업적 이용을 금지합니다.
자세한 내용은 `LICENSE` 파일을 참고하십시오.

---

## 🤝 기여 (Contributing)

이 프로젝트는 현재 비공개 개발 프로젝트입니다. 외부 기여는 제한적일 수 있습니다.
이슈 리포트나 개선 제안은 [Issues](https://github.com/AstralEUD/kg-server-web-gui/issues) 탭을 이용해 주세요.
