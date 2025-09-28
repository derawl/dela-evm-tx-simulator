/**
 * Webview Provider for VS Code Extension
 * Provides the main simulator interface as a webview
 */

import * as vscode from "vscode";

export class TxSimulatorWebviewProvider {
  public static readonly viewType = "tx-simulator-explorer";

  constructor(private readonly extensionUri: string) {}

  public createWebviewPanel(): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
      TxSimulatorWebviewProvider.viewType,
      "TX Simulator",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(this.extensionUri)],
      }
    );

    panel.webview.html = this._getHtmlForWebview();

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "newSimulation":
            vscode.commands.executeCommand("tx-simulator.simulateTransaction");
            break;
          case "viewHistory":
            vscode.commands.executeCommand("tx-simulator.viewHistory");
            break;
          case "quickSimulate":
            this.handleQuickSimulate(message.from, message.to);
            break;
        }
      },
      undefined,
      []
    );

    return panel;
  }

  private handleQuickSimulate(from: string, to: string): void {
    // Trigger quick simulate command with the provided addresses
    vscode.commands.executeCommand("tx-simulator.quickSimulate");
  }

  private _getHtmlForWebview(): string {
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TX Simulator</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 16px;
          }
          .button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 2px;
            cursor: pointer;
            margin: 4px;
          }
          .button:hover {
            background: var(--vscode-button-hoverBackground);
          }
          .input {
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px;
            border-radius: 2px;
            width: 100%;
            margin: 4px 0;
          }
        </style>
      </head>
      <body>
        <h2>TX Simulator</h2>
        <p>Simulate EVM transactions right from VS Code</p>
        
        <div>
          <button class="button" onclick="newSimulation()">New Simulation</button>
          <button class="button" onclick="viewHistory()">View History</button>
        </div>
        
        <div>
          <h3>Quick Start</h3>
          <input class="input" placeholder="From Address" id="fromAddr">
          <input class="input" placeholder="To Address" id="toAddr">
          <button class="button" onclick="quickSimulate()">Quick Simulate</button>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          function newSimulation() {
            vscode.postMessage({ command: 'newSimulation' });
          }
          
          function viewHistory() {
            vscode.postMessage({ command: 'viewHistory' });
          }
          
          function quickSimulate() {
            const from = document.getElementById('fromAddr').value;
            const to = document.getElementById('toAddr').value;
            
            if (!from || !to) {
              alert('Please enter both from and to addresses');
              return;
            }
            
            vscode.postMessage({ 
              command: 'quickSimulate',
              from: from,
              to: to
            });
          }
        </script>
      </body>
      </html>`;
  }
}
