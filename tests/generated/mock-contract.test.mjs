import test from "node:test";
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
