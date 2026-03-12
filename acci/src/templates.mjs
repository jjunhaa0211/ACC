export function buildDefaultMockData() {
  return {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    scenarios: [
      {
        id: "users-list-default",
        description: "기본 사용자 조회 응답",
        request: {
          method: "GET",
          path: "/api/users"
        },
        response: {
          status: 200,
          body: {
            users: [
              { id: "u_001", name: "Alice", role: "admin" },
              { id: "u_002", name: "Bob", role: "editor" }
            ]
          }
        }
      },
      {
        id: "users-list-empty",
        description: "빈 사용자 목록 응답",
        request: {
          method: "GET",
          path: "/api/users?empty=true"
        },
        response: {
          status: 200,
          body: {
            users: []
          }
        }
      }
    ]
  };
}

export function nodeMockContractTestTemplate() {
  return `import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function loadMock() {
  const fileUrl = new URL("../mocks/users.mock.json", import.meta.url);
  const raw = fs.readFileSync(fileUrl, "utf8");
  return JSON.parse(raw);
}

test("mock contract: users.mock.json schema", () => {
  const payload = loadMock();

  assert.equal(typeof payload.version, "string");
  assert.equal(typeof payload.generatedAt, "string");
  assert.ok(Array.isArray(payload.scenarios));
  assert.ok(payload.scenarios.length > 0);

  for (const scenario of payload.scenarios) {
    assert.equal(typeof scenario.id, "string");
    assert.equal(typeof scenario.description, "string");

    assert.equal(typeof scenario.request?.method, "string");
    assert.equal(typeof scenario.request?.path, "string");

    assert.equal(typeof scenario.response?.status, "number");
    assert.equal(typeof scenario.response?.body, "object");
  }
});

test("mock scenario: users-list-default exists", () => {
  const payload = loadMock();
  const scenario = payload.scenarios.find((item) => item.id === "users-list-default");

  assert.ok(scenario, "users-list-default 시나리오가 필요합니다.");
  assert.equal(scenario.response.status, 200);
  assert.ok(Array.isArray(scenario.response.body.users));
});
`;
}

export function pythonMockContractTestTemplate() {
  return `import json
from pathlib import Path
import unittest


class MockContractTest(unittest.TestCase):
    def setUp(self):
        mock_path = Path(__file__).parent / "mocks" / "users.mock.json"
        self.payload = json.loads(mock_path.read_text(encoding="utf-8"))

    def test_mock_schema(self):
        self.assertIsInstance(self.payload.get("version"), str)
        self.assertIsInstance(self.payload.get("generatedAt"), str)

        scenarios = self.payload.get("scenarios")
        self.assertIsInstance(scenarios, list)
        self.assertGreater(len(scenarios), 0)

        for scenario in scenarios:
            self.assertIsInstance(scenario.get("id"), str)
            self.assertIsInstance(scenario.get("description"), str)
            self.assertIsInstance(scenario.get("request", {}).get("method"), str)
            self.assertIsInstance(scenario.get("request", {}).get("path"), str)
            self.assertIsInstance(scenario.get("response", {}).get("status"), int)
            self.assertIsInstance(scenario.get("response", {}).get("body"), dict)

    def test_default_users_scenario_exists(self):
        scenarios = self.payload.get("scenarios", [])
        default_case = next((s for s in scenarios if s.get("id") == "users-list-default"), None)
        self.assertIsNotNone(default_case)
        self.assertEqual(default_case["response"]["status"], 200)


if __name__ == "__main__":
    unittest.main()
`;
}

export function goMockContractTestTemplate() {
  return `package tests

import (
  "encoding/json"
  "os"
  "path/filepath"
  "testing"
)

type mockPayload struct {
  Version    string          \`json:"version"\`
  GeneratedAt string         \`json:"generatedAt"\`
  Scenarios  []mockScenario  \`json:"scenarios"\`
}

type mockScenario struct {
  ID          string \`json:"id"\`
  Description string \`json:"description"\`
  Request     struct {
    Method string \`json:"method"\`
    Path   string \`json:"path"\`
  } \`json:"request"\`
  Response struct {
    Status int                    \`json:"status"\`
    Body   map[string]interface{} \`json:"body"\`
  } \`json:"response"\`
}

func loadPayload(t *testing.T) mockPayload {
  t.Helper()

  content, err := os.ReadFile(filepath.Join("tests", "mocks", "users.mock.json"))
  if err != nil {
    t.Fatalf("failed to read mock file: %v", err)
  }

  var payload mockPayload
  if err := json.Unmarshal(content, &payload); err != nil {
    t.Fatalf("failed to parse mock file: %v", err)
  }

  return payload
}

func TestMockContract(t *testing.T) {
  payload := loadPayload(t)

  if payload.Version == "" {
    t.Fatal("version is required")
  }
  if payload.GeneratedAt == "" {
    t.Fatal("generatedAt is required")
  }
  if len(payload.Scenarios) == 0 {
    t.Fatal("at least one scenario is required")
  }

  for _, scenario := range payload.Scenarios {
    if scenario.ID == "" {
      t.Fatal("scenario id is required")
    }
    if scenario.Request.Method == "" {
      t.Fatal("scenario.request.method is required")
    }
    if scenario.Request.Path == "" {
      t.Fatal("scenario.request.path is required")
    }
  }
}
`;
}

export function mockReadmeTemplate() {
  return `# Test Mocks

이 디렉터리는 CI 자동화 툴(\`acc-ci\`)이 생성한 mock 시나리오를 보관합니다.

## 파일
- \`users.mock.json\`: API/서비스 응답 시나리오

## 원칙
- 항상 \`version\`, \`generatedAt\`, \`scenarios\` 필드를 유지합니다.
- 시나리오에는 \`id\`, \`request\`, \`response\`를 명시합니다.
- 테스트는 이 파일을 계약(contract)으로 사용해 회귀를 방지합니다.
`;
}

export function githubWorkflowTemplate() {
  return `name: ACC Universal CI

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: acc-universal-ci-${"${{ github.ref }}"}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write

jobs:
  quality:
    name: Universal Quality Gate
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Setup Node
        uses: actions/setup-node@v6
        with:
          node-version: 20
          cache: npm

      - name: Run Universal Verify
        run: node acci/bin/acc-ci.mjs verify --project . --ci

      - name: Upload Universal Artifacts
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: acc-universal-artifacts-${"${{ github.run_id }}"}
          retention-days: 14
          if-no-files-found: warn
          path: |
            test-results
            playwright-report
            .lighthouseci
            tests/mocks
`;
}

export function aiPrPolicyWorkflowTemplate() {
  return `name: AI Review Policy

on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened, ready_for_review, edited]
  pull_request_review:
    types: [submitted, edited, dismissed]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  policy-gate:
    name: AI Review Policy
    runs-on: ubuntu-latest
    if: (github.event_name == 'pull_request' || github.event_name == 'pull_request_review') && github.event.pull_request.draft == false

    steps:
      - name: Checkout policy scripts
        uses: actions/checkout@v6

      - name: Enforce AI PR body contract
        env:
          GH_TOKEN: ${"${{ github.token }}"}
          PR_NUMBER: ${"${{ github.event.pull_request.number }}"}
        run: node .github/scripts/validate-ai-pr-body.mjs
`;
}

export function aiPrTemplate() {
  return `## AI 작업 메타
- AI 에이전트: [필수 입력]
- 요구사항 원문: [필수 입력]
- 목표/완료 기준: [필수 입력]
- 제외 범위(이번 PR에서 안 하는 것): [필수 입력]

## AI 요구사항서
### 1) 문제 정의
- [필수 입력]

### 2) 해결 전략
- [필수 입력]

### 3) 성공 기준
- [필수 입력]

## 구현 변경 요약
- [필수 입력]

## 변경 전/후
| 항목 | 변경 전 | 변경 후 | 기대 효과 |
|---|---|---|---|
| [필수 입력] | [필수 입력] | [필수 입력] | [필수 입력] |

## 커밋 내역
| Commit | 타입 | 변경 요약 | 요구사항 연결 |
|---|---|---|---|
| [필수 입력] | [필수 입력] | [필수 입력] | [필수 입력] |

## 검증 결과
- 로컬 테스트: [필수 입력]
- CI 결과: [필수 입력]
- 스크린샷/영상/리포트: [필수 입력]

## 리스크 및 롤백
- 리스크: [필수 입력]
- 롤백 방법: [필수 입력]

## 자동화 체크리스트
- [ ] 요구사항서 작성 완료
- [ ] 변경 전/후 작성 완료
- [ ] 커밋 내역 작성 완료
- [ ] 검증 근거(로그/아티팩트/이미지) 첨부 완료
`;
}

export function aiPrBodyValidatorScriptTemplate() {
  return [
    "#!/usr/bin/env node",
    "",
    "import { execFileSync } from \"node:child_process\";",
    "",
    "const repository = process.env.GITHUB_REPOSITORY;",
    "const prNumber = process.env.PR_NUMBER;",
    "const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;",
    "",
    "if (!repository) {",
    "  console.error(\"GITHUB_REPOSITORY is required.\");",
    "  process.exit(1);",
    "}",
    "",
    "if (!prNumber) {",
    "  console.error(\"PR_NUMBER is required.\");",
    "  process.exit(1);",
    "}",
    "",
    "if (!token) {",
    "  console.error(\"GH_TOKEN or GITHUB_TOKEN is required.\");",
    "  process.exit(1);",
    "}",
    "",
    "function runGh(args) {",
    "  return execFileSync(\"gh\", args, {",
    "    encoding: \"utf8\",",
    "    env: {",
    "      ...process.env,",
    "      GH_TOKEN: token",
    "    }",
    "  });",
    "}",
    "",
    "function hasHeading(body, heading) {",
    "  const target = `## ${heading}`;",
    "  return body.split(\"\\n\").some((line) => line.trim() === target);",
    "}",
    "",
    "function extractSection(body, heading) {",
    "  const lines = body.split(\"\\n\");",
    "  const target = `## ${heading}`;",
    "",
    "  let startIndex = -1;",
    "  for (let index = 0; index < lines.length; index += 1) {",
    "    if (lines[index].trim() === target) {",
    "      startIndex = index + 1;",
    "      break;",
    "    }",
    "  }",
    "",
    "  if (startIndex === -1) {",
    "    return \"\";",
    "  }",
    "",
    "  const sectionLines = [];",
    "  for (let index = startIndex; index < lines.length; index += 1) {",
    "    const line = lines[index];",
    "    if (/^##\\\\s+/.test(line.trim())) {",
    "      break;",
    "    }",
    "    sectionLines.push(line);",
    "  }",
    "",
    "  return sectionLines.join(\"\\n\").trim();",
    "}",
    "",
    "const prRaw = runGh([\"api\", `repos/${repository}/pulls/${prNumber}`]);",
    "const pr = JSON.parse(prRaw);",
    "const body = String(pr.body || \"\").trim();",
    "",
    "const errors = [];",
    "",
    "if (!body) {",
    "  errors.push(\"PR 본문이 비어 있습니다.\");",
    "}",
    "",
    "const requiredHeadings = [",
    "  \"AI 작업 메타\",",
    "  \"AI 요구사항서\",",
    "  \"구현 변경 요약\",",
    "  \"변경 전/후\",",
    "  \"커밋 내역\",",
    "  \"검증 결과\",",
    "  \"리스크 및 롤백\",",
    "  \"자동화 체크리스트\"",
    "];",
    "",
    "for (const heading of requiredHeadings) {",
    "  if (!hasHeading(body, heading)) {",
    "    errors.push(`필수 섹션 누락: \\`## ${heading}\\``);",
    "  }",
    "}",
    "",
    "const requiredCheckedItems = [",
    "  \"요구사항서 작성 완료\",",
    "  \"변경 전/후 작성 완료\",",
    "  \"커밋 내역 작성 완료\",",
    "  \"검증 근거(로그/아티팩트/이미지) 첨부 완료\"",
    "];",
    "",
    "for (const item of requiredCheckedItems) {",
    "  const checked = body.includes(`- [x] ${item}`) || body.includes(`- [X] ${item}`);",
    "  if (!checked) {",
    "    errors.push(`체크리스트 미완료: \\`${item}\\``);",
    "  }",
    "}",
    "",
    "if (/\\\\[필수 입력\\\\]/.test(body)) {",
    "  errors.push(\"`[필수 입력]` 플레이스홀더가 남아 있습니다.\");",
    "}",
    "",
    "const beforeAfterSection = extractSection(body, \"변경 전/후\");",
    "const beforeAfterRows = beforeAfterSection",
    "  .split(\"\\n\")",
    "  .map((line) => line.trim())",
    "  .filter((line) => line.startsWith(\"|\"));",
    "if (beforeAfterRows.length < 3) {",
    "  errors.push(\"`## 변경 전/후` 표에 최소 1개 데이터 행이 필요합니다.\");",
    "}",
    "",
    "const commitSection = extractSection(body, \"커밋 내역\");",
    "const commitRows = commitSection",
    "  .split(\"\\n\")",
    "  .map((line) => line.trim())",
    "  .filter((line) => line.startsWith(\"|\"));",
    "if (commitRows.length < 3) {",
    "  errors.push(\"`## 커밋 내역` 표에 최소 1개 데이터 행이 필요합니다.\");",
    "}",
    "",
    "const commitShaListRaw = runGh([",
    "  \"api\",",
    "  \"--paginate\",",
    "  `repos/${repository}/pulls/${prNumber}/commits`,",
    "  \"--jq\",",
    "  \".[].sha\"",
    "]);",
    "",
    "const commitShas = commitShaListRaw",
    "  .split(\"\\n\")",
    "  .map((line) => line.trim())",
    "  .filter((line) => line.length > 0);",
    "",
    "const missingCommits = commitShas",
    "  .map((sha) => ({ full: sha, short: sha.slice(0, 7) }))",
    "  .filter(({ full, short }) => !body.includes(short) && !body.includes(full))",
    "  .map(({ short }) => short);",
    "",
    "if (missingCommits.length > 0) {",
    "  errors.push(",
    "    `PR의 모든 커밋이 \\`## 커밋 내역\\`에 포함되어야 합니다. 누락 커밋(앞 7자리): ${missingCommits.join(\", \")}`",
    "  );",
    "}",
    "",
    "if (errors.length > 0) {",
    "  console.error(\"AI PR 본문 정책 위반:\");",
    "  for (const [index, message] of errors.entries()) {",
    "    console.error(`${index + 1}. ${message}`);",
    "  }",
    "  process.exit(1);",
    "}",
    "",
    "console.log(`AI PR 본문 정책 통과: PR #${prNumber} (${commitShas.length} commits checked)`);",
    ""
  ].join("\n");
}

export function generatedConfigComment() {
  return "이 파일은 acc-ci가 생성합니다. 필요 시 수정 가능하며, 팀 표준에 맞춰 커스터마이징하세요.";
}
