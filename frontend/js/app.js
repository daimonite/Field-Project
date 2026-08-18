/**
 * app.js — handles user.html (Dashboard / AI Chat / File Search / Automation).
 */

const VALID_TABS = ["dashboard", "chat", "filesearch", "automation"];
let activeConversationId = null;
let cachedFiles = [];
let cachedPrinters = [];

document.addEventListener("DOMContentLoaded", async () => {
  const user = Store.requireAuth();
  if (!user) return;

  showTab(currentTabFromHash());
  window.addEventListener("hashchange", () => showTab(currentTabFromHash()));

  // Refresh user profile and display any admin feedback note
  initUserProfile();

  // Load dashboard stats, files, and printers
  loadDashboardStats();
  loadFiles();
  loadUserAutomations();

  document.getElementById("chat-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
});

async function initUserProfile() {
  const liveUser = (await Store.getMyProfile()) || Store.getCurrentUser();
  if (!liveUser) return;

  const heading = document.getElementById("welcome-user-heading");
  if (heading) {
    heading.textContent = `Welcome back, ${liveUser.name}`;
  }

  const feedbackBanner = document.getElementById("user-feedback-banner");
  const feedbackText = document.getElementById("user-feedback-text");
  if (feedbackBanner && feedbackText && liveUser.approval_feedback) {
    feedbackText.textContent = liveUser.approval_feedback;
    feedbackBanner.hidden = false;
  }
}

async function loadDashboardStats() {
  try {
    const stats = await Store.getStats();
    if (stats) {
      const modelEl = document.getElementById("node-model");
      if (modelEl && stats.model) modelEl.textContent = stats.model;

      const userStatEl = document.getElementById("node-users-stat");
      if (userStatEl && stats.active_users !== undefined) {
        userStatEl.textContent = `${stats.active_users} / ${stats.max_users || 60}`;
      }

      const statusEl = document.getElementById("node-status-text");
      if (statusEl && stats.status) {
        statusEl.textContent = stats.status;
      }
    }
  } catch (e) {
    console.error("Error loading dashboard stats:", e);
  }
}

async function loadFiles() {
  try {
    const res = await Store.getFiles();
    if (res && res.ok && res.files) {
      cachedFiles = res.files;
      const container = document.querySelector("main[data-panel='filesearch'] .d-flex.flex-column.gap-2");
      if (container && cachedFiles.length > 0) {
        container.innerHTML = cachedFiles
          .map(
            (f) => `
          <div class="bg-surface border border-soft rounded-lg p-3 d-flex align-items-center gap-3 card-link">
            <span class="material-symbols-outlined text-primary">${f.file_type === "xlsx" ? "table_view" : f.file_type === "docx" ? "article" : "description"}</span>
            <div class="flex-grow-1 min-w-0">
              <p class="font-label-md text-label-md text-main mb-0 text-truncate">${escapeHtml(f.filename)}</p>
              <p class="font-mono-sm text-11 text-secondary mb-0">${escapeHtml(f.dept || "Shared")} · ${f.size_kb} KB</p>
            </div>
            <button type="button" onclick="quickAction('Summarize ' + '${escapeHtml(f.filename)}')" class="btn btn-sm btn-outline-brand px-2 py-1" title="Summarize with AI">AI Summary</button>
          </div>`
          )
          .join("");
      }
    }
  } catch (e) {
    console.error("Error loading files:", e);
  }
}

function currentTabFromHash() {
  const tab = window.location.hash.replace("#", "");
  return VALID_TABS.includes(tab) ? tab : "dashboard";
}

function showTab(tab) {
  renderShell(tab);
  document.querySelectorAll(".page-panel").forEach((p) => (p.hidden = p.dataset.panel !== tab));
  if (tab === "chat") scrollChatToBottom();
  if (tab === "automation") loadUserAutomations();
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
  activeConversationId = null;
  document.getElementById("chat-log").innerHTML = `
    <div class="d-flex justify-content-center my-2">
      <span class="font-mono-sm text-mono-sm text-secondary bg-surface-container px-3 py-1 border border-soft rounded">NEW SESSION</span>
    </div>
    <div class="d-flex w-100">
      <div class="msg-group d-flex align-items-start gap-3">
        <div class="avatar avatar-ai">
          <span class="material-symbols-outlined icon-xs">smart_toy</span>
        </div>
        <div class="bubble bubble-ai">
          <p class="font-body-md text-body-md mb-0">Hi, I'm the office TRA AI Node assistant. How can I help you with files, reports, printing, or database queries today?</p>
        </div>
      </div>
    </div>`;
  window.location.hash = "chat";
}

function quickAction(label) {
  const input = document.getElementById("chat-input");
  input.value = label;
  window.location.hash = "chat";
  input.focus();
}

async function sendMessage() {
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
        <p class="font-body-md text-body-md text-secondary mb-0">Connecting to node &amp; database...</p>
      </div>
    </div>`;
  log.appendChild(typingMsg);
  log.scrollTop = log.scrollHeight;

  try {
    const data = await Store.sendChatMessage(text, activeConversationId);
    typingMsg.remove();

    if (data.conversation_id) {
      activeConversationId = data.conversation_id;
    }

    let actionBadgeHtml = "";
    if (data.action && data.action.type) {
      if (data.action.type === "document_generated") {
        actionBadgeHtml = `
          <div class="mt-2 p-2 bg-surface border border-success rounded d-flex align-items-center gap-2 font-mono-sm text-mono-sm text-success">
            <span class="material-symbols-outlined icon-xs">task_alt</span>
            <span>Document Saved: <strong>${escapeHtml(data.action.filename)}</strong></span>
          </div>`;
      } else if (data.action.type === "print_queued") {
        actionBadgeHtml = `
          <div class="mt-2 p-2 bg-surface border border-primary rounded d-flex align-items-center gap-2 font-mono-sm text-mono-sm text-primary">
            <span class="material-symbols-outlined icon-xs">print</span>
            <span>Print Job #${data.action.job_id} &rarr; ${escapeHtml(data.action.printer)}</span>
          </div>`;
      }
    }

    const aiMsg = document.createElement("div");
    aiMsg.className = "d-flex justify-content-start w-100";
    aiMsg.innerHTML = `
      <div class="msg-group d-flex align-items-start gap-3">
        <div class="avatar avatar-ai">
          <span class="material-symbols-outlined icon-xs">smart_toy</span>
        </div>
        <div class="bubble bubble-ai">
          <p class="font-body-md text-body-md mb-0">${escapeHtml(data.reply).replace(/\n/g, '<br/>')}</p>
          ${actionBadgeHtml}
        </div>
      </div>`;
    log.appendChild(aiMsg);
    log.scrollTop = log.scrollHeight;

    // Refresh automations in background
    loadUserAutomations();
  } catch (err) {
    typingMsg.remove();
    const aiMsg = document.createElement("div");
    aiMsg.className = "d-flex justify-content-start w-100";
    aiMsg.innerHTML = `
      <div class="msg-group d-flex align-items-start gap-3">
        <div class="avatar avatar-ai">
          <span class="material-symbols-outlined icon-xs">smart_toy</span>
        </div>
        <div class="bubble bubble-error">
          <p class="font-body-md text-body-md mb-0">${escapeHtml(err.message || "Failed to process chat.")}</p>
        </div>
      </div>`;
    log.appendChild(aiMsg);
    log.scrollTop = log.scrollHeight;
  } finally {
    sendBtn.disabled = false;
  }
}

// ---------- Automations: Print & Convert ----------
async function loadUserAutomations() {
  try {
    // 1. Load generated documents
    const docRes = await Store.getDocuments();
    const docContainer = document.getElementById("generated-docs-list");
    if (docContainer) {
      if (docRes && docRes.ok && docRes.documents && docRes.documents.length > 0) {
        docContainer.innerHTML = docRes.documents
          .map(
            (d) => `
          <div class="bg-surface-container border border-soft rounded-lg p-3 d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-3">
              <span class="material-symbols-outlined text-primary">${d.doc_type === 'excel' ? 'table_view' : d.doc_type === 'powerpoint' ? 'slideshow' : 'article'}</span>
              <div>
                <p class="font-label-md text-label-md text-main mb-0 fw-semibold">${escapeHtml(d.filename)}</p>
                <p class="font-mono-sm text-11 text-secondary mb-0">${d.doc_type.toUpperCase()} · ${d.status.toUpperCase()} · ${d.created_at ? d.created_at.substring(0, 10) : 'Today'}</p>
              </div>
            </div>
            <span class="badge-soft badge-active">Ready</span>
          </div>`
          )
          .join("");
      } else {
        docContainer.innerHTML = `<p class="text-secondary font-body-sm text-body-sm mb-0">No documents generated yet. Use AI chat to generate reports or convert files.</p>`;
      }
    }

    // 2. Load print jobs
    const printRes = await Store.getPrintJobs();
    const printContainer = document.getElementById("print-jobs-list");
    if (printContainer) {
      if (printRes && printRes.ok && printRes.print_jobs && printRes.print_jobs.length > 0) {
        printContainer.innerHTML = printRes.print_jobs
          .map(
            (j) => `
          <div class="bg-surface-container border border-soft rounded-lg p-3 d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-3">
              <span class="material-symbols-outlined text-primary">print</span>
              <div>
                <p class="font-label-md text-label-md text-main mb-0 fw-semibold">Job #${j.id}: ${escapeHtml(j.filename)}</p>
                <p class="font-mono-sm text-11 text-secondary mb-0">${escapeHtml(j.printer)} (${escapeHtml(j.location)})</p>
              </div>
            </div>
            <span class="badge-soft ${j.status === 'done' ? 'badge-active' : 'badge-pending'}">${j.status.toUpperCase()}</span>
          </div>`
          )
          .join("");
      } else {
        printContainer.innerHTML = `<p class="text-secondary font-body-sm text-body-sm mb-0">No active print jobs in queue.</p>`;
      }
    }
  } catch (e) {
    console.error("Error loading automations:", e);
  }
}

async function openPrintModal() {
  if (cachedFiles.length === 0) {
    const fRes = await Store.getFiles();
    if (fRes && fRes.files) cachedFiles = fRes.files;
  }
  if (cachedPrinters.length === 0) {
    const pRes = await Store.getPrinters();
    if (pRes && pRes.printers) cachedPrinters = pRes.printers;
  }

  const fileSelect = document.getElementById("select-print-file");
  fileSelect.innerHTML = cachedFiles.map((f) => `<option value="${f.id}">${escapeHtml(f.filename)} (${f.dept})</option>`).join("");

  const printerSelect = document.getElementById("select-print-printer");
  printerSelect.innerHTML = cachedPrinters.map((p) => `<option value="${p.id}">${escapeHtml(p.name)} - ${escapeHtml(p.location)} [${p.status.toUpperCase()}]</option>`).join("");

  const modalEl = document.getElementById("printModal");
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

async function submitPrintJob() {
  const fileId = parseInt(document.getElementById("select-print-file").value, 10);
  const printerId = parseInt(document.getElementById("select-print-printer").value, 10);

  const btn = document.getElementById("btn-submit-print");
  btn.disabled = true;
  btn.textContent = "Dispatching...";

  try {
    const res = await Store.printFile(fileId, printerId);
    const modalEl = document.getElementById("printModal");
    bootstrap.Modal.getInstance(modalEl).hide();

    if (res && res.ok) {
      showAutomationAlert(res.message || "Print job sent to printer.");
      loadUserAutomations();
    } else {
      alert(res.error || "Failed to dispatch print job.");
    }
  } finally {
    btn.disabled = false;
    btn.textContent = "Send to Printer";
  }
}

async function openConvertModal() {
  if (cachedFiles.length === 0) {
    const fRes = await Store.getFiles();
    if (fRes && fRes.files) cachedFiles = fRes.files;
  }

  const fileSelect = document.getElementById("select-convert-file");
  fileSelect.innerHTML = cachedFiles.map((f) => `<option value="${f.id}">${escapeHtml(f.filename)}</option>`).join("");

  const modalEl = document.getElementById("convertModal");
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

async function submitConvertJob() {
  const fileId = parseInt(document.getElementById("select-convert-file").value, 10);
  const targetFormat = document.getElementById("select-convert-target").value;

  const btn = document.getElementById("btn-submit-convert");
  btn.disabled = true;
  btn.textContent = "Converting...";

  try {
    const res = await Store.convertFile(fileId, targetFormat);
    const modalEl = document.getElementById("convertModal");
    bootstrap.Modal.getInstance(modalEl).hide();

    if (res && res.ok) {
      showAutomationAlert(res.message || "Document converted.");
      loadUserAutomations();
    } else {
      alert(res.error || "Failed to convert document.");
    }
  } finally {
    btn.disabled = false;
    btn.textContent = "Convert Now";
  }
}

function showAutomationAlert(text) {
  const alertEl = document.getElementById("automation-alert");
  const alertText = document.getElementById("automation-alert-text");
  if (alertEl && alertText) {
    alertText.textContent = text;
    alertEl.hidden = false;
    setTimeout(() => {
      alertEl.hidden = true;
    }, 5000);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

