# TX Simulator - Modular EVM Transaction Simulator

A powerful, modular EVM transaction simulator that works as a CLI tool, desktop application, and VS Code extension. Built with TypeScript, Electron, and Foundry (Anvil/Cast).

## 🚀 Features

- **Multi-Platform**: CLI, Desktop App (Electron), and VS Code Extension
- **Universal EVM Support**: Works with any EVM-compatible blockchain
- **Foundry Integration**: Uses Anvil for forking and Cast for transaction execution
- **ABI Support**: Automatic ABI detection and parameter encoding
- **Transaction Tracing**: Detailed execution traces and gas analysis
- **History Management**: Track and replay previous simulations
- **Project Integration**: Auto-detect contracts in your workspace

## 🏗 Project Structure

```
tx-simulator/
├── src/
│   ├── core/           # Core simulation logic
│   │   ├── simulator.ts    # Main TransactionSimulator class
│   │   ├── types.ts        # Type definitions
│   │   ├── utils.ts        # Utility functions
│   │   └── index.ts        # Core module exports
│   ├── cli/            # Command-line interface
│   │   └── index.ts        # CLI entry point with Commander.js
│   ├── desktop/        # Electron desktop application
│   │   ├── main.ts         # Electron main process
│   │   ├── preload.ts      # Preload script for security
│   │   └── renderer/       # React/HTML frontend (to be implemented)
│   └── extension/      # VS Code extension
│       ├── extension.ts    # Extension entry point
│       ├── package.json    # Extension manifest
│       └── webpack.config.js # Build configuration
├── scripts/
│   └── download-binaries.js # Binary download script
├── binaries/           # Foundry binaries (anvil, cast)
└── dist/              # Compiled output
```

## 🛠 Installation & Setup

### Prerequisites

- Node.js 18+ 
- TypeScript
- Git

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd tx-simulator
   npm install
   ```

2. **Download Foundry binaries:**
   ```bash
   node scripts/download-binaries.js
   # Or for all platforms: node scripts/download-binaries.js --all
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

## 📋 Usage

### CLI Usage

The CLI provides a powerful command-line interface for transaction simulation:

```bash
# Install globally
npm install -g .

# Basic simulation
tx-sim simulate \
  --network mainnet \
  --from 0xYourAddress \
  --to 0xContractAddress \
  --signature "transfer(address,uint256)" \
  --args "0xRecipient,1000000000000000000"

# Interactive mode
tx-sim interactive

# Quick simulate with defaults
tx-sim simulate \
  --network sepolia \
  --from 0xbb396e61c2ade58eeadee95f988d5b17cd865a7e \
  --to 0xea91daeae68ff8967d8e466b974385bef4e8fd1b

# List available networks
tx-sim networks

# Help
tx-sim --help
```

#### CLI Options

- `--network <name>`: Use predefined network (mainnet, sepolia, polygon, etc.)
- `--rpc <url>`: Custom RPC URL
- `--from <address>`: From address (will be impersonated)
- `--to <address>`: To address (contract or EOA)  
- `--value <amount>`: ETH value in ether
- `--gas <limit>`: Gas limit
- `--gas-price <price>`: Gas price in gwei
- `--signature <sig>`: Function signature
- `--args <args...>`: Function arguments
- `--data <hex>`: Raw transaction data
- `--abi <path>`: Path to ABI file
- `--trace`: Enable transaction tracing
- `--json`: Output as JSON

### Desktop Application

Launch the Electron desktop app:

```bash
npm run build
npm run dev:desktop
```

Features:
- Graphical transaction builder
- Network selection UI
- Real-time simulation progress
- Result visualization
- Session management

### VS Code Extension

Install the extension in development mode:

1. Open the project in VS Code
2. Press F5 to launch Extension Development Host
3. In the new VS Code window, use:
   - `Ctrl+Shift+P` → "TX Simulator: Open Simulator"
   - `Ctrl+Shift+T` → Quick open simulator
   - `Ctrl+Shift+R` → Quick simulate

Extension features:
- Command palette integration
- Context menu for Solidity files
- Automatic contract detection
- Simulation history
- Integrated results viewer

## 🔧 Core Components

### TransactionSimulator Class

The heart of the application - handles Anvil fork management and Cast execution:

```typescript
import { createSimulator, SimulationConfig } from './core';

const config: SimulationConfig = {
  rpcUrl: 'https://rpc.ankr.com/eth',
  from: '0xYourAddress',
  to: '0xContractAddress',
  functionSignature: 'transfer(address,uint256)',
  functionParams: ['0xRecipient', '1000000000000000000'],
  traceEnabled: true
};

const simulator = createSimulator(config);

simulator.on('log', (message) => console.log(message));
simulator.on('error', (error) => console.error(error));

const result = await simulator.runSimulation();
console.log('Simulation result:', result);
```

### Supported Networks

Built-in support for popular networks:

- **Ethereum**: Mainnet, Sepolia
- **Polygon**: Mainnet
- **Arbitrum**: One
- **Monad**: Testnet
- **Custom**: Any EVM-compatible RPC

### Binary Management

Automatic download and bundling of Foundry binaries:

```bash
# Check if binaries exist
node scripts/download-binaries.js --check

# Download for current platform
node scripts/download-binaries.js  

# Download for all platforms (for distribution)
node scripts/download-binaries.js --all
```

## 📝 Configuration

### VS Code Extension Settings

```json
{
  "tx-simulator.defaultRpcUrl": "https://rpc.ankr.com/eth",
  "tx-simulator.defaultAnvilPort": 8545,
  "tx-simulator.autoDetectContracts": true,
  "tx-simulator.enableTracing": false,
  "tx-simulator.maxHistoryEntries": 100
}
```

### Environment Variables

- `NODE_ENV`: Set to 'development' for development mode
- `TX_SIM_DEFAULT_RPC`: Default RPC URL
- `TX_SIM_BINARY_PATH`: Custom path to Foundry binaries

## 🚧 Development

### Building

```bash
# Build all components
npm run build

# Watch mode
npm run build:watch

# Build specific components
npm run build:cli
npm run build:desktop  
npm run build:extension
```

### Testing

```bash
# Run tests
npm test

# Run specific tests
npm test -- --testNamePattern="SimulationConfig"
```

### Debugging

- **CLI**: Use `npm run dev:cli` to run with ts-node
- **Desktop**: Use `npm run dev:desktop` with DevTools
- **Extension**: Press F5 in VS Code to launch Extension Development Host

## 🔐 Security Considerations

- Account impersonation only works on forked networks
- Never use real private keys in simulations
- Binaries are downloaded from official Foundry releases
- All network requests go through trusted RPC providers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Build and test: `npm run build && npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- [Foundry Documentation](https://book.getfoundry.sh/)
- [Anvil Reference](https://book.getfoundry.sh/anvil/)
- [Cast Reference](https://book.getfoundry.sh/cast/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Electron Documentation](https://electronjs.org/docs)

---

Built with ❤️ for the Ethereum developer community