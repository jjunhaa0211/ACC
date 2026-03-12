# ACC Universal CI Automation Toolkit (`acc-ci`)

## 목표
`acc-ci`는 "프로젝트 루트에서 명령 1개"로 다음을 자동화합니다.

- 프로젝트 생태계 감지(Node / Python / Go)
- 테스트 + Mock 데이터 스캐폴딩
- CI 워크플로 생성
- 로컬/CI 동일 검증(verify)

## 명령

```bash
# 전체 자동화 (권장)
node acci/bin/acc-ci.mjs bootstrap --project . --provider github

# 단계별
node acci/bin/acc-ci.mjs init --project .
node acci/bin/acc-ci.mjs scaffold-tests --project .
node acci/bin/acc-ci.mjs setup-ci --project . --provider github
node acci/bin/acc-ci.mjs verify --project . --ci
```

## 생성 파일

- `.acci/config.json`
  - 프로젝트 메타
  - 실행 명령(install/lint/test/coverage)
  - 품질 게이트 옵션
- `.github/workflows/acc-universal-ci.yml`
  - Universal Quality Gate
  - verify 실행
  - 결과 아티팩트 업로드
- `tests/mocks/users.mock.json`
  - mock 계약 데이터
- `tests/generated/mock-contract.test.mjs` (Node)
  - mock 스키마/시나리오 검증 테스트

## 아키텍처

- `acci/bin/acc-ci.mjs`
  - CLI 진입점
- `acci/src/cli.mjs`
  - 명령 파싱/디스패치
- `acci/src/core.mjs`
  - init/scaffold/setup-ci/verify/bootstrap 오케스트레이션
- `acci/src/plugins.mjs`
  - 생태계별 플러그인(Node/Python/Go)
- `acci/src/templates.mjs`
  - 테스트/워크플로 템플릿
- `acci/src/fs-utils.mjs`, `acci/src/shell-utils.mjs`
  - 파일/명령 실행 유틸

## Mock 테스트 전략

`users.mock.json`은 계약(contract)로 취급됩니다.

필수 필드:
- `version: string`
- `generatedAt: string`
- `scenarios: array`

각 scenario 필수:
- `id`, `description`
- `request.method`, `request.path`
- `response.status`, `response.body`

verify 과정에서 mock 계약 검증이 먼저 실행되고, 실패 시 lint/test 단계로 넘어가지 않습니다.

## 확장 전략 (플러그인)

`acci/src/plugins.mjs`에서 생태계별 플러그인을 추가할 수 있습니다.

플러그인 인터페이스:
- `resolveCommands(projectDir)`
- `scaffold(projectDir, options)`

새 생태계 추가 예:
1. 명령 집합(resolveCommands) 정의
2. mock/test 템플릿 생성(scaffold) 구현
3. `pluginRegistry`에 등록
4. `detectEcosystem` 확장

## 운영 권장

- `bootstrap` 후 `.acci/config.json`을 팀 표준에 맞게 튜닝
- `verify --ci`와 로컬 검증 명령을 동일하게 유지
- mock 파일은 PR에서 리뷰 대상(계약 변경)으로 관리
- flaky 테스트는 별도 retry 정책 적용
