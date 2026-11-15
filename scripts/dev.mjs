#!/usr/bin/env node
// Build the site, then serve dist/ on http://localhost:8080.
// Zero dependencies so `npm run dev` works on any machine with Node installed.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 8080);
// fileURLToPath, not `.pathname`: on Windows the latter is "/D:/Code/...",
// which join() turns into "\D:\Code\..." and nothing resolves.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".woff2": "font/woff2",
};

execFileSync(process.execPath, [join(ROOT, "scripts", "build.mjs")], { stdio: "inherit" });

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  path = normalize(path).replace(/^(\.\.[/\\])+/, "");
  let file = join(DIST, path);

  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, "index.html");
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("404");
    return;
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": TYPES[extname(file)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("404");
  }
}).listen(PORT, () => {
  console.log(`\n  http://localhost:${PORT}\n`);
});
