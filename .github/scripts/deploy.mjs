// @ts-check

// We're building on GitHub Actions instead of Vercel to keep access to Git history.
//
// Each `vercel` subcommand runs in its own child process so that a non-zero
// exit pinpoints exactly which step failed (pull / build / deploy / alias)
// and surfaces stderr directly in the Actions log. The deployment URL is
// parsed from `vercel deploy` stdout by picking the last `https://…` line,
// which is robust to banners or deprecation notices printed by pnpm/vercel.

import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import parseArgs from "yargs-parser";

const { token, prod } = parseArgs(process.argv.slice(2));

if (!token) {
  throw new Error("deploy.mjs: missing --token");
}

const environment = prod ? "production" : "preview";

/**
 * Run `bunx <args...>` and exit the script on failure.
 *
 * @param {string} label
 * @param {string[]} args
 * @param {{ captureStdout?: boolean }} [opts]
 * @returns {string} captured stdout (empty string when captureStdout is false)
 */
function bunxRun(label, args, opts = {}) {
  const redacted = args.map((a) => a.replace(token, "***"));
  // eslint-disable-next-line no-console -- progress output for the GitHub Actions log
  console.log(`\n▶ ${label}: bunx ${redacted.join(" ")}`);

  const result = spawnSync("bunx", args, {
    stdio: opts.captureStdout ? ["inherit", "pipe", "inherit"] : "inherit",
    encoding: "utf8",
  });

  if (result.error) {
    throw new Error(`✗ ${label} failed to spawn: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stdoutTail =
      opts.captureStdout && result.stdout
        ? `\n--- stdout ---\n${result.stdout}`
        : "";
    throw new Error(`✗ ${label} exited with code ${result.status}${stdoutTail}`);
  }

  return opts.captureStdout ? (result.stdout ?? "") : "";
}

// 1. Pull Vercel environment information.
bunxRun("vercel pull", [
  "vercel",
  "pull",
  "--yes",
  `--token=${token}`,
  `--environment=${environment}`,
]);

// 2. Build project artifacts.
bunxRun("vercel build", [
  "vercel",
  "build",
  `--token=${token}`,
  ...(prod ? ["--prod"] : []),
]);

// 3. Deploy prebuilt artifacts. Capture stdout so we can extract the URL.
const deployStdout = bunxRun(
  "vercel deploy",
  [
    "vercel",
    "deploy",
    "--prebuilt",
    `--token=${token}`,
    ...(prod ? ["--prod"] : []),
  ],
  { captureStdout: true },
);

const deploymentUrl = deployStdout
  .split(/\r?\n/)
  .map((l) => l.trim())
  .toReversed()
  .find((l) => /^https:\/\/\S+$/.test(l));

if (!deploymentUrl) {
  throw new Error(
    `✗ could not find a deployment URL in \`vercel deploy\` output\n--- stdout ---\n${deployStdout}`,
  );
}
// eslint-disable-next-line no-console -- progress output for the GitHub Actions log
console.log(`deployment URL: ${deploymentUrl}`);

// 4. Alias the deployment to `${branch}--loudmouth-looter.vercel.app` and write the
//    alias to $GITHUB_ENV so later steps can reference it.
const deploymentAlias = createDeploymentAlias();
// eslint-disable-next-line no-console -- progress output for the GitHub Actions log
console.log(`deployment alias: ${deploymentAlias}`);

if (process.env.GITHUB_ENV) {
  appendFileSync(
    process.env.GITHUB_ENV,
    `DEPLOYMENT_ALIAS=${deploymentAlias}\n`,
  );
}

bunxRun("vercel alias", [
  "vercel",
  "alias",
  deploymentUrl,
  deploymentAlias,
  `--token=${token}`,
]);

function createDeploymentAlias() {
  if (!process.env.REF_NAME) throw new Error("process.env.REF_NAME is missing");

  const refSlug = process.env.REF_NAME.replace(
    "dependabot/npm_and_yarn/",
    "deps-",
  )
    .replaceAll(/[^a-z0-9]/gi, "-")
    .replaceAll(/-+/g, "-")
    .toLowerCase();

  return `${refSlug}--loudmouth-looter.vercel.app`;
}
