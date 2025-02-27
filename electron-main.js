const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs-extra');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle request to begin scraping
ipcMain.on('start-scraping', (event, bookName) => {
  console.log('Starting scraping for book:', bookName);

  // Option B: If you rewrote kindle-scrape.js to use puppeteer-core,
  // pass the path to Electron’s Chromium via environment variable:
  const electronExecPath = process.execPath; // Typically the Electron binary

  // Spawn the newly rewritten kindle-scrape.js with the custom env
  const scrapeProcess = spawn('node', ['kindle-scrape.js', bookName], {
    cwd: __dirname,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ELECTRON_BROWSER_PATH: electronExecPath // pass to the script
    }
  });

  // Send console output from the child process to the renderer
  scrapeProcess.stdout.on('data', (data) => {
    event.sender.send('scrape-log', data.toString());
  });

  scrapeProcess.stderr.on('data', (data) => {
    event.sender.send('scrape-log', `ERROR: ${data.toString()}`);
  });

  scrapeProcess.on('close', (code) => {
    event.sender.send('scrape-log', `Scraping finished with exit code ${code}`);
    // Optionally re-list the PDFs after the script completes
    listPDFs(event);
  });
});

// Handle request to list existing PDFs
ipcMain.on('list-pdfs', (event) => {
  listPDFs(event);
});

async function listPDFs(event) {
  try {
    const pdfDir = path.join(__dirname, 'ebooks');
    await fs.ensureDir(pdfDir); // ensure it exists
    const files = await fs.readdir(pdfDir);
    const pdfFiles = files.filter((file) => file.endsWith('.pdf'));
    event.reply('pdf-list', pdfFiles);
  } catch (error) {
    event.reply('pdf-list', []);
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});