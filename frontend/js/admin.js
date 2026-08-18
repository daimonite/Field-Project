/**
 * admin.js — handles admin.html only.
 * Access is gated twice: renderShell()->requireAuth() blocks anyone not
 * signed in, and Store.requireAdmin() below blocks any signed-in user
 * whose role isn't "admin" (sends them back to user.html).
 */
document.addEventListener("DOMContentLoaded", () => {
  const user = Store.requireAdmin();
  if (!user) return;

  renderShell("admin");
  renderUsersTable();
});

const statusBadge = {
  active: "badge-soft badge-active",
  pending: "badge-soft badge-pending",
  removed: "badge-soft badge-removed",
};

function renderUsersTable() {
  const body = document.getElementById("users-table-body");
  const users = Store.getUsers();
  body.innerHTML = "";

  users.forEach((u) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="font-body-sm text-body-sm text-main">${escapeHtml(u.name)}</td>
      <td class="font-mono-sm text-mono-sm text-secondary">${escapeHtml(u.username)}</td>
      <td class="font-body-sm text-body-sm text-secondary">${escapeHtml(u.dept)}</td>
      <td class="font-label-md text-label-md text-secondary">${u.role.toUpperCase()}</td>
      <td><span class="${statusBadge[u.status]}">${u.status.toUpperCase()}</span></td>
      <td class="text-end text-nowrap">${actionsHtml(u)}</td>`;
    body.appendChild(row);
  });

  document.getElementById("pending-count").textContent = Store.pendingCount() + " pending";
}

function actionsHtml(u) {
  if (u.status === "pending") {
    return `
      <button type="button" onclick="handleApprove(${u.id})" class="btn btn-sm text-success fw-semibold me-2 hover-underline">Approve</button>
      <button type="button" onclick="handleReject(${u.id})" class="btn btn-sm text-error fw-semibold hover-underline">Reject</button>`;
  }
  if (u.status === "active" && u.username !== "admin") {
    return `<button type="button" onclick="handleRemove(${u.id})" class="btn btn-sm text-error fw-semibold hover-underline">Remove</button>`;
  }
  if (u.status === "removed") {
    return `<button type="button" onclick="handleReinstate(${u.id})" class="btn btn-sm text-secondary fw-semibold hover-underline">Reinstate</button>`;
  }
  return `<span class="text-tertiary font-label-md text-label-md">—</span>`;
}

function handleApprove(id) { Store.approveUser(id); renderUsersTable(); }
function handleReject(id) { Store.rejectUser(id); renderUsersTable(); }
function handleRemove(id) { Store.removeUser(id); renderUsersTable(); }
function handleReinstate(id) { Store.reinstateUser(id); renderUsersTable(); }

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
