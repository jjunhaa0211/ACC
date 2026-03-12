# Test Mocks

이 디렉터리는 CI 자동화 툴(`acc-ci`)이 생성한 mock 시나리오를 보관합니다.

## 파일
- `users.mock.json`: API/서비스 응답 시나리오

## 원칙
- 항상 `version`, `generatedAt`, `scenarios` 필드를 유지합니다.
- 시나리오에는 `id`, `request`, `response`를 명시합니다.
- 테스트는 이 파일을 계약(contract)으로 사용해 회귀를 방지합니다.
