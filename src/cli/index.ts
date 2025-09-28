#!/usr/bin/env node

/**
 * CLI Entry Point for TX Simulator
 * Provides command-line interface for transaction simulation
 */

import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import { createSimulator, SimulationConfig, NETWORKS } from "../core";
import { isValidAddress, weiToEther, etherToWei } from "../core/utils";

const program = new Command();

/**
 * Main CLI setup with all commands and options
 */
program
  .name("tx-sim")
  .description(
    "EVM Transaction Simulator - Fork, simulate, and test transactions"
  )
  .version("1.0.0");

/**
 * Simulate command - main functionality
 * Allows users to simulate transactions with various options
 */
program
  .command("simulate")
  .description("Simulate a transaction on a forked network")
  .option("-r, --rpc <url>", "RPC URL for forking")
  .option(
    "-n, --network <name>",
    "Predefined network (mainnet, sepolia, polygon, etc.)"
  )
  .option("-b, --block <number>", "Fork from specific block number")
  .option("-p, --port <number>", "Anvil port (default: 8545)", "8545")
  .option("-f, --from <address>", "From address (will be impersonated)")
  .option("-t, --to <address>", "To address (contract or EOA)")
  .option("-v, --value <amount>", "ETH value to send (in ether)")
  .option("-g, --gas <limit>", "Gas limit")
  .option("--gas-price <price>", "Gas price in gwei")
  .option("-d, --data <hex>", "Raw transaction data")
  .option(
    "-s, --signature <sig>",
    'Function signature (e.g., "transfer(address,uint256)")'
  )
  .option("-a, --args <args...>", "Function arguments")
  .option("--abi <path>", "Path to ABI file")
  .option("--trace", "Enable transaction tracing")
  .option("--no-trace", "Disable transaction tracing")
  .option("--json", "Output results as JSON")
  .action(async (options) => {
    try {
      await handleSimulate(options);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(chalk.red("Simulation failed:"), errorMessage);
      process.exit(1);
    }
  });

/**
 * Interactive command - guided simulation setup
 * Provides step-by-step wizard for complex transactions
 */
program
  .command("interactive")
  .alias("i")
  .description("Interactive simulation wizard")
  .action(async () => {
    try {
      await handleInteractive();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(chalk.red("Interactive mode failed:"), errorMessage);
      process.exit(1);
    }
  });

/**
 * Networks command - list available networks
 */
program
  .command("networks")
  .description("List available networks")
  .action(() => {
    console.log(chalk.blue.bold("\nAvailable Networks:\n"));

    Object.entries(NETWORKS).forEach(([key, network]) => {
      console.log(`${chalk.green(key.padEnd(15))} ${network.name}`);
      console.log(`${" ".repeat(15)} Chain ID: ${network.chainId}`);
      console.log(`${" ".repeat(15)} RPC: ${network.rpcUrl}`);
      if (network.blockExplorer) {
        console.log(`${" ".repeat(15)} Explorer: ${network.blockExplorer}`);
      }
      console.log();
    });
  });

/**
 * Handle the simulate command execution
 * Processes all options and runs the simulation
 */
async function handleSimulate(options: any) {
  // Validate required options
  if (!options.rpc && !options.network) {
    throw new Error("Either --rpc or --network must be specified");
  }

  if (!options.from) {
    throw new Error("--from address is required");
  }

  if (!options.to) {
    throw new Error("--to address is required");
  }

  // Validate addresses
  if (!isValidAddress(options.from)) {
    throw new Error("Invalid --from address");
  }

  if (!isValidAddress(options.to)) {
    throw new Error("Invalid --to address");
  }

  // Determine RPC URL
  let rpcUrl = options.rpc;
  if (options.network) {
    const network = NETWORKS[options.network.toLowerCase()];
    if (!network) {
      throw new Error(
        `Unknown network: ${options.network}. Use 'tx-sim networks' to see available options`
      );
    }
    rpcUrl = network.rpcUrl;
    console.log(chalk.blue(`Using ${network.name} (${network.rpcUrl})`));
  }

  // Build simulation configuration
  const config: SimulationConfig = {
    rpcUrl,
    from: options.from,
    to: options.to,
    anvilPort: parseInt(options.port),
    traceEnabled: options.trace,
  };

  // Add optional parameters
  if (options.block) {
    config.forkBlockNumber = parseInt(options.block);
  }

  if (options.value) {
    config.value = etherToWei(options.value);
  }

  if (options.gas) {
    config.gasLimit = options.gas;
  }

  if (options.gasPrice) {
    config.gasPrice = (parseInt(options.gasPrice) * 1e9).toString(); // Convert gwei to wei
  }

  if (options.data) {
    config.rawData = options.data;
  }

  if (options.signature) {
    config.functionSignature = options.signature;
    config.functionParams = options.args || [];
  }

  if (options.abi) {
    try {
      const fs = require("fs");
      config.abi = fs.readFileSync(options.abi, "utf8");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read ABI file: ${errorMessage}`);
    }
  }

  // Run simulation
  console.log(chalk.blue.bold("\n🚀 Starting Transaction Simulation\n"));

  const spinner = ora("Setting up simulation environment...").start();

  try {
    const simulator = createSimulator(config);

    // Listen for simulator events
    simulator.on("log", (message: string) => {
      spinner.text = message;
    });

    simulator.on("error", (error: string) => {
      spinner.fail(error);
    });

    // Run the simulation
    const result = await simulator.runSimulation();

    spinner.succeed("Simulation completed");

    // Display results
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      displaySimulationResult(result, config);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    spinner.fail(`Simulation failed: ${errorMessage}`);
    throw error;
  }
}

/**
 * Handle interactive mode
 * Provides step-by-step wizard for transaction simulation
 */
async function handleInteractive() {
  console.log(chalk.blue.bold("\n🧙 Transaction Simulation Wizard\n"));

  // Step 1: Choose network
  const networkChoices = Object.entries(NETWORKS).map(([key, network]) => ({
    name: `${network.name} (${key})`,
    value: key,
  }));

  networkChoices.push({ name: "Custom RPC URL", value: "custom" });

  const { networkChoice } = await inquirer.prompt([
    {
      type: "list",
      name: "networkChoice",
      message: "Select a network:",
      choices: networkChoices,
    },
  ]);

  let rpcUrl: string;
  if (networkChoice === "custom") {
    const { customRpc } = await inquirer.prompt([
      {
        type: "input",
        name: "customRpc",
        message: "Enter RPC URL:",
        validate: (input: string) =>
          input.startsWith("http") || "Please enter a valid HTTP/HTTPS URL",
      },
    ]);
    rpcUrl = customRpc;
  } else {
    rpcUrl = NETWORKS[networkChoice].rpcUrl;
  }

  // Step 2: Transaction details
  const txDetails = await inquirer.prompt([
    {
      type: "input",
      name: "from",
      message: "From address (will be impersonated):",
      validate: (input: string) =>
        isValidAddress(input) || "Please enter a valid Ethereum address",
    },
    {
      type: "input",
      name: "to",
      message: "To address (contract or EOA):",
      validate: (input: string) =>
        isValidAddress(input) || "Please enter a valid Ethereum address",
    },
    {
      type: "input",
      name: "value",
      message: "ETH value to send (leave empty for 0):",
      default: "0",
    },
    {
      type: "input",
      name: "forkBlock",
      message: "Fork from block number (leave empty for latest):",
      default: "",
    },
  ]);

  // Step 3: Contract interaction (optional)
  const { hasContractInteraction } = await inquirer.prompt([
    {
      type: "confirm",
      name: "hasContractInteraction",
      message: "Is this a contract function call?",
      default: false,
    },
  ]);

  let contractDetails: any = {};
  if (hasContractInteraction) {
    contractDetails = await inquirer.prompt([
      {
        type: "input",
        name: "functionSignature",
        message: 'Function signature (e.g., "transfer(address,uint256)"):',
        validate: (input: string) =>
          (input.includes("(") && input.includes(")")) ||
          "Please enter a valid function signature",
      },
      {
        type: "input",
        name: "functionArgs",
        message: "Function arguments (comma-separated):",
      },
    ]);
  }

  // Step 4: Advanced options
  const { enableTrace } = await inquirer.prompt([
    {
      type: "confirm",
      name: "enableTrace",
      message: "Enable transaction tracing?",
      default: false,
    },
  ]);

  // Build configuration and run simulation
  const config: SimulationConfig = {
    rpcUrl,
    from: txDetails.from,
    to: txDetails.to,
    traceEnabled: enableTrace,
  };

  if (txDetails.value && txDetails.value !== "0") {
    config.value = etherToWei(txDetails.value);
  }

  if (txDetails.forkBlock) {
    config.forkBlockNumber = parseInt(txDetails.forkBlock);
  }

  if (hasContractInteraction) {
    config.functionSignature = contractDetails.functionSignature;
    if (contractDetails.functionArgs) {
      config.functionParams = contractDetails.functionArgs
        .split(",")
        .map((arg: string) => arg.trim());
    }
  }

  // Run simulation
  console.log(chalk.blue.bold("\n🚀 Running Simulation\n"));

  const spinner = ora("Setting up simulation environment...").start();

  try {
    const simulator = createSimulator(config);

    simulator.on("log", (message: string) => {
      spinner.text = message;
    });

    const result = await simulator.runSimulation();

    spinner.succeed("Simulation completed");
    displaySimulationResult(result, config);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    spinner.fail(`Simulation failed: ${errorMessage}`);
    throw error;
  }
}

/**
 * Display simulation results in a user-friendly format
 */
function displaySimulationResult(result: any, config: SimulationConfig) {
  console.log(chalk.green.bold("\n✅ Simulation Results\n"));

  console.log(chalk.blue("Transaction Details:"));
  console.log(`  From: ${chalk.yellow(config.from)}`);
  console.log(`  To: ${chalk.yellow(config.to)}`);

  if (config.value) {
    console.log(`  Value: ${chalk.yellow(weiToEther(config.value))} ETH`);
  }

  console.log(
    `  Success: ${result.success ? chalk.green("✅") : chalk.red("❌")}`
  );

  if (result.gasUsed) {
    console.log(`  Gas Used: ${chalk.yellow(result.gasUsed)}`);
  }

  if (result.returnData && result.returnData !== "0x") {
    console.log(`  Return Data: ${chalk.cyan(result.returnData)}`);
  }

  if (result.error) {
    console.log(`  Error: ${chalk.red(result.error)}`);
  }

  if (result.logs && result.logs.length > 0) {
    console.log(`\n${chalk.blue("Event Logs:")}`);
    result.logs.forEach((log: any, index: number) => {
      console.log(`  ${index + 1}. ${chalk.cyan(log.address || "Unknown")}`);
      console.log(`     Topics: ${log.topics?.join(", ") || "None"}`);
      if (log.data) {
        console.log(`     Data: ${log.data}`);
      }
    });
  }

  if (result.trace && config.traceEnabled) {
    console.log(`\n${chalk.blue("Execution Trace:")}`);

    // If trace has rawOutput, show that prominently
    if (result.trace.rawOutput) {
      console.log(chalk.cyan("\n=== Full Cast Trace Output ==="));
      console.log(result.trace.rawOutput);
      console.log(chalk.cyan("=== End Trace Output ===\n"));
    }

    // Also display parsed trace data if available
    if (result.trace.traces && result.trace.traces.length > 0) {
      console.log(chalk.yellow("Parsed Trace Steps:"));
      result.trace.traces.forEach((step: any, index: number) => {
        console.log(chalk.green(`  Step ${index + 1} [${step.type}]:`));
        console.log(chalk.white(`    ${step.raw}`));
        if (step.details && step.details.length > 0) {
          step.details.forEach((detail: string) => {
            console.log(chalk.gray(`      ${detail}`));
          });
        }
      });
    } else if (typeof result.trace === "string") {
      console.log(chalk.cyan(result.trace));
    } else {
      console.log(chalk.cyan(JSON.stringify(result.trace, null, 2)));
    }
  }

  console.log(chalk.green("\n🎉 Simulation completed successfully!"));
}

// Error handling for unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error(
    chalk.red("Unhandled Rejection at:"),
    promise,
    chalk.red("reason:"),
    reason
  );
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error(chalk.red("Uncaught Exception:"), error);
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);
