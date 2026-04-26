const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 4174);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const DATA_FILE = process.env.DATA_FILE || path.join(ROOT, "ledger-data.json");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    setCors(res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url.startsWith("/api/backup")) {
      await handleBackup(req, res);
      return;
    }

    if (req.url.startsWith("/api/sync")) {
      await handleRestore(req, res);
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`六年之约同步服务已启动: http://${HOST}:${PORT}`);
});

async function handleRestore(req, res) {
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end("Method not allowed");
    return;
  }

  sendJson(res, readLedger());
}

async function handleBackup(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end("Method not allowed");
    return;
  }

  const body = await readBody(req);
  const incoming = JSON.parse(body || "{}");
  const nextData = {
    entries: sanitizeEntries(incoming.entries || []),
    backedUpAt: new Date().toISOString(),
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(nextData, null, 2), "utf8");
  sendJson(res, nextData);
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const rel = urlPath === "/" ? "index.html" : urlPath.slice(1);
  const file = path.resolve(ROOT, rel);

  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}

function readLedger() {
  if (!fs.existsSync(DATA_FILE)) {
    return { entries: [], syncedAt: null };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return Array.isArray(parsed.entries) ? parsed : { entries: [], syncedAt: null };
  } catch {
    return { entries: [], syncedAt: null };
  }
}

function sanitizeEntries(entries) {
  const byId = new Map();

  entries.forEach((entry) => {
    if (!entry || !entry.id) {
      return;
    }

    const existing = byId.get(entry.id);
    if (!existing || new Date(entry.updatedAt || entry.createdAt) > new Date(existing.updatedAt || existing.createdAt)) {
      byId.set(entry.id, entry);
    }
  });

  return [...byId.values()].sort(
    (left, right) => new Date(right.createdAt) - new Date(left.createdAt)
  );
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sendJson(res, data) {
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
