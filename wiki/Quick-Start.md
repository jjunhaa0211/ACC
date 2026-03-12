# Quick Start

## 1) 설치 없이 실행(현재 저장소 기준)

```bash
node acci/bin/acc-ci.mjs bootstrap --project . --provider github
```

실행 결과:
- `.acci/config.json` 생성
- `tests/mocks/users.mock.json` 생성
- 테스트 스캐폴드 생성(Node: `tests/generated/mock-contract.test.mjs`)
- `.github/workflows/acc-universal-ci.yml` 생성
- lint/test 자동 검증 실행

## 2) 단계별 실행

```bash
node acci/bin/acc-ci.mjs init --project .
node acci/bin/acc-ci.mjs scaffold-tests --project .
node acci/bin/acc-ci.mjs setup-ci --project . --provider github
node acci/bin/acc-ci.mjs verify --project . --ci
```

## 3) npm 스크립트로 실행

```bash
npm run acc-ci:bootstrap
npm run acc-ci -- verify --project . --ci
```

## 4) 다른 프로젝트에 적용

```bash
# 예: /path/to/your-project
node /path/to/ACC/acci/bin/acc-ci.mjs bootstrap --project /path/to/your-project --provider github
```

