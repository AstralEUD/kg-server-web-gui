# Walkthrough: v3.0.0 Major Release - "Stability & multi-instance"

## 주요 업데이트 내역

### 1. 다중 인스턴스 및 RCON 통합
- **InstanceManager**를 통해 여러 서버 인스턴스(default, test 등)를 독립적으로 관리할 수 있습니다.
- 각 인스턴스는 고유한 `server.json`, `profile`, `addons` 경로를 가지며 격리된 환경에서 실행됩니다.
- **RCON 콘솔**이 통합되어 웹 UI에서 직접 서버 명령어를 전달하고 FPS, 플레이어 목록 등의 실시간 데이터를 수집합니다.

### 2. 시나리오 프리뷰 및 워크샵 연동
- 시나리오 목록에서 각 미션의 이미지를 자동으로 표시합니다.
- **Scraper**가 Arma Platform Workshop에서 해당 모드의 대표 이미지를 동적으로 긁어와 시나리오 카드에 풍부한 시각적 효과를 더합니다.

### 3. 디스코드 봇 제어 강화
- 디스코드에서 `!start`, `!stop`, `!status` 명령어로 서버를 제어할 수 있습니다.
- 특정 인스턴스 ID를 지정하여 (`!start test`) 원하는 서버를 원격으로 조작 가능합니다.
- 서버 상태 변경 시 디스코드 채널로 즉시 알림이 전송됩니다.

### 4. 모바일 최적화 (UX)
- 새로운 **MobileNav** 컴포넌트를 도입하여 모바일 환경에서도 모든 메뉴에 쉽게 접근할 수 있도록 햄버거 메뉴를 구현했습니다.
- 반응형 디자인을 통해 대시보드와 설정 화면이 작은 화면에서도 프리미엄한 느낌을 유지하도록 조정했습니다.

### 5. 아키텍처 정립 및 버그 수정
- `ResolveServerArgs` 로직을 중앙화하여 CLI 인자 주입의 일관성을 확보했습니다.
- `inst.Running` 필드 참조 오류 등 감사 과정에서 발견된 마이너 버그들을 모두 해결했습니다.
- 전체 버전을 **v3.0.0**으로 격상하여 정식 메이저 릴리즈를 준비했습니다.

## 기술적 상세
- **Backend**: Go (Fiber, discordgo, gopsutil)
- **Frontend**: Next.js 16 (React 19, Tailwind CSS 4, shadcn/ui)
- **Persistence**: JSON-based Flat File System (No DB required)
- **Monitoring**: Real-time process monitoring & resource tracking
