---
description: Automatically commits all changes, creates a version tag, and pushes to remote to trigger the release workflow. Follows Semantic Versioning rules.
---

# 🌌 Antigravity Git Release Workflow (Global Standard)

이 워크플로우는 Antigravity 에이전트의 표준 릴리즈 절차를 정의합니다. 모든 변경사항을 커밋하고 태그를 생성하여 GitHub Actions를 기반으로 한 자동 배포를 수행합니다.

## 📏 버전 관리 규칙 (`va.b.c`)

릴리즈 시 아래의 **Semantic Versioning** 규칙을 반드시 준수합니다:

1.  **`a` (Major)**: 대규모 아키텍처 변경 또는 대형 업데이트
2.  **`b` (Minor)**: 새로운 기능 추가 또는 마이너 기능 고도화
3.  **`c` (Patch)**: 버그 수정, 간단한 코드 개선 또는 UI 수정

> **[중요]** 별도의 지시가 없는 경우, 기본적으로 **`c` (Patch)** 버전을 1단계 올린 후 진행합니다. 특정 버전 레벨업 요청(예: "Minor 올려줘")이 있을 경우 해당 규칙에 따라 버전을 산정합니다.

## 📋 Execution Steps

1.  **현재 버전 확인**
    - `frontend/package.json` 또는 `cmd/server/main.go`에서 현재 버전을 확인합니다.
2.  **새 버전 결정**
    - 규칙에 따라 새 버전 번호를 산정합니다. (기본값: Patch +1)
3.  **파일 업데이트**
    - 배포 전 `frontend/package.json` 및 `cmd/server/main.go`(또는 해당 상수)의 버전 문자열을 새 버전에 맞춰 수정합니다.
4.  **변경사항 스테이징 및 커밋**
    ```powershell
    git add .
    git commit -m "feat/fix: release v<a.b.c> - <summary of changes>"
    ```
5.  **릴리즈 태그 생성**
    ```powershell
    git tag -a v<a.b.c> -m "release v<a.b.c>"
    ```

// turbo
6.  **원격 저장소 푸시**
    ```powershell
    git push origin main
    git push origin v<a.b.c>
    ```

7.  **워크플로우 완료 보고**
    - 생성된 태그와 릴리즈 로그를 사용자에게 보고합니다.