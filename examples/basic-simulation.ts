/**
 * Example: Basic Transaction Simulation
 * Demonstrates the core functionality of the TX Simulator
 */

import { createSimulator, SimulationConfig } from "../src/core";

async function basicSimulationExample() {
  console.log("🚀 Basic Transaction Simulation Example\n");

  // Configuration for a simple ETH transfer simulation
  const config: SimulationConfig = {
    rpcUrl: "https://eth.llamarpc.com", // Use the same RPC as CLI test
    // No specific fork block - use latest
    from: "0xbb396e61c2ade58eeadee95f988d5b17cd865a7e", // Will be impersonated
    to: "0xea91daeae68ff8967d8e466b974385bef4e8fd1b", // Recipient
    value: "1000000000000000", // 0.001 ETH in wei (smaller amount)
    anvilPort: 8545,
    traceEnabled: true,
  };

  try {
    // Create simulator instance
    const simulator = createSimulator(config);

    // Listen for progress updates
    simulator.on("log", (message: string) => {
      console.log(`📝 ${message}`);
    });

    simulator.on("error", (error: string) => {
      console.error(`❌ ${error}`);
    });

    console.log("Configuration:", {
      network: "Sepolia Testnet",
      from: config.from,
      to: config.to,
      value: "1 ETH",
      forkBlock: config.forkBlockNumber,
    });

    console.log("\nStarting simulation...\n");

    // Run the simulation
    const result = await simulator.runSimulation();

    // Display results
    console.log("\n📊 Simulation Results:");
    console.log("=".repeat(50));
    console.log(`Success: ${result.success ? "✅" : "❌"}`);

    if (result.success) {
      console.log(`Gas Used: ${result.gasUsed || "N/A"}`);
      console.log(`Return Data: ${result.returnData || "0x"}`);

      if (result.logs && result.logs.length > 0) {
        console.log(`Event Logs: ${result.logs.length} events emitted`);
      }

      console.log("\n🎉 Transaction would succeed on the network!");
    } else {
      console.log(`Error: ${result.error}`);
      console.log("\n💥 Transaction would fail on the network!");
    }
  } catch (error) {
    console.error("Simulation failed:", error);
  }
}

// Run the example
if (require.main === module) {
  basicSimulationExample().catch(console.error);
}

export { basicSimulationExample };
