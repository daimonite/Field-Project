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

function renderUsersTable() {
  const body = document.getElementById("users-table-body");
  const users = Store.getUsers();
  body.innerHTML = "";

  const statusStyles = {
    active: "bg-success-container text-success-teal",
    pending: "bg-primary-container/30 text-on-primary-container",
    removed: "bg-error-container text-error-crimson",
  };

  users.forEach((u) => {
    const row = document.createElement("tr");
    row.className = "border-b border-outline-variant last:border-0";
    row.innerHTML = `
      <td class="px-5 py-3 font-body-sm text-body-sm text-slate-900">${escapeHtml(u.name)}</td>
      <td class="px-5 py-3 font-mono-sm text-mono-sm text-secondary">${escapeHtml(u.username)}</td>
      <td class="px-5 py-3 font-body-sm text-body-sm text-secondary">${escapeHtml(u.dept)}</td>
      <td class="px-5 py-3 font-label-md text-label-md text-secondary">${u.role.toUpperCase()}</td>
      <td class="px-5 py-3"><span class="font-label-md text-label-md px-2.5 py-1 rounded-full ${statusStyles[u.status]}">${u.status.toUpperCase()}</span></td>
      <td class="px-5 py-3 text-right whitespace-nowrap">${actionsHtml(u)}</td>`;
    body.appendChild(row);
  });

  document.getElementById("pending-count").textContent = Store.pendingCount() + " pending";
}

function actionsHtml(u) {
  if (u.status === "pending") {
    return `
      <button onclick="handleApprove(${u.id})" class="text-success-teal hover:underline font-label-md text-label-md mr-3">Approve</button>
      <button onclick="handleReject(${u.id})" class="text-error hover:underline font-label-md text-label-md">Reject</button>`;
  }
  if (u.status === "active" && u.username !== "admin") {
    return `<button onclick="handleRemove(${u.id})" class="text-error hover:underline font-label-md text-label-md">Remove</button>`;
  }
  if (u.status === "removed") {
    return `<button onclick="handleReinstate(${u.id})" class="text-secondary hover:underline font-label-md text-label-md">Reinstate</button>`;
  }
  return `<span class="text-secondary/40 font-label-md text-label-md">—</span>`;
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
