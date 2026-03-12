# AI PR 요구사항 계약 정책 가이드

## 개요
이 문서는 "AI 에이전트가 구현한 변경이라면 PR 본문에 요구사항서/변경 전후/커밋 내역/검증 근거를 반드시 남기고, CI에서 자동으로 강제"하는 정책을 설명합니다.

핵심 목표:
- 사람이 코드를 직접 다 보지 않아도 변경 의도와 결과를 빠르게 파악
- 요구사항 -> 구현 -> 검증 연결을 PR 단위로 추적
- 누락된 문서/검증 근거를 CI에서 조기 차단

## 적용 파일
- PR 템플릿: `.github/pull_request_template.md`
- 본문 검증 스크립트: `.github/scripts/validate-ai-pr-body.mjs`
- 정책 게이트: `.github/workflows/ai-review-policy.yml`
- 범용 스캐폴딩 템플릿:
  - `acci/src/core.mjs`
  - `acci/src/templates.mjs`

## 동작 방식
1. PR 작성자가 템플릿에 맞춰 본문 작성
2. `AI Review Policy` 워크플로우에서 `validate-ai-pr-body.mjs` 실행
3. 본문 계약 위반 시 `AI Review Policy` 체크 실패
4. 본문 계약 통과 시 다음 품질 게이트(Web CI, Universal CI 등) 진행

## 필수 본문 계약
필수 섹션:
- `## AI 작업 메타`
- `## AI 요구사항서`
- `## 구현 변경 요약`
- `## 변경 전/후`
- `## 커밋 내역`
- `## 검증 결과`
- `## 리스크 및 롤백`
- `## 자동화 체크리스트`

필수 조건:
- 체크리스트 4개 모두 `[x]` 또는 `[X]` 완료
- `[필수 입력]` 플레이스홀더가 남아 있지 않아야 함
- `변경 전/후` 표에 헤더 + 구분선 + 최소 1개 데이터 행
- `커밋 내역` 표에 헤더 + 구분선 + 최소 1개 데이터 행
- PR의 모든 커밋 SHA(전체 또는 앞 7자리)가 본문에 포함되어야 함

## 실패 시 자주 나오는 메시지와 조치
1. `필수 섹션 누락`
- 조치: 누락된 `## 섹션명` 추가

2. `체크리스트 미완료`
- 조치: 완료한 항목은 `[x]`로 변경

3. ``[필수 입력] 플레이스홀더가 남아 있습니다``
- 조치: 템플릿 예시 텍스트를 실제 내용으로 치환

4. `누락 커밋`
- 조치: `## 커밋 내역` 표에 누락된 커밋 SHA(7자리 이상) 행 추가

## 운영 권장사항
- PR 본문은 "최종 상태"로 유지:
  - 새 커밋을 push할 때마다 `커밋 내역` 표 갱신
  - 테스트/CI 결과가 바뀌면 `검증 결과` 섹션 즉시 갱신
- 본문은 길어도 괜찮지만, 항목별로 짧고 명확한 문장 유지
- 장애 대응을 위해 `리스크 및 롤백`은 반드시 실제 절차로 작성

## 다른 프로젝트에 재사용 (`acc-ci`)
`acc-ci setup-ci` 또는 `acc-ci bootstrap` 시 아래 파일이 함께 생성됩니다.

- `.github/workflows/acc-universal-ci.yml`
- `.github/workflows/ai-pr-policy.yml`
- `.github/scripts/validate-ai-pr-body.mjs`
- `.github/pull_request_template.md`

예시:
```bash
node acci/bin/acc-ci.mjs bootstrap --project . --provider github
```

## 정책 강도 조정 팁
현재 정책은 "PR 본문 계약"을 강하게 강제합니다. 팀 상황에 맞게 아래를 조정할 수 있습니다.

- 완화:
  - `validate-ai-pr-body.mjs`에서 필수 섹션/체크리스트 일부 제외
- AI 전용으로 제한:
  - `ai-review-policy.yml` 조건을 라벨 기반으로 변경해 특정 PR만 검사
- 강화:
  - 검증 결과 섹션에 테스트 명령/아티팩트 링크 패턴까지 정규식으로 강제

## 체크리스트 (도입 완료 확인)
- [x] PR 템플릿 표준화
- [x] PR 본문 계약 자동 검증
- [x] 정책 실패 시 병합 차단
- [x] `acc-ci`로 타 프로젝트 재사용 가능
