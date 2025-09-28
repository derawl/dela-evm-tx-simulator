/**
 * Quick trace test with a simple transaction to see trace output
 */

import { createSimulator, SimulationConfig } from "../src/core";

async function quickTraceTest() {
  console.log("🔍 Quick Trace Test\n");

  const config: SimulationConfig = {
    rpcUrl: "https://ethereum-rpc.publicnode.com", // Free public RPC
    from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // First anvil account (will have ETH)
    to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Second anvil account
    value: "10000000000000000", // 0.01 ETH
    traceEnabled: true,
  };

  try {
    const simulator = createSimulator(config);

    simulator.on("log", (message: string) => {
      console.log(`📝 ${message}`);
    });

    simulator.on("error", (error: string) => {
      console.log(`❌ ${error}`);
    });

    console.log("Configuration:", {
      from: config.from,
      to: config.to,
      value: "0.01 ETH",
      trace: config.traceEnabled,
    });

    console.log("\nStarting simulation...\n");

    const result = await simulator.runSimulation();

    console.log("✅ Simulation completed!\n");

    // Display results
    console.log("📊 Results:");
    console.log(`  Success: ${result.success}`);
    console.log(`  Return Data: ${result.returnData}`);

    if (result.gasUsed) {
      console.log(`  Gas Used: ${result.gasUsed}`);
    }

    if (result.trace) {
      console.log("\n🔍 TRACE OUTPUT:");
      if (result.trace.rawOutput) {
        console.log("=== Full Cast Trace ===");
        console.log(result.trace.rawOutput);
        console.log("=== End Trace ===");
      } else {
        console.log(JSON.stringify(result.trace, null, 2));
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

quickTraceTest().catch(console.error);
