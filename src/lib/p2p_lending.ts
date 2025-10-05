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
 * Note: Uses resource check since pool_exists() is not a view function in deployed contract
 */
export async function poolExists(): Promise<boolean> {
  try {
    await aptos.getAccountResource({
      accountAddress: LENDING_CONTRACT_ADDRESS,
      resourceType: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::LendingPool`,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get lending pool details
 * Note: Fetches resource directly since get_pool_details() is not a view function in deployed contract
 */
export async function getPoolDetails(): Promise<LendingPoolDetails | null> {
  try {
    const resource = await aptos.getAccountResource({
      accountAddress: LENDING_CONTRACT_ADDRESS,
      resourceType: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::LendingPool`,
    });

    const data = resource.data as {
      pool_coins: number;
      total_borrowed: number;
      borrow_rate: number;
      supply_rate: number;
      borrow_index: string;
      supply_index: string;
    };

    return {
      total_liquidity: Number(data.pool_coins),
      total_borrowed: Number(data.total_borrowed),
      current_borrow_rate: Number(data.borrow_rate),
      current_supply_rate: Number(data.supply_rate),
      borrow_index: String(data.borrow_index),
      supply_index: String(data.supply_index),
    };
  } catch {
    return null;
  }
}

/**
 * Get user position details
 * Note: Returns null because positions are stored in a Table and get_position_details() is not a view function
 * This is a known limitation of the deployed contract - positions cannot be queried from frontend
 */
export async function getPositionDetails(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userAddress: string
): Promise<UserPosition | null> {
  // Position data is stored in a Table inside PositionRegistry resource
  // Without a view function, we cannot access table entries from the frontend
  // This would need contract redeployment with #[view] attributes
  return null;
}

/**
 * Check if user has a position
 * Note: Checks by attempting to fetch position details since position_exists() is not a view function
 */
export async function positionExists(userAddress: string): Promise<boolean> {
  const position = await getPositionDetails(userAddress);
  return position !== null && (
    position.supplied_amount > 0 ||
    position.borrowed_amount > 0 ||
    position.collateral_amount > 0
  );
}

/**
 * Get current prices from oracle
 * Note: Fetches resource directly since get_prices() is not a view function in deployed contract
 */
export async function getPrices(): Promise<PriceInfo | null> {
  try {
    const resource = await aptos.getAccountResource({
      accountAddress: LENDING_CONTRACT_ADDRESS,
      resourceType: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::PriceOracle`,
    });

    const data = resource.data as {
      apt_price: number;
      usdc_price: number;
      last_update: number;
    };

    return {
      apt_price: Number(data.apt_price),
      usdc_price: Number(data.usdc_price),
      last_update: Number(data.last_update),
    };
  } catch {
    return null;
  }
}

/**
 * Get registry statistics
 * Note: Fetches resource directly since get_registry_stats() is not a view function in deployed contract
 */
export async function getRegistryStats(): Promise<RegistryStats | null> {
  try {
    const resource = await aptos.getAccountResource({
      accountAddress: LENDING_CONTRACT_ADDRESS,
      resourceType: `${LENDING_CONTRACT_ADDRESS}::p2p_lending::LendingRegistry`,
    });

    const data = resource.data as {
      total_pools: number;
      total_volume_supplied: string;
      total_volume_borrowed: string;
      total_liquidations: number;
    };

    return {
      total_pools: Number(data.total_pools),
      total_volume_supplied: String(data.total_volume_supplied),
      total_volume_borrowed: String(data.total_volume_borrowed),
      total_liquidations: Number(data.total_liquidations),
    };
  } catch {
    return null;
  }
}

/**
 * Calculate health factor for a user
 * Note: Returns null because calculate_health_factor() is not a view function and positions are in a Table
 * This is a known limitation of the deployed contract
 */
export async function calculateHealthFactor(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userAddress: string
): Promise<string | null> {
  // Cannot calculate health factor without view function or direct position access
  // Position data is stored in a Table which cannot be queried from frontend
  return null;
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
