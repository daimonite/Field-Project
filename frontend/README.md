# AI Office Node — Frontend Prototype

Split into separate pages and JS files so each part can be debugged on its own.

## Getting started

Download and install python
```
sudo dnf install python3 python3-pip python3-devel -y
```
Download ollama and pick your model
```
curl -fsSL https://ollama.com/install.sh | sh && ollama run qwen3.5:0.8b
```
Set python environment
```
# 1. Create a virtual environment (named 'venv')
python3 -m venv venv

# 2. Activate the virtual environment
source venv/bin/activate
```

## How each page is protected

- `user.html` and `admin.html` both call `Store.requireAuth()` (via `nav.js` / their own script) on load — if nobody is signed in, they redirect to `login.html`.
- `admin.html` additionally calls `Store.requireAdmin()`, which sends non-admin users back to `user.html`. The Admin link in the sidebar is also only rendered at all for `role === "admin"` (see `nav.js`).

## Running it

Because the pages use `fetch`-free static assets and `localStorage`, you can open `login.html` directly in a browser, but it's more reliable to serve it over local HTTP (some browsers restrict `localStorage` on the `file://` origin):

```bash
cd node-ai-frontend
python3 -m http.server 8080
# then open http://localhost:8080/login.html
```

## Demo logins

| Username | Password | Role  |
|---|---|---|
| `admin` | `admin123` | admin |
| `demo` | `demo123` | staff |
| `g.mushi` | `pass123` | staff, **pending** (use this to test the approval flow) |

## ⚠️ Important: this is a frontend-only demo

`js/store.js` fakes a backend using `localStorage` so state persists across page loads. **This is not secure and not how the real system should work:**

- Passwords are checked in plain text, in the browser. A real system must hash passwords server-side and never send/compare them in JS.
- Anyone could open devtools and edit `localStorage` to grant themselves admin. A real system must verify the session (JWT/cookie) server-side on every request, not trust the client.
- Chat responses in `app.js` are hardcoded placeholders.

### Wiring up the real backend (FastAPI + Ollama)

Replace the functions in `js/store.js` one at a time with real API calls, keeping the same function names so nothing else needs to change:

| Function in `store.js` | Replace with |
|---|---|
| `login()` | `POST /auth/login` → set session cookie/JWT |
| `register()` | `POST /auth/register` |
| `getUsers()`, `approveUser()`, `rejectUser()`, `removeUser()` | `GET/POST /admin/users/...` (require admin session server-side too — don't only rely on the frontend gate) |
| `requireAuth()`, `requireAdmin()` | Check session validity via a `GET /auth/me` call instead of localStorage |

And in `js/app.js`, replace the `setTimeout(...)` mock in `sendMessage()` with a real call to your `/chat` endpoint that forwards the prompt to Ollama.
