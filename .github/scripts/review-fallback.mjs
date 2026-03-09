import fs from "node:fs";

const diffPath = process.argv[2];

if (!diffPath || !fs.existsSync(diffPath)) {
  console.log("- PR diff 파일이 없어 fallback 리뷰를 생략했습니다.");
  process.exit(0);
}

const rawDiff = fs.readFileSync(diffPath, "utf8");
if (!rawDiff.trim()) {
  console.log("- 변경된 코드가 없어 fallback 리뷰를 생략했습니다.");
  process.exit(0);
}

const lines = rawDiff.split("\n");
const files = new Set();
let additions = 0;
let deletions = 0;
const findings = [];

for (const line of lines) {
  if (line.startsWith("+++ b/")) {
    files.add(line.replace("+++ b/", "").trim());
    continue;
  }

  if (line.startsWith("+") && !line.startsWith("+++")) {
    additions += 1;
    const code = line.slice(1);

    if (/sk-proj-|AIza|api[_-]?key|secret/i.test(code)) {
      findings.push("민감정보(키/시크릿) 노출 패턴이 변경분에 포함될 수 있습니다.");
    }
    if (/innerHTML\s*=|eval\(/.test(code)) {
      findings.push("XSS/코드 실행 위험 패턴(`innerHTML`, `eval`)이 보입니다.");
    }
    if (/TODO|FIXME/i.test(code)) {
      findings.push("미완료 표시(`TODO`/`FIXME`)가 남아 있습니다.");
    }
  } else if (line.startsWith("-") && !line.startsWith("---")) {
    deletions += 1;
  }
}

const uniqueFindings = [...new Set(findings)];
const fileList = [...files];

console.log("- ✅ 잘한 점");
console.log(
  `  - 변경 파일 ${fileList.length}개, 추가 ${additions}줄/삭제 ${deletions}줄로 PR 규모가 명확합니다.`
);
if (fileList.length > 0) {
  console.log(`  - 변경 파일: ${fileList.slice(0, 6).join(", ")}`);
}

console.log("- ⚠️ 우선 확인할 이슈");
if (uniqueFindings.length === 0) {
  console.log("  - 자동 규칙 검사에서 즉시 위험 신호는 발견되지 않았습니다.");
} else {
  for (const finding of uniqueFindings.slice(0, 4)) {
    console.log(`  - ${finding}`);
  }
}

console.log("- 🔧 구조개선 제안");
console.log("  - API 쿼터 이슈 대비용으로 fallback 리뷰를 유지해 CI 가시성을 확보하세요.");
console.log("  - 핵심 로직 변경 PR에는 테스트(또는 스모크 체크)를 함께 추가하세요.");
