# ACC

재밌는 버튼 UI + PR AI 리뷰 CI를 테스트하는 저장소입니다.

## 웹 기능
- 버튼 클릭 시 `안녕하세요! 반가워요!` 메시지가 애니메이션과 함께 표시됩니다.
- 정적 페이지 파일:
  - `index.html`
  - `styles.css`
  - `script.js`

## CI 구성
![Web CI](https://github.com/jjunhaa0211/ACC/actions/workflows/web-ci.yml/badge.svg)
![AI PR Review](https://github.com/jjunhaa0211/ACC/actions/workflows/ai-pr-review.yml/badge.svg)

1. `Web CI` (`.github/workflows/web-ci.yml`)
   - 파일 존재/키워드 체크
   - HTML에 CSS/JS 연결 여부 스모크 체크
   - 정적 웹 파일 아티팩트 업로드

2. `AI PR Review` (`.github/workflows/ai-pr-review.yml`)
   - Pull Request 발생 시 변경 diff 생성
   - ChatGPT(OpenAI) + Gemini로 PR 리뷰
   - 결과를 PR 코멘트로 자동 갱신

## GitHub Secrets 설정
레포 `Settings > Secrets and variables > Actions`에 아래 키를 추가하세요.

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`

키가 없으면 워크플로는 실패하지 않고 "리뷰 스킵" 메시지를 남깁니다.

## 로컬 실행
브라우저에서 `index.html`을 열면 바로 확인할 수 있습니다.

## PR CI Test
- 이 변경은 AI 리뷰 CI 동작 확인용입니다.
