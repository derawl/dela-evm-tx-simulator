/**
 * Electron Main Process
 * Manages the desktop application lifecycle and creates the main window
 */

import { app, BrowserWindow, Menu, ipcMain, dialog } from "electron";
import * as path from "path";
import { createSimulator, SimulationConfig } from "../core";

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

/**
 * Create the main application window
 */
function createWindow(): void {
  // Create the browser window
  mainWindow = new BrowserWindow({
    height: 900,
    width: 1400,
    minHeight: 600,
    minWidth: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "../../assets/icon.png"), // Add app icon
    title: "TX Simulator",
    show: false, // Don't show until ready
  });

  // Load the app's HTML
  if (process.env.NODE_ENV === "development") {
    // In development, load from local server
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from file
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once("ready-to-show", () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Set up the menu
  createMenu();
}

/**
 * Create the application menu
 */
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          label: "New Simulation",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow?.webContents.send("menu-new-simulation");
          },
        },
        {
          label: "Open Simulation",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            if (mainWindow) {
              const result = await dialog.showOpenDialog(mainWindow, {
                properties: ["openFile"],
                filters: [
                  { name: "JSON Files", extensions: ["json"] },
                  { name: "All Files", extensions: ["*"] },
                ],
              });

              if (!result.canceled && result.filePaths.length > 0) {
                mainWindow.webContents.send(
                  "menu-open-simulation",
                  result.filePaths[0]
                );
              }
            }
          },
        },
        {
          label: "Save Simulation",
          accelerator: "CmdOrCtrl+S",
          click: () => {
            mainWindow?.webContents.send("menu-save-simulation");
          },
        },
        { type: "separator" },
        {
          role: "quit",
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Simulation",
      submenu: [
        {
          label: "Run Simulation",
          accelerator: "F5",
          click: () => {
            mainWindow?.webContents.send("menu-run-simulation");
          },
        },
        {
          label: "Stop Simulation",
          accelerator: "Shift+F5",
          click: () => {
            mainWindow?.webContents.send("menu-stop-simulation");
          },
        },
        { type: "separator" },
        {
          label: "Clear Results",
          click: () => {
            mainWindow?.webContents.send("menu-clear-results");
          },
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Documentation",
          click: () => {
            require("electron").shell.openExternal(
              "https://github.com/your-org/tx-simulator"
            );
          },
        },
        {
          label: "Report Issue",
          click: () => {
            require("electron").shell.openExternal(
              "https://github.com/your-org/tx-simulator/issues"
            );
          },
        },
        { type: "separator" },
        {
          label: "About",
          click: () => {
            if (mainWindow) {
              dialog.showMessageBox(mainWindow, {
                type: "info",
                title: "About TX Simulator",
                message: "TX Simulator v1.0.0",
                detail:
                  "A powerful EVM transaction simulator built with Electron and Foundry.",
              });
            }
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Set up IPC handlers for communication with renderer process
 */
function setupIpcHandlers(): void {
  // Handle simulation requests from renderer
  ipcMain.handle(
    "run-simulation",
    async (event: Electron.IpcMainInvokeEvent, config: SimulationConfig) => {
      try {
        const simulator = createSimulator(config);

        // Send progress updates to renderer
        simulator.on("log", (message: string) => {
          mainWindow?.webContents.send("simulation-progress", {
            type: "log",
            message,
          });
        });

        simulator.on("error", (error: string) => {
          mainWindow?.webContents.send("simulation-progress", {
            type: "error",
            message: error,
          });
        });

        // Run the simulation
        const result = await simulator.runSimulation();

        return { success: true, result };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
      }
    }
  );

  // Handle file operations
  ipcMain.handle(
    "save-file-dialog",
    async (event: Electron.IpcMainInvokeEvent, defaultPath?: string) => {
      if (!mainWindow) return null;

      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath,
        filters: [
          { name: "JSON Files", extensions: ["json"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      return result.canceled ? null : result.filePath;
    }
  );

  // Handle directory selection
  ipcMain.handle(
    "select-directory-dialog",
    async (event: Electron.IpcMainInvokeEvent) => {
      if (!mainWindow) return null;

      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory"],
      });

      return result.canceled ? null : result.filePaths[0];
    }
  );

  // Handle external links
  ipcMain.handle(
    "open-external",
    async (event: Electron.IpcMainInvokeEvent, url: string) => {
      require("electron").shell.openExternal(url);
    }
  );
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers();

  app.on("activate", () => {
    // On macOS, re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // On macOS, keep the app running even when all windows are closed
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  // Clean up any running simulations before quitting
  // This would involve stopping any anvil processes
});

// Handle deep linking for protocol handlers (e.g., tx-simulator://)
app.setAsDefaultProtocolClient("tx-simulator");

app.on("open-url", (event: Electron.Event, url: string) => {
  event.preventDefault();
  // Parse the URL and handle it (e.g., open specific simulation)
  console.log("Deep link:", url);

  if (mainWindow) {
    mainWindow.webContents.send("deep-link", url);
  }
});

// Security: Prevent new window creation
app.on(
  "web-contents-created",
  (event: Electron.Event, contents: Electron.WebContents) => {
    contents.setWindowOpenHandler(({ url }) => {
      require("electron").shell.openExternal(url);
      return { action: "deny" };
    });
  }
);

// Handle certificate errors
app.on(
  "certificate-error",
  (
    event: Electron.Event,
    webContents: Electron.WebContents,
    url: string,
    error: string,
    certificate: Electron.Certificate,
    callback: (isTrusted: boolean) => void
  ) => {
    // In development, ignore certificate errors for local servers
    if (process.env.NODE_ENV === "development") {
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  }
);
