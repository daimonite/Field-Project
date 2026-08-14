/**
 * login.js — handles login.html only.
 */
document.addEventListener("DOMContentLoaded", () => {
  // If already signed in, skip straight past the login screen.
  if (Store.getCurrentUser()) {
    window.location.href = "user.html";
    return;
  }

  const form = document.getElementById("login-form");
  const errBox = document.getElementById("login-error");
  const errText = document.getElementById("login-error-text");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    const result = Store.login(username, password);
    if (!result.ok) {
      errText.textContent = result.error;
      errBox.hidden = false;
      return;
    }

    window.location.href = "user.html";
  });
});
