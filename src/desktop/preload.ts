/**
 * Electron Preload Script
 * Provides secure API bridge between renderer and main process
 */

import { contextBridge, ipcRenderer } from "electron";
import { SimulationConfig, SimulationResult } from "../core/types";

// Define the API interface that will be available to the renderer
interface ElectronAPI {
  // Simulation operations
  runSimulation: (
    config: SimulationConfig
  ) => Promise<{ success: boolean; result?: SimulationResult; error?: string }>;
  onSimulationProgress: (
    callback: (data: { type: string; message: string }) => void
  ) => void;

  // File operations
  saveFileDialog: (defaultPath?: string) => Promise<string | null>;
  selectDirectoryDialog: () => Promise<string | null>;
  openExternal: (url: string) => Promise<void>;

  // Menu events
  onMenuAction: (action: string, callback: (data?: any) => void) => void;

  // Deep linking
  onDeepLink: (callback: (url: string) => void) => void;

  // App info
  getVersion: () => string;
  getPlatform: () => string;
}

// Expose the API to the renderer process
const electronAPI: ElectronAPI = {
  // Simulation operations
  runSimulation: (config: SimulationConfig) =>
    ipcRenderer.invoke("run-simulation", config),

  onSimulationProgress: (callback) => {
    ipcRenderer.on("simulation-progress", (event, data) => callback(data));
  },

  // File operations
  saveFileDialog: (defaultPath) =>
    ipcRenderer.invoke("save-file-dialog", defaultPath),
  selectDirectoryDialog: () => ipcRenderer.invoke("select-directory-dialog"),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),

  // Menu events
  onMenuAction: (action, callback) => {
    ipcRenderer.on(`menu-${action}`, (event, data) => callback(data));
  },

  // Deep linking
  onDeepLink: (callback) => {
    ipcRenderer.on("deep-link", (event, url) => callback(url));
  },

  // App info
  getVersion: () => process.env.npm_package_version || "1.0.0",
  getPlatform: () => process.platform,
};

// Expose the API to the renderer
contextBridge.exposeInMainWorld("electronAPI", electronAPI);

// Remove the loading indicator when ready
window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector: string, text: string) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const dependency of ["chrome", "node", "electron"]) {
    replaceText(`${dependency}-version`, (process.versions as any)[dependency]);
  }
});

// Ensure proper cleanup
window.addEventListener("beforeunload", () => {
  ipcRenderer.removeAllListeners("simulation-progress");
  ipcRenderer.removeAllListeners("menu-new-simulation");
  ipcRenderer.removeAllListeners("menu-open-simulation");
  ipcRenderer.removeAllListeners("menu-save-simulation");
  ipcRenderer.removeAllListeners("menu-run-simulation");
  ipcRenderer.removeAllListeners("menu-stop-simulation");
  ipcRenderer.removeAllListeners("menu-clear-results");
  ipcRenderer.removeAllListeners("deep-link");
});
