/**
 * store.js
 * ------------------------------------------------------------------
 * Connected API client for AI Office Node.
 * Manages JWT tokens, authenticated sessions, user profiles, and
 * administrative workflows against the FastAPI backend.
 * ------------------------------------------------------------------
 */

const TOKEN_KEY = "nodeai_jwt_token_v1";
const USER_KEY = "nodeai_user_data_v1";

const Store = {
  // ---------- session ----------
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || null;
  },

  getCurrentUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  setSession(token, user) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = "login.html";
  },

  getAuthHeaders() {
    const headers = { "Content-Type": "application/json" };
    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  },

  // Gatekeeping for protected pages
  requireAuth() {
    const user = this.getCurrentUser();
    const token = this.getToken();
    if (!user || !token) {
      window.location.href = "login.html";
      return null;
    }
    return user;
  },

  requireAdmin() {
    const user = this.requireAuth();
    if (!user) return null;
    if (user.role !== "admin") {
      window.location.href = "user.html";
      return null;
    }
    return user;
  },

  // ---------- authentication ----------
  async login(username, password) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data.detail || "Sign in failed. Please check your credentials.",
          status: data.status || "error",
        };
      }

      this.setSession(data.token, data.user);
      return { ok: true, user: data.user, token: data.token };
    } catch (err) {
      return { ok: false, error: "Network error connecting to node server." };
    }
  },

  async register({ name, username, dept, password }) {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, dept, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.detail || "Registration failed." };
      }

      return { ok: true, message: data.message, user: data.user };
    } catch (err) {
      return { ok: false, error: "Network error connecting to node server." };
    }
  },

  async checkStatus(username) {
    try {
      const res = await fetch(`/api/auth/status?username=${encodeURIComponent(username)}`);
      return await res.json();
    } catch (err) {
      return { ok: false, message: "Network error checking status." };
    }
  },

  async getMyProfile() {
    try {
      const res = await fetch("/api/auth/me", {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          this.logout();
        }
        return null;
      }
      const data = await res.json();
      if (data.ok && data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return data.user;
      }
      return null;
    } catch (e) {
      return this.getCurrentUser();
    }
  },

  // ---------- admin: user management ----------
  async getUsers() {
    try {
      const res = await fetch("/api/admin/users", {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error("Failed to load users list.");
      }
      return await res.json();
    } catch (err) {
      console.error(err);
      return { ok: false, users: [], pending_count: 0 };
    }
  },

  async approveUser(id, feedback = "") {
    try {
      const res = await fetch(`/api/admin/users/${id}/approve`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ feedback: feedback || "Approved by Administrator." }),
      });
      return await res.json();
    } catch (err) {
      return { ok: false, error: "Failed to approve user." };
    }
  },

  async rejectUser(id, feedback = "") {
    try {
      const res = await fetch(`/api/admin/users/${id}/reject`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ feedback: feedback || "Registration request not approved." }),
      });
      return await res.json();
    } catch (err) {
      return { ok: false, error: "Failed to reject user." };
    }
  },

  async removeUser(id) {
    try {
      const res = await fetch(`/api/admin/users/${id}/remove`, {
        method: "POST",
        headers: this.getAuthHeaders(),
      });
      return await res.json();
    } catch (err) {
      return { ok: false, error: "Failed to deactivate user." };
    }
  },

  async reinstateUser(id) {
    try {
      const res = await fetch(`/api/admin/users/${id}/reinstate`, {
        method: "POST",
        headers: this.getAuthHeaders(),
      });
      return await res.json();
    } catch (err) {
      return { ok: false, error: "Failed to reinstate user." };
    }
  },

  // ---------- stats & resources ----------
  async getStats() {
    try {
      const res = await fetch("/api/dashboard/stats");
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async getFiles() {
    try {
      const res = await fetch("/api/files");
      return await res.json();
    } catch (e) {
      return { ok: false, files: [] };
    }
  },

  async getPrinters() {
    try {
      const res = await fetch("/api/printers");
      return await res.json();
    } catch (e) {
      return { ok: false, printers: [] };
    }
  },

  // ---------- AI & Automations ----------
  async sendChatMessage(prompt, conversationId = null) {
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ prompt, conversation_id: conversationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Chat request failed.");
      return data;
    } catch (err) {
      throw err;
    }
  },

  async convertFile(fileId, targetFormat = "pdf") {
    try {
      const res = await fetch("/api/automation/convert", {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ file_id: fileId, target_format: targetFormat }),
      });
      return await res.json();
    } catch (err) {
      return { ok: false, error: "Failed to convert file." };
    }
  },

  async printFile(fileId, printerId = null) {
    try {
      const res = await fetch("/api/automation/print", {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ file_id: fileId, printer_id: printerId }),
      });
      return await res.json();
    } catch (err) {
      return { ok: false, error: "Failed to dispatch print job." };
    }
  },

  async getDocuments() {
    try {
      const res = await fetch("/api/documents", {
        headers: this.getAuthHeaders(),
      });
      return await res.json();
    } catch (err) {
      return { ok: false, documents: [] };
    }
  },

  async getPrintJobs() {
    try {
      const res = await fetch("/api/print-jobs", {
        headers: this.getAuthHeaders(),
      });
      return await res.json();
    } catch (err) {
      return { ok: false, print_jobs: [] };
    }
  },
};


