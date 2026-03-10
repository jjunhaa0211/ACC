# ACC

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
