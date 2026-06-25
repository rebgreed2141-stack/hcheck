const STORAGE_KEY = "class_checklist_matrix_v1";
const SERVER_URL_KEY = "hcheck_server_url";
const DEFAULT_SERVER_URL = "http://192.168.1.60:3000";
let selectedClassId = "class0";
let selectedMonth = "";
let selectedMissingDateKey = "";

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupSelectors();
  initializeState();
  renderMatrix();
  renderMonthTab();
  setupMonthNav();
  setupAdmin();
});

function setupTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((btn) => btn.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(`tab-${button.dataset.tab}`).classList.add("active");

      if (button.dataset.tab === "month") {
        renderMonthTab();
      }
    });
  });
}

function setupSelectors() {
  const classSelect = document.getElementById("class-select");
  classSelect.innerHTML = CHECKLIST_MASTER.map((item) => {
    return `<option value="${item.id}">${escapeHtml(item.label)}（${item.itemCount}項目）</option>`;
  }).join("");

  classSelect.addEventListener("change", () => {
    selectedClassId = classSelect.value;
    selectedMissingDateKey = "";
    renderMatrix();
    renderMonthTab();
  });

  const monthSelect = document.getElementById("month-select");
  monthSelect.addEventListener("change", () => {
    selectedMonth = monthSelect.value;
    selectedMissingDateKey = "";
    renderMatrix();
    renderMonthTab();
  });

  document.getElementById("today-btn").addEventListener("click", () => {
    const today = new Date();
    selectedMonth = formatMonthInput(today.getFullYear(), today.getMonth() + 1);
    monthSelect.value = selectedMonth;
    selectedMissingDateKey = "";
    renderMatrix();
    renderMonthTab();
  });
}

function initializeState() {
  const today = new Date();
  selectedMonth = formatMonthInput(today.getFullYear(), today.getMonth() + 1);
  document.getElementById("month-select").value = selectedMonth;
  document.getElementById("class-select").value = selectedClassId;
}

function getCurrentClassDef() {
  return CHECKLIST_MASTER.find((item) => item.id === selectedClassId) || CHECKLIST_MASTER[0];
}

function getMonthMeta(monthValue) {
  const [yearStr, monthStr] = monthValue.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const lastDate = new Date(year, month, 0).getDate();
  const days = [];
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const today = new Date();

  for (let day = 1; day <= lastDate; day += 1) {
    const date = new Date(year, month - 1, day);
    const weekday = date.getDay();

    if (weekday === 0) continue; // 日曜除外

    days.push({
      year,
      month,
      day,
      dateKey: formatDateKey(year, month, day),
      weekday,
      weekdayLabel: weekdays[weekday],
      isToday: isSameDate(date, today)
    });
  }

  return { year, month, days };
}

function renderMatrix() {
  const classDef = getCurrentClassDef();
  const monthMeta = getMonthMeta(selectedMonth);
  const thead = document.getElementById("matrix-head");
  const tbody = document.getElementById("matrix-body");

  thead.innerHTML = "";
  tbody.innerHTML = "";

  const headRow = document.createElement("tr");
  headRow.innerHTML =
    `<th class="corner-head item-head">項目</th>` +
    monthMeta.days.map((day) => {
      return `
        <th class="date-head ${day.isToday ? "today" : ""}">
          <div class="date-num">${day.day}</div>
          <div class="date-weekday">(${day.weekdayLabel})</div>
        </th>
      `;
    }).join("");
  thead.appendChild(headRow);

  classDef.items.forEach((item) => {
    const tr = document.createElement("tr");

    const itemCell = document.createElement("td");
    itemCell.className = "item-cell";
    itemCell.innerHTML = `<span class="item-no">${item.no}</span>${escapeHtml(item.text)}`;
    tr.appendChild(itemCell);

    monthMeta.days.forEach((day) => {
      const checked = getCheckedValue(classDef.id, day.dateKey, item.no);
      const td = document.createElement("td");
      td.className = `check-cell ${day.isToday ? "today" : ""} ${checked ? "is-checked" : ""}`;
      td.innerHTML = `
        <label class="check-wrap">
          <input type="checkbox"
                 data-class-id="${classDef.id}"
                 data-date-key="${day.dateKey}"
                 data-item-no="${item.no}"
                 ${checked ? "checked" : ""}>
        </label>
      `;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const input = event.currentTarget;
      const classId = input.dataset.classId;
      const dateKey = input.dataset.dateKey;
      const itemNo = Number(input.dataset.itemNo);

      setCheckedValue(classId, dateKey, itemNo, input.checked);
      input.closest("td").classList.toggle("is-checked", input.checked);

      updateSummary();
      renderMonthTab();
    });
  });

  updateSummary();
}

function updateSummary() {
  const classDef = getCurrentClassDef();
  const monthMeta = getMonthMeta(selectedMonth);
  const total = classDef.items.length * monthMeta.days.length;
  let checked = 0;

  monthMeta.days.forEach((day) => {
    classDef.items.forEach((item) => {
      if (getCheckedValue(classDef.id, day.dateKey, item.no)) {
        checked += 1;
      }
    });
  });

  document.getElementById("checked-count").textContent = String(checked);
  document.getElementById("total-count").textContent = String(total);

  const rate = total === 0 ? 0 : Math.round((checked / total) * 100);
  document.getElementById("checked-rate").textContent = `${rate}%`;
}

function setupMonthNav() {
  document.getElementById("prev-month-btn").addEventListener("click", () => moveMonth(-1));
  document.getElementById("next-month-btn").addEventListener("click", () => moveMonth(1));
}

function moveMonth(delta) {
  const [yearStr, monthStr] = selectedMonth.split("-");
  const date = new Date(Number(yearStr), Number(monthStr) - 1 + delta, 1);

  selectedMonth = formatMonthInput(date.getFullYear(), date.getMonth() + 1);
  document.getElementById("month-select").value = selectedMonth;
  selectedMissingDateKey = "";

  renderMatrix();
  renderMonthTab();
}

function renderMonthTab() {
  const classDef = getCurrentClassDef();
  const monthMeta = getMonthMeta(selectedMonth);

  document.getElementById("month-title").textContent = `${monthMeta.year}年${monthMeta.month}月`;
  document.getElementById("month-class-label").textContent = `${classDef.label} チェック一覧`;

  let totalChecked = 0;
  let perfectDays = 0;
  let touchedDays = 0;

  const rows = monthMeta.days.map((day) => {
    let checkedCount = 0;

    classDef.items.forEach((item) => {
      if (getCheckedValue(classDef.id, day.dateKey, item.no)) {
        checkedCount += 1;
      }
    });

    if (checkedCount > 0) touchedDays += 1;
    if (checkedCount === classDef.items.length) perfectDays += 1;

    totalChecked += checkedCount;

    const missingCount = classDef.items.length - checkedCount;
    const rate = classDef.items.length === 0
      ? 0
      : Math.round((checkedCount / classDef.items.length) * 100);

    return {
      ...day,
      checkedCount,
      missingCount,
      rate
    };
  });

  const totalSlots = monthMeta.days.length * classDef.items.length;
  const overallRate = totalSlots === 0 ? 0 : Math.round((totalChecked / totalSlots) * 100);

  document.getElementById("month-summary").innerHTML = [
    summaryCard("対象日数", `${monthMeta.days.length}日`),
    summaryCard("全体達成率", `${overallRate}%`),
    summaryCard("全項目完了日", `${perfectDays}日`),
    summaryCard("何か入力あり", `${touchedDays}日`)
  ].join("");

  const tbody = document.getElementById("daily-summary-body");
  tbody.innerHTML = rows.map((row) => {
    const selected = row.dateKey === selectedMissingDateKey ? "selected" : "";
    return `
      <tr class="day-row ${selected}" data-date-key="${row.dateKey}">
        <td>${row.month}/${row.day}</td>
        <td>${row.weekdayLabel}</td>
        <td>${row.checkedCount} / ${classDef.items.length}</td>
        <td>${row.rate}%</td>
        <td>${row.missingCount}</td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll(".day-row").forEach((tr) => {
    tr.addEventListener("click", () => {
      selectedMissingDateKey = tr.dataset.dateKey;
      renderMonthTab();
      renderMissingItems(selectedMissingDateKey);
    });
  });

  if (selectedMissingDateKey) {
    renderMissingItems(selectedMissingDateKey);
  } else {
    document.getElementById("missing-list").innerHTML = "";
    const title = document.querySelector(".missing-title");
    if (title) {
      title.textContent = "未チェック項目";
    }
  }
}

function renderMissingItems(dateKey) {
  const classDef = getCurrentClassDef();
  const meta = parseDateKey(dateKey);
  const missing = classDef.items.filter((item) => !getCheckedValue(classDef.id, dateKey, item.no));

  const container = document.getElementById("missing-list");
  const title = document.querySelector(".missing-title");

  title.textContent = `${meta.month}月${meta.day}日 の未チェック項目`;

  if (missing.length === 0) {
    container.innerHTML = '<div class="missing-list">未チェック項目はありません。</div>';
    return;
  }

  container.innerHTML = `
    <div class="missing-list">
      <ul>
        ${missing.map((item) => `<li><strong>${item.no}</strong> ${escapeHtml(item.text)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function summaryCard(label, value) {
  return `
    <div class="month-card">
      <div class="month-card-label">${escapeHtml(label)}</div>
      <div class="month-card-value">${escapeHtml(value)}</div>
    </div>
  `;
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (error) {
    console.error(error);
    return {};
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getCheckedValue(classId, dateKey, itemNo) {
  const store = loadStore();
  return Boolean(store?.[classId]?.[dateKey]?.[itemNo]);
}

function setCheckedValue(classId, dateKey, itemNo, value) {
  const store = loadStore();

  store[classId] = store[classId] || {};
  store[classId][dateKey] = store[classId][dateKey] || {};

  if (value) {
    store[classId][dateKey][itemNo] = true;
  } else {
    delete store[classId][dateKey][itemNo];

    if (Object.keys(store[classId][dateKey]).length === 0) {
      delete store[classId][dateKey];
    }

    if (Object.keys(store[classId]).length === 0) {
      delete store[classId];
    }
  }

  saveStore(store);
}

function setupAdmin() {
  const serverUrlInput = document.getElementById("server-url-input");
  const savedUrl = localStorage.getItem(SERVER_URL_KEY) || DEFAULT_SERVER_URL;
  if (serverUrlInput) {
    serverUrlInput.value = savedUrl;
  }

  document.getElementById("save-server-url-btn").addEventListener("click", saveServerUrl);
  document.getElementById("backup-btn").addEventListener("click", backupData);
  document.getElementById("send-server-btn").addEventListener("click", sendToServer);

  document.getElementById("restore-btn").addEventListener("click", () => {
    document.getElementById("restore-file").click();
  });

  document.getElementById("restore-file").addEventListener("change", restoreData);

  document.getElementById("delete-btn").addEventListener("click", () => {
    if (!confirm("保存データを全部削除します。よろしいですか？")) return;

    localStorage.removeItem(STORAGE_KEY);
    selectedMissingDateKey = "";
    renderMatrix();
    renderMonthTab();
    alert("削除しました。");
  });
}

function normalizeServerUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function getServerUrl() {
  const input = document.getElementById("server-url-input");
  const value = normalizeServerUrl(input ? input.value : "");
  return value || DEFAULT_SERVER_URL;
}

function saveServerUrl() {
  const url = getServerUrl();
  localStorage.setItem(SERVER_URL_KEY, url);
  const input = document.getElementById("server-url-input");
  if (input) input.value = url;
  alert("保存しました。");
}

function buildServerPayload() {
  return {
    app: "hcheck",
    savedAt: new Date().toISOString(),
    checklistMaster: CHECKLIST_MASTER,
    payload: loadStore()
  };
}

async function sendToServer() {
  const serverUrl = getServerUrl();
  localStorage.setItem(SERVER_URL_KEY, serverUrl);

  if (!confirm("サーバーに送信しますか？")) return;

  try {
    const res = await fetch(`${serverUrl}/api/hcheck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildServerPayload())
    });

    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) {
      throw new Error(result.message || "送信に失敗しました。");
    }

    alert("サーバーに送信しました。");
  } catch (error) {
    console.error(error);
    alert("サーバーに送信できませんでした。園内PC URLとWi-Fi接続を確認してください。");
  }
}

function backupData() {
  const data = {
    exportedAt: new Date().toISOString(),
    app: "class-checklist-prototype",
    payload: loadStore()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date();

  a.href = url;
  a.download = `checklist-backup-${formatDateKey(
    stamp.getFullYear(),
    stamp.getMonth() + 1,
    stamp.getDate()
  )}.json`;

  a.click();
  URL.revokeObjectURL(url);
}

function restoreData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data.payload !== "object") {
        throw new Error("invalid");
      }

      saveStore(data.payload || {});
      selectedMissingDateKey = "";
      renderMatrix();
      renderMonthTab();
      alert("復元しました。");
    } catch (error) {
      alert("復元できませんでした。JSONファイルを確認してください。");
    }

    event.target.value = "";
  };

  reader.readAsText(file, "utf-8");
}

function formatMonthInput(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day };
}

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}