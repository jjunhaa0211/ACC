import path from "node:path";
import {
  buildDefaultMockData,
  goMockContractTestTemplate,
  mockReadmeTemplate,
  nodeMockContractTestTemplate,
  pythonMockContractTestTemplate
} from "./templates.mjs";
import { ensureDir, fileExists, readJson, updateJsonFile, writeFileIfNeeded, writeJson } from "./fs-utils.mjs";

function hasScript(pkg, scriptName) {
  return Boolean(pkg && pkg.scripts && pkg.scripts[scriptName]);
}

async function scaffoldMockData(projectDir, { force = false } = {}) {
  const mockDir = path.join(projectDir, "tests", "mocks");
  await ensureDir(mockDir);

  const mockFile = path.join(mockDir, "users.mock.json");
  const mockReadme = path.join(mockDir, "README.md");

  await writeJson(mockFile, buildDefaultMockData(), { force });
  await writeFileIfNeeded(mockReadme, mockReadmeTemplate(), { force });

  return {
    mockDir,
    mockFile
  };
}

async function scaffoldNode(projectDir, options = {}) {
  await scaffoldMockData(projectDir, options);

  const generatedDir = path.join(projectDir, "tests", "generated");
  await ensureDir(generatedDir);

  await writeFileIfNeeded(
    path.join(generatedDir, "mock-contract.test.mjs"),
    nodeMockContractTestTemplate(),
    options
  );

  const packageJsonPath = path.join(projectDir, "package.json");
  if (fileExists(packageJsonPath)) {
    await updateJsonFile(packageJsonPath, (pkg) => {
      const next = { ...pkg };
      next.scripts = { ...(pkg.scripts || {}) };

      if (!next.scripts["test:mock"]) {
        next.scripts["test:mock"] = "node --test tests/generated";
      }
      if (!next.scripts["test:ci:universal"]) {
        next.scripts["test:ci:universal"] =
          "npm run lint --if-present && npm run test:mock --if-present && npm run test --if-present && npm run test:e2e:ci --if-present";
      }

      return next;
    });
  }
}

async function scaffoldPython(projectDir, options = {}) {
  await scaffoldMockData(projectDir, options);

  await writeFileIfNeeded(
    path.join(projectDir, "tests", "test_mock_contract.py"),
    pythonMockContractTestTemplate(),
    options
  );
}

async function scaffoldGo(projectDir, options = {}) {
  await scaffoldMockData(projectDir, options);

  await writeFileIfNeeded(
    path.join(projectDir, "tests", "mock_contract_test.go"),
    goMockContractTestTemplate(),
    options
  );
}

async function nodeCommands(projectDir) {
  const packageJsonPath = path.join(projectDir, "package.json");
  const pkg = fileExists(packageJsonPath) ? await readJson(packageJsonPath) : {};
  const hasPackageLock = fileExists(path.join(projectDir, "package-lock.json"));

  const install = [hasPackageLock ? "npm ci" : "npm install"];
  const lint = hasScript(pkg, "lint") ? ["npm run lint"] : ["npm run lint --if-present"];

  const test = [];
  if (hasScript(pkg, "test:ci:universal")) {
    test.push("npm run test:ci:universal");
  } else {
    test.push("npm run test:mock --if-present");
    test.push("npm run test --if-present");
    test.push("npm run test:e2e:ci --if-present");
  }

  return {
    install,
    lint,
    test,
    coverage: ["npm run test:coverage --if-present"]
  };
}

async function pythonCommands(projectDir) {
  const install = ["python3 -m pip install --upgrade pip"];

  const reqTxt = path.join(projectDir, "requirements.txt");
  const reqDevTxt = path.join(projectDir, "requirements-dev.txt");

  if (fileExists(reqTxt)) {
    install.push("python3 -m pip install -r requirements.txt");
  }
  if (fileExists(reqDevTxt)) {
    install.push("python3 -m pip install -r requirements-dev.txt");
  }

  return {
    install,
    lint: ["ruff check . || true", "flake8 . || true"],
    test: ["python3 -m unittest discover -s tests -p 'test*.py'"] ,
    coverage: ["pytest --cov --cov-report=term-missing || true"]
  };
}

async function goCommands() {
  return {
    install: ["go mod download || true"],
    lint: ["go vet ./..."],
    test: ["go test ./... -count=1"],
    coverage: ["go test ./... -coverprofile=coverage.out"]
  };
}

export const pluginRegistry = {
  node: {
    id: "node",
    scaffold: scaffoldNode,
    resolveCommands: nodeCommands
  },
  python: {
    id: "python",
    scaffold: scaffoldPython,
    resolveCommands: pythonCommands
  },
  go: {
    id: "go",
    scaffold: scaffoldGo,
    resolveCommands: goCommands
  }
};

export function getPlugin(ecosystem) {
  return pluginRegistry[ecosystem] || null;
}
