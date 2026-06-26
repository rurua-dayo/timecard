// Google Apps Script のウェブアプリURLを入れてください
const ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbxQU-UHzTi_z4WI-q9wIsKpR70krj8OKXsPM18i1eJHpPkPsZOfCQnJ9ldMis1WUh7Ogg/exec";

const EMPLOYEES = [
  { name: "手塚", no: "022" },
  { name: "中尾", no: "049" },
  { name: "山田", no: "015" },
  { name: "池田", no: "000" },
];

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
let selectedEmployee = null;
let monthRecords = [];

const employeeButtons = document.getElementById("employeeButtons");
const selectedEmployeeText = document.getElementById("selectedEmployee");
const message = document.getElementById("message");
const employeeNo = document.getElementById("employeeNo");
const employeeName = document.getElementById("employeeName");
const eraTitle = document.getElementById("eraTitle");
const attendanceBody = document.getElementById("attendanceBody");
const totalDays = document.getElementById("totalDays");
const totalHours = document.getElementById("totalHours");
const totalOvertime = document.getElementById("totalOvertime");

init();

function init() {
  EMPLOYEES.forEach((emp) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = emp.name;
    button.addEventListener("click", () => selectEmployee(emp));
    employeeButtons.appendChild(button);
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => punch(button.dataset.action));
  });

  document.getElementById("refreshButton").addEventListener("click", loadRecords);

  updateHeader();
  renderTable([]);
}

function selectEmployee(emp) {
  selectedEmployee = emp;
  selectedEmployeeText.textContent = `${emp.no} ${emp.name}`;
  document.querySelectorAll("#employeeButtons button").forEach((button) => {
    button.classList.toggle("active", button.textContent === emp.name);
  });
  updateHeader();
  loadRecords();
}

function updateHeader() {
  const now = new Date();
  eraTitle.textContent = toReiwaMonth(now);
  employeeNo.textContent = selectedEmployee ? selectedEmployee.no : "---";
  employeeName.textContent = selectedEmployee ? selectedEmployee.name : "名前を選択";
}

async function punch(action) {
  if (!selectedEmployee) {
    showMessage("名前を選んでね。", "error");
    return;
  }
  if (!isEndpointSet()) {
    showMessage("app.jsにApps ScriptのURLを設定してね。", "error");
    return;
  }

  showMessage("記録中...", "");
  try {
    const payload = {
      mode: "punch",
      action,
      name: selectedEmployee.name,
      employeeNo: selectedEmployee.no,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    const response = await fetch(ENDPOINT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.message || "保存に失敗しました");

    monthRecords = result.records || [];
    renderTable(monthRecords);
    showMessage(`${selectedEmployee.name}：${action}を保存しました。`, "ok");
  } catch (error) {
    console.error(error);
    showMessage(`保存できませんでした：${error.message}`, "error");
  }
}

async function loadRecords() {
  if (!selectedEmployee) return;
  if (!isEndpointSet()) {
    showMessage("app.jsにApps ScriptのURLを設定してね。", "error");
    return;
  }

  const now = new Date();
  const url = `${ENDPOINT_URL}?mode=month&employeeNo=${encodeURIComponent(selectedEmployee.no)}&name=${encodeURIComponent(selectedEmployee.name)}&year=${now.getFullYear()}&month=${now.getMonth() + 1}`;

  try {
    const response = await fetch(url);
    const result = await response.json();
    if (!result.ok) throw new Error(result.message || "読み込みに失敗しました");

    monthRecords = result.records || [];
    renderTable(monthRecords);
    showMessage("記録を更新しました。", "ok");
  } catch (error) {
    console.error(error);
    showMessage(`読み込みできませんでした：${error.message}`, "error");
  }
}

function renderTable(records) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const recordMap = new Map(records.map((r) => [String(r.day), r]));
  let html = "";
  let workdayCount = 0;
  let hoursSum = 0;
  let overtimeSum = 0;

  for (let day = 1; day <= days; day += 1) {
    const date = new Date(year, month, day);
    const weekday = weekdays[date.getDay()];
    const rec = recordMap.get(String(day));

    let dateText = `${month + 1}月${day}日`;
    let weekdayText = weekday;
    let start = "";
    let end = "";
    let hours = "";
    let overtime = "";

    if (rec) {
      if (rec.type === "paidLeave") {
        dateText = "有給";
        weekdayText = "";
      } else if (rec.type === "holiday") {
        // 日付と曜日だけ残し、勤務項目は空白
      } else {
        start = rec.start || "";
        end = rec.end || "";
        hours = formatNumber(rec.hours);
        overtime = formatNumber(rec.overtime);

        if (Number(rec.hours) > 0) {
          workdayCount += 1;
          hoursSum += Number(rec.hours) || 0;
          overtimeSum += Number(rec.overtime) || 0;
        }
      }
    }

    html += `
      <tr>
        <td>${escapeHtml(dateText)}</td>
        <td>${escapeHtml(weekdayText)}</td>
        <td>${escapeHtml(start)}</td>
        <td>${escapeHtml(end)}</td>
        <td>${escapeHtml(hours)}</td>
        <td>${escapeHtml(overtime)}</td>
        <td></td>
        <td></td>
      </tr>`;
  }

  attendanceBody.innerHTML = html;
  totalDays.textContent = workdayCount ? String(workdayCount) : "";
  totalHours.textContent = hoursSum ? formatNumber(hoursSum) : "";
  totalOvertime.textContent = overtimeSum ? formatNumber(overtimeSum) : "";
}

function toReiwaMonth(date) {
  const reiwaYear = date.getFullYear() - 2018;
  return `令和 ${reiwaYear} 年 ${date.getMonth() + 1} 月分`;
}

function formatNumber(value) {
  if (value === "" || value === null || value === undefined) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return Number.isInteger(num) ? String(num) : String(num.toFixed(1)).replace(/\.0$/, "");
}

function isEndpointSet() {
  return ENDPOINT_URL && !ENDPOINT_URL.includes("ここに");
}

function showMessage(text, status) {
  message.textContent = text;
  message.className = `message ${status}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[ch]));
}
