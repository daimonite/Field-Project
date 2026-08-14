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
}

// ---------- Chat ----------
function newChat() {
  document.getElementById("chat-log").innerHTML = `
    <div class="flex items-center justify-center my-2">
      <span class="font-mono-sm text-mono-sm text-secondary bg-surface-container px-3 py-1 border border-outline/20 rounded">TODAY</span>
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

  const user = Store.getCurrentUser();
  const log = document.getElementById("chat-log");

  const userMsg = document.createElement("div");
  userMsg.className = "flex justify-end w-full";
  userMsg.innerHTML = `
    <div class="max-w-[80%] flex items-end gap-3 flex-row-reverse">
      <div class="w-8 h-8 rounded-full bg-slate-900 text-primary-fixed-dim flex items-center justify-center font-label-md text-label-md shrink-0">${user.name.charAt(0).toUpperCase()}</div>
      <div class="bg-slate-900 text-white p-4 rounded-xl rounded-br-sm border border-slate-800">
        <p class="font-body-md text-body-md">${escapeHtml(text)}</p>
      </div>
    </div>`;
  log.appendChild(userMsg);
  input.value = "";
  log.scrollTop = log.scrollHeight;

  // TODO: replace this with a real fetch("/chat", { ... }) call to your
  // FastAPI backend, which forwards the prompt to Ollama.
 fetch("http://localhost:8000/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: text })
})
  .then(res => res.json())
  .then(data => {
    const aiMsg = document.createElement("div");
    aiMsg.className = "flex justify-start w-full";
    aiMsg.innerHTML = `<div class="max-w-[80%] p-4 rounded-xl bg-surface-container border border-outline/20"><p>${escapeHtml(data.reply)}</p></div>`;
    log.appendChild(aiMsg);
    log.scrollTop = log.scrollHeight;
  });
}
