/**
 * VS Code Extension Entry Point
 * Registers commands and provides transaction simulation functionality within VS Code
 */

import * as vscode from "vscode";
import { createSimulator, SimulationConfig, NETWORKS } from "../core";
import { TxSimulatorWebviewProvider } from "./webview-provider";
import { ContractDetector } from "./contract-detector";
import { SimulationHistoryManager } from "./history-manager";

let outputChannel: vscode.OutputChannel;
let webviewProvider: TxSimulatorWebviewProvider;
let contractDetector: ContractDetector;
let historyManager: SimulationHistoryManager;

/**
 * Extension activation function
 * Called when the extension is first activated
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("TX Simulator extension is now active!");

  // Initialize components
  outputChannel = vscode.window.createOutputChannel("TX Simulator");
  webviewProvider = new TxSimulatorWebviewProvider(context.extensionPath);
  contractDetector = new ContractDetector();
  historyManager = new SimulationHistoryManager(context);

  // Register webview provider (simplified - remove if not supported in current API)
  // context.subscriptions.push(
  //   vscode.window.registerWebviewViewProvider(
  //     "tx-simulator-explorer",
  //     webviewProvider
  //   )
  // );

  // Register commands
  registerCommands(context);

  // Set up file watchers for contract detection
  setupFileWatchers(context);

  // Show welcome message for first-time users
  showWelcomeMessage(context);
}

/**
 * Register all extension commands
 */
function registerCommands(context: vscode.ExtensionContext) {
  // Open TX Simulator webview
  const openSimulatorCommand = vscode.commands.registerCommand(
    "tx-simulator.openSimulator",
    () => {
      // Use the webview provider to create a panel
      const panel = webviewProvider.createWebviewPanel();
      panel.reveal();
    }
  );

  // Simulate transaction from current selection/file
  const simulateTransactionCommand = vscode.commands.registerCommand(
    "tx-simulator.simulateTransaction",
    async () => {
      await handleSimulateTransaction();
    }
  );

  // Quick simulate with minimal input
  const quickSimulateCommand = vscode.commands.registerCommand(
    "tx-simulator.quickSimulate",
    async () => {
      await handleQuickSimulate();
    }
  );

  // Import contract from project
  const importFromProjectCommand = vscode.commands.registerCommand(
    "tx-simulator.importFromProject",
    async (uri: vscode.Uri) => {
      await handleImportFromProject(uri);
    }
  );

  // View simulation history
  const viewHistoryCommand = vscode.commands.registerCommand(
    "tx-simulator.viewHistory",
    async () => {
      await historyManager.showHistory();
    }
  );

  // Add commands to subscriptions for cleanup
  context.subscriptions.push(
    openSimulatorCommand,
    simulateTransactionCommand,
    quickSimulateCommand,
    importFromProjectCommand,
    viewHistoryCommand
  );
}

/**
 * Handle simulate transaction command
 * Prompts user for simulation parameters and runs the simulation
 */
async function handleSimulateTransaction() {
  try {
    // Get current editor selection or entire file
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor found");
      return;
    }

    // Detect if current file is a contract
    const contractInfo = await contractDetector.detectContract(
      editor.document.uri
    );

    // Show input form
    const config = await showSimulationInputForm(contractInfo);
    if (!config) {
      return; // User cancelled
    }

    // Run simulation
    await runSimulation(config);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Simulation failed: ${errorMessage}`);
    outputChannel.appendLine(`Error: ${errorMessage}`);
  }
}

/**
 * Handle quick simulate command
 * Uses sensible defaults for quick testing
 */
async function handleQuickSimulate() {
  const config = vscode.workspace.getConfiguration("tx-simulator");

  // Get basic parameters from user
  const from = await vscode.window.showInputBox({
    prompt: "From address (will be impersonated)",
    placeHolder: "0x...",
    validateInput: (value: string) => {
      if (!/^0x[a-fA-F0-9]{40}$/.exec(value)) {
        return "Please enter a valid Ethereum address";
      }
      return null;
    },
  });

  if (!from) return;

  const to = await vscode.window.showInputBox({
    prompt: "To address",
    placeHolder: "0x...",
    validateInput: (value: string) => {
      if (!/^0x[a-fA-F0-9]{40}$/.exec(value)) {
        return "Please enter a valid Ethereum address";
      }
      return null;
    },
  });

  if (!to) return;

  // Use defaults for other parameters
  const simulationConfig: SimulationConfig = {
    rpcUrl: config.get("defaultRpcUrl", "https://rpc.ankr.com/eth"),
    from,
    to,
    anvilPort: config.get("defaultAnvilPort", 8545),
    traceEnabled: config.get("enableTracing", false),
  };

  await runSimulation(simulationConfig);
}

/**
 * Handle import from project command
 * Imports contract ABI and metadata from Solidity files
 */
async function handleImportFromProject(uri: vscode.Uri) {
  try {
    const contractInfo = await contractDetector.extractContractInfo(uri);
    if (!contractInfo) {
      vscode.window.showWarningMessage(
        "Could not extract contract information from this file"
      );
      return;
    }

    // Show success message and option to simulate
    const action = await vscode.window.showInformationMessage(
      `Imported contract: ${contractInfo.name}`,
      "Simulate Transaction",
      "View Details"
    );

    if (action === "Simulate Transaction") {
      // Pre-fill simulation form with contract info
      const config = await showSimulationInputForm(contractInfo);
      if (config) {
        await runSimulation(config);
      }
    } else if (action === "View Details") {
      // Show contract details in output channel
      outputChannel.show();
      outputChannel.appendLine(`Contract: ${contractInfo.name}`);
      outputChannel.appendLine(
        `Address: ${contractInfo.address || "Not deployed"}`
      );
      outputChannel.appendLine(
        `ABI: ${JSON.stringify(contractInfo.abi, null, 2)}`
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(
      `Failed to import contract: ${errorMessage}`
    );
  }
}

/**
 * Show simulation input form to user
 */
async function showSimulationInputForm(
  contractInfo?: any
): Promise<SimulationConfig | null> {
  // Network selection
  const networkOptions = Object.entries(NETWORKS).map(([key, network]) => ({
    label: network.name,
    description: key,
    detail: network.rpcUrl,
  }));

  const selectedNetwork = await vscode.window.showQuickPick(networkOptions, {
    placeHolder: "Select a network",
  });

  if (!selectedNetwork) return null;

  const network = NETWORKS[selectedNetwork.description as string];

  // Basic transaction parameters
  const from = await vscode.window.showInputBox({
    prompt: "From address (will be impersonated)",
    placeHolder: "0x...",
  });

  if (!from) return null;

  const to = await vscode.window.showInputBox({
    prompt: "To address",
    placeHolder: contractInfo?.address || "0x...",
    value: contractInfo?.address || "",
  });

  if (!to) return null;

  // Build configuration
  const config: SimulationConfig = {
    rpcUrl: network.rpcUrl,
    from,
    to,
    anvilPort: vscode.workspace
      .getConfiguration("tx-simulator")
      .get("defaultAnvilPort", 8545),
    traceEnabled: vscode.workspace
      .getConfiguration("tx-simulator")
      .get("enableTracing", false),
  };

  // If we have contract info, ask for function to call
  if (contractInfo?.abi) {
    const functions = contractInfo.abi
      .filter((item: any) => item.type === "function")
      .map((func: any) => ({
        label: func.name,
        description: func.stateMutability || "nonpayable",
        detail: `${func.name}(${func.inputs.map((input: any) => input.type).join(", ")})`,
      }));

    if (functions.length > 0) {
      const selectedFunction = await vscode.window.showQuickPick(functions, {
        placeHolder: "Select a function to call (optional)",
      });

      if (selectedFunction) {
        config.functionSignature =
          (selectedFunction as any).detail || (selectedFunction as any).label;
        // Would need to collect function parameters here
      }
    }
  }

  return config;
}

/**
 * Run the simulation and display results
 */
async function runSimulation(config: SimulationConfig) {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Running TX Simulation",
      cancellable: false,
    },
    async (
      progress: vscode.Progress<{ message?: string; increment?: number }>
    ) => {
      progress.report({ increment: 0, message: "Starting simulation..." });

      try {
        const simulator = createSimulator(config);

        // Listen for progress updates
        simulator.on("log", (message: string) => {
          progress.report({ message });
          outputChannel.appendLine(message);
        });

        simulator.on("error", (error: string) => {
          outputChannel.appendLine(`Error: ${error}`);
        });

        progress.report({ increment: 50, message: "Running simulation..." });

        const result = await simulator.runSimulation();

        progress.report({ increment: 100, message: "Simulation completed" });

        // Save to history
        await historyManager.addToHistory(config, result);

        // Show results
        if (result.success) {
          vscode.window
            .showInformationMessage(
              "Simulation completed successfully!",
              "View Results"
            )
            .then((action: string | undefined) => {
              if (action === "View Results") {
                showSimulationResults(config, result);
              }
            });
        } else {
          vscode.window.showErrorMessage(`Simulation failed: ${result.error}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Simulation failed: ${errorMessage}`);
        outputChannel.appendLine(`Error: ${errorMessage}`);
      }
    }
  );
}

/**
 * Show simulation results in output channel or webview
 */
function showSimulationResults(config: SimulationConfig, result: any) {
  outputChannel.show();
  outputChannel.appendLine("\n--- Simulation Results ---");
  outputChannel.appendLine(`From: ${config.from}`);
  outputChannel.appendLine(`To: ${config.to}`);
  outputChannel.appendLine(`Success: ${result.success ? "✅" : "❌"}`);

  if (result.gasUsed) {
    outputChannel.appendLine(`Gas Used: ${result.gasUsed}`);
  }

  if (result.returnData && result.returnData !== "0x") {
    outputChannel.appendLine(`Return Data: ${result.returnData}`);
  }

  if (result.error) {
    outputChannel.appendLine(`Error: ${result.error}`);
  }

  outputChannel.appendLine("--- End Results ---\n");
}

/**
 * Set up file watchers for contract detection
 */
function setupFileWatchers(context: vscode.ExtensionContext) {
  // Watch for Solidity files
  const solidityWatcher = vscode.workspace.createFileSystemWatcher("**/*.sol");

  solidityWatcher.onDidCreate(async (uri: vscode.Uri) => {
    await contractDetector.detectContract(uri);
  });

  solidityWatcher.onDidChange(async (uri: vscode.Uri) => {
    await contractDetector.detectContract(uri);
  });

  context.subscriptions.push(solidityWatcher);
}

/**
 * Show welcome message for first-time users
 */
function showWelcomeMessage(context: vscode.ExtensionContext) {
  const hasShownWelcome = context.globalState.get(
    "tx-simulator.hasShownWelcome",
    false
  );

  if (!hasShownWelcome) {
    vscode.window
      .showInformationMessage(
        "Welcome to TX Simulator! Simulate EVM transactions right from VS Code.",
        "Open Simulator",
        "Learn More"
      )
      .then((action: string | undefined) => {
        if (action === "Open Simulator") {
          vscode.commands.executeCommand("tx-simulator.openSimulator");
        } else if (action === "Learn More") {
          vscode.env.openExternal(
            vscode.Uri.parse("https://github.com/your-org/tx-simulator")
          );
        }
      });

    context.globalState.update("tx-simulator.hasShownWelcome", true);
  }
}

/**
 * Main webview panel class for the simulator interface
 */
class TxSimulatorPanel {
  public static currentPanel: TxSimulatorPanel | undefined;
  public static readonly viewType = "tx-simulator";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (TxSimulatorPanel.currentPanel) {
      TxSimulatorPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      TxSimulatorPanel.viewType,
      "TX Simulator",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(extensionUri.fsPath + "/dist")],
      }
    );

    TxSimulatorPanel.currentPanel = new TxSimulatorPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;

    this._update();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public dispose() {
    TxSimulatorPanel.currentPanel = undefined;
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    this._panel.webview.html = this._getHtmlForWebview();
  }

  private _getHtmlForWebview(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TX Simulator</title>
      </head>
      <body>
        <h1>TX Simulator</h1>
        <p>Full webview implementation would go here...</p>
      </body>
      </html>
    `;
  }
}

/**
 * Extension deactivation function
 * Called when the extension is deactivated
 */
export function deactivate() {
  if (outputChannel) {
    outputChannel.dispose();
  }
}
