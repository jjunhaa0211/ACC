import path from "node:path";
import { fileExists, readJson, writeFileIfNeeded, writeJson } from "./fs-utils.mjs";
import { pluginRegistry, getPlugin } from "./plugins.mjs";
import { runCommand } from "./shell-utils.mjs";
import { githubWorkflowTemplate } from "./templates.mjs";

export const CONFIG_PATH = ".acci/config.json";

export function detectEcosystem(projectDir) {
  const checks = [
    { ecosystem: "node", files: ["package.json"] },
    { ecosystem: "python", files: ["pyproject.toml", "requirements.txt", "setup.py"] },
    { ecosystem: "go", files: ["go.mod"] }
  ];

  for (const check of checks) {
    if (check.files.some((file) => fileExists(path.join(projectDir, file)))) {
      return check.ecosystem;
    }
  }

  return "unknown";
}

function defaultCommands() {
  return {
    install: [],
    lint: [],
    test: [],
    coverage: []
  };
}

function baseConfig(projectDir, ecosystem, commands) {
  return {
    meta: {
      generatedBy: "acc-ci",
      generatedAt: new Date().toISOString(),
      version: 1
    },
    project: {
      name: path.basename(projectDir),
      root: projectDir,
      ecosystem
    },
    testing: {
      mockDataDir: "tests/mocks",
      generatedTestDir: ecosystem === "node" ? "tests/generated" : "tests",
      enforceMockSchema: true
    },
    commands,
    ci: {
      provider: "github",
      workflowPath: ".github/workflows/acc-universal-ci.yml"
    },
    qualityGates: {
      requireLint: true,
      requireTests: true,
      requireMockValidation: true
    }
  };
}

export async function createDefaultConfig(projectDir, ecosystem) {
  const plugin = getPlugin(ecosystem);
  const commands = plugin ? await plugin.resolveCommands(projectDir) : defaultCommands();
  return baseConfig(projectDir, ecosystem, commands);
}

export async function initProject({ projectDir, force = false } = {}) {
  const ecosystem = detectEcosystem(projectDir);
  const configPath = path.join(projectDir, CONFIG_PATH);

  if (fileExists(configPath) && !force) {
    const existing = await readJson(configPath);
    return {
      created: false,
      configPath,
      config: existing,
      ecosystem: existing?.project?.ecosystem || ecosystem
    };
  }

  const config = await createDefaultConfig(projectDir, ecosystem);
  await writeJson(configPath, config);

  return {
    created: true,
    configPath,
    config,
    ecosystem
  };
}

export async function loadConfig(projectDir) {
  const configPath = path.join(projectDir, CONFIG_PATH);
  if (!fileExists(configPath)) {
    return null;
  }
  return readJson(configPath);
}

export async function scaffoldTests({ projectDir, force = false }) {
  let config = await loadConfig(projectDir);
  if (!config) {
    const result = await initProject({ projectDir, force: false });
    config = result.config;
  }

  const ecosystem = config.project.ecosystem;
  const plugin = getPlugin(ecosystem);

  if (!plugin) {
    return {
      scaffolded: false,
      reason: `Unsupported ecosystem: ${ecosystem}`
    };
  }

  await plugin.scaffold(projectDir, { force });
  return {
    scaffolded: true,
    ecosystem
  };
}

export async function setupCi({ projectDir, provider = "github", force = false }) {
  const config = await loadConfig(projectDir);
  const workflowPath = config?.ci?.workflowPath || ".github/workflows/acc-universal-ci.yml";
  const absoluteWorkflowPath = path.join(projectDir, workflowPath);

  if (provider !== "github") {
    return {
      generated: false,
      reason: `Unsupported CI provider: ${provider}`
    };
  }

  const result = await writeFileIfNeeded(absoluteWorkflowPath, githubWorkflowTemplate(), { force });
  return {
    generated: result.written,
    workflowPath,
    reason: result.reason
  };
}

export async function validateMockData({ projectDir, config }) {
  const mockDataDir = config?.testing?.mockDataDir || "tests/mocks";
  const mockFile = path.join(projectDir, mockDataDir, "users.mock.json");

  if (!fileExists(mockFile)) {
    throw new Error(`Mock data file missing: ${path.relative(projectDir, mockFile)}`);
  }

  const payload = await readJson(mockFile);

  if (typeof payload.version !== "string") {
    throw new Error("Mock data validation failed: version must be string");
  }
  if (typeof payload.generatedAt !== "string") {
    throw new Error("Mock data validation failed: generatedAt must be string");
  }
  if (!Array.isArray(payload.scenarios) || payload.scenarios.length === 0) {
    throw new Error("Mock data validation failed: scenarios must be non-empty array");
  }

  for (const scenario of payload.scenarios) {
    if (typeof scenario.id !== "string") {
      throw new Error("Mock data validation failed: scenario.id must be string");
    }
    if (typeof scenario.request?.method !== "string") {
      throw new Error("Mock data validation failed: scenario.request.method must be string");
    }
    if (typeof scenario.request?.path !== "string") {
      throw new Error("Mock data validation failed: scenario.request.path must be string");
    }
    if (typeof scenario.response?.status !== "number") {
      throw new Error("Mock data validation failed: scenario.response.status must be number");
    }
  }

  return {
    ok: true,
    file: mockFile,
    scenarios: payload.scenarios.length
  };
}

async function runCommandGroup(label, commands, options) {
  if (!commands || commands.length === 0) {
    console.log(`[skip] ${label}: no commands configured`);
    return;
  }

  console.log(`\n== ${label} ==`);
  for (const command of commands) {
    await runCommand(command, options);
  }
}

export async function verifyProject({
  projectDir,
  ci = false,
  dryRun = false,
  withCoverage = false
}) {
  let config = await loadConfig(projectDir);
  if (!config) {
    const result = await initProject({ projectDir });
    config = result.config;
  }

  if (config.qualityGates?.requireMockValidation) {
    const mockStatus = await validateMockData({ projectDir, config });
    console.log(`mock validation passed: ${path.relative(projectDir, mockStatus.file)} (${mockStatus.scenarios} scenarios)`);
  }

  const env = ci ? { CI: "1" } : {};
  const options = {
    cwd: projectDir,
    env,
    dryRun
  };

  await runCommandGroup("install", config.commands?.install || [], options);

  if (config.qualityGates?.requireLint) {
    await runCommandGroup("lint", config.commands?.lint || [], options);
  }

  if (config.qualityGates?.requireTests) {
    await runCommandGroup("test", config.commands?.test || [], options);
  }

  if (withCoverage) {
    await runCommandGroup("coverage", config.commands?.coverage || [], options);
  }

  return {
    ok: true,
    ecosystem: config.project?.ecosystem,
    projectDir
  };
}

export async function bootstrapProject({
  projectDir,
  provider = "github",
  force = false,
  dryRun = false,
  skipVerify = false,
  withCoverage = false
}) {
  const initResult = await initProject({ projectDir, force });
  const scaffoldResult = await scaffoldTests({ projectDir, force });
  const ciResult = await setupCi({ projectDir, provider, force });

  let verifyResult = null;
  if (!skipVerify) {
    verifyResult = await verifyProject({
      projectDir,
      ci: false,
      dryRun,
      withCoverage
    });
  }

  return {
    initResult,
    scaffoldResult,
    ciResult,
    verifyResult
  };
}

export function supportedEcosystems() {
  return Object.keys(pluginRegistry);
}
