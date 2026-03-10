# ACC

검은 배경 캔버스에서 중앙 버튼을 누르면 이모지가 떨어지고, 서로/벽/버튼 상단과 충돌하며 튕기는 인터랙티브 데모입니다.

## 주요 기능
- 중앙 버튼 클릭 시 이모지 대량 드롭
- 이모지 간 충돌, 중력, 반발, 감쇠 적용
- 화면 경계 밖으로 이탈 방지
- 버튼 상단을 보조 바닥처럼 처리해 충돌 반발
- 이모지 드래그 후 던지기(throw) 지원
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
- AI PR Review / AI Review Policy / CodeQL
- PR Preview(Netlify), SBOM(CycloneDX)
- Pages 배포 후 헬스체크, 실패 시 롤백 시도
