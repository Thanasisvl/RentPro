/* eslint-disable no-console */
const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 3000);
const buildDir = path.resolve(__dirname, "..", "build");
const indexHtml = path.join(buildDir, "index.html");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function safeDecodeURIComponent(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", contentTypes[ext] || "application/octet-stream");
  fs.createReadStream(filePath).pipe(res);
}

if (!fileExists(indexHtml)) {
  console.error(
    `[serve-build] build not found. Expected ${indexHtml}. Run "npm run build" first.`
  );
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const reqUrl = req.url || "/";
  const pathname = safeDecodeURIComponent(reqUrl.split("?")[0] || "/");

  // Normalize to prevent path traversal.
  const rel = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  const candidate = path.join(buildDir, rel);

  // If request maps to an existing file in build/, serve it.
  if (fileExists(candidate) && fs.statSync(candidate).isFile()) {
    return serveFile(res, candidate);
  }

  // SPA fallback: serve index.html for client-side routes.
  return serveFile(res, indexHtml);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[serve-build] serving ${buildDir} at http://127.0.0.1:${port}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));

