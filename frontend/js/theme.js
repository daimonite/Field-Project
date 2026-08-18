/**
 * theme.js — light/dark theme handling for Bootstrap 5.3.
 * Applies the saved (or system) theme before the page paints and
 * provides toggleTheme() used by the header/auth-page toggle buttons.
 */
(function () {
  var KEY = "nodeai_theme";
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  var theme = stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light";
  document.documentElement.setAttribute("data-bs-theme", theme);
})();

function currentTheme() {
  return document.documentElement.getAttribute("data-bs-theme") === "dark" ? "dark" : "light";
}

function toggleTheme() {
  var next = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-bs-theme", next);
  try { localStorage.setItem("nodeai_theme", next); } catch (e) { /* ignore */ }
  updateThemeIcon();
  return next;
}

function updateThemeIcon() {
  var dark = currentTheme() === "dark";
  document.querySelectorAll("[data-theme-icon]").forEach(function (el) {
    el.textContent = dark ? "light_mode" : "dark_mode";
  });
}

document.addEventListener("DOMContentLoaded", updateThemeIcon);
