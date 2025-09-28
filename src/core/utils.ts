import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { BinaryConfig } from "./types";

/**
 * Utility functions for managing binaries and configuration
 */

/**
 * Download and extract Foundry binaries (anvil, cast)
 * Handles platform-specific downloads and extraction
 */
export async function downloadBinaries(
  config: BinaryConfig,
  targetDir: string
): Promise<void> {
  const platform = process.platform as keyof typeof config.platforms;

  if (!config.platforms[platform]) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const downloadUrl = config.platforms[platform];
  const filename = path.basename(downloadUrl);
  const targetPath = path.join(targetDir, filename);

  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`Downloading ${config.name} for ${platform}...`);
  console.log(`URL: ${downloadUrl}`);
  console.log(`Target: ${targetPath}`);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(targetPath);

    https
      .get(downloadUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(`Download failed with status: ${response.statusCode}`)
          );
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          console.log(`Downloaded ${config.name} successfully`);

          // Make executable on Unix systems
          if (platform !== "win32") {
            fs.chmodSync(targetPath, 0o755);
          }

          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlinkSync(targetPath); // Delete partial file
        reject(err);
      });
  });
}

/**
 * Get version information for installed binaries
 */
export async function getBinaryVersion(binaryPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { spawn } = require("child_process");
    const process = spawn(binaryPath, ["--version"]);

    let output = "";
    process.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    process.on("close", (code: number) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Failed to get version for ${binaryPath}`));
      }
    });

    process.on("error", (error: Error) => {
      reject(error);
    });
  });
}

/**
 * Check if binary exists and is executable
 */
export function isBinaryAvailable(binaryPath: string): boolean {
  try {
    return fs.existsSync(binaryPath) && fs.statSync(binaryPath).isFile();
  } catch {
    return false;
  }
}

/**
 * Get the default Foundry binary configuration
 * Points to official Foundry releases
 */
export function getFoundryBinaryConfig(): BinaryConfig {
  const version = "nightly-de33b6af53005037b463318d2628b5cfcaf39916";

  return {
    name: "Foundry",
    version,
    platforms: {
      win32: `https://github.com/foundry-rs/foundry/releases/download/${version}/foundry_${version}_x86_64-pc-windows-msvc.tar.gz`,
      darwin: `https://github.com/foundry-rs/foundry/releases/download/${version}/foundry_${version}_x86_64-apple-darwin.tar.gz`,
      linux: `https://github.com/foundry-rs/foundry/releases/download/${version}/foundry_${version}_x86_64-unknown-linux-gnu.tar.gz`,
    },
    downloadUrl: "https://github.com/foundry-rs/foundry/releases",
  };
}

/**
 * Validate that a given string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate that a given string is a valid transaction hash
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Convert wei to ether string
 */
export function weiToEther(wei: string): string {
  const weiNum = BigInt(wei);
  const etherWei = BigInt("1000000000000000000"); // 10^18
  const ether = weiNum / etherWei;
  const remainder = weiNum % etherWei;

  if (remainder === BigInt(0)) {
    return ether.toString();
  }

  const fractional = remainder.toString().padStart(18, "0");
  return `${ether}.${fractional.replace(/0+$/, "")}`;
}

/**
 * Convert ether to wei string
 */
export function etherToWei(ether: string): string {
  const etherWei = BigInt("1000000000000000000"); // 10^18
  const [wholePart, fractionalPart = ""] = ether.split(".");

  const whole = BigInt(wholePart) * etherWei;
  const fractional = BigInt(fractionalPart.padEnd(18, "0").substring(0, 18));

  return (whole + fractional).toString();
}
