# Plugin Development

## 기본 인터페이스

`acci/src/plugins.mjs`의 각 플러그인은 아래를 구현합니다.

- `resolveCommands(projectDir)`
- `scaffold(projectDir, options)`

## 새 생태계 추가 절차

1. 감지 규칙 추가
- `detectEcosystem`에 파일 시그니처 등록

2. 명령 세트 정의
- install/lint/test/coverage 커맨드 설계

3. 테스트/Mock 템플릿 생성
- 필수 mock 스키마를 만족하도록 테스트 추가

4. registry 등록
- `pluginRegistry.<ecosystem>` 추가

## 권장 설계 원칙

- 코어 로직은 생태계 비의존적으로 유지
- 생태계 차이는 플러그인에서만 처리
- mock 스키마 검증은 공통 계약으로 유지
