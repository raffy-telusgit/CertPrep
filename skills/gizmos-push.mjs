#!/usr/bin/env node

// gizmos-push — deploy an app to Gizmos via the push API
//
// Usage:
//   gizmos-push [options] [directory]
//
// Options:
//   --app <name>         App name (default: read from wrangler.toml)
//   --api-key <key>      API key (default: $GIZMOS_API_KEY)
//   --url <url>          Gizmos base URL (default: $GIZMOS_URL)
//   --dry-run            List files that would be uploaded without deploying
//   --help               Show this help message

import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, relative } from "node:path";

function usage() {
  console.log(`Usage: gizmos-push [options] [directory]

Options:
  --app <name>         App name (default: from wrangler.toml)
  --api-key <key>      API key (default: $GIZMOS_API_KEY)
  --url <url>          Gizmos base URL (default: $GIZMOS_URL)
  --dry-run            List files without deploying
  --help               Show this help`);
}

function parseArgs(argv) {
  const args = { dir: ".", app: null, apiKey: null, url: null, dryRun: false };
  let i = 2;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else if (arg === "--app") {
      args.app = argv[++i];
    } else if (arg === "--api-key") {
      args.apiKey = argv[++i];
    } else if (arg === "--url") {
      args.url = argv[++i];
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (!arg.startsWith("-")) {
      args.dir = arg;
    } else {
      console.error(`Unknown option: ${arg}`);
      usage();
      process.exit(1);
    }
    i++;
  }
  return args;
}

function detectAppName(dir) {
  for (const searchDir of [dir, process.cwd()]) {
    const tomlPath = resolve(searchDir, "wrangler.toml");
    if (!existsSync(tomlPath)) continue;
    const content = readFileSync(tomlPath, "utf-8");
    const match = content.match(/^name\s*=\s*"([^"]+)"/m);
    if (match) return match[1];
  }
  return null;
}

// Detect "pushing source from a bundled project" — e.g. a Vite/webpack/rollup
// app's source directory, with a build script but no dist/ being deployed.
// The hub's in-browser Vite pipeline handles a lot of this, but real
// bundlers with node_modules produce tighter output. Warn the user so they
// can choose to build first and deploy `dist/` instead.
function detectBundledProjectShape(dir) {
  const pkgPath = resolve(dir, "package.json");
  if (!existsSync(pkgPath)) return null;
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  } catch {
    return null;
  }
  const buildScript = pkg.scripts?.build;
  if (!buildScript) return null;
  const bundlerConfigs = [
    "vite.config.ts",
    "vite.config.js",
    "vite.config.mjs",
    "webpack.config.js",
    "webpack.config.ts",
    "rollup.config.js",
    "rollup.config.mjs",
    "rollup.config.ts",
  ];
  const bundler = bundlerConfigs.find((c) => existsSync(resolve(dir, c)));
  if (!bundler) return null;
  // If deploying from a `dist/` or `build/` directory, the user already built.
  const basename = dir.split("/").filter(Boolean).pop() ?? "";
  if (basename === "dist" || basename === "build") return null;
  return { bundler, buildScript };
}

async function collectFiles(dir) {
  const absDir = resolve(dir);

  // Try git ls-files first to respect .gitignore
  try {
    const output = execSync("git ls-files --cached --others --exclude-standard", {
      cwd: absDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const files = output
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean)
      .filter((f) => {
        return (
          !f.startsWith("node_modules/") &&
          !f.startsWith(".git/") &&
          !f.startsWith("dist/") &&
          !f.startsWith("build/") &&
          !f.startsWith(".wrangler/") &&
          f !== ".DS_Store"
        );
      });
    // Only use git results if non-empty — dir may be gitignored (e.g. dist/)
    if (files.length > 0) return files;
  } catch {
    // Not a git repo — fall through to directory walk
  }

  // Directory walk fallback (used when not a git repo, or dir is gitignored)
  const { readdirSync } = await import("node:fs");
  const SKIP = new Set(["node_modules", ".git", "dist", "build", ".wrangler"]);
  const result = [];
  (function walk(d, prefix) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue;
      const full = resolve(d, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, rel);
      else result.push(rel);
    }
  })(absDir, "");
  return result;
}

// Inject files that must always accompany the deploy even when deploying from
// a sub-directory (e.g. dist/).  worker.ts holds the pre-bundled Cloudflare
// Worker; wrangler.toml carries the D1 binding Gizmos needs.  Both live at
// the project root and may not appear in the sub-directory file list.
function injectRootFiles(dir, filePaths) {
  const rootRequired = ['worker.ts', 'wrangler.toml'];
  let result = [...filePaths];
  for (const f of rootRequired) {
    if (result.includes(f)) continue;
    if (existsSync(resolve(dir, f))) continue;
    const atRoot = resolve(process.cwd(), f);
    if (existsSync(atRoot)) result = [f, ...result];
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv);
  const dir = resolve(args.dir);

  // Resolve API key
  const apiKey = args.apiKey || process.env.GIZMOS_API_KEY;
  if (!apiKey && !args.dryRun) {
    console.error(
      "Error: No API key found.\n" +
        "Set GIZMOS_API_KEY or pass --api-key <key>.\n" +
        "Generate one at your hub's /settings page."
    );
    process.exit(1);
  }

  // Resolve Gizmos URL
  const baseUrl = args.url || process.env.GIZMOS_URL;
  if (!baseUrl && !args.dryRun) {
    console.error(
      "Error: No Gizmos URL found.\n" +
        "Set GIZMOS_URL or pass --url <url>.\n" +
        "Example: https://gizmos.run"
    );
    process.exit(1);
  }

  // Resolve app name
  const appName = args.app || detectAppName(dir);
  if (!appName) {
    console.error(
      "Error: Could not determine app name.\n" +
        'Add name = "my-app" to wrangler.toml or pass --app <name>.'
    );
    process.exit(1);
  }

  // Collect files
  let filePaths = await collectFiles(dir);
  filePaths = injectRootFiles(dir, filePaths);
  if (filePaths.length === 0) {
    console.error("Error: No files found to deploy.");
    process.exit(1);
  }

  const bundled = detectBundledProjectShape(dir);
  if (bundled) {
    process.stderr.write(
      `\n[warn] This looks like a ${bundled.bundler.split(".")[0]} project. For best results, build first and deploy the output:\n` +
        `         npm run build && node skills/gizmos-push.mjs dist/\n` +
        `       Pushing source directly relies on the platform's in-browser bundler, which may not match your local build.\n\n`,
    );
  }

  console.log(`App:   ${appName}`);
  console.log(`Files: ${filePaths.length}`);

  if (args.dryRun) {
    console.log("\nFiles that would be uploaded:");
    for (const f of filePaths) console.log(`  ${f}`);
    return;
  }

  // Build payload
  // Some files (worker.ts, wrangler.toml) may live at the project root rather
  // than inside the deploy dir when deploying from dist/.
  const files = {};
  for (const f of filePaths) {
    const inDir = resolve(dir, f);
    const path = existsSync(inDir) ? inDir : resolve(process.cwd(), f);
    const content = readFileSync(path);
    files[f] = content.toString("base64");
  }

  const body = JSON.stringify({ files });
  console.log(`Size:  ${(body.length / 1024).toFixed(1)} KB`);
  console.log(`\nDeploying to ${appName}...`);

  // POST to loader's push API
  const url = `${baseUrl.replace(/\/$/, "")}/__push/apps/${encodeURIComponent(appName)}/deploy`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
    });
  } catch (err) {
    console.error(`\nError: Could not connect to ${baseUrl}`);
    console.error(err.cause?.message || err.message);
    process.exit(1);
  }

  const resBody = await res.json().catch(() => null);

  if (res.status === 200 && resBody?.ok) {
    console.log(`\nDeployed! Live at: ${resBody.url}`);
    if (resBody.warnings?.length) {
      for (const w of resBody.warnings) {
        process.stderr.write(`[warn] ${w}\n`);
      }
    }
  } else if (res.status === 401) {
    console.error("\nError: API key is invalid or revoked.");
    console.error("Generate a new one at your hub's /settings page.");
    process.exit(1);
  } else if (res.status === 403) {
    console.error(`\nError: App "${appName}" is owned by someone else.`);
    console.error("Choose a different name in wrangler.toml or pass --app <name>.");
    process.exit(1);
  } else {
    console.error(`\nError: Deploy failed (HTTP ${res.status})`);
    if (resBody) console.error(JSON.stringify(resBody, null, 2));
    process.exit(1);
  }
}

main();
