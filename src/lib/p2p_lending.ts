/**
 * P2P Lending Protocol Integration
 *
 * Interacts with the deployed p2p_lending.move contract
 */

import { aptos } from "./aptos";
import { KeylessAccount } from "@aptos-labs/ts-sdk";

// Contract address (deployed on testnet)
const LENDING_CONTRACT_ADDRESS =
  "0x2b6848d433930a6cec8b474f9adcf2d58a1f5f88d5e17f8718a0a93737660efe";

export interface LendingPoolDetails {
  total_liquidity: number; // in Octas
  total_borrowed: number; // in Octas
  current_borrow_rate: number; // basis points
  current_supply_rate: number; // basis points
  borrow_index: string; // u128 as string
  supply_index: string; // u128 as string
}

export interface UserPosition {
  supplied_amount: number; // in Octas
  borrowed_amount: number; // in Octas
  collateral_amount: number; // in Octas
  health_factor: string; // u128 as string (18 decimals)
}

export interface RegistryStats {
  total_pools: number;
  total_volume_supplied: string; // u128 as string
  total_volume_borrowed: string; // u128 as string
  total_liquidations: number;
}

export interface PriceInfo {
  apt_price: number; // 8 decimals
  usdc_price: number; // 8 decimals
  last_update: number; // timestamp
}

/**
 * Create APT lending pool (admin only)
 */
export async function createAptPool(
  adminAccount: KeylessAccount
): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    sender: adminAccount.accountAddress,
    data: {
      function: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::create_apt_pool`,
      functionArguments: [],
    },
  });

  const pendingTxn = await aptos.signAndSubmitTransaction({
    signer: adminAccount,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: pendingTxn.hash,
  });

  return pendingTxn.hash;
}

/**
 * Supply APT to the lending pool to earn interest
 */
export async function supplyApt(
  account: KeylessAccount,
  amount: number // in APT (will convert to Octas)
): Promise<string> {
  const amountOctas = Math.floor(amount * 100_000_000); // Convert APT to Octas

  const transaction = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::supply`,
      functionArguments: [amountOctas],
    },
  });

  const pendingTxn = await aptos.signAndSubmitTransaction({
    signer: account,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: pendingTxn.hash,
  });

  return pendingTxn.hash;
}

/**
 * Withdraw supplied APT from the lending pool
 */
export async function withdrawApt(
  account: KeylessAccount,
  amount: number // in APT (will convert to Octas)
): Promise<string> {
  const amountOctas = Math.floor(amount * 100_000_000); // Convert APT to Octas

  const transaction = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::withdraw`,
      functionArguments: [amountOctas],
    },
  });

  const pendingTxn = await aptos.signAndSubmitTransaction({
    signer: account,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: pendingTxn.hash,
  });

  return pendingTxn.hash;
}

/**
 * Borrow APT against collateral
 */
export async function borrowApt(
  account: KeylessAccount,
  collateralAmount: number, // in APT (will convert to Octas)
  borrowAmount: number // in APT (will convert to Octas)
): Promise<string> {
  const collateralOctas = Math.floor(collateralAmount * 100_000_000);
  const borrowOctas = Math.floor(borrowAmount * 100_000_000);

  const transaction = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::borrow`,
      functionArguments: [collateralOctas, borrowOctas],
    },
  });

  const pendingTxn = await aptos.signAndSubmitTransaction({
    signer: account,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: pendingTxn.hash,
  });

  return pendingTxn.hash;
}

/**
 * Repay borrowed APT
 */
export async function repayApt(
  account: KeylessAccount,
  amount: number // in APT (will convert to Octas)
): Promise<string> {
  const amountOctas = Math.floor(amount * 100_000_000); // Convert APT to Octas

  const transaction = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::repay`,
      functionArguments: [amountOctas],
    },
  });

  const pendingTxn = await aptos.signAndSubmitTransaction({
    signer: account,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: pendingTxn.hash,
  });

  return pendingTxn.hash;
}

/**
 * Liquidate an unhealthy position
 */
export async function liquidatePosition(
  liquidatorAccount: KeylessAccount,
  borrowerAddress: string,
  repayAmount: number // in APT (will convert to Octas)
): Promise<string> {
  const repayOctas = Math.floor(repayAmount * 100_000_000);

  const transaction = await aptos.transaction.build.simple({
    sender: liquidatorAccount.accountAddress,
    data: {
      function: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::liquidate`,
      functionArguments: [borrowerAddress, repayOctas],
    },
  });

  const pendingTxn = await aptos.signAndSubmitTransaction({
    signer: liquidatorAccount,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: pendingTxn.hash,
  });

  return pendingTxn.hash;
}

/**
 * Update price oracle (admin only)
 */
export async function updatePriceOracle(
  adminAccount: KeylessAccount,
  aptPrice: number, // in USD (8 decimals)
  usdcPrice: number // in USD (8 decimals)
): Promise<string> {
  const aptPriceScaled = Math.floor(aptPrice * 100_000_000); // 8 decimals
  const usdcPriceScaled = Math.floor(usdcPrice * 100_000_000); // 8 decimals

  const transaction = await aptos.transaction.build.simple({
    sender: adminAccount.accountAddress,
    data: {
      function: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::update_price_oracle`,
      functionArguments: [aptPriceScaled, usdcPriceScaled],
    },
  });

  const pendingTxn = await aptos.signAndSubmitTransaction({
    signer: adminAccount,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: pendingTxn.hash,
  });

  return pendingTxn.hash;
}

/**
 * Check if lending pool exists
 */
export async function poolExists(): Promise<boolean> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::pool_exists`,
        functionArguments: [],
      },
    });
    return result[0] as boolean;
  } catch (error) {
    console.error("Error checking pool existence:", error);
    return false;
  }
}

/**
 * Get lending pool details
 */
export async function getPoolDetails(): Promise<LendingPoolDetails | null> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::get_pool_details`,
        functionArguments: [],
      },
    });

    return {
      total_liquidity: Number(result[0]),
      total_borrowed: Number(result[1]),
      current_borrow_rate: Number(result[2]),
      current_supply_rate: Number(result[3]),
      borrow_index: String(result[4]),
      supply_index: String(result[5]),
    };
  } catch (error) {
    console.error("Error fetching pool details:", error);
    return null;
  }
}

/**
 * Get user position details
 */
export async function getPositionDetails(
  userAddress: string
): Promise<UserPosition | null> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::get_position_details`,
        functionArguments: [userAddress],
      },
    });

    return {
      supplied_amount: Number(result[0]),
      borrowed_amount: Number(result[1]),
      collateral_amount: Number(result[2]),
      health_factor: String(result[3]),
    };
  } catch {
    // User doesn't have a position yet
    return null;
  }
}

/**
 * Check if user has a position
 */
export async function positionExists(userAddress: string): Promise<boolean> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::position_exists`,
        functionArguments: [userAddress],
      },
    });
    return result[0] as boolean;
  } catch (error) {
    console.error("Error checking position existence:", error);
    return false;
  }
}

/**
 * Get current prices from oracle
 */
export async function getPrices(): Promise<PriceInfo | null> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::get_prices`,
        functionArguments: [],
      },
    });

    return {
      apt_price: Number(result[0]),
      usdc_price: Number(result[1]),
      last_update: Number(result[2]),
    };
  } catch (error) {
    console.error("Error fetching prices:", error);
    return null;
  }
}

/**
 * Get registry statistics
 */
export async function getRegistryStats(): Promise<RegistryStats | null> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::get_registry_stats`,
        functionArguments: [],
      },
    });

    return {
      total_pools: Number(result[0]),
      total_volume_supplied: String(result[1]),
      total_volume_borrowed: String(result[2]),
      total_liquidations: Number(result[3]),
    };
  } catch (error) {
    console.error("Error fetching registry stats:", error);
    return null;
  }
}

/**
 * Calculate health factor for a user
 */
export async function calculateHealthFactor(
  userAddress: string
): Promise<string | null> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::calculate_health_factor`,
        functionArguments: [userAddress],
      },
    });

    return String(result[0]);
  } catch (error) {
    console.error("Error calculating health factor:", error);
    return null;
  }
}

/**
 * Helper: Convert health factor from u128 (18 decimals) to readable number
 */
export function formatHealthFactor(healthFactorU128: string): number {
  const PRECISION_18 = BigInt("1000000000000000000"); // 1e18
  const healthBigInt = BigInt(healthFactorU128);
  return Number(healthBigInt) / Number(PRECISION_18);
}

/**
 * Helper: Convert APR from basis points to percentage
 */
export function formatApr(basisPoints: number): number {
  return basisPoints / 100; // 10000 basis points = 100%
}

/**
 * Helper: Calculate max borrow amount based on collateral and LTV
 */
export function calculateMaxBorrow(
  collateralAmount: number,
  aptPrice: number,
  ltvRatio: number = 0.75
): number {
  const collateralValue = collateralAmount * aptPrice;
  const maxBorrowValue = collateralValue * ltvRatio;
  return maxBorrowValue / aptPrice; // Convert back to APT
}

/**
 * Helper: Check if position is liquidatable
 */
export function isLiquidatable(healthFactorU128: string): boolean {
  const MIN_HEALTH_FACTOR = BigInt("1000000000000000000"); // 1e18 = 1.0
  return BigInt(healthFactorU128) < MIN_HEALTH_FACTOR;
}
