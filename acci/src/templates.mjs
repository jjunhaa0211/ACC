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

export function generatedConfigComment() {
  return "이 파일은 acc-ci가 생성합니다. 필요 시 수정 가능하며, 팀 표준에 맞춰 커스터마이징하세요.";
}
