const STORAGE_KEY = "six-year-fire-ledger";
const SYNC_URL_KEY = "six-year-fire-ledger-sync-url";
const VISION_AMOUNT = 1_000_000;
const START_DATE = new Date("2026-04-26T00:00:00+08:00");
const YEARS = 6;

const categories = {
  expense: [
    ["🍜", "餐饮"],
    ["🚇", "交通"],
    ["🛒", "购物"],
    ["🏠", "居家"],
    ["☕", "咖啡"],
    ["💊", "健康"],
    ["🎬", "娱乐"],
    ["📦", "其他"],
  ],
  income: [
    ["💼", "工资"],
    ["🎁", "奖金"],
    ["📈", "投资"],
    ["💸", "副业"],
  ],
  saving: [
    ["🌱", "存款"],
    ["🏦", "定投"],
    ["🔥", "FIRE"],
    ["🧧", "红包"],
  ],
};

const fallbackEntries = [
  makeEntry("saving", 5200, "FIRE", "月初自动存入"),
  makeEntry("expense", 32, "餐饮", "午饭"),
  makeEntry("income", 1800, "副业", "周末项目"),
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

let state = loadState();
let currentType = "expense";
let currentCategory = categories.expense[0][1];

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
  adviceText: document.querySelector("#adviceText"),
  refreshAdvice: document.querySelector("#refreshAdvice"),
  syncStatus: document.querySelector("#syncStatus"),
  syncServerInput: document.querySelector("#syncServerInput"),
  backupNow: document.querySelector("#backupNow"),
  restoreNow: document.querySelector("#restoreNow"),
  savingList: document.querySelector("#savingList"),
  categoryGrid: document.querySelector("#categoryGrid"),
  amountInput: document.querySelector("#amountInput"),
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

document.querySelectorAll(".segmented button").forEach((button) => {
  button.addEventListener("click", () => {
    currentType = button.dataset.type;
    currentCategory = categories[currentType][0][1];

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
    els.amountInput.focus();
  });
});

els.saveEntry.addEventListener("click", () => {
  const amount = Number.parseFloat(els.amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    els.amountInput.focus();
    return;
  }

  state.entries.unshift(
    makeEntry(
      currentType,
      Math.round(amount * 100) / 100,
      currentCategory,
      els.noteInput.value.trim()
    )
  );
  state.entries = state.entries.slice(0, 80);
  els.amountInput.value = "";
  els.noteInput.value = "";
  persist();
  render();
});

els.amountInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    els.saveEntry.click();
  }
});

els.clearEntries.addEventListener("click", () => {
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
  localStorage.setItem(SYNC_URL_KEY, normalizeUrl(els.syncServerInput.value));
});

els.profileAddSaving.addEventListener("click", () => {
  currentType = "saving";
  currentCategory = "FIRE";
  document.querySelector('[data-type="saving"]').click();
  els.noteInput.value = "给六年之约加速";
  switchView("entry");
  els.amountInput.focus();
});

renderCategories();
renderTodayDate();
initSync();
render();
registerServiceWorker();

function switchView(viewName) {
  els.views.forEach((view) => {
    view.classList.toggle("active", view.dataset.view === viewName);
  });
  els.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.viewTarget === viewName);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetDemoData() {
  state = { entries: [...fallbackEntries] };
  persist();
  render();
  switchView("home");
}

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

function makeEntry(type, amount, category, note = "") {
  return {
    id: crypto.randomUUID(),
    type,
    amount,
    category,
    note,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { entries: [] };
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed.entries) ? parsed : { entries: [] };
  } catch {
    return { entries: [] };
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function initSync() {
  els.syncServerInput.value = getSyncUrl();
  updateSyncStatus("本机离线可用");
}

async function backupToComputer() {
  const url = getSyncUrl();
  if (!url) {
    updateSyncStatus("未设置地址");
    return;
  }

  updateSyncStatus("备份中...");

  try {
    const response = await fetch(`${url}/api/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: state.entries }),
    });

    if (!response.ok) {
      throw new Error("sync failed");
    }

    const data = await response.json();
    state.entries = mergeEntries(state.entries, data.entries || []);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
    updateSyncStatus(`已备份 ${formatTime(new Date())}`);
  } catch {
    updateSyncStatus("备份失败");
  }
}

async function restoreFromComputer() {
  const url = getSyncUrl();
  if (!url) {
    updateSyncStatus("未设置地址");
    return;
  }

  updateSyncStatus("恢复中...");

  try {
    const response = await fetch(`${url}/api/sync`);
    if (!response.ok) {
      throw new Error("restore failed");
    }

    const data = await response.json();
    state.entries = mergeEntries(state.entries, data.entries || []);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
    updateSyncStatus(`已恢复 ${formatTime(new Date())}`);
  } catch {
    updateSyncStatus("恢复失败");
  }
}

function getSyncUrl() {
  const saved = localStorage.getItem(SYNC_URL_KEY);
  return normalizeUrl(saved || window.location.origin);
}

function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function mergeEntries(localEntries, remoteEntries) {
  const byId = new Map();
  [...remoteEntries, ...localEntries].forEach((entry) => {
    if (!entry?.id) {
      return;
    }

    const existing = byId.get(entry.id);
    if (
      !existing ||
      new Date(entry.updatedAt || entry.createdAt) >
        new Date(existing.updatedAt || existing.createdAt)
    ) {
      byId.set(entry.id, entry);
    }
  });

  return [...byId.values()].sort(
    (left, right) => new Date(right.createdAt) - new Date(left.createdAt)
  );
}

function updateSyncStatus(text) {
  els.syncStatus.textContent = text;
}

function renderCategories() {
  els.categoryGrid.innerHTML = categories[currentType]
    .map(
      ([icon, label]) => `
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
      renderCategories();
    });
  });
}

function render() {
  const entries = state.entries;
  const saved = sum(entries, (entry) =>
    entry.type === "saving" ? entry.amount : 0
  );
  const income = sum(entries, (entry) =>
    entry.type === "income" ? entry.amount : 0
  );
  const expenses = sum(entries, (entry) =>
    entry.type === "expense" ? entry.amount : 0
  );
  const monthBalance = saved + income - expenses;
  const todayExpense = sum(entries, (entry) =>
    entry.type === "expense" && isToday(entry.createdAt) ? entry.amount : 0
  );
  const monthExpense = sum(entries, (entry) =>
    entry.type === "expense" && isThisMonth(entry.createdAt) ? entry.amount : 0
  );
  const yearExpense = sum(entries, (entry) =>
    entry.type === "expense" && isThisYear(entry.createdAt) ? entry.amount : 0
  );
  const dayOfMonth = new Date().getDate();
  const percent = Math.min(saved / VISION_AMOUNT, 1);
  const circumference = 314;
  const daysLeft = getDaysLeft();
  const monthsLeft = Math.max(daysLeft / 30.44, 1);

  els.ringFill.style.strokeDashoffset = String(circumference * (1 - percent));
  els.progressPercent.textContent = `${Math.round(percent * 100)}%`;
  els.savedAmount.textContent = money(saved);
  els.targetHint.textContent =
    saved >= VISION_AMOUNT
      ? "愿景已经照进现实"
      : `离愿景还差 ${money(Math.max(VISION_AMOUNT - saved, 0))}`;
  els.monthBalance.textContent = money(monthBalance);
  els.todayExpense.textContent = money(todayExpense);
  els.dailyBudget.textContent = money(getDailyBudget(saved));
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
  els.adviceText.textContent = getAdvice({
    todayExpense,
    monthExpense,
    yearExpense,
    saved,
  });
  els.goalSentence.textContent =
    saved >= VISION_AMOUNT
      ? "愿景已经照进现实，接下来是好好守住自由。"
      : `不用逼自己，只要继续靠近：目前离愿景还有 ${money(Math.max(VISION_AMOUNT - saved, 0))}。`;

  els.emptyState.hidden = entries.length > 0;
  els.entryList.innerHTML = entries.slice(0, 12).map(renderEntry).join("");

  const savingEntries = entries.filter((entry) => entry.type === "saving");
  els.savingList.innerHTML =
    savingEntries.length > 0
      ? savingEntries.slice(0, 10).map(renderEntry).join("")
      : `<li class="plain-row">还没有存钱记录，下一笔就从这里开始。</li>`;
}

function getTopExpenseCategory(entries) {
  const totals = new Map();
  entries
    .filter((entry) => entry.type === "expense" && isThisMonth(entry.createdAt))
    .forEach((entry) => {
      totals.set(entry.category, (totals.get(entry.category) || 0) + entry.amount);
    });

  if (totals.size === 0) {
    return "暂时没有";
  }

  const [category, total] = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  return `${category} · ${money(total)}`;
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

function renderEntry(entry) {
  const icon = findIcon(entry.type, entry.category);
  const sign = entry.type === "expense" ? "-" : "+";
  const note = entry.note || entry.category;
  return `
    <li>
      <span class="entry-icon">${icon}</span>
      <span class="entry-meta">
        <strong>${escapeHtml(entry.category)}</strong>
        <span>${escapeHtml(note)} · ${formatDate(entry.createdAt)}</span>
      </span>
      <span class="entry-amount ${entry.type}">${sign}${money(entry.amount)}</span>
    </li>
  `;
}

function sum(items, selector) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function getDaysLeft() {
  const end = new Date(START_DATE);
  end.setFullYear(end.getFullYear() + YEARS);
  return Math.max(Math.ceil((end - new Date()) / 86_400_000), 1);
}

function getDailyBudget(saved) {
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
  return categories[type].find((item) => item[1] === category)?.[0] || "📌";
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

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Local file previews and older browsers can fail here; the app still works.
    });
  });
}
