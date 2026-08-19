# dressup.exe — macOS Desktop App

Packages the FastAPI backend and the React frontend into a single installable
macOS application. The app ships its own Python runtime, so no system Python,
Node, or Docker installation is required on the target machine.

## How it works

```
dressup.exe.app/Contents/Resources/
├── python/          relocatable CPython 3.11 + backend dependencies
├── backend/         the FastAPI app (desktop_server.py is the entry point)
└── frontend-dist/   the production Vite build
```

On launch the Electron main process (`src/main.js`):

1. asks for the Google AI API key on first start and stores it in
   `~/Library/Application Support/dressup.exe/config.json`,
2. generates a per-installation `AUTH_SECRET_KEY` and stores it next to it,
3. picks a free localhost port and starts `desktop_server.py`, which runs the
   Alembic migrations and then serves API **and** frontend from that one port,
4. waits for `/healthz` and opens the app window at `http://127.0.0.1:<port>`.

Because the backend serves the frontend from the same origin, the HttpOnly auth
cookie and the protected `/uploads` route work without any CORS setup. Asset
URLs are stored relative (`/uploads/…`), so a changing port never invalidates
previously generated images.

User data lives outside the app bundle in
`~/Library/Application Support/dressup.exe/`:

| Path             | Contents                          |
| ---------------- | --------------------------------- |
| `database/`      | `closet.db` (SQLite)              |
| `uploads/`       | face scans, avatars, looks        |
| `config.json`    | API key + auth secret (mode 0600) |
| `backend.log`    | backend stdout/stderr             |

## Build

```bash
cd desktop
npm install
npm run dist
```

This downloads a relocatable CPython (once, cached in `vendor/python`), installs
`requirements-desktop.txt` into it, builds the frontend in `desktop` mode,
renders the icon, and writes `release/dressup.exe-1.0.0-arm64.dmg`.

Individual steps:

| Command                      | Effect                                        |
| ---------------------------- | --------------------------------------------- |
| `npm run vendor:python`      | download + populate `vendor/python`           |
| `npm run build:frontend`     | `vite build --mode desktop` into `frontend/dist` |
| `npm run icon`               | render `build/icon.icns`                      |
| `npm start`                  | run the app unpackaged (dev)                  |
| `npm run dist`               | full `.app` + `.dmg`                          |

## Install

Open the DMG and drag **dressup.exe** into *Applications*. The build is
ad-hoc signed, not notarized — on first launch macOS shows a Gatekeeper
warning. Open it once via right-click → *Open*, then it starts normally.

## Notes

- Background removal (`rembg`) downloads its `u2net` model to `~/.u2net` on
  first use, so the first clothing upload needs an internet connection.
- Without a Google AI key the app still runs; avatar and try-on generation stay
  unavailable until a key is entered via *dressup.exe → Google-API-Key ändern…*.
- The app is built for Apple Silicon (`arm64`). For Intel Macs change the `mac`
  target arch in `package.json` and rebuild on that architecture.
