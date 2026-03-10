import fs from "node:fs";

const requiredFiles = ["index.html", "script.js"];
const errors = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    errors.push(`필수 파일이 없습니다: ${file}`);
  }
}

if (errors.length > 0) {
  throw new Error(errors.join("\n"));
}

const html = fs.readFileSync("index.html", "utf8");
const js = fs.readFileSync("script.js", "utf8");
const hasTailwindCdnScript = /<script[^>]*src=["']https:\/\/cdn\.tailwindcss\.com\/?["'][^>]*>\s*<\/script>/i.test(
  html
);

const checks = [
  {
    ok: /<html[^>]*lang=["']ko["']/i.test(html),
    fail: "index.html의 `<html>`에 `lang=\"ko\"`가 필요합니다."
  },
  {
    ok: hasTailwindCdnScript,
    fail: "index.html에 Tailwind CDN 로드가 필요합니다."
  },
  {
    ok: html.includes('id="dropButton"'),
    fail: "index.html에 `id=\"dropButton\"` 버튼이 필요합니다."
  },
  {
    ok: html.includes('id="emojiLayer"'),
    fail: "index.html에 `id=\"emojiLayer\"` 영역이 필요합니다."
  },
  {
    ok: html.includes('id="emojiTemplate"'),
    fail: "index.html에 `id=\"emojiTemplate\"` 템플릿이 필요합니다."
  },
  {
    ok: html.includes('id="status"') && html.includes('aria-live="polite"'),
    fail: "status 영역에 `aria-live=\"polite\"`가 필요합니다."
  },
  {
    ok: html.includes('src="script.js"'),
    fail: "index.html이 script.js를 로드해야 합니다."
  },
  {
    ok: js.includes("spawnBurst") && js.includes("window.__emojiLab"),
    fail: "script.js에 이모지 생성/테스트 API가 필요합니다."
  },
  {
    ok: js.includes("pointerdown") && js.includes("pointermove") && js.includes("pointerup"),
    fail: "script.js에 드래그/던지기 포인터 이벤트 처리가 필요합니다."
  },
  {
    ok: js.includes("resolveViewportCollision") && js.includes("resolveRectCollision"),
    fail: "script.js에 화면 경계/버튼 충돌 처리 로직이 필요합니다."
  }
];

for (const check of checks) {
  if (!check.ok) {
    errors.push(check.fail);
  }
}

if (errors.length > 0) {
  throw new Error(errors.join("\n"));
}

console.log("check-static-site: all checks passed");
