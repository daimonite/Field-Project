/**
 * login.js — handles login.html only.
 */
document.addEventListener("DOMContentLoaded", () => {
  // If already signed in, navigate to appropriate page
  const existingUser = Store.getCurrentUser();
  const token = Store.getToken();
  if (existingUser && token) {
    window.location.href = existingUser.role === "admin" ? "admin.html" : "user.html";
    return;
  }

  const form = document.getElementById("login-form");
  const errBox = document.getElementById("login-error");
  const errText = document.getElementById("login-error-text");
  const submitBtn = form.querySelector("button[type='submit']");

  // Toggle Password Visibility
  const toggleBtn = document.getElementById("toggle-password");
  const passwordInput = document.getElementById("login-password");
  const toggleIcon = document.getElementById("toggle-password-icon");
  if (toggleBtn && passwordInput && toggleIcon) {
    toggleBtn.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      toggleIcon.textContent = isPassword ? "visibility_off" : "visibility";
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errBox.hidden = true;

    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    if (!username || !password) {
      errText.textContent = "Please enter both username and password.";
      errBox.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = "SIGNING IN...";

    try {
      const result = await Store.login(username, password);
      if (!result.ok) {
        if (result.status === "pending" || (result.error && result.error.toLowerCase().includes("pending"))) {
          errText.innerHTML = `${result.error} <br/><a href="pending.html?username=${encodeURIComponent(username)}" class="fw-semibold text-decoration-underline text-on-error-container mt-1 d-inline-block">Check Approval Status &amp; Admin Feedback &rarr;</a>`;
        } else {
          errText.textContent = result.error || "Invalid username or password.";
        }
        errBox.hidden = false;
        return;
      }

      if (result.user.role === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "user.html";
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
});

