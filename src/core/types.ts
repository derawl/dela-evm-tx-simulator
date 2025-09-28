/**
 * Type definitions for the transaction simulator
 * Centralizes all interfaces and types used across the application
 */

/**
 * Configuration interface for transaction simulation
 * Includes all parameters needed to simulate an EVM transaction
 */
export interface SimulationConfig {
  // Network configuration
  rpcUrl: string;
  forkBlockNumber?: number;
  anvilPort?: number;

  // Transaction details
  from: string;
  to: string;
  value?: string;
  gasLimit?: string;
  gasPrice?: string;

  // Contract interaction
  functionSignature?: string;
  functionParams?: any[];
  rawData?: string;
  abi?: string;

  // Simulation options
  traceEnabled?: boolean;
  usePendingBlock?: boolean;
  overrideBlockNumber?: number;
  overrideTimestamp?: number;
}

/**
 * Result of a transaction simulation
 * Contains all relevant data from the simulation including traces
 */
export interface SimulationResult {
  success: boolean;
  transactionHash?: string;
  gasUsed?: string;
  logs?: any[];
  trace?: any;
  error?: string;
  returnData?: string;
  decodedReturnData?: any;
  rawOutput?: string; // Raw output from cast command for debugging
}

/**
 * Supported EVM networks with their RPC URLs and chain IDs
 */
export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer?: string;
}

/**
 * Common networks configuration
 */
export const NETWORKS: Record<string, NetworkConfig> = {
  mainnet: {
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrl: "https://eth.llamarpc.com",
    blockExplorer: "https://etherscan.io",
  },
  sepolia: {
    name: "Sepolia Testnet",
    chainId: 11155111,
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com", // Public Node RPC
    blockExplorer: "https://sepolia.etherscan.io",
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpcUrl: "https://rpc.ankr.com/polygon",
    blockExplorer: "https://polygonscan.com",
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpcUrl: "https://rpc.ankr.com/arbitrum",
    blockExplorer: "https://arbiscan.io",
  },
  monad: {
    name: "Monad Testnet",
    chainId: 41455,
    rpcUrl: "https://rpc.ankr.com/monad_testnet",
    blockExplorer: "https://testnet.monad.xyz",
  },
};

/**
 * ABI entry for function/event definitions
 */
export interface AbiEntry {
  type: "function" | "constructor" | "event" | "error";
  name?: string;
  inputs: Array<{
    name: string;
    type: string;
    indexed?: boolean;
  }>;
  outputs?: Array<{
    name: string;
    type: string;
  }>;
  stateMutability?: "pure" | "view" | "nonpayable" | "payable";
}

/**
 * Contract information including ABI and metadata
 */
export interface ContractInfo {
  address: string;
  abi?: AbiEntry[];
  name?: string;
  verified?: boolean;
  source?: string;
}

/**
 * Transaction trace information
 */
export interface TransactionTrace {
  type: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasUsed: string;
  input: string;
  output: string;
  calls?: TransactionTrace[];
  error?: string;
}

/**
 * Event log from transaction execution
 */
export interface EventLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber?: number;
  transactionHash?: string;
  logIndex?: number;
  decoded?: {
    name: string;
    args: Record<string, any>;
  };
}

/**
 * Binary download configuration for bundling anvil/cast
 */
export interface BinaryConfig {
  name: string;
  version: string;
  platforms: {
    win32: string;
    darwin: string;
    linux: string;
  };
  downloadUrl: string;
}

/**
 * Simulation session that can contain multiple transactions
 */
export interface SimulationSession {
  id: string;
  name: string;
  network: NetworkConfig;
  forkBlock: number;
  transactions: SimulationResult[];
  created: Date;
  modified: Date;
}
