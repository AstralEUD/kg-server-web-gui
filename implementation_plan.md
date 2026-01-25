# Implementation Plan - 빌드 오류 수정

현재 `npm run build` 과정에서 발생하는 여러 구문 오류와 유실된 컴포넌트 문제를 해결합니다.

## 1. 분석 및 문제 상황
- **mods/page.tsx**: JSX 닫는 태그나 중괄호(`}`)의 불일치로 예상됩니다.
- **page.tsx**: `return` 문이 함수 블록 외부나 유효하지 않은 위치에 존재합니다.
- **scenarios/page.tsx**: 복합적인 JSX 구문 오류 및 정규식 오파싱(Unterminated regexp literal)이 발생했습니다.
- **mobile-nav.tsx**: `shadcn/ui`의 `sheet` 컴포넌트가 존재하지 않거나 경로가 잘못되었습니다.

## 2. 해결 전략
### 2.1 구문 오류 수정
- 각 파일의 해당 라인을 확인하여 중괄호(`{}`), 소괄호(`()`), 그리고 JSX 태그의 쌍을 맞춥니다.
- `page.tsx`의 경우 컴포넌트 함수의 구조가 올바른지 확인합니다.

### 2.2 missing component 해결
- `src/components/ui/sheet.tsx` 파일이 존재하는지 확인합니다.
- 만약 없다면 `shadcn-ui`를 통해 새로 설치하거나 기존 코드를 복구합니다.

## 3. 작업 순서
1. `src/app/mods/page.tsx` 수정
2. `src/app/page.tsx` 수정
3. `src/app/scenarios/page.tsx` 수정
4. `src/components/ui/sheet.tsx` 확인 및 생성
5. `npm run build` 실행 및 검증

## 4. 검증 계획
- `npm run build` 명령어가 에러 없이 완료되는지 확인합니다.
- 서비스가 정상적으로 구동되는지 확인합니다.
