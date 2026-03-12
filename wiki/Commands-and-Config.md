# Commands and Config

## Commands

### `init`

```bash
node acci/bin/acc-ci.mjs init --project .
```

- `.acci/config.json` 생성
- 기존 파일이 있으면 재사용(기본)
- `--force`로 강제 갱신

### `scaffold-tests`

```bash
node acci/bin/acc-ci.mjs scaffold-tests --project .
```

- mock 데이터 + 테스트 파일 생성

### `setup-ci`

```bash
node acci/bin/acc-ci.mjs setup-ci --project . --provider github
```

- GitHub 워크플로 파일 생성

### `verify`

```bash
node acci/bin/acc-ci.mjs verify --project . --ci
```

- mock 검증 + lint/test 실행
- `--dry-run` 지원
- `--with-coverage` 지원

### `bootstrap`

```bash
node acci/bin/acc-ci.mjs bootstrap --project . --provider github
```

- init + scaffold-tests + setup-ci + verify
- `--skip-verify` 지원

## Config (`.acci/config.json`)

핵심 필드:

- `project.ecosystem`
- `testing.mockDataDir`
- `commands.install/lint/test/coverage`
- `qualityGates.requireLint/requireTests/requireMockValidation`

팀별 커맨드 표준을 이 파일에서 조정하면 CLI가 그대로 반영합니다.
