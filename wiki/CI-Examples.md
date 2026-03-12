# CI Examples

## Universal Workflow

생성 파일: `.github/workflows/acc-universal-ci.yml`

주요 단계:
- checkout
- setup-node
- `node acci/bin/acc-ci.mjs verify --project . --ci`
- 아티팩트 업로드

## Mock 중심 테스트 전략

- mock 파일을 계약으로 관리
- PR 리뷰 시 mock diff를 중요한 변경 신호로 해석
- verify에서 mock 계약 검증을 먼저 수행

## 운영 체크리스트

- [ ] bootstrap 이후 config를 팀 표준으로 조정
- [ ] coverage 명령을 프로젝트에 맞게 활성화
- [ ] flaky 테스트 분리 및 retry 정책 수립
- [ ] 주기적 mock 시나리오 정리
