import fs from "node:fs";

const requiredFiles = ["index.html", "styles.css", "script.js"];
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
const css = fs.readFileSync("styles.css", "utf8");
const js = fs.readFileSync("script.js", "utf8");

const checks = [
  {
    ok: /<html[^>]*lang=["']ko["']/i.test(html),
    fail: "index.html의 `<html>`에 `lang=\"ko\"`가 필요합니다."
  },
  {
    ok: html.includes('id="helloButton"'),
    fail: "index.html에 `id=\"helloButton\"` 버튼이 필요합니다."
  },
  {
    ok: html.includes('id="message"') && html.includes('aria-live="polite"'),
    fail: "메시지 영역에 `aria-live=\"polite\"`가 필요합니다."
  },
  {
    ok: html.includes('href="styles.css"'),
    fail: "index.html이 styles.css를 로드해야 합니다."
  },
  {
    ok: html.includes('src="script.js"'),
    fail: "index.html이 script.js를 로드해야 합니다."
  },
  {
    ok: css.includes(":root") && css.includes("--bg-1") && css.includes("--hot"),
    fail: "styles.css에 기본 테마 변수(:root)가 필요합니다."
  },
  {
    ok: js.includes("안녕하세요! 반가워요!"),
    fail: "script.js에 인사 메시지 텍스트가 필요합니다."
  },
  {
    ok: js.includes("helloButton") && js.includes("addEventListener"),
    fail: "script.js에 버튼 이벤트 핸들러가 필요합니다."
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
