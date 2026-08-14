/**
 * store.js
 * ------------------------------------------------------------------
 * DEMO-ONLY data layer. There is no backend yet, so this file fakes
 * a "database" using localStorage so state survives page navigation
 * (login.html -> user.html -> admin.html etc. are separate page loads).
 *
 * WHEN YOU BUILD THE REAL BACKEND:
 *   - Replace every function below with a fetch() call to your FastAPI
 *     endpoints (e.g. POST /auth/login, GET /admin/users, ...).
 *   - Passwords must NEVER be checked or stored client-side in a real
 *     system — this plain-text check is only here so the prototype is
 *     clickable without a server. Do not ship this file as-is.
 *   - Replace the localStorage session with a proper HTTP-only cookie
 *     or JWT-based session so a user can't fake admin access by
 *     editing localStorage in devtools.
 * ------------------------------------------------------------------
 */

const STORAGE_KEY = "nodeai_demo_state_v1";

function seedState() {
  return {
    users: [
      { id: 1, name: "Admin User", username: "admin", password: "admin123", dept: "IT", role: "admin", status: "active" },
      { id: 2, name: "Demo Staff", username: "demo", password: "demo123", dept: "Domestic Revenue", role: "staff", status: "active" },
      { id: 3, name: "Grace Mushi", username: "g.mushi", password: "pass123", dept: "Customs", role: "staff", status: "pending" },
    ],
    nextId: 4,
    currentUserId: null,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Could not read saved state, starting fresh.", e);
  }
  return seedState();
}

let state = loadState();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const Store = {
  // ---------- session ----------
  getCurrentUser() {
    if (!state.currentUserId) return null;
    return state.users.find((u) => u.id === state.currentUserId) || null;
  },

  login(username, password) {
    const user = state.users.find((u) => u.username === username && u.password === password);
    if (!user) return { ok: false, error: "Invalid username or password." };
    if (user.status === "pending") return { ok: false, error: "This account is still pending admin approval." };
    if (user.status === "removed") return { ok: false, error: "This account has been deactivated. Contact an admin." };
    state.currentUserId = user.id;
    persist();
    return { ok: true, user };
  },

  logout() {
    state.currentUserId = null;
    persist();
  },

  // Redirects to login.html if nobody is signed in. Call at the top of
  // every protected page. Returns the current user if allowed through.
  requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = "login.html";
      return null;
    }
    return user;
  },

  // Redirects non-admins away from admin-only pages.
  requireAdmin() {
    const user = this.requireAuth();
    if (!user) return null;
    if (user.role !== "admin") {
      window.location.href = "user.html";
      return null;
    }
    return user;
  },

  // ---------- registration ----------
  register({ name, username, dept, password }) {
    if (state.users.some((u) => u.username === username)) {
      return { ok: false, error: "That username is already taken." };
    }
    const user = { id: state.nextId++, name, username, dept, password, role: "staff", status: "pending" };
    state.users.push(user);
    persist();
    return { ok: true, user };
  },

  // ---------- admin: user management ----------
  getUsers() {
    return state.users;
  },

  pendingCount() {
    return state.users.filter((u) => u.status === "pending").length;
  },

  approveUser(id) {
    state.users = state.users.map((u) => (u.id === id ? { ...u, status: "active" } : u));
    persist();
  },

  rejectUser(id) {
    state.users = state.users.filter((u) => u.id !== id);
    persist();
  },

  removeUser(id) {
    state.users = state.users.map((u) => (u.id === id ? { ...u, status: "removed" } : u));
    persist();
  },

  reinstateUser(id) {
    state.users = state.users.map((u) => (u.id === id ? { ...u, status: "active" } : u));
    persist();
  },

  // ---------- reset helper (handy while testing) ----------
  resetDemoData() {
    state = seedState();
    persist();
  },
};
