const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");

const PORT = 3417;

function standaloneDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "standalone")
    : path.join(__dirname, "..", ".next", "standalone");
}

/** Πρώτη εκκίνηση: αντιγράφει το κενό template.db στο userData, αν δεν υπάρχει ήδη. */
function ensureDatabase() {
  const dbFile = path.join(app.getPath("userData"), "duty-scheduler.db");
  if (!fs.existsSync(dbFile)) {
    fs.mkdirSync(path.dirname(dbFile), { recursive: true });
    fs.copyFileSync(path.join(standaloneDir(), "template.db"), dbFile);
  }
  return dbFile;
}

function waitForServer(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const attempt = () => {
      http
        .get(url, (res) => {
          res.resume();
          resolve();
        })
        .on("error", () => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error("Ο τοπικός server δεν απάντησε εγκαίρως."));
          } else {
            setTimeout(attempt, 300);
          }
        });
    };
    attempt();
  });
}

async function startNextServer() {
  const dir = standaloneDir();
  process.env.PORT = String(PORT);
  process.env.HOSTNAME = "127.0.0.1";
  process.env.NODE_ENV = "production";
  process.env.DATABASE_PATH = ensureDatabase();

  const serverEntry = path.join(dir, "server.js");
  const prevCwd = process.cwd();
  process.chdir(dir);
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(dir, "package.json"), "utf8"),
    );
    if (pkg.type === "module") {
      await import(require("node:url").pathToFileURL(serverEntry).href);
    } else {
      require(serverEntry);
    }
  } finally {
    process.chdir(prevCwd);
  }

  await waitForServer(`http://127.0.0.1:${PORT}`, 20000);
}

let mainWindow;

async function createWindow() {
  await startNextServer();

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createWindow().catch((err) => {
    console.error(err);
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
