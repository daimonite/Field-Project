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
    <nav class="bg-slate-900 h-screen w-64 fixed left-0 top-0 border-r border-outline flex flex-col z-50">
      <div class="p-6 border-b border-outline/20">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 rounded-full bg-primary-fixed-dim flex items-center justify-center border-2 border-primary-fixed-dim shrink-0">
            <span class="material-symbols-outlined text-slate-900 text-[20px]">hub</span>
          </div>
          <div>
            <h1 class="font-headline-md text-headline-md text-primary-fixed-dim leading-tight">AI Office Node</h1>
            <p class="font-body-sm text-body-sm text-slate-400">TRA · V-1.0 MVP</p>
          </div>
        </div>
        <a href="user.html#chat" class="w-full bg-primary-fixed-dim text-slate-900 font-label-md text-label-md py-3 rounded hover:bg-primary-container transition-colors duration-200 flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[18px]">add</span>New Chat
        </a>
      </div>

      <div class="flex-1 py-4 flex flex-col gap-1 overflow-y-auto">
        ${linksHtml}
        ${adminLinkHtml}
      </div>

      <div class="border-t border-outline/20 p-4 flex flex-col gap-1">
        <div class="flex items-center gap-3 px-2 py-2 mb-1">
          <div class="w-8 h-8 rounded-full bg-primary-fixed-dim flex items-center justify-center font-label-md text-label-md text-slate-900 shrink-0">${initial}</div>
          <div class="min-w-0">
            <p class="font-body-sm text-body-sm text-white truncate">${escapeHtml(user.name)}</p>
            <p class="font-mono-sm text-[11px] text-slate-400 truncate">${user.role.toUpperCase()} · ${escapeHtml(user.dept)}</p>
          </div>
        </div>
        <a id="logout-link" class="text-slate-200 hover:text-white flex items-center gap-3 px-6 py-3 hover:bg-white/5 transition-colors duration-200 font-label-md text-label-md cursor-pointer">
          <span class="material-symbols-outlined">logout</span>Log out
        </a>
      </div>
    </nav>`;

  document.getElementById("header-root").innerHTML = `
    <header class="bg-surface fixed top-0 right-0 w-[calc(100%-16rem)] h-16 border-b border-outline-variant flex justify-between items-center px-gutter z-40">
      <div class="flex items-center gap-6 h-full">
        <span class="font-headline-md text-headline-md text-slate-900">${PAGE_TITLES[activePage] || ""}</span>
      </div>
      <div class="flex-1 px-8">
        <div class="relative max-w-md">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[20px]">search</span>
          <input class="w-full bg-surface-container-highest border border-outline/30 focus:border-slate-900 focus:ring-0 rounded-full py-2 pl-10 pr-4 font-body-sm text-body-sm placeholder:text-secondary transition-colors" placeholder="Global Search..." type="text"/>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="text-secondary hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-variant">
          <span class="material-symbols-outlined">notifications</span>
        </button>
        <div class="w-8 h-8 rounded-full bg-slate-900 text-primary-fixed-dim flex items-center justify-center font-label-md text-label-md">${initial}</div>
      </div>
    </header>`;

  document.getElementById("logout-link").addEventListener("click", () => {
    Store.logout();
    window.location.href = "login.html";
  });
}

function navLinkHtml(link, activePage) {
  const active = link.page === activePage;
  const activeClasses = active
    ? "text-primary-fixed-dim font-bold border-r-4 border-primary-fixed-dim bg-white/5"
    : "text-slate-200 hover:text-white hover:bg-white/5";
  return `
    <a href="${link.href}" class="${activeClasses} flex items-center gap-3 px-6 py-4 transition-colors duration-200 font-label-md text-label-md cursor-pointer">
      <span class="material-symbols-outlined">${link.icon}</span>${link.label}
    </a>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
