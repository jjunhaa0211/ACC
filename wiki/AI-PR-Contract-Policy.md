# AI PR Contract Policy

## 목적
AI 에이전트 기반 개발에서 PR 본문 품질을 CI로 강제해, 요구사항-구현-검증 추적성을 확보합니다.

## 구성 요소
- 템플릿: `.github/pull_request_template.md`
- 검증기: `.github/scripts/validate-ai-pr-body.mjs`
- 정책 게이트: `.github/workflows/ai-review-policy.yml`

## 강제 규칙
- 필수 섹션 8개 존재
- 체크리스트 4개 완료(`[x]`)
- `[필수 입력]` 문구 미존재
- `변경 전/후`, `커밋 내역` 표에 최소 1개 데이터 행
- PR의 모든 커밋 SHA(또는 앞 7자리) 본문 포함

## 실패 원인 빠른 점검
1. 누락 섹션이 있는가?
2. 체크리스트 4개가 모두 체크됐는가?
3. 플레이스홀더가 남아 있는가?
4. 최신 push 커밋이 `커밋 내역` 표에 반영됐는가?

## 재사용
`acc-ci`의 `setup-ci/bootstrap` 실행 시 동일 정책 파일이 자동 생성됩니다.
