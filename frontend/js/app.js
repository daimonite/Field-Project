/**
 * app.js — handles user.html only (Dashboard / AI Chat / File Search / Automation).
 * These four live on one page and switch via the URL hash (#dashboard, #chat, ...)
 * so the browser back/forward buttons and bookmarks work naturally.
 */

const VALID_TABS = ["dashboard", "chat", "filesearch", "automation"];

document.addEventListener("DOMContentLoaded", () => {
  const user = Store.requireAuth();
  if (!user) return;

  showTab(currentTabFromHash());
  window.addEventListener("hashchange", () => showTab(currentTabFromHash()));

  fetch("/model")
    .then((res) => res.json())
    .then((data) => {
      const el = document.getElementById("node-model");
      if (el) el.textContent = data.model;
    })
    .catch(() => {});

  document.getElementById("chat-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
});

function currentTabFromHash() {
  const tab = window.location.hash.replace("#", "");
  return VALID_TABS.includes(tab) ? tab : "dashboard";
}

function showTab(tab) {
  renderShell(tab); // from nav.js — redraws sidebar/header with correct active state
  document.querySelectorAll(".page-panel").forEach((p) => (p.hidden = p.dataset.panel !== tab));
  if (tab === "chat") scrollChatToBottom();
}

function scrollChatToBottom() {
  const log = document.getElementById("chat-log");
  if (!log) return;
  requestAnimationFrame(() => {
    log.scrollTop = log.scrollHeight;
  });
}

// ---------- Chat ----------
function newChat() {
  document.getElementById("chat-log").innerHTML = `
    <div class="d-flex justify-content-center my-2">
      <span class="font-mono-sm text-mono-sm text-secondary bg-surface-container px-3 py-1 border border-soft rounded">TODAY</span>
    </div>`;
  window.location.hash = "chat";
}

function quickAction(label) {
  const input = document.getElementById("chat-input");
  input.value = label + ": ";
  input.focus();
}

function sendMessage() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  const sendBtn = document.getElementById("send-btn");
  if (sendBtn.disabled) return;
  sendBtn.disabled = true;

  const user = Store.getCurrentUser();
  const log = document.getElementById("chat-log");

  const userMsg = document.createElement("div");
  userMsg.className = "d-flex justify-content-end w-100";
  userMsg.innerHTML = `
    <div class="msg-group d-flex align-items-end gap-3 flex-row-reverse">
      <div class="avatar avatar-user">${user.name.charAt(0).toUpperCase()}</div>
      <div class="bubble bubble-user">
        <p class="font-body-md text-body-md mb-0">${escapeHtml(text)}</p>
      </div>
    </div>`;
  log.appendChild(userMsg);
  input.value = "";
  log.scrollTop = log.scrollHeight;

  const typingMsg = document.createElement("div");
  typingMsg.className = "d-flex justify-content-start w-100";
  typingMsg.id = "typing-indicator";
  typingMsg.innerHTML = `
    <div class="msg-group d-flex align-items-start gap-3">
      <div class="avatar avatar-ai">
        <span class="material-symbols-outlined icon-xs">smart_toy</span>
      </div>
      <div class="bubble bubble-ai">
        <p class="font-body-md text-body-md text-secondary mb-0">TRA AI is thinking…</p>
      </div>
    </div>`;
  log.appendChild(typingMsg);
  log.scrollTop = log.scrollHeight;

  // Safety net so the button can never stay stuck disabled: abort after
  // 120s (matches the backend's Ollama timeout) and always release the button.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: text }),
    signal: controller.signal
  })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Chat request failed.");
      return data;
    })
    .then((data) => {
      const aiMsg = document.createElement("div");
      aiMsg.className = "d-flex justify-content-start w-100";
      aiMsg.innerHTML = `
        <div class="msg-group d-flex align-items-start gap-3">
          <div class="avatar avatar-ai">
            <span class="material-symbols-outlined icon-xs">smart_toy</span>
          </div>
          <div class="bubble bubble-ai">
            <p class="font-body-md text-body-md mb-0">${escapeHtml(data.reply)}</p>
          </div>
        </div>`;
      typingMsg.remove();
      log.appendChild(aiMsg);
      log.scrollTop = log.scrollHeight;
    })
    .catch((err) => {
      typingMsg.remove();
      const msg = err.name === "AbortError" ? "Request timed out. Please try again." : err.message;
      const aiMsg = document.createElement("div");
      aiMsg.className = "d-flex justify-content-start w-100";
      aiMsg.innerHTML = `
        <div class="msg-group d-flex align-items-start gap-3">
          <div class="avatar avatar-ai">
            <span class="material-symbols-outlined icon-xs">smart_toy</span>
          </div>
          <div class="bubble bubble-error">
            <p class="font-body-md text-body-md mb-0">${escapeHtml(msg)}</p>
          </div>
        </div>`;
      log.appendChild(aiMsg);
      log.scrollTop = log.scrollHeight;
    })
    .finally(() => {
      clearTimeout(timeoutId);
      sendBtn.disabled = false; // always re-enable, on success, error, or timeout
    });
}
