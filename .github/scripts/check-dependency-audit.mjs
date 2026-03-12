#!/usr/bin/env node

import fs from "node:fs";

const auditPath = process.argv[2] || "npm-audit.json";

function appendSummary(lines) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }
  fs.appendFileSync(summaryPath, `${lines.join("\n")}\n`, "utf8");
}

function toCount(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

if (!fs.existsSync(auditPath)) {
  console.error(`npm audit result not found: ${auditPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(auditPath, "utf8").trim();
if (!raw) {
  console.error(`npm audit result is empty: ${auditPath}`);
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(raw);
} catch (error) {
  console.error(`Failed to parse npm audit JSON: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const vulnerabilities = payload?.metadata?.vulnerabilities;

if (!vulnerabilities) {
  const errorCode = payload?.error?.code || "UNKNOWN";
  const message =
    payload?.error?.summary || payload?.error?.message || "npm audit metadata.vulnerabilities is unavailable.";

  console.warn(`::warning::Dependency Review warning (${errorCode}): ${message}`);
  appendSummary([
    "### Dependency Review",
    "",
    "- Status: WARNING",
    `- Code: ${errorCode}`,
    `- Message: ${message}`
  ]);
  process.exit(0);
}

const counts = {
  critical: toCount(vulnerabilities.critical),
  high: toCount(vulnerabilities.high),
  moderate: toCount(vulnerabilities.moderate),
  low: toCount(vulnerabilities.low),
  info: toCount(vulnerabilities.info),
  total: toCount(vulnerabilities.total)
};

if (counts.total === 0) {
  counts.total = counts.critical + counts.high + counts.moderate + counts.low + counts.info;
}

appendSummary([
  "### Dependency Review",
  "",
  `- critical: ${counts.critical}`,
  `- high: ${counts.high}`,
  `- moderate: ${counts.moderate}`,
  `- low: ${counts.low}`,
  `- info: ${counts.info}`,
  `- total: ${counts.total}`
]);

if (counts.critical > 0 || counts.high > 0) {
  console.error(
    `Blocking vulnerabilities detected (critical: ${counts.critical}, high: ${counts.high}).`
  );
  process.exit(1);
}

console.log(
  `Dependency Review passed. (critical: ${counts.critical}, high: ${counts.high}, total: ${counts.total})`
);
