/**
 * Simulation History Manager for VS Code Extension
 * Manages simulation history and persistence
 */

import * as vscode from "vscode";
import { SimulationConfig, SimulationResult } from "../core/types";

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  config: SimulationConfig;
  result: SimulationResult;
  name?: string;
}

export class SimulationHistoryManager {
  private context: vscode.ExtensionContext;
  private readonly maxEntries: number;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.maxEntries = vscode.workspace
      .getConfiguration("tx-simulator")
      .get("maxHistoryEntries", 100);
  }

  /**
   * Add a simulation result to history
   */
  async addToHistory(
    config: SimulationConfig,
    result: SimulationResult
  ): Promise<void> {
    const entry: HistoryEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      config,
      result,
    };

    const history = await this.getHistory();
    history.unshift(entry);

    // Keep only maxEntries
    if (history.length > this.maxEntries) {
      history.splice(this.maxEntries);
    }

    await this.saveHistory(history);
  }

  /**
   * Get simulation history
   */
  async getHistory(): Promise<HistoryEntry[]> {
    return this.context.globalState.get("tx-simulator.history", []);
  }

  /**
   * Clear simulation history
   */
  async clearHistory(): Promise<void> {
    await this.context.globalState.update("tx-simulator.history", []);
  }

  /**
   * Show history in a quick pick
   */
  async showHistory(): Promise<void> {
    const history = await this.getHistory();

    if (history.length === 0) {
      vscode.window.showInformationMessage("No simulation history found");
      return;
    }

    const items = history.map((entry) => ({
      label: `${entry.config.from} → ${entry.config.to}`,
      description: entry.timestamp.toLocaleString(),
      detail: entry.result.success ? "✅ Success" : "❌ Failed",
      entry,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select a simulation to view details",
    });

    if (selected) {
      this.showHistoryEntry(selected.entry);
    }
  }

  /**
   * Show details of a history entry
   */
  private showHistoryEntry(entry: HistoryEntry): void {
    const panel = vscode.window.createWebviewPanel(
      "tx-simulator-history",
      "Simulation History",
      vscode.ViewColumn.One,
      {}
    );

    panel.webview.html = this.getHistoryHtml(entry);
  }

  /**
   * Generate HTML for history entry
   */
  private getHistoryHtml(entry: HistoryEntry): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Simulation History</title>
        <style>
          body { font-family: system-ui; margin: 20px; }
          .config, .result { margin: 20px 0; }
          .label { font-weight: bold; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>Simulation History</h1>
        <p><strong>Timestamp:</strong> ${entry.timestamp.toLocaleString()}</p>
        
        <div class="config">
          <h2>Configuration</h2>
          <p><strong>From:</strong> ${entry.config.from}</p>
          <p><strong>To:</strong> ${entry.config.to}</p>
          <p><strong>RPC URL:</strong> ${entry.config.rpcUrl}</p>
          ${entry.config.functionSignature ? `<p><strong>Function:</strong> ${entry.config.functionSignature}</p>` : ""}
        </div>
        
        <div class="result">
          <h2>Result</h2>
          <p><strong>Success:</strong> ${entry.result.success ? "✅" : "❌"}</p>
          ${entry.result.gasUsed ? `<p><strong>Gas Used:</strong> ${entry.result.gasUsed}</p>` : ""}
          ${entry.result.error ? `<p><strong>Error:</strong> ${entry.result.error}</p>` : ""}
          ${entry.result.returnData ? `<p><strong>Return Data:</strong> <pre>${entry.result.returnData}</pre></p>` : ""}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Save history to global state
   */
  private async saveHistory(history: HistoryEntry[]): Promise<void> {
    await this.context.globalState.update("tx-simulator.history", history);
  }

  /**
   * Generate unique ID for history entry
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
