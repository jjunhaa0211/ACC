import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

export function fileExists(targetPath) {
  return existsSync(targetPath);
}

export async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

export async function readJson(targetPath) {
  const raw = await fs.readFile(targetPath, "utf8");
  return JSON.parse(raw);
}

export async function writeJson(targetPath, data, { force = true } = {}) {
  await ensureDir(path.dirname(targetPath));
  if (!force && fileExists(targetPath)) {
    return { written: false, reason: "exists" };
  }
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(targetPath, serialized, "utf8");
  return { written: true, reason: force ? "force" : "new" };
}

export async function writeFileIfNeeded(targetPath, contents, { force = false } = {}) {
  await ensureDir(path.dirname(targetPath));

  if (!force && fileExists(targetPath)) {
    return { written: false, reason: "exists" };
  }

  await fs.writeFile(targetPath, contents, "utf8");
  return { written: true, reason: force ? "force" : "new" };
}

export async function updateJsonFile(targetPath, updater) {
  const current = fileExists(targetPath) ? await readJson(targetPath) : {};
  const next = await updater(current);
  await writeJson(targetPath, next);
  return next;
}

export function toPosixPath(inputPath) {
  return inputPath.split(path.sep).join("/");
}
