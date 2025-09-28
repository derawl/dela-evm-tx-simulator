/**
 * Example: Your Original Game Market Script Converted
 * Demonstrates how to convert your bash script to use the TX Simulator
 */

import { createSimulator, SimulationConfig } from "../src/core";

async function gameMarketSimulation() {
  console.log("🎮 Game Market Simulation Example\n");

  // Your original configuration converted to TypeScript
  const config: SimulationConfig = {
    rpcUrl: "https://rpc.ankr.com/monad_testnet",
    forkBlockNumber: 38980949,
    from: "0xbb396e61c2ade58eeadee95f988d5b17cd865a7e",
    to: "0xea91daeae68ff8967d8e466b974385bef4e8fd1b",
    anvilPort: 8545,
    functionSignature: "createGameMarket(uint256,bytes16,bytes)",
    functionParams: [
      4, // GAME_ID
      "0xeb1dcadcfca10960803009411023082d", // LEVR_MARKET_ID
      "0x0000000000000000000000003b57b60b53444d9a44a3b2c9871e6627630b770900000000000000000000000000000000000000000000021e19e0c9bab240000000000000000000000000000000000000000000000000021e19e0c9bab240000000000000000000000000000000000000000000000000021e19e0c9bab240000000000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000839b680fffffffffffffffffffffffffffffffffffffffffffffffffffffffff76abc00000000000000000000000000000000000000000000000000000000000bdc7fc0",
    ],
    traceEnabled: true,
  };

  try {
    const simulator = createSimulator(config);

    simulator.on("log", (message: string) => {
      console.log(`📝 ${message}`);
    });

    simulator.on("error", (error: string) => {
      console.error(`❌ ${error}`);
    });

    console.log("Game Market Configuration:");
    console.log(`- Network: Monad Testnet`);
    console.log(`- Contract: ${config.to}`);
    console.log(`- Function: createGameMarket`);
    console.log(`- Game ID: 4`);
    console.log(`- Fork Block: ${config.forkBlockNumber}`);

    console.log("\nStarting game market simulation...\n");

    const result = await simulator.runSimulation();

    console.log("\n📊 Game Market Simulation Results:");
    console.log("=".repeat(50));
    console.log(`Success: ${result.success ? "✅" : "❌"}`);

    if (result.success) {
      console.log(`Gas Used: ${result.gasUsed || "N/A"}`);
      console.log(`Return Data: ${result.returnData || "0x"}`);

      if (result.trace) {
        console.log("\nExecution Trace Available ✅");
        // In a real implementation, you could parse and display the trace nicely
      }

      if (result.logs && result.logs.length > 0) {
        console.log(`\nEvent Logs (${result.logs.length}):`);
        result.logs.forEach((log, index) => {
          console.log(`  ${index + 1}. Contract: ${log.address}`);
          if (log.topics && log.topics.length > 0) {
            console.log(`     Event Signature: ${log.topics[0]}`);
          }
        });
      }

      console.log("\n🎉 Game market creation would succeed!");
      console.log("🔗 You can now check the transaction details and events.");
    } else {
      console.log(`Error: ${result.error}`);
      console.log("\n💥 Game market creation would fail!");
      console.log(
        "🔍 Check the error details above for debugging information."
      );
    }

    // Compared to your original bash script:
    console.log("\n📝 Advantages over bash script:");
    console.log("✅ Type safety and IDE support");
    console.log("✅ Better error handling and logging");
    console.log("✅ Structured result parsing");
    console.log("✅ Reusable across CLI, desktop, and VS Code");
    console.log("✅ Easy parameter modification");
    console.log("✅ Integration with development tools");
  } catch (error) {
    console.error("Game market simulation failed:", error);
  }
}

// Run the example
if (require.main === module) {
  gameMarketSimulation().catch(console.error);
}

export { gameMarketSimulation };
