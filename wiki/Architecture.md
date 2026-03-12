# Architecture

## 구성 요소

- `acci/bin/acc-ci.mjs`
  - CLI entrypoint
- `acci/src/cli.mjs`
  - 명령 파싱 + 디스패치
- `acci/src/core.mjs`
  - init/scaffold/setup-ci/verify/bootstrap orchestration
- `acci/src/plugins.mjs`
  - 생태계별 플러그인(Node/Python/Go)
- `acci/src/templates.mjs`
  - mock/test/workflow 템플릿
- `acci/src/fs-utils.mjs`, `acci/src/shell-utils.mjs`
  - 파일 처리/쉘 실행 유틸

## 동작 플로우

1. `detectEcosystem`
- 파일 시그니처 기반 감지
- Node: `package.json`
- Python: `pyproject.toml`, `requirements.txt`, `setup.py`
- Go: `go.mod`

2. `init`
- `.acci/config.json` 생성
- 생태계 기본 명령 세트(install/lint/test/coverage) 정의

3. `scaffold-tests`
- 공통 mock 파일 생성: `tests/mocks/users.mock.json`
- 생태계별 테스트 스캐폴드 생성

4. `setup-ci`
- GitHub Actions 워크플로 생성: `.github/workflows/acc-universal-ci.yml`

5. `verify`
- mock 계약 검증
- lint/test(옵션 coverage) 실행

## 왜 플러그인 구조인가

프로젝트별 차이를 `plugins.mjs`에 캡슐화해 코어 로직 변경 없이 확장 가능하게 설계했습니다.
