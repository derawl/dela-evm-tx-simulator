/**
 * Example: Contract Function Call Simulation
 * Demonstrates simulating smart contract interactions
 */

import { createSimulator, SimulationConfig, NETWORKS } from "../src/core";

async function contractCallExample() {
  console.log("🔗 Contract Function Call Simulation Example\n");

  // Example: ERC20 token transfer simulation
  const config: SimulationConfig = {
    rpcUrl: NETWORKS.mainnet.rpcUrl,
    from: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // Vitalik's address (has tokens)
    to: "0xA0b86a33E6417aF98E62f9a7D3B8c1e9B11B2F6C", // USDC contract
    functionSignature: "transfer(address,uint256)",
    functionParams: [
      "0x742d35cc6601C02B6C7C5a8a66B57c8b8D7E3B78", // Recipient
      "1000000", // 1 USDC (6 decimals)
    ],
    anvilPort: 8546, // Different port to avoid conflicts
    traceEnabled: true,
  };

  try {
    const simulator = createSimulator(config);

    simulator.on("log", (message: string) => {
      console.log(`📝 ${message}`);
    });

    console.log("Configuration:");
    console.log(`- Network: ${NETWORKS.mainnet.name}`);
    console.log(`- Contract: ${config.to} (USDC)`);
    console.log(`- Function: ${config.functionSignature}`);
    console.log(`- From: ${config.from}`);
    console.log(`- To: ${config.functionParams![0]}`);
    console.log(`- Amount: ${config.functionParams![1]} USDC`);

    console.log("\nStarting contract call simulation...\n");

    const result = await simulator.runSimulation();

    console.log("\n📊 Contract Call Results:");
    console.log("=".repeat(50));
    console.log(`Success: ${result.success ? "✅" : "❌"}`);

    if (result.success) {
      console.log(`Gas Used: ${result.gasUsed || "N/A"}`);
      console.log(`Return Data: ${result.returnData || "0x"}`);

      if (result.logs && result.logs.length > 0) {
        console.log(`\nEvent Logs (${result.logs.length}):`);
        result.logs.forEach((log, index) => {
          console.log(`  ${index + 1}. Address: ${log.address}`);
          console.log(`     Topics: ${log.topics?.join(", ")}`);
          if (log.data) {
            console.log(`     Data: ${log.data}`);
          }
        });
      }

      console.log("\n🎉 Contract call would succeed!");
    } else {
      console.log(`Error: ${result.error}`);
      console.log("\n💥 Contract call would fail!");
    }
  } catch (error) {
    console.error("Contract simulation failed:", error);
  }
}

// Run the example
if (require.main === module) {
  contractCallExample().catch(console.error);
}

export { contractCallExample };
