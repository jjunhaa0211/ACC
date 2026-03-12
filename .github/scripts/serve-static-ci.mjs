import fs from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";

const rootArg = process.argv[2] || ".";
const portArg = process.argv[3] || process.env.PORT || "4173";

const rootDir = path.resolve(rootArg);
const port = Number(portArg);

if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`유효하지 않은 포트입니다: ${portArg}`);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js" || ext === ".mjs") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".ico") return "image/x-icon";

  return "application/octet-stream";
}

async function readWithSpaFallback(requestPath) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const normalized = path.resolve(rootDir, `.${safePath}`);
  const rootPrefix = `${rootDir}${path.sep}`;

  if (normalized !== rootDir && !normalized.startsWith(rootPrefix)) {
    return { status: 403, buffer: Buffer.from("Forbidden"), type: "text/plain; charset=utf-8" };
  }

  try {
    const buffer = await fs.readFile(normalized);
    return { status: 200, buffer, type: contentType(normalized) };
  } catch (error) {
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT") {
      return {
        status: 500,
        buffer: Buffer.from("Internal Server Error"),
        type: "text/plain; charset=utf-8"
      };
    }

    const fallbackPath = path.join(rootDir, "index.html");
    try {
      const fallback = await fs.readFile(fallbackPath);
      return { status: 200, buffer: fallback, type: "text/html; charset=utf-8" };
    } catch {
      return { status: 404, buffer: Buffer.from("Not Found"), type: "text/plain; charset=utf-8" };
    }
  }
}

const server = createServer(async (request, response) => {
  const baseUrl = `http://127.0.0.1:${port}`;
  const parsed = new URL(request.url || "/", baseUrl);
  const result = await readWithSpaFallback(decodeURIComponent(parsed.pathname));

  response.statusCode = result.status;
  response.setHeader("Content-Type", result.type);
  response.end(result.buffer);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`serve-static-ci: http://127.0.0.1:${port} (${rootDir})`);
});

function shutdown() {
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
