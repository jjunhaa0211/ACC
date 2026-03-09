import fs from "node:fs";

const diffPath = process.argv[2];
const apiKey = process.env.GEMINI_API_KEY;

if (!diffPath || !fs.existsSync(diffPath)) {
  console.log("- PR diff 파일을 찾지 못해 Gemini 리뷰를 건너뜁니다.");
  process.exit(0);
}

const rawDiff = fs.readFileSync(diffPath, "utf8");
if (!rawDiff.trim()) {
  console.log("- 변경된 코드가 없어 Gemini 리뷰를 생략했습니다.");
  process.exit(0);
}

if (!apiKey) {
  console.log("- `GEMINI_API_KEY` 시크릿이 없어 Gemini 리뷰를 건너뜁니다.");
  process.exit(0);
}

const diff = rawDiff.slice(0, 12000);
const prompt = [
  "너는 PR 리뷰어다. 한국어로 간결하게 답해라.",
  "아래 Markdown 형식으로만 답해라:",
  "- ✅ 잘한 점",
  "- ⚠️ 우선 확인할 이슈",
  "- 🔧 구조개선 제안",
  "심각한 문제가 없으면 없다고 써라.",
  "",
  "PR diff:",
  diff
].join("\n");

try {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 700 }
      })
    }
  );

  if (!response.ok) {
    const body = await response.text();
    console.log(`- Gemini API 호출 실패: ${response.status}`);
    console.log(`- 응답: ${body.slice(0, 300)}`);
    process.exit(0);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("\n")
    .trim();

  console.log(text || "- Gemini 응답이 비어 있습니다.");
} catch (error) {
  console.log("- Gemini 리뷰 실행 중 예외가 발생했습니다.");
  console.log(`- ${error.message}`);
}
