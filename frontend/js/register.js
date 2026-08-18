/**
 * register.js — handles register.html only.
 */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  const errBox = document.getElementById("reg-error");
  const submitBtn = form.querySelector("button[type='submit']");

  // Toggle Password Visibility
  const toggleBtn = document.getElementById("toggle-reg-password");
  const passwordInput = document.getElementById("reg-password");
  const toggleIcon = document.getElementById("toggle-reg-password-icon");
  if (toggleBtn && passwordInput && toggleIcon) {
    toggleBtn.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      toggleIcon.textContent = isPassword ? "visibility_off" : "visibility";
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errBox) errBox.hidden = true;

    const name = document.getElementById("reg-name").value.trim();
    const username = document.getElementById("reg-username").value.trim();
    const dept = document.getElementById("reg-dept").value.trim();
    const password = document.getElementById("reg-password").value;

    if (!name || !username || !dept || !password) {
      if (errText) errText.textContent = "All fields are required.";
      if (errBox) errBox.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = "SUBMITTING REQUEST...";

    try {
      const result = await Store.register({ name, username, dept, password });
      if (!result.ok) {
        if (errText) errText.textContent = result.error || "Registration failed.";
        if (errBox) errBox.hidden = false;
        return;
      }

      window.location.href = `pending.html?username=${encodeURIComponent(username)}`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
});

