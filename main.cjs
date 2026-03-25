const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const serve = require('electron-serve').default || require('electron-serve');

const loadURL = serve({ directory: 'out' });

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (app.isPackaged) {
    loadURL(mainWindow);
  } else {
    // In development mode, load the local Next.js server
    mainWindow.loadURL('http://localhost:3000');
  }
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('export-pdf', async (event, filename) => {
    try {
      const pdfBuffer = await mainWindow.webContents.printToPDF({
        printBackground: true,
        landscape: true,
        pageSize: 'A3',
        margins: {
          marginType: 'custom',
          top: 0.4,
          bottom: 0.4,
          left: 0.4,
          right: 0.4
        }
      });

      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save PDF',
        defaultPath: filename || 'bridge-status.pdf',
        filters: [
          { name: 'PDF Document', extensions: ['pdf'] }
        ]
      });

      if (filePath) {
        fs.writeFileSync(filePath, pdfBuffer);
        return { success: true, path: filePath };
      }
      return { success: false, error: 'Cancelled' };
    } catch (error) {
      console.error('PDF Generation Error:', error);
      return { success: false, error: error.message };
    }
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
