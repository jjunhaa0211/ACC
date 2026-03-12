#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const repository = process.env.GITHUB_REPOSITORY;
const prNumber = process.env.PR_NUMBER;
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

if (!repository) {
  console.error("GITHUB_REPOSITORY is required.");
  process.exit(1);
}

if (!prNumber) {
  console.error("PR_NUMBER is required.");
  process.exit(1);
}

if (!token) {
  console.error("GH_TOKEN or GITHUB_TOKEN is required.");
  process.exit(1);
}

function runGh(args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    env: {
      ...process.env,
      GH_TOKEN: token
    }
  });
}

function hasHeading(body, heading) {
  const target = `## ${heading}`;
  return body.split("\n").some((line) => line.trim() === target);
}

function extractSection(body, heading) {
  const lines = body.split("\n");
  const target = `## ${heading}`;

  let startIndex = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() === target) {
      startIndex = index + 1;
      break;
    }
  }

  if (startIndex === -1) {
    return "";
  }

  const sectionLines = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^##\s+/.test(line.trim())) {
      break;
    }
    sectionLines.push(line);
  }

  return sectionLines.join("\n").trim();
}

const prRaw = runGh(["api", `repos/${repository}/pulls/${prNumber}`]);
const pr = JSON.parse(prRaw);
const body = String(pr.body || "").trim();

const errors = [];

if (!body) {
  errors.push("PR 본문이 비어 있습니다.");
}

const requiredHeadings = [
  "AI 작업 메타",
  "AI 요구사항서",
  "구현 변경 요약",
  "변경 전/후",
  "커밋 내역",
  "검증 결과",
  "리스크 및 롤백",
  "자동화 체크리스트"
];

for (const heading of requiredHeadings) {
  if (!hasHeading(body, heading)) {
    errors.push(`필수 섹션 누락: \`## ${heading}\``);
  }
}

const requiredCheckedItems = [
  "요구사항서 작성 완료",
  "변경 전/후 작성 완료",
  "커밋 내역 작성 완료",
  "검증 근거(로그/아티팩트/이미지) 첨부 완료"
];

for (const item of requiredCheckedItems) {
  const checked = body.includes(`- [x] ${item}`) || body.includes(`- [X] ${item}`);
  if (!checked) {
    errors.push(`체크리스트 미완료: \`${item}\``);
  }
}

if (/\[필수 입력\]/.test(body)) {
  errors.push("`[필수 입력]` 플레이스홀더가 남아 있습니다.");
}

const beforeAfterSection = extractSection(body, "변경 전/후");
const beforeAfterRows = beforeAfterSection
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.startsWith("|"));
if (beforeAfterRows.length < 3) {
  errors.push("`## 변경 전/후` 표에 최소 1개 데이터 행이 필요합니다.");
}

const commitSection = extractSection(body, "커밋 내역");
const commitRows = commitSection
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.startsWith("|"));
if (commitRows.length < 3) {
  errors.push("`## 커밋 내역` 표에 최소 1개 데이터 행이 필요합니다.");
}

const commitShaListRaw = runGh([
  "api",
  "--paginate",
  `repos/${repository}/pulls/${prNumber}/commits`,
  "--jq",
  ".[].sha"
]);

const commitShas = commitShaListRaw
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

const missingCommits = commitShas
  .map((sha) => ({ full: sha, short: sha.slice(0, 7) }))
  .filter(({ full, short }) => !body.includes(short) && !body.includes(full))
  .map(({ short }) => short);

if (missingCommits.length > 0) {
  errors.push(
    `PR의 모든 커밋이 \`## 커밋 내역\`에 포함되어야 합니다. 누락 커밋(앞 7자리): ${missingCommits.join(", ")}`
  );
}

if (errors.length > 0) {
  console.error("AI PR 본문 정책 위반:");
  for (const [index, message] of errors.entries()) {
    console.error(`${index + 1}. ${message}`);
  }
  process.exit(1);
}

console.log(`AI PR 본문 정책 통과: PR #${prNumber} (${commitShas.length} commits checked)`);
