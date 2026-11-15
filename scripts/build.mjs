#!/usr/bin/env node
// Builds the site: one folder per game, plus the hub page rendered from scripts/hub.html.
// No dependencies, no config. `node scripts/build.mjs` → dist/

import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const GAMES = join(ROOT, "games");
const DIST = join(ROOT, "dist");
const HUB = join(ROOT, "scripts", "hub.html");

const SKIP = new Set(["node_modules", ".git", ".github", "package.json", "package-lock.json"]);

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

async function size(dir) {
  let total = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) total += await size(p);
    else total += (await stat(p)).size;
  }
  return total;
}

async function readMeta(gameDir) {
  try {
    return JSON.parse(await readFile(join(gameDir, "game.json"), "utf8"));
  } catch {
    return {};
  }
}

// A game may ship as-is, or build itself into its own dist/ first.
function prepare(gameDir) {
  const pkgPath = join(gameDir, "package.json");
  if (!existsSync(pkgPath)) return gameDir;

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    if (!pkg.scripts?.build) return gameDir;
  } catch {
    return gameDir;
  }

  console.log(`  building ${gameDir}`);
  execFileSync("npm", ["ci", "--no-audit", "--no-fund"], { cwd: gameDir, stdio: "inherit" });
  execFileSync("npm", ["run", "build"], { cwd: gameDir, stdio: "inherit" });
  return join(gameDir, "dist");
}

await rm(DIST, { recursive: true, force: true });
await mkdir(join(DIST, "games"), { recursive: true });

const found = [];

for (const entry of await readdir(GAMES, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

  const slug = entry.name;
  const gameDir = join(GAMES, slug);
  const source = prepare(gameDir);

  if (!existsSync(join(source, "index.html"))) {
    throw new Error(`games/${slug}/index.html not found — every game needs one`);
  }

  const out = join(DIST, "games", slug);
  await cp(source, out, {
    recursive: true,
    filter: (src) => !SKIP.has(src.split("/").pop()),
  });

  const meta = await readMeta(gameDir);
  const bytes = await size(out);
  if (bytes > 2 * 1024 * 1024) {
    console.warn(`  ! games/${slug} is ${kb(bytes)} — AGENTS.md asks for ~1 MB`);
  }

  console.log(`  ${slug} (${kb(bytes)})`);
  found.push({
    slug,
    title: meta.title || slug,
    genre: meta.genre || "",
    author: meta.author || "",
  });
}

found.sort((a, b) => a.title.localeCompare(b.title));

const hub = await readFile(HUB, "utf8");
await writeFile(join(DIST, "index.html"), hub.replace("__GAMES__", () => JSON.stringify(found)));

console.log(`\ndist/ ready — ${found.length} game${found.length === 1 ? "" : "s"}`);
