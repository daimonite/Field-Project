/**
 * admin.js — handles admin.html user approvals, feedback, and settings.
 */

let currentUsersList = [];
let pendingActionUserId = null;
let pendingActionType = "approve"; // "approve" | "reject"

document.addEventListener("DOMContentLoaded", () => {
  const user = Store.requireAdmin();
  if (!user) return;

  renderShell("admin");
  renderUsersTable();
  loadSettings();

  // Wire modal confirmation button
  const confirmBtn = document.getElementById("modal-confirm-btn");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", handleModalSubmit);
  }

  // Wire settings save button
  const saveSettingsBtn = document.getElementById("btn-save-settings");
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", saveSettings);
  }
});

const statusBadge = {
  active: "badge-soft badge-active",
  pending: "badge-soft badge-pending",
  removed: "badge-soft badge-removed",
};

async function renderUsersTable() {
  const body = document.getElementById("users-table-body");
  const pendingBadge = document.getElementById("pending-count");
  if (!body) return;

  body.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-secondary"><div class="spinner-border spinner-border-sm me-2"></div> Loading users from database...</td></tr>`;

  try {
    const res = await Store.getUsers();
    if (!res || !res.ok) {
      body.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Failed to load user directory. Please try refreshing.</td></tr>`;
      return;
    }

    currentUsersList = res.users || [];
    body.innerHTML = "";

    if (currentUsersList.length === 0) {
      body.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-secondary">No users found in database.</td></tr>`;
      if (pendingBadge) pendingBadge.textContent = "0 pending";
      return;
    }

    currentUsersList.forEach((u) => {
      const row = document.createElement("tr");
      const feedbackDisplay = u.approval_feedback
        ? `<div class="d-flex align-items-center gap-1 font-body-sm text-body-sm text-secondary"><span class="material-symbols-outlined icon-xs text-primary">chat_bubble</span><span class="text-truncate" style="max-width: 200px;" title="${escapeHtml(u.approval_feedback)}">${escapeHtml(u.approval_feedback)}</span></div>`
        : `<span class="text-tertiary font-mono-sm text-11">—</span>`;

      row.innerHTML = `
        <td class="font-body-sm text-body-sm fw-semibold text-main">${escapeHtml(u.name || "")}</td>
        <td class="font-mono-sm text-mono-sm text-secondary">${escapeHtml(u.username)}</td>
        <td class="font-body-sm text-body-sm text-secondary">${escapeHtml(u.dept || "General")}</td>
        <td class="font-label-md text-label-md text-secondary"><span class="badge ${u.role === 'admin' ? 'bg-primary' : 'bg-secondary'} text-white">${u.role.toUpperCase()}</span></td>
        <td><span class="${statusBadge[u.status] || 'badge-soft'}">${u.status.toUpperCase()}</span></td>
        <td>${feedbackDisplay}</td>
        <td class="text-end text-nowrap">${actionsHtml(u)}</td>`;
      body.appendChild(row);
    });

    if (pendingBadge) {
      pendingBadge.textContent = (res.pending_count || 0) + " pending";
    }
  } catch (err) {
    console.error(err);
    body.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Error retrieving users from server.</td></tr>`;
  }
}

function actionsHtml(u) {
  if (u.status === "pending") {
    return `
      <button type="button" onclick="openApproveModal(${u.id})" class="btn btn-sm btn-success text-white fw-semibold me-1 px-2 py-1">
        <span class="material-symbols-outlined icon-xs align-middle">check</span> Approve
      </button>
      <button type="button" onclick="openRejectModal(${u.id})" class="btn btn-sm btn-outline-danger fw-semibold px-2 py-1">
        Reject
      </button>`;
  }
  if (u.status === "active" && u.username !== "admin") {
    return `<button type="button" onclick="handleRemove(${u.id})" class="btn btn-sm text-error fw-semibold hover-underline">Deactivate</button>`;
  }
  if (u.status === "removed") {
    return `<button type="button" onclick="handleReinstate(${u.id})" class="btn btn-sm text-success fw-semibold hover-underline">Reinstate</button>`;
  }
  return `<span class="text-tertiary font-label-md text-label-md">—</span>`;
}

function openApproveModal(userId) {
  const user = currentUsersList.find((u) => u.id === userId);
  if (!user) return;

  pendingActionUserId = userId;
  pendingActionType = "approve";

  document.getElementById("approvalModalLabel").textContent = "Approve User & Send Feedback";
  document.getElementById("modal-user-name").textContent = user.name;
  document.getElementById("modal-user-username").textContent = user.username;
  document.getElementById("modal-user-dept").textContent = user.dept || "General";

  const defaultFeedback = `Approved. Welcome to the ${user.dept || "team"} department! Access granted to AI Office Node.`;
  document.getElementById("modal-feedback-input").value = defaultFeedback;

  const confirmBtn = document.getElementById("modal-confirm-btn");
  confirmBtn.className = "btn btn-success text-white btn-sm";
  confirmBtn.textContent = "Approve & Send Feedback";

  const modalEl = document.getElementById("approvalModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

function openRejectModal(userId) {
  const user = currentUsersList.find((u) => u.id === userId);
  if (!user) return;

  pendingActionUserId = userId;
  pendingActionType = "reject";

  document.getElementById("approvalModalLabel").textContent = "Reject User Registration";
  document.getElementById("modal-user-name").textContent = user.name;
  document.getElementById("modal-user-username").textContent = user.username;
  document.getElementById("modal-user-dept").textContent = user.dept || "General";

  document.getElementById("modal-feedback-input").value = "Registration request was not approved by administration.";

  const confirmBtn = document.getElementById("modal-confirm-btn");
  confirmBtn.className = "btn btn-danger text-white btn-sm";
  confirmBtn.textContent = "Confirm Rejection";

  const modalEl = document.getElementById("approvalModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

async function handleModalSubmit() {
  if (!pendingActionUserId) return;

  const feedback = document.getElementById("modal-feedback-input").value.trim();
  const modalEl = document.getElementById("approvalModal");
  const modal = bootstrap.Modal.getInstance(modalEl);

  const confirmBtn = document.getElementById("modal-confirm-btn");
  confirmBtn.disabled = true;
  confirmBtn.textContent = "Processing...";

  try {
    let result;
    if (pendingActionType === "approve") {
      result = await Store.approveUser(pendingActionUserId, feedback);
    } else {
      result = await Store.rejectUser(pendingActionUserId, feedback);
    }

    if (modal) modal.hide();

    if (result && result.ok) {
      showAlert(result.message || "User status updated successfully.");
    } else {
      alert(result?.error || "Action failed.");
    }

    await renderUsersTable();
  } finally {
    confirmBtn.disabled = false;
    pendingActionUserId = null;
  }
}

async function handleRemove(id) {
  if (!confirm("Are you sure you want to deactivate this user?")) return;
  const result = await Store.removeUser(id);
  if (result && result.ok) {
    showAlert(result.message || "User account deactivated.");
  }
  await renderUsersTable();
}

async function handleReinstate(id) {
  const result = await Store.reinstateUser(id);
  if (result && result.ok) {
    showAlert(result.message || "User reinstated.");
  }
  await renderUsersTable();
}

function showAlert(text) {
  const alertEl = document.getElementById("admin-alert");
  const alertText = document.getElementById("admin-alert-text");
  if (alertEl && alertText) {
    alertText.textContent = text;
    alertEl.hidden = false;
    setTimeout(() => {
      alertEl.hidden = true;
    }, 5000);
  }
}

async function loadSettings() {
  try {
    const res = await fetch("/api/admin/settings", {
      headers: Store.getAuthHeaders(),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.node_address) document.getElementById("node-address").value = data.node_address;
    if (data.active_model) document.getElementById("active-model").value = data.active_model;
    if (data.max_users) document.getElementById("max-users").value = data.max_users;
    if (data.default_printer_id) document.getElementById("default-printer").value = data.default_printer_id;
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
}

async function saveSettings() {
  const node_address = document.getElementById("node-address").value.trim();
  const active_model = document.getElementById("active-model").value.trim();
  const max_users = parseInt(document.getElementById("max-users").value, 10) || 60;
  const default_printer_id = parseInt(document.getElementById("default-printer").value, 10) || 1;

  const btn = document.getElementById("btn-save-settings");
  btn.disabled = true;
  btn.textContent = "SAVING...";

  try {
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: Store.getAuthHeaders(),
      body: JSON.stringify({ node_address, active_model, max_users, default_printer_id }),
    });
    const data = await res.json();
    if (res.ok) {
      showAlert(data.message || "Settings updated successfully.");
    } else {
      alert(data.detail || "Failed to update settings.");
    }
  } catch (e) {
    alert("Network error updating settings.");
  } finally {
    btn.disabled = false;
    btn.textContent = "SAVE SETTINGS";
  }
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

