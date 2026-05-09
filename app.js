const STORAGE_KEY = "six-year-fire-ledger";
const SYNC_URL_KEY = "six-year-fire-ledger-sync-url";
const VISION_AMOUNT = 1_000_000;
const START_DATE = new Date("2026-04-26T00:00:00+08:00");
const YEARS = 6;

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
      getSelectedCategory(),
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
  autoBackupToComputerIfSafe();
});

els.profileAddSaving.addEventListener("click", () => {
  document.querySelector('[data-type="saving"]').click();
  currentCategory = "FIRE";
  currentSubcategory = "六年之约";
  renderCategories();
  els.noteInput.value = "给六年之约加速";
  switchView("entry");
  els.amountInput.focus();
});

renderCategories();
updateAmountPreview();
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
  updateSyncStatus(getSyncUrl() ? "本机离线可用" : "填写电脑地址后可备份");
  window.addEventListener("online", () => autoBackupToComputerIfSafe());
  setTimeout(() => autoBackupToComputerIfSafe(), 800);
}

async function backupToComputer() {
  const url = getSyncUrl();
  if (!url) {
    updateSyncStatus("未设置地址");
    return;
  }

  updateSyncStatus("备份中...");

  try {
    const response = await fetch(`${url}/api/backup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: state.entries }),
    });

    if (!response.ok) {
      throw new Error("sync failed");
    }

    await response.json();
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
    state.entries = data.entries || [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
    updateSyncStatus(`已恢复 ${formatTime(new Date())}`);
  } catch {
    updateSyncStatus("恢复失败");
  }
}

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

async function autoBackupToComputerIfSafe() {
  const url = getSyncUrl();
  if (!url) {
    return;
  }

  try {
    const response = await fetch(`${url}/api/sync`);
    if (!response.ok) {
      throw new Error("compare failed");
    }

    const remoteData = await response.json();
    const decision = getBackupDecision(state.entries, remoteData.entries || []);
    if (!decision.shouldBackup) {
      if (decision.reason === "remote-has-extra") {
        updateSyncStatus("电脑有未恢复记录");
      }
      return;
    }

    const backupResponse = await fetch(`${url}/api/backup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: state.entries }),
    });

    if (!backupResponse.ok) {
      throw new Error("auto backup failed");
    }

    await backupResponse.json();
    updateSyncStatus(`已自动备份 ${formatTime(new Date())}`);
  } catch {
    updateSyncStatus("离线记录中");
  }
}

function getBackupDecision(localEntries, remoteEntries) {
  const localById = new Map(localEntries.map((entry) => [entry.id, entry]));
  const remoteById = new Map(remoteEntries.map((entry) => [entry.id, entry]));

  const localContainsRemote = remoteEntries.every((entry) =>
    localById.has(entry.id)
  );

  if (!localContainsRemote) {
    return { shouldBackup: false, reason: "remote-has-extra" };
  }

  const localHasMore = localEntries.length > remoteEntries.length;
  const localHasNewerEdit = remoteEntries.some((remoteEntry) => {
    const localEntry = localById.get(remoteEntry.id);
    return getEntryTime(localEntry) > getEntryTime(remoteEntry);
  });
  const remoteEmptyAndLocalHasData = remoteById.size === 0 && localEntries.length > 0;

  return {
    shouldBackup: localHasMore || localHasNewerEdit || remoteEmptyAndLocalHasData,
    reason: "safe",
  };
}

function getEntryTime(entry) {
  return new Date(entry?.updatedAt || entry?.createdAt || 0).getTime();
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

function getCurrentCategoryConfig() {
  return (
    categories[currentType].find((item) => item.label === currentCategory) ||
    categories[currentType][0]
  );
}

function getSelectedCategory() {
  if (currentSubcategory === "自定义") {
    const custom = els.customCategoryInput.value.trim();
    return custom ? `${currentCategory}/${custom}` : `${currentCategory}/自定义`;
  }

  return `${currentCategory}/${currentSubcategory}`;
}

function getPrimaryCategory(entry) {
  return String(entry.category || "").split("/")[0] || "未分类";
}

function getSecondaryCategory(entry) {
  const parts = String(entry.category || "").split("/");
  return parts[1] || parts[0] || "未分类";
}

function updateAmountPreview() {
  const amount = Number.parseFloat(els.amountInput.value) || 0;
  els.amountPreview.textContent = money(amount);
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

function renderEntry(entry) {
  const icon = findIcon(entry.type, entry.category);
  const sign = entry.type === "expense" ? "-" : "+";
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
