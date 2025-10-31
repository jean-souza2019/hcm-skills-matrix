const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let backendProcess = null;

const isDev = !app.isPackaged;

function resolveBackendExecutable() {
  if (isDev) {
    return path.resolve(__dirname, '..', '..', 'backend', 'build', 'api.exe');
  }

  return path.join(process.resourcesPath, 'backend', 'api.exe');
}

function startBackend() {
  const backendExecutable = resolveBackendExecutable();

  if (!fs.existsSync(backendExecutable)) {
    console.warn(`[backend] Executável não encontrado: ${backendExecutable}`);
    return;
  }

  if (backendProcess) {
    return;
  }

  backendProcess = spawn(backendExecutable, [], {
    cwd: path.dirname(backendExecutable),
    windowsHide: true,
  });

  backendProcess.stdout?.on('data', (data) => {
    console.log(`[backend] ${data.toString().trimEnd()}`);
  });

  backendProcess.stderr?.on('data', (data) => {
    console.error(`[backend] ${data.toString().trimEnd()}`);
  });

  backendProcess.on('error', (error) => {
    console.error('[backend] Falha ao iniciar o processo do backend', error);
  });

  backendProcess.on('exit', (code, signal) => {
    console.log(`[backend] Processo encerrado (code=${code ?? 0}, signal=${signal ?? 'null'})`);
    backendProcess = null;
  });
}

function stopBackend() {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
  backendProcess = null;
}

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'app-icon.ico');

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    icon: iconPath,
    webPreferences: {
      sandbox: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (!app.isPackaged && devServerUrl) {
    win.loadURL(devServerUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexHtml = path.join(__dirname, '..', 'dist', 'index.html');
    win.loadFile(indexHtml);
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackend();
});

app.on('will-quit', () => {
  stopBackend();
});
