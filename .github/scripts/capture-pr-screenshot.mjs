import fs from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const SCREENSHOT_OUTPUT = process.argv[2] || "dist/ci/pr-preview.png";
const PORT = Number(process.env.PR_SCREENSHOT_PORT || "4174");
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TARGET_URL = `${BASE_URL}/?seed=20260310&test=1`;
const DIST_DIR = path.resolve("dist");

async function captureScreenshot(url, outputPath) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.fill("#emojiCount", "120");
    await page.click("#dropButton");

    await page.evaluate(() => {
      const dropButton = document.getElementById("dropButton");
      const resetButton = document.getElementById("resetButton");
      const status = document.getElementById("status");

      if (dropButton) {
        dropButton.style.visibility = "hidden";
      }
      if (resetButton) {
        resetButton.style.visibility = "hidden";
      }
      if (status) {
        status.style.opacity = "0.8";
      }

      if (window.__emojiLab && typeof window.__emojiLab.runFrames === "function") {
        window.__emojiLab.runFrames(220);
      }
    });

    await page.waitForTimeout(300);
    await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
    await page.screenshot({ path: path.resolve(outputPath), fullPage: true });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function ensureDistSource() {
  await fs.mkdir(DIST_DIR, { recursive: true });

  for (const file of ["index.html", "script.js"]) {
    const source = path.resolve(file);
    const target = path.join(DIST_DIR, file);
    try {
      await fs.access(target);
    } catch {
      await fs.copyFile(source, target);
    }
  }
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".html") {
    return "text/html; charset=utf-8";
  }
  if (extension === ".js") {
    return "text/javascript; charset=utf-8";
  }
  if (extension === ".css") {
    return "text/css; charset=utf-8";
  }
  if (extension === ".png") {
    return "image/png";
  }
  if (extension === ".svg") {
    return "image/svg+xml";
  }
  if (extension === ".json") {
    return "application/json; charset=utf-8";
  }

  return "application/octet-stream";
}

async function startStaticServer(rootDir, port) {
  const server = createServer(async (request, response) => {
    try {
      const requestedUrl = new URL(request.url || "/", BASE_URL);
      const requestPath = decodeURIComponent(requestedUrl.pathname);
      const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
      const targetFile = path.resolve(rootDir, `.${normalizedPath}`);
      const rootPrefix = `${rootDir}${path.sep}`;

      if (targetFile !== rootDir && !targetFile.startsWith(rootPrefix)) {
        response.statusCode = 403;
        response.end("Forbidden");
        return;
      }

      const fileBuffer = await fs.readFile(targetFile);
      response.statusCode = 200;
      response.setHeader("Content-Type", getContentType(targetFile));
      response.end(fileBuffer);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        response.statusCode = 404;
        response.end("Not Found");
        return;
      }

      response.statusCode = 500;
      response.end("Internal Server Error");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve();
    });
  });

  return server;
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

await ensureDistSource();
const server = await startStaticServer(DIST_DIR, PORT);

try {
  await captureScreenshot(TARGET_URL, SCREENSHOT_OUTPUT);
  console.log(`PR 화면 캡처 저장 완료: ${path.resolve(SCREENSHOT_OUTPUT)}`);
} finally {
  await closeServer(server);
}
