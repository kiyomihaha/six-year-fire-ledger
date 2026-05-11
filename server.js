const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 4174);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const DATA_FILE = process.env.DATA_FILE || path.join(ROOT, "ledger-data.json");
const MAX_AMOUNT = 9_999_999.99;
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(Z|[+-]\d{2}:\d{2})$/;
const ENTRY_TYPES = new Set(["expense", "income", "saving"]);
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
      await handleSync(req, res);
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    sendError(res, 500, "internal server error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`六年之约同步服务已启动: http://${HOST}:${PORT}`);
});

async function handleSync(req, res) {
  if (req.method !== "GET") {
    sendError(res, 405, "method not allowed");
    return;
  }

  const ledger = readLedger();
  if (!ledger.ok) {
    sendError(res, 500, ledger.error);
    return;
  }

  sendJson(res, ledger.snapshot);
}

async function handleBackup(req, res) {
  if (req.method !== "POST") {
    sendError(res, 405, "method not allowed");
    return;
  }

  const body = await readBody(req);
  let incoming;

  try {
    incoming = JSON.parse(body || "{}");
  } catch {
    sendError(res, 400, "invalid json body");
    return;
  }

  if (!isPlainObject(incoming) || !Array.isArray(incoming.entries)) {
    sendError(res, 400, "invalid snapshot payload");
    return;
  }

  const validation = validateEntries(incoming.entries);
  if (!validation.ok) {
    sendError(res, 400, validation.error);
    return;
  }

  const nextData = {
    entries: sortEntries(validation.entries),
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

function migrateEntry(entry) {
  if (entry && typeof entry.category === "string" && !entry.category.includes("/")) {
    return { ...entry, category: `${entry.category}/自定义` };
  }
  return entry;
}

function readLedger() {
  if (!fs.existsSync(DATA_FILE)) {
    return {
      ok: true,
      snapshot: { entries: [], backedUpAt: null },
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    if (Array.isArray(parsed.entries)) {
      parsed.entries = parsed.entries.map(migrateEntry);
    }
    if (!isValidLedgerSnapshot(parsed)) {
      return {
        ok: false,
        error: "stored snapshot is invalid",
      };
    }

    return {
      ok: true,
      snapshot: {
        entries: sortEntries(parsed.entries),
        backedUpAt: parsed.backedUpAt,
      },
    };
  } catch {
    return {
      ok: false,
      error: "stored snapshot is invalid",
    };
  }
}

function validateEntries(entries) {
  const seenIds = new Set();

  for (const entry of entries) {
    if (!isValidEntry(entry)) {
      return { ok: false, error: "invalid entry payload" };
    }

    if (seenIds.has(entry.id)) {
      return { ok: false, error: "duplicate entry id" };
    }

    seenIds.add(entry.id);
  }

  return { ok: true, entries };
}

function isValidLedgerSnapshot(snapshot) {
  if (!isPlainObject(snapshot) || !Array.isArray(snapshot.entries)) {
    return false;
  }

  if (snapshot.backedUpAt === undefined) {
    snapshot.backedUpAt = null;
  }

  if (snapshot.backedUpAt !== null && !isValidTimestamp(snapshot.backedUpAt)) {
    return false;
  }

  return validateEntries(snapshot.entries).ok;
}

function isValidEntry(entry) {
  if (!isPlainObject(entry)) {
    return false;
  }

  if (typeof entry.id !== "string" || entry.id.trim() === "") {
    return false;
  }

  if (!ENTRY_TYPES.has(entry.type)) {
    return false;
  }

  if (!isValidAmount(entry.amount)) {
    return false;
  }

  if (!isValidCategory(entry.category)) {
    return false;
  }

  if (typeof entry.note !== "string") {
    return false;
  }

  if (!isValidTimestamp(entry.createdAt) || !isValidTimestamp(entry.updatedAt)) {
    return false;
  }

  return true;
}

function isValidAmount(value) {
  return (
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAX_AMOUNT &&
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-6
  );
}

function isValidCategory(category) {
  if (typeof category !== "string") {
    return false;
  }

  const parts = category.split("/");
  if (parts.length !== 2) {
    return false;
  }

  const [primary, secondary] = parts;
  if (!primary.trim() || !secondary.trim()) {
    return false;
  }

  return category === `${primary.trim()}/${secondary.trim()}`;
}

function isValidTimestamp(value) {
  return (
    typeof value === "string" &&
    TIMESTAMP_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function sortEntries(entries) {
  return [...entries].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
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

function sendError(res, statusCode, error) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error }));
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}
