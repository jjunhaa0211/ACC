import fs from "node:fs";

const diffPath = process.argv[2];
const apiKey = process.env.OPENAI_API_KEY;

if (!diffPath || !fs.existsSync(diffPath)) {
  console.log("- PR diff 파일을 찾지 못해 OpenAI 리뷰를 건너뜁니다.");
  process.exit(0);
}

const rawDiff = fs.readFileSync(diffPath, "utf8");
if (!rawDiff.trim()) {
  console.log("- 변경된 코드가 없어 OpenAI 리뷰를 생략했습니다.");
  process.exit(0);
}

if (!apiKey) {
  console.log("- `OPENAI_API_KEY` 시크릿이 없어 OpenAI 리뷰를 건너뜁니다.");
  process.exit(0);
}

const diff = rawDiff.slice(0, 7000);
const systemPrompt = [
  "너는 PR을 리뷰하는 시니어 소프트웨어 엔지니어다.",
  "한국어로 답하고, 짧고 명확하게 작성해라.",
  "아래 Markdown 형식을 반드시 지켜라:",
  "- ✅ 잘한 점",
  "- ⚠️ 우선 확인할 이슈",
  "- 🔧 구조개선 제안",
  "치명 이슈가 없으면 없다고 명시해라."
].join("\n");

const userPrompt = `다음 PR diff를 리뷰해줘:\n\n${diff}`;

try {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      max_output_tokens: 500,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }]
        }
      ]
    })
  });

  if (!response.ok) {
    if (response.status === 429) {
      console.log("- OpenAI API 쿼터 부족(429)으로 AI 리뷰를 생성하지 못했습니다.");
      console.log("- OpenAI Billing/Usage limit을 확인한 뒤 다시 실행하세요.");
      process.exit(0);
    }

    const body = await response.text();
    console.log(`- OpenAI API 호출 실패: ${response.status}`);
    console.log(`- 응답 일부: ${body.slice(0, 180)}`);
    process.exit(0);
  }

  const data = await response.json();
  let text = data.output_text;

  if (!text && Array.isArray(data.output)) {
    text = data.output
      .flatMap((item) => item.content || [])
      .map((content) => content.text || "")
      .join("\n")
      .trim();
  }

  console.log(text?.trim() || "- OpenAI 응답이 비어 있습니다.");
} catch (error) {
  console.log("- OpenAI 리뷰 실행 중 예외가 발생했습니다.");
  console.log(`- ${error.message}`);
}
