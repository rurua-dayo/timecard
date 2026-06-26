// Google Apps Script のウェブアプリURLを入れてください
const ENDPOINT_URL = "ここにApps ScriptのウェブアプリURLを貼る";

const nameInput = document.getElementById("name");
const message = document.getElementById("message");
const clockInButton = document.getElementById("clockIn");
const clockOutButton = document.getElementById("clockOut");

clockInButton.addEventListener("click", () => punch("出勤"));
clockOutButton.addEventListener("click", () => punch("退勤"));

async function punch(type) {
  const name = nameInput.value.trim();

  if (!name) {
    showMessage("名前を入力してね。", "error");
    nameInput.focus();
    return;
  }

  if (!ENDPOINT_URL || ENDPOINT_URL.includes("ここに")) {
    showMessage("app.jsにApps ScriptのURLを設定してね。", "error");
    return;
  }

  setLoading(true);
  showMessage("記録中...", "");

  try {
    const payload = {
      name,
      type,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    const response = await fetch(ENDPOINT_URL, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.message || "保存に失敗しました");
    }

    const localTime = new Date().toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo"
    });

    showMessage(`${localTime} に「${type}」を保存しました。`, "success");
  } catch (error) {
    console.error(error);
    showMessage("保存できませんでした。設定を確認してね。", "error");
  } finally {
    setLoading(false);
  }
}

function showMessage(text, status) {
  message.textContent = text;
  message.className = `message ${status}`;
}

function setLoading(isLoading) {
  clockInButton.disabled = isLoading;
  clockOutButton.disabled = isLoading;
}
