import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import path from "path";
import { SimulationConfig, SimulationResult } from "./types";

/**
 * Utility function to convert ETH to wei
 * @param ethValue - Val      // Only add --trace for call operations, not send operations
      if (isCall && this.config.traceEnabled) {
        args.push("--trace");
        // Try adding verbosity flags for more detailed output
        args.push("-v"); // Verbose flag
        args.push("-vv"); // Extra verbose
        // Note: --debug can cause "debug arena is empty" errors, so avoiding it
      }ETH (can be string or number)
 * @returns Value in wei as string
 */
function ethToWei(ethValue: string | number): string {
  const eth = typeof ethValue === "string" ? parseFloat(ethValue) : ethValue;
  if (isNaN(eth)) {
    throw new Error(`Invalid ETH value: ${ethValue}`);
  }

  // 1 ETH = 10^18 wei
  const weiValue = BigInt(Math.floor(eth * 1e18));
  return weiValue.toString();
}

/**
 * Core transaction simulator class
 * Handles Anvil fork management and Cast transaction execution
 */
export class TransactionSimulator extends EventEmitter {
  private anvilProcess: ChildProcess | null = null;
  private config: SimulationConfig;
  private binariesPath: string;

  constructor(config: SimulationConfig) {
    super();
    this.config = config;
    // Determine path to bundled binaries (will be in resources folder when packaged)
    this.binariesPath = this.getBinariesPath();
  }

// ...existing code...

/**
 * Get the correct path to bundled binaries
 * Handles both development and packaged app scenarios
 */
private getBinariesPath(): string {
  // Better detection for packaged vs development
  const isPackaged = 
    // Check if we're in an asar file
    __dirname.includes('app.asar') ||
    // Check if process.resourcesPath exists (Electron packaged app)
    (typeof process !== 'undefined' && process.resourcesPath) ||
    // Check if we're running from installed location
    process.execPath.includes('TX Simulator') ||
    // Check production environment
    process.env.NODE_ENV === 'production';

  const isDev = !isPackaged;

  console.log(`[SIMULATOR] Detection - isDev: ${isDev}, isPackaged: ${isPackaged}`);
  console.log(`[SIMULATOR] __dirname: ${__dirname}`);
  console.log(`[SIMULATOR] process.resourcesPath: ${process.resourcesPath}`);
  console.log(`[SIMULATOR] process.execPath: ${process.execPath}`);

  if (isDev) {
    // In development, check from project root first
    const projectRoot = process.cwd();
    const projectBinariesPath = path.join(projectRoot, "binaries");
    // const fs = require("fs");

    // console.log(`[SIMULATOR] Dev mode - checking: ${projectBinariesPath}`);

    // if (fs.existsSync(projectBinariesPath)) {
    //   console.log(`[SIMULATOR] Using dev binaries: ${projectBinariesPath}`);
    //   return projectBinariesPath;
    // }

    // Fallback to relative path from compiled location
    const fallbackPath = path.join(__dirname, "../../binaries");
    console.log(`[SIMULATOR] Using fallback dev binaries: ${fallbackPath}`);
    return fallbackPath;
  }

  // In packaged app, binaries are extracted as extraResources OUTSIDE the asar
  // They are located at: resources/binaries/ (not inside app.asar)
  const packagedPath = path.join(process.resourcesPath, "binaries");
  console.log(`[SIMULATOR] Using packaged binaries: ${packagedPath}`);
  return packagedPath;
}
  /**
   * Get the full path to anvil executable
   * Handles cross-platform executable names and checks temp directory as fallback
   */
  private getAnvilPath(): string {
    const isWindows = process.platform === "win32";
    const executable = isWindows ? "anvil.exe" : "anvil";

    // First try main binaries directory
    let anvilPath = path.join(this.binariesPath, executable);
    const fs = require("fs");

    // If not found, try temp directory
    if (!fs.existsSync(anvilPath)) {
      anvilPath = path.join(this.binariesPath, executable);
    }

    return anvilPath;
  }

  /**
   * Get the full path to cast executable
   * Handles cross-platform executable names and checks temp directory as fallback
   */
  private getCastPath(): string {
    const isWindows = process.platform === "win32";
    const executable = isWindows ? "cast.exe" : "cast";

    // First try main binaries directory
    let castPath = path.join(this.binariesPath, executable);
    const fs = require("fs");

    // If not found, try temp directory
    if (!fs.existsSync(castPath)) {
      castPath = path.join(this.binariesPath, executable);
    }

    return castPath;
  }

  /**
   * Start Anvil fork with the configured RPC URL and block number
   * Returns a promise that resolves when Anvil is ready to accept connections
   */
  async startAnvilFork(): Promise<void> {
    return new Promise((resolve, reject) => {
      const anvilPath = this.getAnvilPath();
      const port = this.config.anvilPort || 8545;

      // Build anvil command arguments
      const args = [
        "--fork-url",
        this.config.rpcUrl,
        "--port",
        port.toString(),
      ];

      if (this.config.forkBlockNumber) {
        args.push(
          "--fork-block-number",
          this.config.forkBlockNumber.toString()
        );
      }

      this.emit("log", `Starting Anvil fork on port ${port}...`);

      // Start anvil process
      this.anvilProcess = spawn(anvilPath, args, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Handle process events
      this.anvilProcess.on("error", (error) => {
        this.emit("error", `Failed to start Anvil: ${error.message}`);
        reject(error);
      });

      this.anvilProcess.stdout?.on("data", (data) => {
        const output = data.toString();
        this.emit("log", `Anvil: ${output.trim()}`);

        // Check if Anvil is ready (listening on port)
        if (output.includes("Listening on")) {
          resolve();
        }
      });

      this.anvilProcess.stderr?.on("data", (data) => {
        this.emit("error", `Anvil error: ${data.toString().trim()}`);
      });

      // Timeout after 10 seconds if Anvil doesn't start
      setTimeout(() => {
        if (this.anvilProcess && !this.anvilProcess.killed) {
          reject(new Error("Anvil startup timeout"));
        }
      }, 10000);
    });
  }

  /**
   * Impersonate an account using Cast's anvil_impersonateAccount RPC call
   * This allows transactions to be sent from any address without private keys
   */
  async impersonateAccount(address: string): Promise<void> {
    const castPath = this.getCastPath();
    const rpcUrl = `http://127.0.0.1:${this.config.anvilPort || 8545}`;

    return new Promise((resolve, reject) => {
      const castProcess = spawn(castPath, [
        "rpc",
        "anvil_impersonateAccount",
        address,
        "--rpc-url",
        rpcUrl,
      ]);

      castProcess.on("close", (code) => {
        if (code === 0) {
          this.emit("log", `Impersonated account: ${address}`);
          resolve();
        } else {
          reject(new Error(`Failed to impersonate account: ${address}`));
        }
      });
    });
  }

  /**
   * Encode function parameters using ethers.js
   * Handles complex ABI encoding for contract function calls
   */
  private encodeParameters(
    signature: string,
    params: any[],
    abi?: string
  ): string {
    try {
      // If raw data is provided, use it directly
      if (this.config.rawData) {
        return this.config.rawData;
      }

      // For now, return empty data - in full implementation, use ethers.js
      // const interface = new ethers.Interface(abi);
      // return interface.encodeFunctionData(signature, params);
      return "0x";
    } catch (error) {
      throw new Error(`Failed to encode parameters: ${error}`);
    }
  }

  /**
   * Execute transaction simulation using Cast
   * Supports both call (read-only) and send (state-changing) operations
   */
  async simulateTransaction(isCall: boolean = true): Promise<SimulationResult> {
    const castPath = this.getCastPath();
    const rpcUrl = `http://127.0.0.1:${this.config.anvilPort || 8545}`;

    return new Promise((resolve, reject) => {
      const args = [isCall ? "call" : "send", this.config.to];

      // Add function signature and parameters if provided
      if (this.config.functionSignature) {
        args.push(this.config.functionSignature);
        // Add parameters directly - Cast will handle the encoding
        if (
          this.config.functionParams &&
          Array.isArray(this.config.functionParams)
        ) {
          // Add each parameter as a separate argument
          this.config.functionParams.forEach((param: any) => {
            args.push(param.toString());
          });
        }
      }
      // If raw data is provided instead, use that
      else if (this.config.rawData) {
        args.push(this.config.rawData);
      }

      // Add transaction options
      args.push("--from", this.config.from);
      args.push("--rpc-url", rpcUrl);

      // Only add --trace for call operations, not send operations
      if (isCall && this.config.traceEnabled) {
        args.push("--trace");
        // Note: --debug can cause "debug arena is empty" errors, so avoiding it
        // Try different trace verbosity options if Cast supports them
      }

      if (!isCall) {
        args.push("--unlocked"); // For impersonated accounts
      }

      if (this.config.value) {
        // Convert ETH to wei for Cast
        const weiValue = ethToWei(this.config.value);
        args.push("--value", weiValue);
      }

      if (this.config.gasLimit) {
        args.push("--gas-limit", this.config.gasLimit);
      }

      this.emit("log", `Executing: cast ${args.join(" ")}`);

      let output = "";
      let error = "";

      const castProcess = spawn(castPath, args);

      castProcess.stdout?.on("data", (data) => {
        output += data.toString();
      });

      castProcess.stderr?.on("data", (data) => {
        error += data.toString();
      });

      castProcess.on("close", (code) => {
        // Always parse Cast output to preserve trace data, regardless of exit code
        const result = this.parseCastOutput(output, error);

        if (code === 0) {
          this.emit("log", "Transaction simulation completed");
          resolve(result);
        } else {
          // Transaction failed but preserve trace data
          result.success = false;
          result.error =
            error.trim() || `Transaction failed (exit code: ${code})`;
          this.emit("log", `Transaction failed: ${result.error}`);
          resolve(result); // Resolve (not reject) to preserve trace data
        }
      });

      castProcess.on("error", (err) => {
        reject(new Error(`Failed to execute cast: ${err.message}`));
      });
    });
  }

  /**
   * Parse Cast command output to extract simulation results
   * Handles different output formats from cast call/send commands
   */
  private parseCastOutput(
    output: string,
    errorOutput?: string
  ): SimulationResult {
    try {
      const result: SimulationResult = {
        success: true,
        returnData: "0x",
        rawOutput: output, // Store raw output for debugging and trace display
      };

      // Extract decoded error names from error output for enhanced trace display
      const errorMappings = new Map<string, string>();
      if (errorOutput) {
        // Extract custom error mappings like: 0x795f6780: LBM_DUPLICATE_MARKET
        const errorRegex = /(0x[a-fA-F0-9]{8}):\s*([A-Z_][A-Z0-9_]*)/g;
        let match;
        while ((match = errorRegex.exec(errorOutput)) !== null) {
          errorMappings.set(match[1], match[2]);
        }
      }

      // Check if this is trace output (contains execution traces)
      if (
        this.config.traceEnabled &&
        (output.includes("Traces:") ||
          output.includes("[CALL]") ||
          output.includes("[CREATE]") ||
          output.includes("[STATICCALL]") ||
          output.includes("[DELEGATECALL]") ||
          output.includes("└─") ||
          output.includes("├─") ||
          output.includes("[0]") ||
          output.includes("::"))
      ) {
        // Parse trace output
        result.trace = this.parseTraceOutput(output);

        // Enhance trace with decoded error names
        if (errorMappings.size > 0 && result.trace.rawOutput) {
          result.trace.rawOutput = this.enhanceTraceWithErrorNames(
            result.trace.rawOutput,
            errorMappings
          );
        }

        // Store the complete raw output for detailed view
        if (!result.trace.rawOutput) {
          result.trace.rawOutput = output;
        }

        // Extract return data from trace output if present
        const returnDataRegex = /Return data: (0x[a-fA-F0-9]*)/;
        const returnDataMatch = returnDataRegex.exec(output);
        if (returnDataMatch) {
          result.returnData = returnDataMatch[1];
        }

        // Extract gas usage if present
        const gasRegex = /Gas used: (\d+)/;
        const gasMatch = gasRegex.exec(output);
        if (gasMatch) {
          result.gasUsed = gasMatch[1];
        }
      } else {
        // Try to parse as JSON if it looks like structured output
        if (output.trim().startsWith("{")) {
          const jsonResult = JSON.parse(output.trim());
          Object.assign(result, jsonResult);
        } else {
          // Simple output - likely return data
          result.returnData = output.trim();
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse cast output: ${error}`,
        rawOutput: output, // Include raw output for debugging
      };
    }
  }

  /**
   * Enhance trace output by replacing error hashes with decoded error names
   */
  private enhanceTraceWithErrorNames(
    traceOutput: string,
    errorMappings: Map<string, string>
  ): string {
    let enhancedTrace = traceOutput;

    // Replace error hashes with decoded names in the trace
    for (const [errorHash, errorName] of errorMappings) {
      const regex = new RegExp(errorHash, "g");
      enhancedTrace = enhancedTrace.replace(
        regex,
        `${errorHash} (${errorName})`
      );
    }

    return enhancedTrace;
  }

  /**
   * Parse trace output from Cast command
   * Extracts execution steps and call information
   */
  private parseTraceOutput(output: string): any {
    const lines = output.split("\n");
    const traces: any[] = [];
    let currentTrace: any = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Parse different trace line types
      if (
        trimmedLine.startsWith("[CALL]") ||
        trimmedLine.startsWith("[STATICCALL]") ||
        trimmedLine.startsWith("[DELEGATECALL]") ||
        trimmedLine.startsWith("[CALLCODE]")
      ) {
        if (currentTrace) {
          traces.push(currentTrace);
        }
        currentTrace = {
          type: trimmedLine.match(/\[(\w+)\]/)?.[1],
          raw: trimmedLine,
          depth: line.length - trimmedLine.length, // Indentation indicates depth
        };
      } else if (trimmedLine.startsWith("[CREATE]")) {
        if (currentTrace) {
          traces.push(currentTrace);
        }
        currentTrace = {
          type: "CREATE",
          raw: trimmedLine,
          depth: line.length - trimmedLine.length,
        };
      } else if (currentTrace && trimmedLine.length > 0) {
        // Additional trace information
        if (!currentTrace.details) {
          currentTrace.details = [];
        }
        currentTrace.details.push(trimmedLine);
      }
    }

    // Add the last trace
    if (currentTrace) {
      traces.push(currentTrace);
    }

    return {
      traces,
      rawOutput: output, // Keep full raw output for complete visibility
    };
  }

  /**
   * Stop the Anvil fork process
   * Cleanly shuts down the forked blockchain
   */
  async stopAnvilFork(): Promise<void> {
    return new Promise((resolve) => {
      if (this.anvilProcess && !this.anvilProcess.killed) {
        this.emit("log", "Stopping Anvil fork...");

        this.anvilProcess.on("close", () => {
          this.emit("log", "Anvil fork stopped");
          resolve();
        });

        // Send SIGTERM to gracefully shut down
        this.anvilProcess.kill("SIGTERM");

        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (this.anvilProcess && !this.anvilProcess.killed) {
            this.anvilProcess.kill("SIGKILL");
            resolve();
          }
        }, 5000);
      } else {
        resolve();
      }
    });
  }

  /**
   * Run complete simulation workflow:
   * 1. Start Anvil fork
   * 2. Impersonate account
   * 3. Execute transaction
   * 4. Stop Anvil fork
   */
  async runSimulation(): Promise<SimulationResult> {
    try {
      // Start Anvil fork
      await this.startAnvilFork();

      // Wait a bit for Anvil to be fully ready
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Impersonate the from account
      await this.impersonateAccount(this.config.from);

      // Execute the transaction simulation
      // Determine operation type: use 'send' if we have a value (ETH transfer)
      const isCall = !this.config.value;

      // For tracing state-changing transactions, we need to do both call and send
      if (!isCall && this.config.traceEnabled) {
        // First, do a traced call to get execution details
        const traceResult = await this.simulateTransaction(true); // call with trace

        // Then do the actual send
        const sendResult = await this.simulateTransaction(false); // send without trace

        // Combine results: use send result but add trace from call
        sendResult.trace = traceResult.trace;
        sendResult.rawOutput = traceResult.rawOutput;

        return sendResult;
      } else {
        // Simple case: either call with trace or send without trace
        const result = await this.simulateTransaction(isCall);
        return result;
      }
    } catch (error) {
      throw new Error(`Simulation failed: ${error}`);
    } finally {
      // Always clean up Anvil process
      await this.stopAnvilFork();
    }
  }
}

/**
 * Factory function to create a new transaction simulator
 * Provides a convenient way to create simulator instances
 */
export function createSimulator(
  config: SimulationConfig
): TransactionSimulator {
  return new TransactionSimulator(config);
}
