# Arma Reforger Server Management Web Panel
## 개발 설계안 (Complete Design Document)

---

## 1. 프로젝트 개요

**목표**: Arma Reforger Dedicated Server(Windows)의 모든 운영(모드, 시나리오, 설정, 미션 즉시 전환)을 **미려한 웹 UI**에서 통합 관리

**핵심 특징**:
- ✅ 설정 JSON 편집(server.json) + 검증 + 백업 + 즉시 적용(재시작)
- ✅ 로컬 addon.gproj 스캔 + Workshop 웹 API 수집 → 의존성 관리 + 자동 포함
- ✅ `-listScenarios` 엔진 스크랩 + 번호 매핑(kgmission) → 미션 즉시 전환
- ✅ SteamCMD 업데이트/검증 + 스케줄러
- ✅ Job 큐(작업 직렬화) + 실시간 로그(WebSocket/SSE)
- ✅ 감사로그 + 권한 관리 + 역할 기반 접근(RBAC)
- ✅ Discord 봇 원격 제어(선택)

---

## 2. 아키텍처

### 2.1 계층 구조(3계층 + 메시징)

```
┌─────────────────────────────────────────────────────┐
│  프론트엔드 (Next.js + React + Tailwind + shadcn)   │
│  - Dashboard, Config Editor, Mods, Scenarios, Jobs  │
│  - WebSocket/SSE로 실시간 로그/상태 수신             │
└──────────────────┬──────────────────────────────────┘
                   │ REST API + WebSocket
┌──────────────────▼──────────────────────────────────┐
│     백엔드 (Go: Fiber/Gin + PostgreSQL)              │
│  - REST 엔드포인트 (설정/모드/시나리오/작업)          │
│  - Job 큐(Redis or in-memory) + Worker threads     │
│  - Workshop 웹 스크래핑/API 호출                     │
│  - 감사로그 + 권한 검증                              │
│  - WebSocket/SSE 브로드캐스트                       │
└──────────────────┬──────────────────────────────────┘
                   │ gRPC or HTTP
┌──────────────────▼──────────────────────────────────┐
│   로컬 Windows 에이전트 (kgagent)                   │
│  - addons 폴더 스캔 (addon.gproj 파싱)              │
│  - -listScenarios 실행 + 파싱                       │
│  - server.json 읽기/쓰기                            │
│  - 프로세스 제어(서버 시작/종료/재시작)             │
│  - SteamCMD 실행                                     │
│  - 파일 시스템 정리(휴지통 이동)                     │
└──────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름 예시

#### 미션 번호 전환(`!kgmission 13`)
```
[인게임 채팅 명령]
  ↓
[모드 → next.json 기록]
  ↓
[kgagent 감시 또는 REST API]
  ↓
[Go 백엔드 검증 + Job 큐에 추가]
  ↓
[Job Worker: server.json scenarioId 교체]
  ↓
[kgagent: 프로세스 재시작]
  ↓
[프론트 WebSocket로 상태 수신 + 표시]
```

#### 모드 의존성 자동 포함
```
[사용자 설정에 "모드 X" 추가]
  ↓
[Go 백엔드가 로컬/Workshop 메타 조회]
  ↓
[addon.gproj 파싱 + Workshop API → 의존성 목록]
  ↓
[사용자가 "자동 포함" 클릭]
  ↓
[의존성 모드들 자동 추가 + UI 표시]
  ↓
[server.json game.mods에 반영 + 적용]
```

---

## 3. 데이터베이스 스키마(PostgreSQL)

```sql
-- Profiles (경로 설정)
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  server_json_path VARCHAR(1024),
  profile_path VARCHAR(1024),
  addons_path VARCHAR(1024),
  steamcmd_path VARCHAR(1024),
  steamcmd_root VARCHAR(1024),
  server_exe_path VARCHAR(1024),
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Scenarios (미션 목록)
CREATE TABLE scenarios (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  scenario_id VARCHAR(512), -- {GUID}Missions/xxx.conf
  name VARCHAR(255),
  mission_number INT, -- kgmission 번호 (1-10)
  required_mods TEXT[], -- modId 배열
  description TEXT,
  is_custom BOOLEAN DEFAULT false,
  scraped_at TIMESTAMP,
  created_at TIMESTAMP
);

-- Mods (설치/가용 모드)
CREATE TABLE mods (
  id UUID PRIMARY KEY,
  mod_id VARCHAR(128) UNIQUE, -- GUID
  name VARCHAR(255),
  version VARCHAR(50),
  is_installed BOOLEAN DEFAULT false,
  is_configured BOOLEAN DEFAULT false, -- server.json에 포함됨
  source VARCHAR(50), -- 'local' or 'workshop'
  workshop_id BIGINT, -- Steam Workshop ID
  workshop_url VARCHAR(512),
  dependencies TEXT[], -- 의존 modId 배열
  mod_metadata JSONB, -- 일반 메타(다운로드수 등)
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- ServerConfigs (server.json 버전 관리)
CREATE TABLE server_configs (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  config_json JSONB,
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMP,
  backup_path VARCHAR(1024),
  created_by VARCHAR(255),
  created_at TIMESTAMP
);

-- Jobs (작업 큐)
CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  job_type VARCHAR(50), -- 'update', 'apply_config', 'restart', 'cleanup', 'mission_change'
  status VARCHAR(50), -- 'pending', 'running', 'success', 'failed'
  payload JSONB,
  log_lines TEXT[],
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  created_by VARCHAR(255),
  created_at TIMESTAMP
);

-- AuditLog (감시 로그)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255),
  action VARCHAR(100),
  resource_type VARCHAR(50), -- 'config', 'mod', 'job'
  resource_id VARCHAR(255),
  old_value JSONB,
  new_value JSONB,
  status VARCHAR(50), -- 'success', 'failed'
  ip_address VARCHAR(50),
  created_at TIMESTAMP
);

-- Users (권한)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(128) UNIQUE,
  email VARCHAR(255),
  password_hash VARCHAR(255),
  role VARCHAR(50), -- 'admin', 'operator', 'viewer'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 4. REST/WebSocket API 엔드포인트 목록

### 4.1 Profile 관리
```
GET    /api/profiles              # 전체 Profile 목록
POST   /api/profiles              # Profile 생성
GET    /api/profiles/:id          # Profile 상세
PUT    /api/profiles/:id          # Profile 수정
DELETE /api/profiles/:id          # Profile 삭제
POST   /api/profiles/:id/activate # Profile 활성화
POST   /api/profiles/:id/validate # 경로/설정 검증
```

### 4.2 Config 편집기
```
GET    /api/profiles/:id/config   # 현재 server.json 조회
POST   /api/profiles/:id/config   # Config 임시 저장
PUT    /api/profiles/:id/config/apply # Config 검증 + 백업 + 적용
GET    /api/profiles/:id/config/diff  # 변경사항 diff
GET    /api/profiles/:id/config/backups # 백업 목록
POST   /api/profiles/:id/config/rollback/:timestamp # 롤백
```

### 4.3 Mods 관리
```
GET    /api/profiles/:id/mods/installed  # 로컬 설치 모드 (addon.gproj 스캔)
GET    /api/profiles/:id/mods/configured # server.json game.mods
GET    /api/profiles/:id/mods/workshop   # Workshop 검색 결과
POST   /api/mods/:modId/dependencies     # 의존성 목록 조회
POST   /api/profiles/:id/mods/add        # 설정에 모드 추가
DELETE /api/profiles/:id/mods/:modId     # 설정에서 모드 제거
POST   /api/profiles/:id/mods/auto-include # 의존성 자동 포함
GET    /api/profiles/:id/mods/orphans    # 고아 폴더 목록
POST   /api/profiles/:id/mods/cleanup    # 고아 폴더 휴지통 이동
```

### 4.4 Scenarios (미션)
```
GET    /api/profiles/:id/scenarios       # 미션 목록 (-listScenarios 스크랩)
POST   /api/profiles/:id/scenarios/rescan # 다시 스캔
GET    /api/profiles/:id/missions        # kgmission 번호 매핑 조회
POST   /api/profiles/:id/missions/:num   # 미션 번호 즉시 전환 (Job 큐)
GET    /api/profiles/:id/scenarios/:id/deps # 시나리오의 필수 모드
```

### 4.5 Jobs (작업 큐)
```
GET    /api/profiles/:id/jobs            # 작업 목록
POST   /api/profiles/:id/jobs            # Job 생성 (모드 업데이트 등)
GET    /api/jobs/:jobId                  # Job 상태
POST   /api/jobs/:jobId/cancel           # Job 취소
DELETE /api/jobs/:jobId                  # Job 삭제

# Job 타입들:
# - 'steamcmd_update': SteamCMD로 서버 파일 업데이트
# - 'apply_config': server.json 적용 + 재시작
# - 'restart': 서버 재시작
# - 'cleanup_mods': 모드 캐시 정리
# - 'mission_change': 미션 번호 전환
```

### 4.6 WebSocket (실시간 로그)
```
WS     /ws/profiles/:id           # 해당 Profile의 실시간 로그 스트림
# 메시지 형식:
{
  "type": "log" | "job_status" | "server_status" | "mod_scan",
  "timestamp": "2026-01-10T...",
  "data": {
    "jobId": "...",
    "status": "running",
    "log": "...",
    "progress": 0.5
  }
}
```

### 4.7 권한/인증
```
POST   /api/auth/login             # 로그인
POST   /api/auth/logout            # 로그아웃
GET    /api/auth/me                # 현재 사용자
POST   /api/auth/refresh-token     # 토큰 갱신
POST   /api/auth/totp/setup        # 2FA TOTP 설정
POST   /api/auth/totp/verify       # TOTP 검증
```

### 4.8 감시 로그
```
GET    /api/audit-logs             # 감시 로그 전체
GET    /api/audit-logs?action=...  # 필터링
```

---

## 5. 프론트엔드 페이지 구조(Next.js)

### 5.1 레이아웃 및 네비게이션

```
┌─────────────────────────────────────────────────┐
│  Top NavBar: 로고, 프로필 선택, 사용자 메뉴(설정/로그아웃)  │
└─────────────────────────────────────────────────┘
┌──────────────┬──────────────────────────────────┐
│  Left Sidebar│                                  │
│   - Profiles │                                  │
│   - Dashboard│       Main Content Area          │
│   - Config   │       (페이지별 콘텐츠)          │
│   - Mods     │                                  │
│   - Scenarios│                                  │
│   - Jobs     │                                  │
│   - Audit    │                                  │
│   - Settings │                                  │
└──────────────┴──────────────────────────────────┘
```

### 5.2 페이지별 설계

#### 1) **Dashboard** (`/dashboard`)
**목표**: 서버 상태 한눈에 보기

**UI 구성**:
- 활성 Profile 표시 + "프로필 전환" 드롭다운
- 서버 상태 카드(온라인/오프라인/마지막 재시작)
- 현재 scenarioId + 미션 이름
- 설치된 모드 개수 vs 설정 모드 개수
- 최근 5개 작업(Job) 상태
- 실시간 로그 스트림(아래 패널, 최근 20줄)
- "빠른 작업" 버튼: 서버 재시작, SteamCMD 업데이트, 미션 변경(드롭다운)

**구현 분량**: ~400줄 React

#### 2) **Config Editor** (`/config`)
**목표**: server.json 안전하게 편집 + 즉시 적용

**UI 구성**:
- 좌측 트리뷰: JSON 구조(game, server, mods 등의 주요 섹션)
- 우측 입력 필드: 선택한 키의 값 편집
  - Type별 입력(string, number, boolean, array, object)
  - Enum 드롭다운(예: `game.scenarioId`)
  - Array 편집 UI(+/- 버튼으로 항목 추가/삭제)
- 우하단: 변경사항 diff(왼쪽 원본, 오른쪽 변경)
- 버튼 바:
  - "미리보기": 변경사항 diff 표시
  - "검증": JSON 스키마 + Reforger 설정 규칙 검증
  - "저장(미적용)": 임시 저장
  - "적용": 백업 생성 → server.json 덮어쓰기 → 서버 재시작(Job)
  - "취소": 편집 중단
  - "복원": 마지막 적용 상태로 복원
- 우상단: 백업 목록 + 롤백 버튼

**검증 규칙**:
- `game.scenarioId`: 형식 `{GUID}Missions/xxx.conf` 확인
- `game.mods`: 배열 타입, 각 항목 modId/required 필드 확인
- 대소문자 경고(예: `game.Mods` vs `game.mods`)

**구현 분량**: ~600줄 React + Go validator

#### 3) **Mods** (`/mods`)
**목표**: 로컬/Workshop 모드 + 의존성 통합 관리

**탭 1: 설치된 모드** (Local)
- 테이블: modId, 이름, 버전, 설치 위치, 의존성 개수, 상태(설정됨/미설정)
- 각 행에 "의존성 보기", "설정에 추가", "삭제(휴지통)" 버튼
- 검색/필터(이름, modId, 의존성 포함 여부)
- "폴더 새로고침": addons 폴더 다시 스캔(Job)

**탭 2: 설정 모드** (server.json game.mods)
- 테이블: modId, 이름, required, 상태(설치됨/미설치)
- 설치되지 않은 모드는 경고 아이콘 + "Workshop에서 검색" 링크
- 드래그 정렬(우선순위)
- "의존성 분석": 현재 모드들의 의존성 자동 검증 + 누락된 모드 추천
- "자동 포함": 의존성 모드 자동 추가(확인 대화상자)
- "저장": server.json에 반영(Config Editor로 이동하거나 직접 적용)

**탭 3: Workshop 검색**
- 검색창 + 필터(평점, 다운로드 수, 업데이트 날짜)
- 결과 카드: 아이콘, 이름, 제작자, 평점, 다운로드 수, 설명(요약)
- "설정에 추가" 버튼 → 의존성 자동 분석 + 확인

**탭 4: 고아 폴더**
- 테이블: 폴더명, 크기, 마지막 수정일, 상태(고아/사용중)
- "선택" 체크박스 + "휴지통으로 이동" 버튼
- 2단계 확인: "정말 삭제할까요?" → "X일 후 자동 영구 삭제"

**구현 분량**: ~1000줄 React + Go 백엔드

#### 4) **Scenarios (Missions)** (`/scenarios`)
**목표**: -listScenarios 스크랩 + kgmission 번호 매핑 + 즉시 전환

**레이아웃**:
- 좌측: 시나리오 목록(테이블 또는 카드)
  - 검색창
  - 필터: scenarioId, 필수 모드 수
  - 테이블: scenarioId(축약), 이름, 필수 모드 개수, kgmission 번호
- 우측: 선택한 시나리오 상세
  - 전체 scenarioId(복사 버튼)
  - 이름 + 설명(있으면)
  - 필수 모드 목록 + "설치 상태" 표시
  - "kgmission 번호 매핑" 드롭다운(1-10) + "저장" 버튼
  - "즉시 전환" 버튼 → Job 생성 → 서버 재시작

**다시 스캔 버튼**: `-listScenarios` 명령어 다시 실행(Job)

**구현 분량**: ~700줄 React + Go 백엔드

#### 5) **Jobs (작업 큐)** (`/jobs`)
**목표**: 모든 작업의 실시간 진행 상황 추적

**UI 구성**:
- 상단 필터: 상태(전체, 대기, 실행중, 성공, 실패), 작업 타입, 날짜 범위
- 테이블:
  - 작업 ID, 타입, 상태, 시작시간, 진행률(프로그래스바), 작업 생성자
  - 우측 버튼: "로그 보기"(모달), "취소"(실행중만), "삭제"
- 우측 패널(선택 시):
  - 작업 상세(ID, 타입, 페이로드)
  - 실시간 로그(WebSocket에서 수신)
  - 진행률 바(%)
  - 재시도/취소/삭제 버튼

**구현 분량**: ~500줄 React + WebSocket 핸들링

#### 6) **Audit Logs** (`/audit`)
**목표**: 모든 변경사항의 감시 로그

**UI 구성**:
- 필터: 사용자, 액션(config_applied, mod_added, job_created 등), 리소스 타입, 날짜 범위
- 테이블:
  - 타임스탬프, 사용자, 액션, 리소스, 상태, IP
  - 클릭 → 상세(old_value/new_value를 JSON diff로 표시)
- 내보내기: CSV, JSON

**구현 분량**: ~300줄 React

#### 7) **Profile 관리** (`/settings/profiles`)
**목표**: 여러 Reforger 서버 인스턴스 관리

**UI 구성**:
- 프로필 카드 목록 또는 테이블
- 각 카드: 이름, 활성 여부, 경로(축약), 최근 활동, 액션 버튼
- "새 프로필 생성" 버튼 → 마법사
  - Step 1: 프로필 이름
  - Step 2: server.json 경로(또는 ArmaReforgerServerTool 경로 자동 탐지)
  - Step 3: profile/addons/steamcmd 경로 입력
  - Step 4: 경로 검증(파일 존재 확인)
  - Step 5: -listScenarios 실행 + 모드 스캔(백그라운드 Job)
- "프로필 상세" 페이지: 모든 경로 수정 가능

**구현 분량**: ~500줄 React + Go 마법사

#### 8) **Settings** (`/settings`)
**목표**: 시스템 설정 + 사용자 관리

**탭 1: 시스템 설정**
- 데이터베이스 연결 상태(읽기 전용)
- kgagent(Windows 에이전트) 연결 상태 + 마지막 통신 시간
- 로그 보관 기간 설정
- 자동 정리 일정(고아 폴더, 오래된 백업)
- 알림 설정(Discord 웹훅 등)

**탭 2: 사용자**
- 테이블: 이름, 이메일, 역할, 마지막 로그인, 액션
- "새 사용자" 버튼 → 초기 비밀번호 생성(이메일 전송)
- "편집": 비밀번호, 역할 변경
- "삭제": 사용자 제거(감시 로그 기록)

**탭 3: 역할**
- 역할별 권한 매트릭스(테이블)
- 권한: config_read, config_write, mods_read, mods_write, jobs_create, jobs_cancel, audit_read, users_manage

**구현 분량**: ~400줄 React

---

## 6. 로컬 Windows 에이전트(Go or Python: kgagent)

**역할**: 파일 시스템 및 프로세스 접근이 필요한 작업 수행

### 6.1 기능 목록

| 기능 | 설명 | 트리거 |
|------|------|--------|
| **Mod Scan** | addons 폴더 재귀 스캔 → addon.gproj 파싱 | Profile 생성 시, "폴더 새로고침" 버튼 |
| **List Scenarios** | `-listScenarios` 실행 + 출력 파싱 | Profile 생성/스캔 버튼 |
| **Config Read** | server.json 읽기 | Config Editor 초기 로드 |
| **Config Write** | server.json 덮어쓰기(원자적) | Config 적용 Job |
| **Backup** | server.json 백업 생성(타임스탬프) | Config 적용 전 |
| **Process Control** | 프로세스 시작/종료/재시작 | Job Worker |
| **SteamCMD** | SteamCMD 실행(`app_update 1874900 validate`) | SteamCMD 업데이트 Job |
| **Cleanup** | 고아 폴더 휴지통 이동 | Cleanup Job |
| **File Watch** | next.json 감시(kgmission 변화) | 백그라운드 |

### 6.2 addon.gproj 파싱 예시

```xml
<!-- addon.gproj 구조 -->
<Project version="1">
  <Property name="ProjectName" value="Example Mod" />
  <Property name="ProjectVersion" value="1.0.0" />
  <Property name="Dependencies" value="GUID1,GUID2" />
  <!-- 또는 -->
  <Dependencies>
    <Dependency value="GUID1" />
    <Dependency value="GUID2" />
  </Dependencies>
</Project>
```

**kgagent 로직**:
1. `C:\saves\addons\*/addon.gproj` 경로 모두 찾기
2. XML 파싱 → ProjectName, version, Dependencies 추출
3. 폴더명에서 GUID 추출(예: `MyMod_ABCD123/` → GUID: `ABCD123`)
4. JSON으로 구성:
```json
{
  "mods": [
    {
      "modId": "ABCD123",
      "name": "Example Mod",
      "version": "1.0.0",
      "path": "C:\\saves\\addons\\Example_ABCD123",
      "dependencies": ["GUID1", "GUID2"]
    }
  ]
}
```

### 6.3 -listScenarios 파싱 예시

```
# 명령어
ArmaReforgerServer.exe -profile C:\saves -addonsDir \addons -logLevel normal -listScenarios

# 출력 (콘솔/로그 파일)
Available scenarios:
  {AAAA1111BBBB2222}Missions/Coop_Fallujah.conf
  {CCCC3333DDDD4444}Missions/Coop_KhanhTrung.conf
```

**kgagent 로직**:
1. 명령어 실행 → 표준 출력 캡처
2. 정규표현식 `\{[A-F0-9]{16}\}Missions/[^\s]+\.conf` 으로 추출
3. JSON 구성:
```json
{
  "scenarios": [
    {
      "scenarioId": "{AAAA1111BBBB2222}Missions/Coop_Fallujah.conf",
      "name": "Coop Fallujah"
    }
  ]
}
```

### 6.4 통신 프로토콜(Go 백엔드 ↔ kgagent)

옵션 A: **gRPC** (성능 중심)
옵션 B: **HTTP REST** (단순함 중심)

권장: **HTTP REST**(로컬 타당성이 높고, 인증 간단)

```
POST http://localhost:9999/api/agent/scan-mods
{
  "addonPath": "C:\\saves\\addons"
}

Response:
{
  "mods": [...]
}
```

---

## 7. Go 백엔드 구현(스켈레톤)

### 7.1 파일 구조

```
backend/
  main.go                        # 진입점
  config/
    config.go                    # 설정 로드
  api/
    router.go                    # 라우팅
    handlers/
      profile.go                 # Profile CRUD
      config.go                  # Config 편집/적용
      mods.go                    # Mods 관리
      scenarios.go               # Scenarios
      jobs.go                    # Job 큐
      auth.go                    # 인증
      audit.go                   # 감시로그
  service/
    profile_service.go           # Profile 비즈니스 로직
    config_service.go            # Config 검증/적용
    mod_service.go               # Mod 의존성 분석
    scenario_service.go          # Scenario 스크래핑
    job_service.go               # Job 큐 관리
    workshop_service.go          # Steam Workshop API
  models/
    profile.go
    config.go
    mod.go
    scenario.go
    job.go
    user.go
  db/
    db.go                        # DB 연결
    migrations/                  # SQL 마이그레이션
  agent/
    client.go                    # kgagent REST 클라이언트
  ws/
    hub.go                       # WebSocket 브로드캐스트
  util/
    validator.go                 # Config/Reforger 검증
    logger.go
```

### 7.2 주요 로직: Job Worker(순열 처리)

```go
// service/job_service.go
type JobWorker struct {
  db *sql.DB
  agent *AgentClient
  mu sync.Mutex
  running bool
}

func (w *JobWorker) Process(job *Job) error {
  w.mu.Lock()
  if w.running {
    w.mu.Unlock()
    return errors.New("another job is running")
  }
  w.running = true
  w.mu.Unlock()
  
  defer func() {
    w.mu.Lock()
    w.running = false
    w.mu.Unlock()
  }()
  
  switch job.Type {
    case "apply_config":
      return w.ApplyConfig(job)
    case "mission_change":
      return w.ChangeMission(job)
    case "steamcmd_update":
      return w.SteamCMDUpdate(job)
    case "cleanup_mods":
      return w.CleanupMods(job)
    default:
      return errors.New("unknown job type")
  }
}

func (w *JobWorker) ApplyConfig(job *Job) error {
  profile := job.Profile
  
  // 1. server.json 백업
  backup := // timestamp
  w.agent.Backup(profile.ServerJsonPath, backup)
  
  // 2. 새 config 검증
  cfg := job.Payload["config"].(map[string]interface{})
  if err := ValidateServerConfig(cfg); err != nil {
    return err
  }
  
  // 3. server.json 덮어쓰기
  if err := w.agent.WriteServerJson(profile, cfg); err != nil {
    w.agent.Restore(backup) // 롤백
    return err
  }
  
  // 4. 서버 재시작
  if err := w.agent.RestartServer(profile); err != nil {
    return err
  }
  
  job.Status = "success"
  job.AppliedAt = time.Now()
  return nil
}

func (w *JobWorker) ChangeMission(job *Job) error {
  profile := job.Profile
  missionNum := job.Payload["mission_number"].(int)
  
  // scenarios DB에서 조회
  scenario, err := w.db.GetScenarioByNumber(profile.ID, missionNum)
  if err != nil {
    return err
  }
  
  // server.json 로드
  cfg := w.agent.ReadServerJson(profile)
  
  // scenarioId 교체
  cfg["game"].(map[string]interface{})["scenarioId"] = scenario.ScenarioId
  
  // 필요 mods 병합
  requiredMods := scenario.RequiredMods
  cfg = MergeMods(cfg, requiredMods)
  
  // server.json 적용 + 재시작
  return w.ApplyConfig(&Job{
    Profile: profile,
    Type: "apply_config",
    Payload: map[string]interface{}{"config": cfg},
  })
}
```

### 7.3 주요 로직: Workshop 스크래핑

```go
// service/workshop_service.go
import "github.com/PuerkitoBio/goquery"

func (s *WorkshopService) SearchReforgerMods(query string) ([]ModMetadata, error) {
  // Steam Workshop Arma Reforger 페이지 스크래핑
  url := fmt.Sprintf("https://steamcommunity.com/app/1874880/workshop/search/?searchtext=%s", url.QueryEscape(query))
  
  resp, err := http.Get(url)
  if err != nil {
    return nil, err
  }
  
  doc, err := goquery.NewDocumentFromReader(resp.Body)
  if err != nil {
    return nil, err
  }
  
  var mods []ModMetadata
  
  // 각 mod 항목 파싱
  doc.Find(".workshopItem").Each(func(i int, s *goquery.Selection) {
    title := s.Find(".workshopItemTitle").Text()
    description := s.Find(".workshopItemDescription").Text()
    rating := s.Find(".ratingInfo").Text()
    workshopId, _ := s.Attr("data-publishedfileid")
    
    // modId 추출(URL 기반 또는 페이지 내용)
    modId := ExtractModIdFromPage(workshopId)
    
    mods = append(mods, ModMetadata{
      ModId: modId,
      Name: title,
      Description: description,
      Rating: rating,
      WorkshopId: workshopId,
    })
  })
  
  return mods, nil
}
```

---

## 8. 프론트엔드 구현(Next.js)

### 8.1 파일 구조

```
frontend/
  app/
    layout.tsx                   # 메인 레이아웃
    page.tsx                     # 로그인 페이지
    dashboard/
      page.tsx
      components/
        ServerStatus.tsx
        RecentJobs.tsx
        QuickActions.tsx
    config/
      page.tsx
      components/
        ConfigEditor.tsx
        JsonTreeView.tsx
        DiffViewer.tsx
        BackupList.tsx
    mods/
      page.tsx
      components/
        TabInstalledMods.tsx
        TabConfiguredMods.tsx
        TabWorkshopSearch.tsx
        TabOrphanFolders.tsx
        DependencyAnalyzer.tsx
    scenarios/
      page.tsx
      components/
        ScenarioList.tsx
        ScenarioDetail.tsx
        MissionMapper.tsx
        QuickChangeButton.tsx
    jobs/
      page.tsx
      components/
        JobsList.tsx
        JobDetail.tsx
        LogViewer.tsx
    audit/
      page.tsx
      components/
        AuditTable.tsx
    settings/
      profiles/
        page.tsx
        components/
          ProfileList.tsx
          ProfileWizard.tsx
      page.tsx
      components/
        SystemSettings.tsx
        UserManagement.tsx
  components/
    common/
      Sidebar.tsx
      TopNavBar.tsx
      ProfileSelector.tsx
    ui/
      Button.tsx               # shadcn 사용
      Input.tsx
      Dialog.tsx
      ...
  lib/
    api.ts                     # REST API 클라이언트
    ws.ts                      # WebSocket 연결
    auth.ts                    # 인증/토큰
    hooks/
      useProfile.ts            # Profile 상태
      useWebSocket.ts          # WebSocket 훅
  styles/
    globals.css
    tailwind.config.js
```

### 8.2 shadcn/ui 컴포넌트 활용

```tsx
// components/config/ConfigEditor.tsx
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  AlertDialog,
  Tabs,
  Badge,
  Progress,
} from "@/components/ui"

export function ConfigEditor({ profileId }: { profileId: string }) {
  const [config, setConfig] = useState<ServerConfig | null>(null)
  const [changes, setChanges] = useState<any | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  
  // 로드
  useEffect(() => {
    fetchConfig(profileId).then(setConfig)
  }, [profileId])
  
  // 트리 선택 → 입력 필드 업데이트
  const handleTreeSelect = (path: string) => {
    // ...
  }
  
  // 저장(검증)
  const handleValidate = async () => {
    setIsValidating(true)
    const errors = await validateConfig(changes || config)
    setIsValidating(false)
    
    if (errors.length > 0) {
      <Dialog open>
        <DialogContent>
          <h2>검증 오류</h2>
          {errors.map(e => <div key={e.field}>{e.field}: {e.message}</div>)}
        </DialogContent>
      </Dialog>
      return
    }
    
    // 다음: diff 표시
  }
  
  return (
    <div className="grid grid-cols-3 gap-4">
      <JsonTreeView config={config} onSelect={handleTreeSelect} />
      <ConfigFields />
      <DiffViewer original={config} modified={changes || config} />
      <div className="col-span-3 flex gap-2">
        <Button onClick={handleValidate} disabled={isValidating}>검증</Button>
        <Button variant="outline">취소</Button>
      </div>
    </div>
  )
}
```

---

## 9. 보안 고려사항

### 9.1 인증/권한
- **사용자 인증**: JWT(access + refresh tokens) + TOTP 2FA
- **역할 기반 접근(RBAC)**: admin, operator, viewer
- **정책 예시**:
  - viewer: config_read, audit_read, jobs_list
  - operator: + config_write(검증 + 2단계), mods_read, scenarios_read, jobs_create
  - admin: 모든 권한 + users_manage, settings_write

### 9.2 API 보안
- 모든 요청에 인증 토큰 검증(JWT)
- Rate limiting: 사용자당 초당 N건 API 호출 제한
- CORS: 프론트엔드 도메인만 허용
- HTTPS(TLS 1.3) 필수

### 9.3 작업 안전성
- Config 적용 전 자동 백업(3개월 보관)
- 백업에서 자동 복구 버튼 제공
- 서버 상태 검증(프로세스 실행 중 확인 후 작업 시작)
- 작업 중복 실행 방지(전역 락)

### 9.4 감사로그
- 모든 설정 변경, Job 생성/실행, 사용자 로그인을 기록
- IP, 사용자, 액션, old_value/new_value, 결과 저장
- 180일 보관(설정 가능)

---

## 10. 배포 구조(Windows 기준)

```
C:\ArmaReforgerServerTool\
  kgmission\                 # 기존 미션 전환 시스템
    missions.json
    next.json
    applied.json
    logs/
    kgagent/                 # 새 에이전트
      kgagent.exe            # Go 바이너리
      config.yaml
      addons.scan.log
  backend/                   # Go 백엔드
    main.exe
    config.yaml
    db/migrations
  frontend/                  # Next.js(빌드 결과)
    .next/
    public/
    node_modules/
  docker/                    # 선택: Docker 컨테이너화
    docker-compose.yml
  systemd/                   # Windows Service 등록
    kgagent.bat
    backend.bat
```

---

## 11. 개발 일정(추정)

| 단계 | 구성 요소 | 예상 기간 |
|------|---------|---------|
| **1단계** | Profile + Config Editor + 기본 Job | 3주 |
| **2단계** | Scenarios + -listScenarios 스크래핑 + kgmission | 2주 |
| **3단계** | Mods(addon.gproj 스캔) + 의존성 | 2주 |
| **4단계** | Workshop API + UI 통합 | 1.5주 |
| **5단계** | SteamCMD 자동화 + 스케줄러 | 1주 |
| **6단계** | 고아 폴더 정리 + 백업/롤백 | 1주 |
| **7단계** | 권한/인증 + 감시로그 + 2FA | 2주 |
| **8단계** | Discord 봇 원격(선택) | 1주 |
| **9단계** | 테스트 + 배포 최적화 | 2주 |
| **총 예상 기간** | | **15.5주 (~4개월)** |

---

## 12. 기술 스택 최종 결정

### 프론트엔드
- **프레임워크**: Next.js 15(App Router) + React 19
- **스타일**: Tailwind CSS 4 + shadcn/ui
- **상태관리**: Zustand(가벼움)
- **비동기**: TanStack Query + Axios
- **차트/로그**: Recharts + react-syntax-highlighter

### 백엔드
- **언어/프레임워크**: Go 1.23 + Fiber (또는 Gin)
- **ORM**: sqlc (타입 안전)
- **DB**: PostgreSQL 15 + migrations (golang-migrate)
- **WebSocket**: gorilla/websocket
- **인증**: golang-jwt + TOTP (pquerna/otp)
- **로깅**: zap
- **HTTP 클라이언트**: net/http (기본)

### 로컬 에이전트(kgagent)
- **언어**: Go 1.23 (또는 Python 3.11)
- **XML 파싱**: encoding/xml (Go) 또는 xml.etree (Python)
- **프로세스 관리**: os/exec (Go) 또는 subprocess (Python)
- **파일 감시**: fsnotify (Go) 또는 watchdog (Python)

### 인프라
- **DB**: PostgreSQL 15(Docker 권장)
- **캐시/Job 큐**: Redis 7(in-memory 대체 가능) 또는 내장 메모리
- **웹 서버**: Nginx(리버스 프록시) + HTTPS
- **배포**: Docker Compose (개발) → Windows Service (프로덕션)

---

## 13. 다음 단계(구현 시작 전)

질문:
1. **기존 kgmission(Python) 통합 방식**
   - 옵션 A: 기존 시스템 그대로 유지(next.json 감시)
   - 옵션 B: Go 에이전트로 마이그레이션(next.json 통합)
   - **추천**: B(통합 단순화)

2. **Workshop API 접근**
   - 공식 API가 없어서 웹 스크래핑 필요
   - Caching 전략(하루 1회 스캔 vs 온디맨드)
   - **추천**: 온디맨드 + 로컬 캐시(메타 1일)

3. **DB 선택**
   - PostgreSQL(권장, 복잡도 낮음)
   - SQLite(경량, 단일 서버만)
   - **추천**: PostgreSQL

4. **프로덕션 배포**
   - Windows Service(systemd 대안)
   - Docker Compose
   - **추천**: Docker(개발/프로덕션 동일)

---

**이 설계안으로 시작해서, 1단계(Profile + Config Editor)부터 구현을 시작하면 됩니다.**
