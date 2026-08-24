const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const isPackaged = app.isPackaged;
const projectRoot = path.resolve(__dirname, "..", "..");

const paths = isPackaged
  ? {
      python: path.join(process.resourcesPath, "python", "bin", "python3"),
      backend: path.join(process.resourcesPath, "backend"),
      frontendDist: path.join(process.resourcesPath, "frontend-dist"),
    }
  : {
      python: path.join(__dirname, "..", "vendor", "python", "bin", "python3"),
      backend: path.join(projectRoot, "backend"),
      frontendDist: path.join(projectRoot, "frontend", "dist"),
    };

const userDataDir = app.getPath("userData");
const configFile = path.join(userDataDir, "config.json");
const uploadsDir = path.join(userDataDir, "uploads");
const databaseDir = path.join(userDataDir, "database");
const logFile = path.join(userDataDir, "backend.log");

let backendProcess = null;
let mainWindow = null;
let backendPort = null;
let isQuitting = false;

/* ------------------------------------------------------------------ config */

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configFile, "utf8"));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2), { mode: 0o600 });
}

function ensureAuthSecret() {
  const config = readConfig();
  if (!config.authSecret || config.authSecret.length < 32) {
    config.authSecret = crypto.randomBytes(48).toString("hex");
    writeConfig(config);
  }
  return config.authSecret;
}

/* ------------------------------------------------------- api key onboarding */

function createSetupWindow(currentKey = "") {
  return new Promise((resolve) => {
    const setupWindow = new BrowserWindow({
      width: 560,
      height: 460,
      resizable: false,
      title: "dressup.exe – Setup",
      backgroundColor: "#f4f1ea",
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      ipcMain.removeHandler("setup:submit");
      ipcMain.removeHandler("setup:current-key");
      if (!setupWindow.isDestroyed()) setupWindow.destroy();
      resolve(value);
    };

    ipcMain.handle("setup:current-key", () => currentKey);
    ipcMain.handle("setup:submit", (_event, apiKey) => {
      const config = readConfig();
      config.googleApiKey = (apiKey || "").trim();
      config.setupCompleted = true;
      writeConfig(config);
      finish(config.googleApiKey);
      return true;
    });

    setupWindow.on("closed", () => finish(null));
    setupWindow.loadFile(path.join(__dirname, "setup.html"));
  });
}

async function ensureApiKey({ force = false } = {}) {
  const config = readConfig();
  if (!force && config.setupCompleted) return config.googleApiKey || "";
  return createSetupWindow(config.googleApiKey || "");
}

/* ----------------------------------------------------------------- backend */

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function waitForBackend(port, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (backendProcess === null || backendProcess.exitCode !== null) {
        reject(new Error("Das Backend wurde unerwartet beendet."));
        return;
      }
      if (Date.now() > deadline) {
        reject(new Error("Zeitüberschreitung beim Starten des Backends."));
        return;
      }

      const request = http.get(
        { host: "127.0.0.1", port, path: "/healthz", timeout: 2000 },
        (response) => {
          response.resume();
          if (response.statusCode === 200) resolve();
          else setTimeout(attempt, 400);
        },
      );
      request.on("timeout", () => request.destroy());
      request.on("error", () => setTimeout(attempt, 400));
    };

    attempt();
  });
}

async function startBackend(googleApiKey) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(databaseDir, { recursive: true });

  backendPort = await findFreePort();
  const logStream = fs.createWriteStream(logFile, { flags: "a" });
  logStream.write(`\n=== ${new Date().toISOString()} starting on port ${backendPort} ===\n`);

  backendProcess = spawn(paths.python, [path.join(paths.backend, "desktop_server.py")], {
    cwd: paths.backend,
    env: {
      ...process.env,
      PYTHONHOME: undefined,
      PYTHONPATH: paths.backend,
      PYTHONDONTWRITEBYTECODE: "1",
      PYTHONUNBUFFERED: "1",
      DRESSUP_PORT: String(backendPort),
      DATABASE_URL: `sqlite:///${path.join(databaseDir, "closet.db")}`,
      UPLOAD_DIR: uploadsDir,
      FRONTEND_DIST: paths.frontendDist,
      GOOGLE_API_KEY: googleApiKey,
      AUTH_SECRET_KEY: ensureAuthSecret(),
      AUTH_TOKEN_ISSUER: "dressup-exe-api",
      AUTH_TOKEN_AUDIENCE: "dressup-exe-client",
      AUTH_COOKIE_SECURE: "false",
      AUTH_COOKIE_SAMESITE: "lax",
      APP_BASE_URL: `http://127.0.0.1:${backendPort}`,
      // Leer = relative /uploads-URLs, damit gespeicherte Bilder unabhängig
      // vom wechselnden Port bleiben.
      PUBLIC_ASSET_BASE_URL: "",
      CORS_ALLOWED_ORIGINS: `http://127.0.0.1:${backendPort}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  backendProcess.stdout.pipe(logStream);
  backendProcess.stderr.pipe(logStream);
  backendProcess.on("exit", (code, signal) => {
    logStream.write(`=== backend exited code=${code} signal=${signal} ===\n`);
    backendProcess = null;
    if (!isQuitting && mainWindow) {
      dialog.showErrorBox(
        "Backend beendet",
        `Der dressup.exe-Dienst wurde unerwartet beendet (Code ${code}).\n\nDetails: ${logFile}`,
      );
    }
  });

  await waitForBackend(backendPort);
  return backendPort;
}

function stopBackend() {
  if (!backendProcess) return;
  const child = backendProcess;
  backendProcess = null;
  child.kill("SIGTERM");
  setTimeout(() => {
    if (child.exitCode === null) child.kill("SIGKILL");
  }, 3000);
}

function tailLog(lines = 25) {
  try {
    return fs.readFileSync(logFile, "utf8").trim().split("\n").slice(-lines).join("\n");
  } catch {
    return "(kein Log vorhanden)";
  }
}

/* ------------------------------------------------------------------ window */

function createMainWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 960,
    minHeight: 700,
    title: "dressup.exe",
    backgroundColor: "#f4f1ea",
    titleBarStyle: "hiddenInset",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}/`);
}

function buildMenu() {
  const template = [
    {
      label: "dressup.exe",
      submenu: [
        { role: "about", label: "Über dressup.exe" },
        { type: "separator" },
        {
          label: "Google-API-Key ändern…",
          click: async () => {
            const key = await ensureApiKey({ force: true });
            if (key) {
              dialog.showMessageBoxSync({
                type: "info",
                message: "API-Key gespeichert",
                detail: "Die App startet den Dienst jetzt neu.",
                buttons: ["OK"],
              });
              app.relaunch();
              app.quit();
            }
          },
        },
        {
          label: "Datenordner öffnen",
          click: () => shell.openPath(userDataDir),
        },
        {
          label: "Backend-Log öffnen",
          click: () => shell.openPath(logFile),
        },
        { type: "separator" },
        { role: "hide", label: "dressup.exe ausblenden" },
        { role: "hideOthers", label: "Andere ausblenden" },
        { type: "separator" },
        { role: "quit", label: "dressup.exe beenden" },
      ],
    },
    {
      label: "Bearbeiten",
      submenu: [
        { role: "undo", label: "Widerrufen" },
        { role: "redo", label: "Wiederholen" },
        { type: "separator" },
        { role: "cut", label: "Ausschneiden" },
        { role: "copy", label: "Kopieren" },
        { role: "paste", label: "Einsetzen" },
        { role: "selectAll", label: "Alles auswählen" },
      ],
    },
    {
      label: "Ansicht",
      submenu: [
        { role: "reload", label: "Neu laden" },
        { role: "toggleDevTools", label: "Entwicklerwerkzeuge" },
        { type: "separator" },
        { role: "resetZoom", label: "Originalgröße" },
        { role: "zoomIn", label: "Größer" },
        { role: "zoomOut", label: "Kleiner" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Vollbild" },
      ],
    },
    {
      role: "window",
      label: "Fenster",
      submenu: [
        { role: "minimize", label: "Im Dock ablegen" },
        { role: "zoom", label: "Zoomen" },
        { role: "close", label: "Schließen" },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* --------------------------------------------------------------- lifecycle */

async function bootstrap() {
  if (!fs.existsSync(paths.python)) {
    dialog.showErrorBox(
      "Laufzeitumgebung fehlt",
      `Python wurde nicht gefunden:\n${paths.python}\n\nIm Entwicklungsmodus zuerst "npm run vendor:python" ausführen.`,
    );
    app.quit();
    return;
  }

  const apiKey = await ensureApiKey();
  if (apiKey === null) {
    app.quit();
    return;
  }

  try {
    const port = await startBackend(apiKey);
    buildMenu();
    createMainWindow(port);
  } catch (error) {
    stopBackend();
    dialog.showErrorBox(
      "Start fehlgeschlagen",
      `${error.message}\n\nLetzte Log-Zeilen:\n${tailLog()}\n\nVollständiges Log: ${logFile}`,
    );
    app.quit();
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(bootstrap);

  app.on("activate", () => {
    if (mainWindow === null && backendPort !== null) createMainWindow(backendPort);
  });

  app.on("window-all-closed", () => {
    app.quit();
  });

  app.on("before-quit", () => {
    isQuitting = true;
    stopBackend();
  });
}
