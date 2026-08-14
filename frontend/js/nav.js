/**
 * nav.js
 * Renders the sidebar + top header into containers that must exist on
 * the page as <div id="sidebar-root"></div> and <div id="header-root"></div>.
 * Keeping this in one file means a nav/branding change only needs to
 * happen here, not on every page.
 */

const NAV_LINKS = [
  { page: "dashboard", icon: "dashboard", label: "Dashboard", href: "user.html#dashboard" },
  { page: "chat", icon: "chat", label: "AI Chat", href: "user.html#chat" },
  { page: "filesearch", icon: "search", label: "File Search", href: "user.html#filesearch" },
  { page: "automation", icon: "bolt", label: "Automation", href: "user.html#automation" },
];

const PAGE_TITLES = {
  dashboard: "Dashboard",
  chat: "AI Chat",
  filesearch: "File Search",
  automation: "Automation",
  admin: "Admin",
};

/**
 * @param {string} activePage - one of dashboard|chat|filesearch|automation|admin
 */
function renderShell(activePage) {
  const user = Store.requireAuth();
  if (!user) return; // requireAuth already redirected to login.html

  const initial = user.name.charAt(0).toUpperCase();

  const linksHtml = NAV_LINKS.map((link) => navLinkHtml(link, activePage)).join("");
  const adminLinkHtml =
    user.role === "admin"
      ? navLinkHtml({ page: "admin", icon: "admin_panel_settings", label: "Admin", href: "admin.html" }, activePage)
      : "";

  document.getElementById("sidebar-root").innerHTML = `
    <nav class="sidebar position-fixed start-0 top-0 h-100 d-flex flex-column border-end">
      <div class="p-4 border-bottom" style="border-color: rgba(255,255,255,0.1)">
        <div class="d-flex align-items-center gap-3 mb-4">
          <div class="icon-box bg-brand">
            <span class="material-symbols-outlined text-on-brand">hub</span>
          </div>
          <div>
            <h1 class="font-headline-md text-headline-md text-brand mb-0 lh-1">AI Office Node</h1>
            <p class="font-body-sm text-body-sm text-secondary mt-1 mb-0">TRA · V-1.0 MVP</p>
          </div>
        </div>
        <a href="user.html#chat" class="btn btn-brand w-100 d-flex align-items-center justify-content-center gap-2">
          <span class="material-symbols-outlined icon-md">add</span>New Chat
        </a>
      </div>

      <div class="flex-grow-1 py-3 d-flex flex-column gap-1 overflow-auto">
        ${linksHtml}
        ${adminLinkHtml}
      </div>

      <div class="border-top p-3 d-flex flex-column gap-1" style="border-color: rgba(255,255,255,0.1)">
        <div class="d-flex align-items-center gap-3 px-2 py-2 mb-1">
          <div class="avatar avatar-user">${initial}</div>
          <div class="min-w-0">
            <p class="font-body-sm text-body-sm text-white mb-0 text-truncate">${escapeHtml(user.name)}</p>
            <p class="font-mono-sm text-11 text-secondary mb-0 text-truncate">${user.role.toUpperCase()} · ${escapeHtml(user.dept)}</p>
          </div>
        </div>
        <a id="logout-link" class="side-link cursor-pointer" style="border-right: 0">
          <span class="material-symbols-outlined">logout</span>Log out
        </a>
      </div>
    </nav>`;

  document.getElementById("header-root").innerHTML = `
    <header class="header-area position-fixed top-0 d-flex justify-content-between align-items-center px-4">
      <span class="font-headline-md text-headline-md text-main">${PAGE_TITLES[activePage] || ""}</span>
      <div class="flex-grow-1 px-4">
        <div class="position-relative" style="max-width: 28rem">
          <span class="material-symbols-outlined position-absolute start-0 top-50 translate-middle-y ms-3 icon-md text-secondary">search</span>
          <input class="form-control rounded-pill ps-5 font-body-sm text-body-sm" placeholder="Global Search..." type="text"/>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button type="button" onclick="toggleTheme()" class="theme-toggle" title="Toggle light/dark theme">
          <span class="material-symbols-outlined" data-theme-icon>dark_mode</span>
        </button>
        <button type="button" class="theme-toggle" title="Notifications">
          <span class="material-symbols-outlined">notifications</span>
        </button>
        <div class="avatar avatar-user">${initial}</div>
      </div>
    </header>`;

  document.getElementById("logout-link").addEventListener("click", () => {
    Store.logout();
    window.location.href = "login.html";
  });
}

function navLinkHtml(link, activePage) {
  const active = link.page === activePage;
  return `
    <a href="${link.href}" class="side-link ${active ? "active" : ""}">
      <span class="material-symbols-outlined">${link.icon}</span>${link.label}
    </a>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
