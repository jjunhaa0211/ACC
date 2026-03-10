const { test, expect } = require("@playwright/test");

test("button click drops bouncing emojis inside the viewport", async ({ page }) => {
  await page.goto("/?seed=7");

  const button = page.locator("#dropButton");
  await expect(button).toBeVisible();

  await button.click();
  await page.waitForTimeout(1000);

  const emojiCount = await page.locator('[data-emoji="true"]').count();
  expect(emojiCount).toBeGreaterThan(30);

  const hasOutOfBoundsEmoji = await page.evaluate(() => {
    const state = window.__emojiLab.getState();
    const { innerWidth, innerHeight } = window;

    return state.some((emoji) => {
      return (
        emoji.x - emoji.radius < 0 ||
        emoji.y - emoji.radius < 0 ||
        emoji.x + emoji.radius > innerWidth ||
        emoji.y + emoji.radius > innerHeight
      );
    });
  });

  expect(hasOutOfBoundsEmoji).toBe(false);
});

test("user can drag and throw an emoji", async ({ page }) => {
  await page.goto("/?seed=18&test=1");

  await page.click("#dropButton");

  const target = page.locator('[data-emoji="true"]').first();
  await expect(target).toBeVisible();

  const emojiId = await target.getAttribute("data-emoji-id");
  expect(emojiId).not.toBeNull();

  const before = await page.evaluate((id) => {
    const current = window.__emojiLab.getState().find((emoji) => String(emoji.id) === id);
    return current ?? null;
  }, emojiId);
  expect(before).not.toBeNull();

  const box = await target.boundingBox();
  if (!box) {
    throw new Error("이모지 위치를 확인할 수 없습니다.");
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 180, startY - 120, { steps: 8 });
  await page.mouse.up();

  const released = await page.evaluate((id) => {
    const current = window.__emojiLab.getState().find((emoji) => String(emoji.id) === id);
    return current ?? null;
  }, emojiId);
  expect(released).not.toBeNull();

  await page.evaluate(() => {
    window.__emojiLab.runFrames(40);
  });

  const after = await page.evaluate((id) => {
    const current = window.__emojiLab.getState().find((emoji) => String(emoji.id) === id);
    return current ?? null;
  }, emojiId);

  expect(after).not.toBeNull();
  expect(Math.abs(after.x - before.x)).toBeGreaterThan(20);
  const travelAfterRelease = Math.abs(after.x - released.x) + Math.abs(after.y - released.y);
  expect(travelAfterRelease).toBeGreaterThan(5);
});

test("snapshot: deterministic emoji scene", async ({ page }) => {
  await page.goto("/?seed=20260310&test=1");

  await page.click("#dropButton");
  await page.evaluate(() => {
    window.__emojiLab.runFrames(180);
  });

  const state = await page.evaluate(() => {
    return window.__emojiLab.getState().slice(0, 12);
  });

  expect(JSON.stringify(state, null, 2)).toMatchSnapshot("emoji-scene.json");
});
