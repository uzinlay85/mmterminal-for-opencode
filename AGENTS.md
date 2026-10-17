# AGENTS.md

Windows-only desktop terminal app that gives OpenCode AI a Myanmar-Unicode-friendly UI.
Single Node process (`server.js`) serves a static frontend + a WebSocket-backed ConPTY shell.

## Commands

- `npm install` — install deps (includes native `node-pty`, needs build tools on Windows).
- `npm start` — run `node server.js`. Serves on `127.0.0.1:3820` (override with `PORT`). Open `http://localhost:3820`.
- `npm test` — runs the `node:test` unit tests in `test/` (no extra deps).
- `npm run lint` — ESLint flat config (`eslint.config.mjs`); the vendored `public/js/xterm*.js` bundles are ignored.
- `npm run app` → `scripts\launch.bat` (or `Start-Terminal.bat` directly) — the real launcher: starts the server minimized if port 3820 is free, then opens Edge in `--app=` mode.
- `powershell -ExecutionPolicy Bypass -File .\scripts\create_desktop_shortcut.ps1` — creates the Desktop shortcut.

CI (`.github/workflows/ci.yml`) runs `npm ci --ignore-scripts` → `npm run lint` → `npm test` on `windows-latest`. `--ignore-scripts` skips the native `node-pty` build, so tests must not require it.

Verify UI changes manually: `npm start`, then exercise the browser UI (terminal, composer, tabs).

## Layout

- `server.js` — all backend: Express static host for `public/`, WebSocket server at `/terminal`, REST under `/api/*`.
- `public/` — frontend, served as-is. No bundler; scripts load in order via `<script>` tags in `public/index.html`: `xterm.js` → `xterm-addon-fit.js` → `addon-unicode11.js` → `converter.js` → `app.js`.
- `public/js/xterm.js`, `xterm-addon-fit.js`, `addon-unicode11.js` — **vendored** library copies loaded at runtime. `node_modules` versions are not used by the browser; edit the files in `public/js/`.
- `public/js/app.js` — all UI logic (terminal init, tabs, composer, settings, history, Web UI iframe).
- `public/js/converter.js` — UMD module (browser global `MyanmarConverter`). Keep it UMD; do not convert to ESM/import.
- `scripts/` — `launch.bat`, `launch_silent.vbs`, `select_folder.ps1`, `create_desktop_shortcut.ps1`.
- `test/` — `node:test` unit tests (e.g. `converter.test.js`); require the UMD module directly, no browser needed.

## Backend notes

- APIs: `GET /api/status`, `GET|POST /api/keys`, `POST /api/cwd`, `POST /api/browse-folder` (native folder picker), `GET /api/models` (installed CLI model list, 8s timeout), `GET|POST /api/opencode/web/{status,start,stop,pair}`, `POST /api/opencode/run` (streams plain text). WebSocket protocol: JSON messages `init|input|resize|restart|ping` with `output|exit|cwd|pong` replies.
- `GET /api/keys` never returns raw keys — only `{ set: boolean, hint: last4 }` per key. `POST /api/keys` replaces a key when a non-empty string is sent and deletes it when `<KEY>_CLEAR: true` is sent; an omitted/empty field leaves the stored key untouched.
- Windows-only assumptions: `node-pty` ConPTY, `powershell.exe`/`cmd.exe`, `opencode.cmd`, `taskkill /F /T /PID`. Every spawn sets UTF-8 env (`PYTHONIOENCODING`, `LANG`) and the shell runs `chcp 65001` — preserve this when touching terminal spawn code, or Myanmar text breaks.
- Web UI start order: prefer the OpenCode 2.0 background service at `127.0.0.1:45278`, else run `opencode serve` (v2) / `opencode web` (v1) on an auto-picked free port; pairing link comes from `opencode pair`.
- `cleanupStaleLocks()` runs at boot and deletes stale files in `~/.local/state/opencode` (locks dir + dead `service.json`). Be deliberate about changing it.
- `api_keys.json` lives **outside the repo** in `~/.config/myanmar-opencode-terminal/` (override with `MYOPENT_CONFIG_DIR`); it is written by `POST /api/keys` and loaded into `process.env` at startup. A legacy repo-local `api_keys.json` is migrated once, then deleted. Never commit it or hardcode keys.
- Client state uses `localStorage` keys `mm_opencode_settings` and `mm_opencode_history`.

## Conventions

- All Burmese text in code, comments, docs, and UI must be **standard Myanmar Unicode** (Pyidaungsu ordering). Never Zawgyi encoding or Zawgyi private-use code points (U+1060–U+1097). `converter.js` exists to migrate Zawgyi input, not to justify writing it.
- `README.md` and `SETUP_GUIDE.md` are user-facing and written in Burmese — keep them in Unicode and update them when user-visible behavior changes.
- Repo is a plain Express app (CommonJS). Match the existing `require`/`app.get`/`wss.on` style in `server.js`; no TypeScript, no frameworks.
