const { app, BrowserWindow } = require('electron');
const path = require('path');

// Permite conexões seguras mesmo através de proxies corporativos/antivírus
app.commandLine.appendSwitch('ignore-certificate-errors');

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Sheila Santos Nails Designer",
    icon: path.join(__dirname, '../public/logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Em produção, carrega o arquivo index.html compilado pelo Vite
  const indexPath = path.join(__dirname, '../dist/index.html');
  win.loadFile(indexPath);
  
  // Ocultar barra de menu padrão para ficar mais limpo
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
