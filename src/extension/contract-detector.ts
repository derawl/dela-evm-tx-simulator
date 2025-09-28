/**
 * Contract Detector for VS Code Extension
 * Detects and analyzes Solidity contracts in the workspace
 */

import * as vscode from "vscode";

export interface ContractInfo {
  name?: string;
  address?: string;
  abi?: any[];
  verified?: boolean;
  source?: string;
}

export class ContractDetector {
  /**
   * Detect contract information from a Solidity file
   */
  async detectContract(uri: vscode.Uri): Promise<ContractInfo | null> {
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const content = document.getText();

      // Simple contract name extraction
      const contractMatch = content.match(/contract\s+(\w+)/);
      if (!contractMatch) {
        return null;
      }

      const contractName = contractMatch[1];

      return {
        name: contractName,
        source: content,
        verified: false,
      };
    } catch (error) {
      console.error("Failed to detect contract:", error);
      return null;
    }
  }

  /**
   * Extract detailed contract information including ABI
   */
  async extractContractInfo(uri: vscode.Uri): Promise<ContractInfo | null> {
    const basicInfo = await this.detectContract(uri);
    if (!basicInfo) {
      return null;
    }

    // In a full implementation, this would:
    // - Parse the Solidity AST to extract function signatures
    // - Look for artifacts in build folders (Foundry, Hardhat)
    // - Check for deployed addresses in config files

    return basicInfo;
  }

  /**
   * Find all contracts in the workspace
   */
  async findAllContracts(): Promise<ContractInfo[]> {
    const contracts: ContractInfo[] = [];

    const solidityFiles = await vscode.workspace.findFiles("**/*.sol");

    for (const file of solidityFiles) {
      const contractInfo = await this.detectContract(file);
      if (contractInfo) {
        contracts.push(contractInfo);
      }
    }

    return contracts;
  }
}
