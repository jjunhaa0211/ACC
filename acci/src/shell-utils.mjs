import { spawn } from "node:child_process";

export async function runCommand(command, { cwd, env = {}, dryRun = false } = {}) {
  if (dryRun) {
    console.log(`[dry-run] ${command}`);
    return { code: 0 };
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      env: {
        ...process.env,
        ...env
      },
      shell: true,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ code: 0 });
        return;
      }
      reject(new Error(`Command failed (${code}): ${command}`));
    });
  });
}
