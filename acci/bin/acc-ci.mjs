#!/usr/bin/env node
import { runCli } from "../src/cli.mjs";

runCli(process.argv.slice(2)).catch((error) => {
  console.error(`acc-ci error: ${error.message}`);
  process.exit(1);
});
