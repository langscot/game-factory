#!/usr/bin/env node
// Builds the site: one folder per game, plus a generated hub page.
// No dependencies, no config. `node scripts/build.mjs` → dist/

import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const GAMES = join(ROOT, "games");
const DIST = join(ROOT, "dist");

const SKIP = new Set(["node_modules", ".git", ".github", "package.json", "package-lock.json"]);

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

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

const cards = found
  .map(
    (g) => `
      <a class="card" href="./games/${esc(g.slug)}/">
        <h2>${esc(g.title)}</h2>
        <p>${esc(g.genre)}${g.genre && g.author ? " · " : ""}${esc(g.author)}</p>
      </a>`,
  )
  .join("");

await writeFile(
  join(DIST, "index.html"),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Game Factory</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 3rem 1.5rem; min-height: 100vh;
    background: #0d0d10; color: #e8e8ee;
    font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  main { max-width: 60rem; margin: 0 auto; }
  h1 { font-size: 1.6rem; letter-spacing: -0.02em; margin: 0 0 .25rem; }
  .sub { color: #8b8b9a; margin: 0 0 2.5rem; font-size: .95rem; }
  .sub a { color: inherit; }
  .grid { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); }
  .card { display: block; padding: 1.1rem 1.2rem; border: 1px solid #26262f; border-radius: .6rem;
          background: #141419; color: inherit; text-decoration: none; transition: border-color .12s, transform .12s; }
  .card:hover { border-color: #4a4a5c; transform: translateY(-1px); }
  .card h2 { font-size: 1rem; margin: 0 0 .2rem; }
  .card p { margin: 0; font-size: .82rem; color: #8b8b9a; }
  .empty { color: #6b6b7a; font-size: .95rem; }
  footer { margin-top: 3rem; font-size: .8rem; color: #5a5a68; }
  footer a { color: #8b8b9a; }
</style>
</head>
<body>
<main>
  <h1>Game Factory</h1>
  <p class="sub">Small browser games, built by anyone's agent, from GitHub issues.</p>
  ${
    found.length
      ? `<div class="grid">${cards}</div>`
      : `<p class="empty">No games yet. <a href="https://github.com/langscot/game-factory/issues">Open an issue</a> and it might become one.</p>`
  }
  <footer><a href="https://github.com/langscot/game-factory">Source and issues on GitHub</a> · ${found.length} game${found.length === 1 ? "" : "s"}</footer>
</main>
</body>
</html>
`,
);

console.log(`\ndist/ ready — ${found.length} game${found.length === 1 ? "" : "s"}`);
