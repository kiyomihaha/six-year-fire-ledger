// ===== 1. Constants & Configuration =====

const STORAGE_KEY = "six-year-fire-ledger";
const SYNC_URL_KEY = "six-year-fire-ledger-sync-url";
const VISION_AMOUNT = 1_000_000;
const START_DATE = new Date("2026-04-26T00:00:00+08:00");
const YEARS = 6;
const MAX_AMOUNT = 9_999_999.99;
const FETCH_TIMEOUT_MS = 8_000;
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(Z|[+-]\d{2}:\d{2})$/;
const ENTRY_TYPES = new Set(["expense", "income", "saving"]);
const CANONICAL_ENTRY_FIELDS = [
  "id",
  "type",
  "amount",
  "category",
  "note",
  "createdAt",
  "updatedAt",
];

const categories = {
  expense: [
    { icon: "餐", label: "餐饮", children: ["早餐", "午餐", "晚餐", "夜宵", "饮料咖啡", "零食", "聚餐", "自定义"] },
    { icon: "行", label: "交通", children: ["地铁", "公交", "打车", "高铁机票", "加油充电", "停车", "自定义"] },
    { icon: "购", label: "购物", children: ["食品", "生活用品", "电子产品", "衣服鞋包", "护肤清洁", "家电家具", "自定义"] },
    { icon: "家", label: "居家", children: ["房租房贷", "水电燃气", "物业", "维修", "宽带话费", "自定义"] },
    { icon: "健", label: "健康", children: ["买药", "门诊", "体检", "运动", "保险", "自定义"] },
    { icon: "娱", label: "娱乐", children: ["电影", "游戏", "会员订阅", "旅行", "礼物", "自定义"] },
    { icon: "学", label: "学习", children: ["书籍", "课程", "软件工具", "考试认证", "自定义"] },
    { icon: "其", label: "其他", children: ["人情", "手续费", "临时支出", "自定义"] },
  ],
  income: [
    { icon: "工", label: "工资", children: ["固定工资", "绩效奖金", "补贴", "自定义"] },
    { icon: "奖", label: "奖金", children: ["年终奖", "项目奖", "红包", "自定义"] },
    { icon: "投", label: "投资", children: ["股息", "基金", "利息", "自定义"] },
    { icon: "副", label: "副业", children: ["接单", "咨询", "销售", "自定义"] },
  ],
  saving: [
    { icon: "存", label: "存款", children: ["活期", "定期", "备用金", "自定义"] },
    { icon: "定", label: "定投", children: ["基金", "股票", "养老金", "自定义"] },
    { icon: "约", label: "FIRE", children: ["六年之约", "长期账户", "自定义"] },
    { icon: "红", label: "红包", children: ["现金红包", "转账红包", "自定义"] },
  ],
};

const fallbackEntries = [
  makeEntry("saving", 5200, "FIRE/六年之约", "月初自动存入"),
  makeEntry("expense", 32, "餐饮/午餐", "午饭"),
  makeEntry("income", 1800, "副业/接单", "周末项目"),
];

const adviceNotes = [
  "今天已经记账了，先给自己一个小小的确定感。长期主义就是这样一点点攒出来的。",
  "如果今天的消费偏高，先别急着自责。看看是不是一次性支出，再决定要不要调整明天。",
  "餐饮和咖啡最容易悄悄变大。下次想买之前，可以先问一句：这笔会让我更自由吗？",
  "存钱不是把生活按灭，是把真正重要的东西留亮一点。",
  "本月如果还能多留下一点，六年后的自己会收到这份小小的善意。",
  "偶尔花钱让自己开心没问题，关键是别让无意识消费替你做选择。",
  "如果今年消费看起来吓人，把它拆回今天。你只需要管理下一笔。",
  "离愿景更近一点的方式，有时候就是今晚不冲动下单。",
];

// ===== 2. Pure Helpers =====

function sum(items, selector) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function getDaysLeft() {
  const end = new Date(START_DATE);
  end.setFullYear(end.getFullYear() + YEARS);
  return Math.max(Math.ceil((end - new Date()) / 86_400_000), 1);
}

function getDailyTargetPace(saved) {
  return Math.max((VISION_AMOUNT - saved) / getDaysLeft(), 0);
}

function isToday(dateText) {
  return new Date(dateText).toDateString() === new Date().toDateString();
}

function isThisMonth(dateText) {
  const date = new Date(dateText);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function isThisYear(dateText) {
  return new Date(dateText).getFullYear() === new Date().getFullYear();
}

function findIcon(type, category) {
  const primary = String(category || "").split("/")[0];
  return categories[type].find((item) => item.label === primary)?.icon || "📌";
}

function money(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function formatDate(dateText) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateText));
}

function formatTime(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getPrimaryCategory(entry) {
  return String(entry.category || "").split("/")[0] || "未分类";
}

function getSecondaryCategory(entry) {
  const parts = String(entry.category || "").split("/");
  return parts[1] || parts[0] || "未分类";
}

function getEntryTime(entry) {
  return Date.parse(entry.updatedAt);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ===== 3. Validation =====

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

function isValidLedgerSnapshot(snapshot) {
  if (!isPlainObject(snapshot) || !Array.isArray(snapshot.entries)) {
    return false;
  }

  if (snapshot.backedUpAt !== null && !isValidTimestamp(snapshot.backedUpAt)) {
    return false;
  }

  const seenIds = new Set();
  return snapshot.entries.every((entry) => {
    if (!isValidEntry(entry) || seenIds.has(entry.id)) {
      return false;
    }

    seenIds.add(entry.id);
    return true;
  });
}

function areCanonicalEntriesEqual(left, right) {
  return CANONICAL_ENTRY_FIELDS.every((field) => left[field] === right[field]);
}

function migrateEntry(entry) {
  if (entry && typeof entry.category === "string" && !entry.category.includes("/")) {
    return { ...entry, category: `${entry.category}/自定义` };
  }
  return entry;
}

function normalizeEntries(entries) {
  const normalizedEntries = [];
  const seenIds = new Set();
  let invalidCount = 0;

  entries.forEach((entry) => {
    const migrated = migrateEntry(entry);
    if (!isValidEntry(migrated) || seenIds.has(migrated.id)) {
      invalidCount += 1;
      return;
    }

    seenIds.add(migrated.id);
    normalizedEntries.push(migrated);
  });

  return {
    entries: normalizedEntries,
    issue: invalidCount > 0 ? "本地数据异常，已暂停同步" : null,
  };
}

// ===== 4. State Management =====

function makeEntry(type, amount, category, note = "") {
  const timestamp = new Date().toISOString();
  return {
    id: generateId(),
    type,
    amount,
    category,
    note,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { state: { entries: [] }, issue: null };
  }

  try {
    const parsed = JSON.parse(stored);
    if (!isPlainObject(parsed) || !Array.isArray(parsed.entries)) {
      return {
        state: { entries: [] },
        issue: "本地数据异常，已暂停同步",
      };
    }

    const normalized = normalizeEntries(parsed.entries);
    return {
      state: { entries: normalized.entries },
      issue: normalized.issue,
    };
  } catch {
    return {
      state: { entries: [] },
      issue: "本地数据异常，已暂停同步",
    };
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: state.entries }));
}

function getCurrentCategoryConfig() {
  return (
    categories[currentType].find((item) => item.label === currentCategory) ||
    categories[currentType][0]
  );
}

function getSelectedCategory() {
  const primary = currentCategory.trim();
  const secondary = currentSubcategory === "自定义"
    ? (els.customCategoryInput.value.trim() || "自定义")
    : currentSubcategory.trim();

  if (secondary.includes("/")) {
    return "";
  }

  const category = `${primary}/${secondary}`;
  return isValidCategory(category) ? category : "";
}

// ===== 5. Sync & Backup =====

function getSyncUrl() {
  const saved = localStorage.getItem(SYNC_URL_KEY);
  const fallback = window.location.origin?.startsWith("http")
    ? window.location.origin
    : "";
  return normalizeUrl(saved || fallback);
}

function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function updateSyncStatus(text) {
  els.syncStatus.textContent = text;
}

function getDefaultSyncStatus() {
  if (localDataIssue) {
    return localDataIssue;
  }
  return getSyncUrl() ? "本机离线可用" : "填写电脑地址后可备份";
}

function getSyncStateMessage(syncState) {
  const messages = {
    "both-empty": "本地和电脑都还没有记录",
    identical: "本地和电脑已一致",
    "local-ahead": "本地有新记录，可备份到电脑",
    "remote-ahead": "电脑有较新记录，可恢复到本地",
    "local-empty": "本地为空，可从电脑恢复",
    "remote-empty": "电脑还没有备份，可备份到电脑",
    diverged: "本地和电脑都有新变化，请先决定备份或恢复",
    "remote-unavailable": "当前连不上电脑端服务",
    "remote-invalid": "电脑快照格式异常，暂时不能同步",
    "local-invalid": "本地数据异常，已暂停同步",
  };

  return messages[syncState] || "同步状态未知";
}

function getRestoreWarning(syncState) {
  if (syncState === "local-ahead") {
    return "从电脑恢复会覆盖本地独有记录，确定继续吗？";
  }

  return "本地和电脑各自都有新变化，从电脑恢复会覆盖当前本地账本，确定继续吗？";
}

function getSyncState(localEntries, remoteEntries) {
  if (localEntries.length === 0 && remoteEntries.length === 0) {
    return "both-empty";
  }

  if (localEntries.length === 0) {
    return "local-empty";
  }

  if (remoteEntries.length === 0) {
    return "remote-empty";
  }

  const localById = new Map(localEntries.map((entry) => [entry.id, entry]));
  const remoteById = new Map(remoteEntries.map((entry) => [entry.id, entry]));
  let hasLocalOnly = false;
  let hasRemoteOnly = false;
  let hasLocalNewer = false;
  let hasRemoteNewer = false;

  localById.forEach((localEntry, id) => {
    const remoteEntry = remoteById.get(id);
    if (!remoteEntry) {
      hasLocalOnly = true;
      return;
    }

    if (areCanonicalEntriesEqual(localEntry, remoteEntry)) {
      return;
    }

    const localTime = getEntryTime(localEntry);
    const remoteTime = getEntryTime(remoteEntry);
    if (localTime === remoteTime) {
      hasLocalNewer = true;
      hasRemoteNewer = true;
      return;
    }

    if (localTime > remoteTime) {
      hasLocalNewer = true;
      return;
    }

    hasRemoteNewer = true;
  });

  remoteById.forEach((remoteEntry, id) => {
    if (!localById.has(id)) {
      hasRemoteOnly = true;
    }
  });

  if (!hasLocalOnly && !hasRemoteOnly && !hasLocalNewer && !hasRemoteNewer) {
    return "identical";
  }

  if ((hasLocalOnly && hasRemoteOnly) || (hasLocalNewer && hasRemoteNewer)) {
    return "diverged";
  }

  if ((hasLocalOnly || hasLocalNewer) && !hasRemoteOnly && !hasRemoteNewer) {
    return "local-ahead";
  }

  if ((hasRemoteOnly || hasRemoteNewer) && !hasLocalOnly && !hasLocalNewer) {
    return "remote-ahead";
  }

  return "diverged";
}

async function fetchRemoteSnapshot(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${url}/api/sync`, {
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      return { ok: false, state: "remote-unavailable" };
    }

    let data;
    try {
      data = await response.json();
    } catch {
      return { ok: false, state: "remote-invalid" };
    }

    if (isPlainObject(data) && Array.isArray(data.entries)) {
      data.entries = data.entries.map(migrateEntry);
    }

    if (!isValidLedgerSnapshot(data)) {
      return { ok: false, state: "remote-invalid" };
    }

    return { ok: true, snapshot: data };
  } catch (error) {
    clearTimeout(timer);
    if (error.name === "AbortError") {
      return { ok: false, state: "remote-unavailable" };
    }
    return { ok: false, state: "remote-unavailable" };
  }
}

async function uploadSnapshot(url, entries) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${url}/api/backup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      return { ok: false, state: "remote-unavailable" };
    }

    let data;
    try {
      data = await response.json();
    } catch {
      return { ok: false, state: "remote-invalid" };
    }

    if (isPlainObject(data) && Array.isArray(data.entries)) {
      data.entries = data.entries.map(migrateEntry);
    }

    if (!isValidLedgerSnapshot(data)) {
      return { ok: false, state: "remote-invalid" };
    }

    return { ok: true, snapshot: data };
  } catch (error) {
    clearTimeout(timer);
    if (error.name === "AbortError") {
      return { ok: false, state: "remote-unavailable" };
    }
    return { ok: false, state: "remote-unavailable" };
  }
}

async function backupToComputer() {
  const url = getSyncUrl();
  if (!url) {
    updateSyncStatus("未设置地址");
    return;
  }

  if (localDataIssue) {
    updateSyncStatus(localDataIssue);
    return;
  }

  updateSyncStatus("正在检查备份状态...");
  const remoteResult = await fetchRemoteSnapshot(url);
  if (!remoteResult.ok) {
    updateSyncStatus(getSyncStateMessage(remoteResult.state));
    return;
  }

  const syncState = getSyncState(state.entries, remoteResult.snapshot.entries);
  if (!["remote-empty", "local-ahead", "identical"].includes(syncState)) {
    updateSyncStatus(getSyncStateMessage(syncState));
    return;
  }

  updateSyncStatus("备份中...");
  const backupResult = await uploadSnapshot(url, state.entries);
  if (!backupResult.ok) {
    updateSyncStatus(getSyncStateMessage(backupResult.state));
    return;
  }

  updateSyncStatus(`已备份 ${formatTime(new Date())}`);
}

async function restoreFromComputer() {
  const url = getSyncUrl();
  if (!url) {
    updateSyncStatus("未设置地址");
    return;
  }

  updateSyncStatus("正在检查恢复状态...");
  const remoteResult = await fetchRemoteSnapshot(url);
  if (!remoteResult.ok) {
    updateSyncStatus(getSyncStateMessage(remoteResult.state));
    return;
  }

  const remoteEntries = remoteResult.snapshot.entries;
  const syncState = getSyncState(state.entries, remoteEntries);

  if (["remote-empty", "both-empty"].includes(syncState)) {
    updateSyncStatus(getSyncStateMessage(syncState));
    return;
  }

  if (["local-ahead", "diverged"].includes(syncState)) {
    const confirmed = window.confirm(getRestoreWarning(syncState));
    if (!confirmed) {
      updateSyncStatus("已取消恢复");
      return;
    }
  }

  localDataIssue = null;
  state.entries = remoteEntries;
  applyLocalDataIssueUI();
  persist();
  render();
  updateSyncStatus(`已恢复 ${formatTime(new Date())}`);
}

async function autoBackupToComputerIfSafe() {
  const url = getSyncUrl();
  if (!url || localDataIssue) {
    if (localDataIssue) {
      updateSyncStatus(localDataIssue);
    }
    return;
  }

  const remoteResult = await fetchRemoteSnapshot(url);
  if (!remoteResult.ok) {
    updateSyncStatus(getSyncStateMessage(remoteResult.state));
    return;
  }

  const syncState = getSyncState(state.entries, remoteResult.snapshot.entries);
  if (syncState === "remote-empty" || syncState === "local-ahead") {
    const backupResult = await uploadSnapshot(url, state.entries);
    if (!backupResult.ok) {
      updateSyncStatus(getSyncStateMessage(backupResult.state));
      return;
    }

    updateSyncStatus(`已自动备份 ${formatTime(new Date())}`);
    return;
  }

  updateSyncStatus(getSyncStateMessage(syncState));
}

function initSync() {
  els.syncServerInput.value = getSyncUrl();
  updateSyncStatus(getDefaultSyncStatus());
  window.addEventListener("online", () => autoBackupToComputerIfSafe());
  window.addEventListener("offline", () => {
    updateSyncStatus("离线记录中");
  });
  setTimeout(() => autoBackupToComputerIfSafe(), 800);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

// ===== 6. Rendering =====

function renderTodayDate() {
  const now = new Date();
  const dateText = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);
  els.todayDate.textContent = dateText;
}

function switchView(viewName) {
  els.views.forEach((view) => {
    view.classList.toggle("active", view.dataset.view === viewName);
  });
  els.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.viewTarget === viewName);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function applyLocalDataIssueUI() {
  const issue = localDataIssue;
  const issueMessage = "本地数据异常：部分旧记录未进入展示、计算和备份";

  if (issue) {
    updateSyncStatus(issueMessage);
    els.syncStatus.setAttribute("aria-live", "assertive");
  } else {
    updateSyncStatus(getDefaultSyncStatus());
    els.syncStatus.setAttribute("aria-live", "polite");
  }

  els.saveEntry.disabled = issue;
  els.clearEntries.disabled = issue;
  els.profileAddSaving.disabled = issue;
  els.backupNow.disabled = issue;
  els.amountInput.disabled = issue;
  els.amountInput.readOnly = issue;
  els.noteInput.disabled = issue;
  els.noteInput.readOnly = issue;
  els.customCategoryInput.disabled = issue;
  els.customCategoryInput.readOnly = issue;

  els.resetDemo.disabled = false;
  els.profileResetDemo.disabled = false;

  if (issue) {
    els.amountInput.placeholder = "本地数据异常";
    els.noteInput.placeholder = "请先处理本地异常数据或使用恢复示例数据";
    els.customCategoryInput.placeholder = "请先处理本地异常数据";
    els.amountPreview.textContent = money(0);
    switchView("profile");
  } else {
    els.amountInput.placeholder = "0.00";
    els.noteInput.placeholder = "可选，比如 午饭 / 地铁 / 工资";
    els.customCategoryInput.placeholder = "比如 夜宵 / 宠物 / 数码配件";
    updateAmountPreview();
  }
}

function resetDemoData() {
  localDataIssue = null;
  state = { entries: [...fallbackEntries] };
  applyLocalDataIssueUI();
  persist();
  render();
  switchView("home");
}

function updateAmountPreview() {
  const amount = Number.parseFloat(els.amountInput.value) || 0;
  els.amountPreview.textContent = money(amount);
}

function renderCategories() {
  els.categoryGrid.innerHTML = categories[currentType]
    .map(
      ({ icon, label }) => `
        <button class="${label === currentCategory ? "active" : ""}" data-category="${label}">
          <i>${icon}</i>
          <span>${label}</span>
        </button>
      `
    )
    .join("");

  els.categoryGrid.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      currentCategory = button.dataset.category;
      currentSubcategory = getCurrentCategoryConfig().children[0];
      renderCategories();
    });
  });

  renderSubcategories();
}

function renderSubcategories() {
  const category = getCurrentCategoryConfig();
  if (!category.children.includes(currentSubcategory)) {
    currentSubcategory = category.children[0];
  }

  els.subcategoryGrid.innerHTML = category.children
    .map(
      (label) => `
        <button class="${label === currentSubcategory ? "active" : ""}" data-subcategory="${label}">
          ${label}
        </button>
      `
    )
    .join("");

  els.subcategoryGrid.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      currentSubcategory = button.dataset.subcategory;
      renderSubcategories();
    });
  });

  els.customCategoryWrap.hidden = currentSubcategory !== "自定义";
}

function renderEntry(entry) {
  const icon = findIcon(entry.type, entry.category);
  const sign = entry.type === "expense" ? "-" : entry.type === "income" ? "+" : "↗";
  const note = entry.note || getSecondaryCategory(entry);
  return `
    <li>
      <span class="entry-icon">${icon}</span>
      <span class="entry-meta">
        <strong>${escapeHtml(getPrimaryCategory(entry))}</strong>
        <span>${escapeHtml(note)} · ${formatDate(entry.createdAt)}</span>
      </span>
      <span class="entry-amount ${entry.type}">${sign}${money(entry.amount)}</span>
    </li>
  `;
}

function renderCategoryBars(entries) {
  const totals = new Map();
  entries.forEach((entry) => {
    const category = getPrimaryCategory(entry);
    totals.set(category, (totals.get(category) || 0) + entry.amount);
  });

  if (totals.size === 0) {
    return `<div class="empty-chart">本月还没有消费记录。</div>`;
  }

  const rows = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const max = rows[0][1] || 1;

  return rows
    .map(([category, total]) => {
      const width = Math.max(8, Math.round((total / max) * 100));
      return `
        <div class="bar-row">
          <div class="bar-meta">
            <span>${escapeHtml(category)}</span>
            <strong>${money(total)}</strong>
          </div>
          <div class="bar-track">
            <i style="width: ${width}%"></i>
          </div>
        </div>
      `;
    })
    .join("");
}

function getAdvice(context = {}) {
  if (context.rotate) {
    return adviceNotes[Math.floor(Math.random() * adviceNotes.length)];
  }

  const seed =
    new Date().getFullYear() * 10000 +
    (new Date().getMonth() + 1) * 100 +
    new Date().getDate() +
    Math.round((context.monthExpense || 0) + (context.saved || 0));
  return adviceNotes[seed % adviceNotes.length];
}

function getTopExpenseCategory(entries) {
  const totals = new Map();
  entries
    .filter((entry) => entry.type === "expense" && isThisMonth(entry.createdAt))
    .forEach((entry) => {
      const category = getPrimaryCategory(entry);
      totals.set(category, (totals.get(category) || 0) + entry.amount);
    });

  if (totals.size === 0) {
    return "暂时没有";
  }

  const [category, total] = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  return `${category} · ${money(total)}`;
}

function getLargestExpense(entries) {
  if (entries.length === 0) {
    return "暂无";
  }

  const largest = [...entries].sort((a, b) => b.amount - a.amount)[0];
  return `${getSecondaryCategory(largest)} · ${money(largest.amount)}`;
}

function getFrequentCategory(entries) {
  if (entries.length === 0) {
    return "暂无";
  }

  const counts = new Map();
  entries.forEach((entry) => {
    const category = getPrimaryCategory(entry);
    counts.set(category, (counts.get(category) || 0) + 1);
  });

  const [category, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return `${category} · ${count} 次`;
}

function render() {
  const entries = state.entries;
  const todayExpense = sum(entries, (entry) =>
    entry.type === "expense" && isToday(entry.createdAt) ? entry.amount : 0
  );
  const monthIncome = sum(entries, (entry) =>
    entry.type === "income" && isThisMonth(entry.createdAt) ? entry.amount : 0
  );
  const monthSaving = sum(entries, (entry) =>
    entry.type === "saving" && isThisMonth(entry.createdAt) ? entry.amount : 0
  );
  const monthExpense = sum(entries, (entry) =>
    entry.type === "expense" && isThisMonth(entry.createdAt) ? entry.amount : 0
  );
  const yearExpense = sum(entries, (entry) =>
    entry.type === "expense" && isThisYear(entry.createdAt) ? entry.amount : 0
  );
  const saved = sum(entries, (entry) =>
    entry.type === "saving" ? entry.amount : 0
  );
  const monthBalance = monthIncome - monthExpense - monthSaving;
  const dayOfMonth = Math.max(new Date().getDate(), 1);
  const percent = clamp(saved / VISION_AMOUNT, 0, 1);
  const circumference = 314;
  const daysLeft = getDaysLeft();
  const monthsLeft = Math.max(daysLeft / 30.44, 1);
  const dailyTargetPace = getDailyTargetPace(saved);
  const remaining = Math.max(VISION_AMOUNT - saved, 0);

  els.ringFill.style.strokeDashoffset = String(circumference * (1 - percent));
  els.progressPercent.textContent = `${Math.round(percent * 100)}%`;
  els.savedAmount.textContent = money(saved);
  els.targetHint.textContent =
    saved >= VISION_AMOUNT
      ? "愿景已经照进现实"
      : `离愿景还差 ${money(remaining)}`;
  els.monthBalance.textContent = money(monthBalance);
  els.todayExpense.textContent = money(todayExpense);
  els.dailyBudget.textContent = money(dailyTargetPace);
  els.daysLeft.textContent = `${daysLeft} 天`;
  els.monthlyTarget.textContent = money(
    Math.max((VISION_AMOUNT - saved) / monthsLeft, 0)
  );
  els.goalMeter.style.width = `${Math.round(percent * 100)}%`;
  els.analysisToday.textContent = money(todayExpense);
  els.analysisMonth.textContent = money(monthExpense);
  els.analysisYear.textContent = money(yearExpense);
  els.analysisDailyAvg.textContent = money(monthExpense / dayOfMonth);
  els.topCategory.textContent = getTopExpenseCategory(entries);
  const monthlyExpenseEntries = entries.filter(
    (entry) => entry.type === "expense" && isThisMonth(entry.createdAt)
  );
  els.largestExpense.textContent = getLargestExpense(monthlyExpenseEntries);
  els.frequentCategory.textContent = getFrequentCategory(monthlyExpenseEntries);
  els.expenseCount.textContent = `${monthlyExpenseEntries.length} 次`;
  els.categoryBars.innerHTML = renderCategoryBars(monthlyExpenseEntries);
  els.adviceText.textContent = getAdvice({
    todayExpense,
    monthExpense,
    yearExpense,
    saved,
  });
  els.goalSentence.textContent =
    saved >= VISION_AMOUNT
      ? "愿景已经照进现实，接下来是好好守住自由。"
      : `不用逼自己，只要继续靠近：目前离愿景还有 ${money(remaining)}。`;

  els.emptyState.hidden = entries.length > 0;
  els.entryList.innerHTML = entries.slice(0, 12).map(renderEntry).join("");

  const savingEntries = entries.filter((entry) => entry.type === "saving");
  els.savingList.innerHTML =
    savingEntries.length > 0
      ? savingEntries.slice(0, 10).map(renderEntry).join("")
      : `<li class="plain-row">还没有存钱记录，下一笔就从这里开始。</li>`;
}

// ===== 7. Boot & Event Wiring =====

const loadedState = loadState();
let state = loadedState.state;
let localDataIssue = loadedState.issue;
let currentType = "expense";
let currentCategory = categories.expense[0].label;
let currentSubcategory = categories.expense[0].children[0];

const els = {
  views: document.querySelectorAll(".app-view"),
  navButtons: document.querySelectorAll(".bottom-bar button"),
  todayDate: document.querySelector("#todayDate"),
  ringFill: document.querySelector("#ringFill"),
  progressPercent: document.querySelector("#progressPercent"),
  savedAmount: document.querySelector("#savedAmount"),
  targetHint: document.querySelector("#targetHint"),
  monthBalance: document.querySelector("#monthBalance"),
  todayExpense: document.querySelector("#todayExpense"),
  dailyBudget: document.querySelector("#dailyBudget"),
  daysLeft: document.querySelector("#daysLeft"),
  monthlyTarget: document.querySelector("#monthlyTarget"),
  goalMeter: document.querySelector("#goalMeter"),
  goalSentence: document.querySelector("#goalSentence"),
  analysisToday: document.querySelector("#analysisToday"),
  analysisMonth: document.querySelector("#analysisMonth"),
  analysisYear: document.querySelector("#analysisYear"),
  analysisDailyAvg: document.querySelector("#analysisDailyAvg"),
  topCategory: document.querySelector("#topCategory"),
  largestExpense: document.querySelector("#largestExpense"),
  frequentCategory: document.querySelector("#frequentCategory"),
  expenseCount: document.querySelector("#expenseCount"),
  categoryBars: document.querySelector("#categoryBars"),
  adviceText: document.querySelector("#adviceText"),
  refreshAdvice: document.querySelector("#refreshAdvice"),
  syncStatus: document.querySelector("#syncStatus"),
  syncServerInput: document.querySelector("#syncServerInput"),
  backupNow: document.querySelector("#backupNow"),
  restoreNow: document.querySelector("#restoreNow"),
  savingList: document.querySelector("#savingList"),
  categoryGrid: document.querySelector("#categoryGrid"),
  subcategoryGrid: document.querySelector("#subcategoryGrid"),
  customCategoryWrap: document.querySelector("#customCategoryWrap"),
  customCategoryInput: document.querySelector("#customCategoryInput"),
  amountInput: document.querySelector("#amountInput"),
  amountPreview: document.querySelector("#amountPreview"),
  noteInput: document.querySelector("#noteInput"),
  saveEntry: document.querySelector("#saveEntry"),
  entryList: document.querySelector("#entryList"),
  emptyState: document.querySelector("#emptyState"),
  clearEntries: document.querySelector("#clearEntries"),
  resetDemo: document.querySelector("#resetDemo"),
  profileResetDemo: document.querySelector("#profileResetDemo"),
  profileAddSaving: document.querySelector("#profileAddSaving"),
};

els.navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchView(button.dataset.viewTarget);
  });
});

document.querySelectorAll("[data-quick-view]").forEach((button) => {
  button.addEventListener("click", () => {
    switchView(button.dataset.quickView);
  });
});

document.querySelector("[data-quick-saving]")?.addEventListener("click", () => {
  els.profileAddSaving.click();
});

document.querySelectorAll(".segmented button").forEach((button) => {
  button.addEventListener("click", () => {
    currentType = button.dataset.type;
    currentCategory = categories[currentType][0].label;
    currentSubcategory = categories[currentType][0].children[0];

    document.querySelectorAll(".segmented button").forEach((item) => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-selected", String(item === button));
    });

    renderCategories();
  });
});

document.querySelectorAll(".quick-amounts button").forEach((button) => {
  button.addEventListener("click", () => {
    els.amountInput.value = button.dataset.amount;
    updateAmountPreview();
  });
});

document.querySelectorAll(".amount-stepper button").forEach((button) => {
  button.addEventListener("click", () => {
    const current = Number.parseFloat(els.amountInput.value) || 0;
    const next = Math.max(0, Math.round((current + Number(button.dataset.delta)) * 100) / 100);
    els.amountInput.value = next > 0 ? String(next) : "";
    updateAmountPreview();
  });
});

els.amountInput.addEventListener("input", updateAmountPreview);

els.amountInput.addEventListener("focus", () => {
  if (localDataIssue) {
    updateSyncStatus(localDataIssue);
  }
});

els.noteInput.addEventListener("focus", () => {
  if (localDataIssue) {
    updateSyncStatus(localDataIssue);
  }
});

els.customCategoryInput.addEventListener("focus", () => {
  if (localDataIssue) {
    updateSyncStatus(localDataIssue);
  }
});

els.syncServerInput.addEventListener("focus", () => {
  if (localDataIssue) {
    updateSyncStatus(localDataIssue);
  }
});

els.saveEntry.addEventListener("focus", () => {
  if (localDataIssue) {
    updateSyncStatus(localDataIssue);
  }
});

els.saveEntry.addEventListener("click", () => {
  if (localDataIssue) {
    updateSyncStatus(localDataIssue);
    return;
  }

  const amount = Number.parseFloat(els.amountInput.value);
  if (!isValidAmount(amount)) {
    els.amountInput.focus();
    return;
  }

  const category = getSelectedCategory();
  if (!category) {
    els.customCategoryInput.focus();
    return;
  }

  state.entries.unshift(
    makeEntry(
      currentType,
      Math.round(amount * 100) / 100,
      category,
      els.noteInput.value.trim()
    )
  );
  state.entries = state.entries.slice(0, 80);
  els.amountInput.value = "";
  els.customCategoryInput.value = "";
  els.noteInput.value = "";
  updateAmountPreview();
  persist();
  render();
  autoBackupToComputerIfSafe();
});

els.amountInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    els.saveEntry.click();
  }
});

els.clearEntries.addEventListener("click", () => {
  if (localDataIssue) {
    updateSyncStatus(localDataIssue);
    return;
  }

  state.entries = [];
  persist();
  render();
});

els.resetDemo.addEventListener("click", resetDemoData);
els.profileResetDemo.addEventListener("click", resetDemoData);
els.refreshAdvice.addEventListener("click", () => {
  els.adviceText.textContent = getAdvice({ rotate: true });
});
els.backupNow.addEventListener("click", () => backupToComputer());
els.restoreNow.addEventListener("click", () => restoreFromComputer());
els.syncServerInput.addEventListener("change", () => {
  const syncUrl = normalizeUrl(els.syncServerInput.value);
  localStorage.setItem(SYNC_URL_KEY, syncUrl);
  updateSyncStatus(getDefaultSyncStatus());
  autoBackupToComputerIfSafe();
});

els.profileAddSaving.addEventListener("click", () => {
  if (localDataIssue) {
    updateSyncStatus(localDataIssue);
    return;
  }

  document.querySelector('[data-type="saving"]').click();
  currentCategory = "FIRE";
  currentSubcategory = "六年之约";
  renderCategories();
  els.noteInput.value = "给六年之约加速";
  switchView("entry");
  els.amountInput.focus();
});

els.backupNow.addEventListener("focus", () => {
  if (localDataIssue) {
    updateSyncStatus(localDataIssue);
  }
});

els.restoreNow.addEventListener("focus", () => {
  if (localDataIssue) {
    updateSyncStatus(localDataIssue);
  }
});

els.clearEntries.addEventListener("focus", () => {
  if (localDataIssue) {
    updateSyncStatus(localDataIssue);
  }
});

els.resetDemo.addEventListener("focus", () => {
  if (localDataIssue) {
    updateSyncStatus(localDataIssue);
  }
});

els.profileResetDemo.addEventListener("focus", () => {
  if (localDataIssue) {
    updateSyncStatus(localDataIssue);
  }
});

els.profileAddSaving.addEventListener("focus", () => {
  if (localDataIssue) {
    updateSyncStatus(localDataIssue);
  }
});

els.refreshAdvice.addEventListener("focus", () => {
  if (localDataIssue) {
    updateSyncStatus(localDataIssue);
  }
});

els.navButtons.forEach((button) => {
  button.addEventListener("focus", () => {
    if (localDataIssue) {
      updateSyncStatus(localDataIssue);
    }
  });
});

els.views.forEach((view) => {
  view.addEventListener("focusin", () => {
    if (localDataIssue) {
      updateSyncStatus(localDataIssue);
    }
  });
});

applyLocalDataIssueUI();

renderCategories();
updateAmountPreview();
renderTodayDate();
initSync();
render();
registerServiceWorker();
