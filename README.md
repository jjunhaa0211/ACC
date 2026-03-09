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
   - Pull Request 발생 시 fallback(규칙 기반) 리뷰 자동 실행
   - 결과를 PR 코멘트로 자동 갱신
   - Gemini 상세 AI 리뷰는 GitHub App(`Gemini Code Assist`)에서 처리

## Gemini Code Assist 설정(무료)
링크 방식대로 API 키 없이 GitHub App으로 PR 리뷰를 받으려면 아래 순서로 진행하세요.

1. GitHub Marketplace에서 `Gemini Code Assist` 앱 설치
2. 설치 대상에 `jjunhaa0211/ACC` 레포 선택
3. PR에서 코멘트로 `@gemini review` 요청

참고: 이 저장소의 GitHub Actions는 fallback 리뷰만 수행하며, Gemini 상세 리뷰는 앱이 담당합니다.

## 로컬 실행
브라우저에서 `index.html`을 열면 바로 확인할 수 있습니다.

## PR 재실행 테스트
- 2026-03-09 재검증용 변경
