# ACC

검은 배경 캔버스에서 중앙 버튼을 누르면 이모지가 떨어지고, 서로/벽/버튼 상단과 충돌하며 튕기는 인터랙티브 데모입니다.

## 주요 기능
- 중앙 버튼 클릭 시 입력한 개수만큼 이모지 드롭(예: 200, 300)
- 이모지 간 충돌, 중력, 반발, 감쇠 적용
- 화면 경계 밖으로 이탈 방지
- 버튼 상단을 보조 바닥처럼 처리해 충돌 반발
- 이모지 드래그 후 던지기(throw) 지원
- 초기화 전까지 기존 이모지 유지(자동 삭제 없음)
- 초기화 전까지 중복 없는 고유 이모지 생성
- Tailwind 기반 단일 페이지(`index.html` + `script.js`)

## 로컬 실행
```bash
npm install
npm run serve:ci
```
브라우저에서 `http://127.0.0.1:4173` 접속

## 품질 체크
```bash
npm run lint
npm run test:e2e:ci
npm run test:lighthouse
```

## 테스트 구성
- E2E: `tests/e2e/emoji-physics.spec.js`
- 스냅샷: deterministic 모드(`?seed=...&test=1`)에서 물리 상태 JSON 스냅샷 검증

## CI/CD
- Web CI: 정적 검증 + 린트 + 시크릿 스캔 + E2E + Lighthouse
- E2E 아티팩트 자동 업로드(Playwright report, test-results)
- PR마다 `CI Visual Report` 코멘트 자동 생성(성공/실패 무관 스크린샷 + 샘플 비디오 링크)
- `Web CI`/`ACC Universal CI`/`SBOM` 완료 후 PR에 `Final CI Digest` 코멘트 자동 생성 + `@codex review` 트리거 코멘트 생성
- AI PR Review / AI Review Policy / CodeQL
- Gemini 한국어 리뷰 가이드: `.gemini/styleguide.md`
- CodeRabbit 한국어 기본 언어 설정: `.coderabbit.yaml`
- PR Preview(Netlify) 코멘트에 자동 화면 캡처 이미지 첨부, SBOM(CycloneDX)
- Pages 배포 후 헬스체크, 실패 시 롤백 시도

## Universal CI Automation (`acc-ci`)
어떤 프로젝트든 한 번에 테스트/Mock/CI를 붙이기 위한 범용 자동화 CLI입니다.

```bash
# 현재 프로젝트 자동 초기화 (설정 + mock 테스트 + universal CI 워크플로 생성 + 검증)
npm run acc-ci:bootstrap

# 개별 명령
npm run acc-ci -- init --project .
npm run acc-ci -- scaffold-tests --project .
npm run acc-ci -- setup-ci --project . --provider github
npm run acc-ci -- verify --project . --ci
```

생성되는 핵심 파일:
- `.acci/config.json` (프로젝트별 자동화 설정)
- `.github/workflows/acc-universal-ci.yml` (범용 CI 템플릿)
- `tests/mocks/users.mock.json` (mock 시나리오)
- `tests/generated/mock-contract.test.mjs` (mock 계약 테스트, Node 기준)

## Wiki 문서 소스
- 위키 원본 마크다운: `wiki/*.md`
- 동기화 스크립트: `.github/scripts/sync-wiki.sh`

```bash
bash .github/scripts/sync-wiki.sh jjunhaa0211/ACC
```
