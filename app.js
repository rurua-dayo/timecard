// Google Apps Script のウェブアプリURLを入れてください
const ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbxQU-UHzTi_z4WI-q9wIsKpR70krj8OKXsPM18i1eJHpPkPsZOfCQnJ9ldMis1WUh7Ogg/exec";

const EMPLOYEES = [
  { name: "手塚", no: "022" },
  { name: "中尾", no: "049" },
  { name: "山田", no: "015" },
  { name: "池田", no: "000" },
];

let selectedEmployee = null;

const employeeButtons = document.getElementById("employeeButtons");
const selectedEmployeeText = document.getElementById("selectedEmployee");
const message = document.getElementById("message");
const pdfButton = document.getElementById("pdfButton");
const pdfLinkArea = document.getElementById("pdfLinkArea");

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

  pdfButton.addEventListener("click", exportPdf);
}

function selectEmployee(emp) {
  selectedEmployee = emp;
  selectedEmployeeText.textContent = `${emp.no} ${emp.name}`;
  pdfLinkArea.innerHTML = "";

  document.querySelectorAll("#employeeButtons button").forEach((button) => {
    button.classList.toggle("active", button.textContent === emp.name);
  });

  showMessage(`${emp.name}を選択しました。`, "ok");
}

async function punch(action) {
  if (!selectedEmployee) {
    showMessage("先に名前を選んでね。", "error");
    return;
  }

  if (!isEndpointSet()) {
    showMessage("app.jsにApps ScriptのURLを設定してね。", "error");
    return;
  }

  showMessage("保存中...", "");
  pdfLinkArea.innerHTML = "";

  try {
    const result = await postToScript({
      mode: "punch",
      action,
      name: selectedEmployee.name,
      employeeNo: selectedEmployee.no,
      timestamp: new Date().toISOString(),
    });

    if (!result.ok) {
      throw new Error(result.message || "保存に失敗しました");
    }

    showMessage(`${selectedEmployee.name}：${action}を保存して、勤務表に反映しました。`, "ok");
  } catch (error) {
    console.error(error);
    showMessage(`保存できませんでした：${error.message}`, "error");
  }
}

async function exportPdf() {
  if (!selectedEmployee) {
    showMessage("先に名前を選んでね。", "error");
    return;
  }

  if (!isEndpointSet()) {
    showMessage("app.jsにApps ScriptのURLを設定してね。", "error");
    return;
  }

  showMessage("PDF作成中...", "");
  pdfLinkArea.innerHTML = "";

  try {
    const result = await postToScript({
      mode: "pdf",
      name: selectedEmployee.name,
      employeeNo: selectedEmployee.no,
      timestamp: new Date().toISOString(),
    });

    if (!result.ok) {
      throw new Error(result.message || "PDF作成に失敗しました");
    }

    showMessage(`${result.sheetName} のPDFを作成しました。`, "ok");

    pdfLinkArea.innerHTML = `
      <a href="${escapeHtml(result.pdfUrl)}" target="_blank" rel="noopener">
        PDFを開く
      </a>
    `;
  } catch (error) {
    console.error(error);
    showMessage(`PDF作成できませんでした：${error.message}`, "error");
  }
}

async function postToScript(payload) {
  const response = await fetch(ENDPOINT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  return await response.json();
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
