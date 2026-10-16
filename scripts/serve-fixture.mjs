import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
const build = spawnSync(
  process.env.npm_execpath ? process.execPath : "npm run fixture:build",
  process.env.npm_execpath
    ? [process.env.npm_execpath, "run", "fixture:build"]
    : [],
  { stdio: "inherit", shell: !process.env.npm_execpath },
);
if (build.status !== 0) process.exit(build.status ?? 1);
const root = resolve("fixtures/astro-consumer/dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://127.0.0.1").pathname,
    );
    let file = resolve(root, "." + pathname);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    const body = await readFile(file);
    res
      .writeHead(200, {
        "Content-Type": types[extname(file)] ?? "application/octet-stream",
      })
      .end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
});
server.listen(4322, "127.0.0.1", () =>
  console.log("Built Astro fixture at http://127.0.0.1:4322"),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
