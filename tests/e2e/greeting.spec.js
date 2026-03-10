const { test, expect } = require("@playwright/test");

test("button click shows greeting and animation target", async ({ page }) => {
  await page.goto("/");

  const button = page.locator("#helloButton");
  const message = page.locator("#message");
  const sparkles = page.locator("#sparkles");

  await expect(button).toBeVisible();
  await expect(message).toHaveText("");

  await button.click();

  await expect(message).toHaveText("안녕하세요! 반가워요!");
  await expect(message).toHaveClass(/show/);
  await expect(sparkles.locator(".spark")).toHaveCount(5);
});
