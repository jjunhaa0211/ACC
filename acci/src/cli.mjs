import path from "node:path";
import {
  bootstrapProject,
  detectEcosystem,
  initProject,
  scaffoldTests,
  setupCi,
  supportedEcosystems,
  verifyProject
} from "./core.mjs";

function parseArgs(argv) {
  const args = [...argv];
  const command = args.shift() || "help";
  const options = {};
  const positional = [];

  while (args.length > 0) {
    const token = args.shift();

    if (!token) {
      continue;
    }

    if (token.startsWith("--")) {
      const [rawKey, inlineValue] = token.slice(2).split("=", 2);
      const key = rawKey.trim();

      if (inlineValue !== undefined) {
        options[key] = inlineValue;
        continue;
      }

      const next = args[0];
      if (next && !next.startsWith("--")) {
        options[key] = args.shift();
      } else {
        options[key] = true;
      }
      continue;
    }

    positional.push(token);
  }

  return {
    command,
    options,
    positional
  };
}

function toBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["1", "true", "yes", "y", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "n", "off"].includes(normalized)) {
      return false;
    }
  }
  return false;
}

function resolveProjectDir(options) {
  const target = options.project || ".";
  return path.resolve(process.cwd(), String(target));
}

function printHelp() {
  console.log(`acc-ci: Universal CI/Test automation bootstrap CLI\n
Usage:
  acc-ci <command> [options]\n
Commands:
  init              프로젝트 분석 + .acci/config.json 생성
  scaffold-tests    테스트/Mock 파일 스캐폴딩
  setup-ci          CI 워크플로 템플릿 생성 (현재 github)
  verify            mock 검증 + lint/test 실행
  bootstrap         init + scaffold-tests + setup-ci + verify
  detect            프로젝트 생태계 감지 결과 출력
  help              도움말\n
Options:
  --project <path>        대상 프로젝트 경로 (기본: 현재 경로)
  --provider <name>       CI provider (기본: github)
  --force                 기존 파일 덮어쓰기
  --dry-run               명령 실행 없이 출력만
  --ci                    CI 모드(CI=1)
  --skip-verify           bootstrap에서 verify 생략
  --with-coverage         verify 시 coverage 명령도 실행
`);
}

export async function runCli(argv) {
  const { command, options } = parseArgs(argv);
  const projectDir = resolveProjectDir(options);

  if (toBoolean(options.help) || command === "help") {
    printHelp();
    return;
  }

  if (command === "detect") {
    const ecosystem = detectEcosystem(projectDir);
    console.log(`project: ${projectDir}`);
    console.log(`ecosystem: ${ecosystem}`);
    console.log(`supported: ${supportedEcosystems().join(", ")}`);
    return;
  }

  if (command === "init") {
    const result = await initProject({
      projectDir,
      force: toBoolean(options.force)
    });
    console.log(result.created ? "config created" : "config exists");
    console.log(`config: ${result.configPath}`);
    console.log(`ecosystem: ${result.ecosystem}`);
    return;
  }

  if (command === "scaffold-tests") {
    const result = await scaffoldTests({
      projectDir,
      force: toBoolean(options.force)
    });
    if (!result.scaffolded) {
      throw new Error(result.reason || "scaffold failed");
    }
    console.log(`scaffold complete: ${result.ecosystem}`);
    return;
  }

  if (command === "setup-ci") {
    const result = await setupCi({
      projectDir,
      provider: String(options.provider || "github"),
      force: toBoolean(options.force)
    });

    if (!result.generated && result.reason?.startsWith("Unsupported")) {
      throw new Error(result.reason);
    }

    console.log(result.generated ? "workflow generated" : "workflow unchanged");
    console.log(`workflow: ${result.workflowPath}`);
    return;
  }

  if (command === "verify") {
    const result = await verifyProject({
      projectDir,
      ci: toBoolean(options.ci),
      dryRun: toBoolean(options["dry-run"]),
      withCoverage: toBoolean(options["with-coverage"])
    });

    console.log(`verify complete: ${result.ecosystem}`);
    return;
  }

  if (command === "bootstrap") {
    const result = await bootstrapProject({
      projectDir,
      provider: String(options.provider || "github"),
      force: toBoolean(options.force),
      dryRun: toBoolean(options["dry-run"]),
      skipVerify: toBoolean(options["skip-verify"]),
      withCoverage: toBoolean(options["with-coverage"])
    });

    console.log("bootstrap complete");
    console.log(`config: ${result.initResult.configPath}`);
    console.log(`workflow: ${result.ciResult.workflowPath}`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}
