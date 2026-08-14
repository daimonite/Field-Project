/**
 * register.js — handles register.html only.
 */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("reg-name").value.trim();
    const username = document.getElementById("reg-username").value.trim();
    const dept = document.getElementById("reg-dept").value.trim();
    const password = document.getElementById("reg-password").value;

    const result = Store.register({ name, username, dept, password });
    if (!result.ok) {
      alert(result.error);
      return;
    }

    window.location.href = "pending.html";
  });
});
