# ACC

재밌는 버튼 UI와 실전형 CI/CD 파이프라인을 함께 테스트하는 저장소입니다.

## 웹 기능
- 버튼 클릭 시 `안녕하세요! 반가워요!` 메시지가 애니메이션과 함께 표시됩니다.
- 정적 페이지 파일:
  - `index.html`
  - `styles.css`
  - `script.js`

## CI/CD 상태
![Web CI](https://github.com/jjunhaa0211/ACC/actions/workflows/web-ci.yml/badge.svg)
![AI PR Review](https://github.com/jjunhaa0211/ACC/actions/workflows/ai-pr-review.yml/badge.svg)
![AI App Trigger](https://github.com/jjunhaa0211/ACC/actions/workflows/gemini-pr-review.yml/badge.svg)
![Deploy Pages](https://github.com/jjunhaa0211/ACC/actions/workflows/deploy-pages.yml/badge.svg)
![CodeQL](https://github.com/jjunhaa0211/ACC/actions/workflows/codeql.yml/badge.svg)

## 파이프라인 구성
1. `Web CI` (`.github/workflows/web-ci.yml`)
   - 정적 사이트 구조/문법 검증
   - 시크릿 패턴 스캔(최근 커밋 히스토리 포함)
   - 의존성 리뷰(Dependency Review, Dependency Graph 활성 시)
   - E2E 테스트(Playwright)
   - 성능/접근성/베스트프랙티스 품질 게이트(Lighthouse CI)
   - 최종 집계 체크 `Web CI` 제공(브랜치 보호 필수 체크 용도)

2. `AI PR Review` (`.github/workflows/ai-pr-review.yml`)
   - PR diff 기반 fallback(규칙 기반) 리뷰 자동 코멘트
   - 비용 없이 기본 품질 피드백 제공

3. `AI App PR Review Trigger` (`.github/workflows/gemini-pr-review.yml`)
   - PR 생성/업데이트 시 `/gemini review`, `@coderabbitai review` 요청 코멘트 자동 생성/갱신
   - Gemini Code Assist / CodeRabbit 설치 시 PR AI 리뷰 연동

4. `CodeQL` (`.github/workflows/codeql.yml`)
   - JavaScript 정적 보안 분석(SAST)
   - PR/Push + 주간 스케줄 실행

5. `SBOM (CycloneDX)` (`.github/workflows/sbom.yml`)
   - SBOM(`sbom.cdx.json`) 자동 생성 및 아티팩트 업로드

6. `PR Preview Deploy` (`.github/workflows/pr-preview.yml`)
   - PR마다 Netlify Preview URL 자동 생성/코멘트 갱신
   - 필요 시 수동 트리거(`workflow_dispatch`)도 지원

7. `Deploy Pages` (`.github/workflows/deploy-pages.yml`)
   - `main` 푸시 시 GitHub Pages 자동 배포
   - 배포 후 헬스체크 수행
   - 헬스체크 실패 시 직전 커밋으로 롤백 배포 시도

## AI 앱 PR 리뷰 설정
1. Gemini Code Assist 설치: `https://github.com/apps/gemini-code-assist`
2. CodeRabbit 설치: `https://github.com/apps/coderabbitai`
3. 두 앱 모두 설치 대상에 `jjunhaa0211/ACC` 레포 선택
4. PR에 자동 생성되는 코멘트(또는 수동 코멘트)로 리뷰 요청
   - `/gemini review`
   - `@coderabbitai review`

## 브랜치 보호 + Merge Queue
- 적용 워크플로: `.github/workflows/repo-governance.yml`
- 적용 스크립트: `.github/scripts/apply-repo-governance.sh`
- 기본 필수 체크: `Web CI`, `AI PR Review`, `AI Review Policy`, `CodeQL`
- `main`은 PR 기반 머지만 허용되도록 브랜치 보호를 적용하고, Merge Queue ruleset을 설정합니다.
- 운영 권장:
  - 저장소 시크릿 `REPO_ADMIN_TOKEN`(repo admin 권한 PAT) 설정
  - `Repo Governance` 워크플로를 `workflow_dispatch`로 1회 실행(또는 정책 변경 시 재실행)

## AI 리뷰 운영 규칙
- `.github/workflows/ai-review-policy.yml`에서 AI 코멘트에 보안/회귀 키워드가 감지되면 `ai-security-blocker` 라벨을 자동 부여합니다.
- 블로커 라벨이 있을 때는 사람 리뷰어의 `APPROVED`가 최소 1건 있어야 `AI Review Policy` 체크가 통과됩니다.
- 이 정책은 `/gemini review`, `@coderabbitai review` 요청 흐름과 함께 동작합니다.

## 배포
- GitHub Pages: `https://jjunhaa0211.github.io/ACC/`
- 첫 배포 시 레포 `Settings > Pages`에서 GitHub Actions 기반 배포를 허용하세요.
- PR Preview를 사용하려면 아래 시크릿을 추가하세요.
  - `NETLIFY_AUTH_TOKEN`
  - `NETLIFY_SITE_ID`

## 로컬 실행
브라우저에서 `index.html`을 열면 바로 확인할 수 있습니다.
