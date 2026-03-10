const { test, expect } = require("@playwright/test");

const FIXED_VIEWPORT = { width: 1280, height: 720 };

async function gotoWithViewport(page, path) {
  await page.setViewportSize(FIXED_VIEWPORT);
  await page.goto(path);
}

test("user count 200/300 keeps emojis and prevents duplicate symbols", async ({ page }) => {
  await gotoWithViewport(page, "/?seed=7&test=1");

  const catalogSize = await page.evaluate(() => window.__emojiLab.getCatalogSize());
  expect(catalogSize).toBeGreaterThanOrEqual(500);

  await page.fill("#emojiCount", "200");
  await page.click("#dropButton");

  const stateAfterFirstDrop = await page.evaluate(() => window.__emojiLab.getState());
  expect(stateAfterFirstDrop).toHaveLength(200);
  expect(new Set(stateAfterFirstDrop.map((emoji) => emoji.symbol)).size).toBe(200);

  await page.fill("#emojiCount", "300");
  await page.click("#dropButton");

  const stateAfterSecondDrop = await page.evaluate(() => window.__emojiLab.getState());
  expect(stateAfterSecondDrop).toHaveLength(500);
  expect(new Set(stateAfterSecondDrop.map((emoji) => emoji.symbol)).size).toBe(500);
});

test("reset clears all emojis and restores unique pool", async ({ page }) => {
  await gotoWithViewport(page, "/?seed=11&test=1");

  await page.fill("#emojiCount", "180");
  await page.click("#dropButton");

  const beforeReset = await page.evaluate(() => {
    return {
      count: window.__emojiLab.getState().length,
      remaining: window.__emojiLab.getRemainingUniqueCount(),
      catalog: window.__emojiLab.getCatalogSize()
    };
  });

  expect(beforeReset.count).toBe(180);
  expect(beforeReset.remaining).toBe(beforeReset.catalog - 180);

  await page.click("#resetButton");

  const afterReset = await page.evaluate(() => {
    return {
      count: window.__emojiLab.getState().length,
      remaining: window.__emojiLab.getRemainingUniqueCount(),
      catalog: window.__emojiLab.getCatalogSize()
    };
  });

  expect(afterReset.count).toBe(0);
  expect(afterReset.remaining).toBe(afterReset.catalog);
});

test("user can drag and throw an emoji", async ({ page }) => {
  await gotoWithViewport(page, "/?seed=18&test=1");

  await page.fill("#emojiCount", "60");
  await page.click("#dropButton");
  await page.evaluate(() => {
    window.__emojiLab.runFrames(90);
  });

  const emojiId = await page.evaluate(() => {
    const h = window.innerHeight;
    const target = window.__emojiLab
      .getState()
      .find((emoji) => emoji.y > 120 && emoji.y < h - 80);

    return target ? String(target.id) : null;
  });

  expect(emojiId).not.toBeNull();

  const target = page.locator(`[data-emoji-id="${emojiId}"]`);
  await expect(target).toBeVisible();

  const before = await page.evaluate((id) => {
    return window.__emojiLab.getState().find((emoji) => String(emoji.id) === id) ?? null;
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
  await page.mouse.move(startX + 200, startY - 140, { steps: 10 });
  await page.mouse.up();

  const released = await page.evaluate((id) => {
    return window.__emojiLab.getState().find((emoji) => String(emoji.id) === id) ?? null;
  }, emojiId);
  expect(released).not.toBeNull();

  await page.evaluate(() => {
    window.__emojiLab.runFrames(40);
  });

  const after = await page.evaluate((id) => {
    return window.__emojiLab.getState().find((emoji) => String(emoji.id) === id) ?? null;
  }, emojiId);

  expect(after).not.toBeNull();
  expect(Math.abs(after.x - before.x)).toBeGreaterThan(20);

  const travelAfterRelease = Math.abs(after.x - released.x) + Math.abs(after.y - released.y);
  expect(travelAfterRelease).toBeGreaterThan(5);
});

test("snapshot: deterministic emoji scene", async ({ page }) => {
  await gotoWithViewport(page, "/?seed=20260310&test=1");

  await page.fill("#emojiCount", "120");
  await page.click("#dropButton");
  await page.evaluate(() => {
    const button = document.getElementById("dropButton");
    if (button) {
      button.style.display = "none";
    }

    window.__emojiLab.runFrames(180);
  });

  const state = await page.evaluate(() => {
    return window.__emojiLab.getState().slice(0, 12);
  });

  expect(JSON.stringify(state, null, 2)).toMatchSnapshot("emoji-scene.json");
});
