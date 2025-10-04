/**
 * Enhanced Escrow V2 Contract Integration
 *
 * Factory-based escrow system with time locks and optional arbitration
 */

import { aptos } from "./aptos";
import { KeylessAccount } from "@aptos-labs/ts-sdk";

// Contract address (same as vesting - all modules deployed together)
const CONTRACT_ADDRESS = "0x2b6848d433930a6cec8b474f9adcf2d58a1f5f88d5e17f8718a0a93737660efe";

// Escrow types
export const ESCROW_TYPE_STANDARD = 0;
export const ESCROW_TYPE_TIME_LOCKED = 1;
export const ESCROW_TYPE_ARBITRATED = 2;

export interface EscrowV2 {
  escrow_id: number;
  escrow_type: number;
  sender: string;
  recipient: string;
  arbitrator: string | null;
  amount: number; // in Octas
  release_time: number; // Unix timestamp (0 if no restriction)
  expiry_time: number; // Unix timestamp (0 if no expiry)
  released: boolean;
  cancelled: boolean;
  released_by: string | null;
}

export interface EscrowV2Stats {
  total_escrows: number;
  total_released: number;
  total_cancelled: number;
  total_expired: number;
  total_standard: number;
  total_time_locked: number;
  total_arbitrated: number;
  total_volume: number; // in Octas
}

/**
 * Create a standard escrow (backward compatible with v1)
 */
export async function createStandardEscrow(
  senderAccount: KeylessAccount,
  recipient: string,
  amount: number, // in APT (will convert to Octas)
  memo: string = ""
): Promise<string> {
  const amountOctas = Math.floor(amount * 100_000_000);

  const transaction = await aptos.transaction.build.simple({
    sender: senderAccount.accountAddress,
    data: {
      function: `${CONTRACT_ADDRESS}::escrow_v2::create_standard_escrow`,
      functionArguments: [
        recipient,
        amountOctas,
        Array.from(new TextEncoder().encode(memo)),
      ],
    },
  });

  const pendingTxn = await aptos.signAndSubmitTransaction({
    signer: senderAccount,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: pendingTxn.hash,
  });

  return pendingTxn.hash;
}

/**
 * Create a time-locked escrow with auto-release and expiry
 */
export async function createTimeLockedEscrow(
  senderAccount: KeylessAccount,
  recipient: string,
  amount: number, // in APT
  memo: string = "",
  releaseTime: number, // Unix timestamp
  expiryTime: number // Unix timestamp
): Promise<string> {
  const amountOctas = Math.floor(amount * 100_000_000);

  const transaction = await aptos.transaction.build.simple({
    sender: senderAccount.accountAddress,
    data: {
      function: `${CONTRACT_ADDRESS}::escrow_v2::create_time_locked_escrow`,
      functionArguments: [
        recipient,
        amountOctas,
        Array.from(new TextEncoder().encode(memo)),
        releaseTime,
        expiryTime,
      ],
    },
  });

  const pendingTxn = await aptos.signAndSubmitTransaction({
    signer: senderAccount,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: pendingTxn.hash,
  });

  return pendingTxn.hash;
}

/**
 * Create an arbitrated escrow with third-party dispute resolution
 */
export async function createArbitratedEscrow(
  senderAccount: KeylessAccount,
  recipient: string,
  arbitrator: string,
  amount: number, // in APT
  memo: string = "",
  expiryTime: number = 0 // Unix timestamp (0 for no expiry)
): Promise<string> {
  const amountOctas = Math.floor(amount * 100_000_000);

  const transaction = await aptos.transaction.build.simple({
    sender: senderAccount.accountAddress,
    data: {
      function: `${CONTRACT_ADDRESS}::escrow_v2::create_arbitrated_escrow`,
      functionArguments: [
        recipient,
        arbitrator,
        amountOctas,
        Array.from(new TextEncoder().encode(memo)),
        expiryTime,
      ],
    },
  });

  const pendingTxn = await aptos.signAndSubmitTransaction({
    signer: senderAccount,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: pendingTxn.hash,
  });

  return pendingTxn.hash;
}

/**
 * Release escrow to recipient (can be called by recipient or arbitrator)
 */
export async function releaseEscrow(
  callerAccount: KeylessAccount,
  escrowId: number
): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    sender: callerAccount.accountAddress,
    data: {
      function: `${CONTRACT_ADDRESS}::escrow_v2::release_escrow`,
      functionArguments: [escrowId],
    },
  });

  const pendingTxn = await aptos.signAndSubmitTransaction({
    signer: callerAccount,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: pendingTxn.hash,
  });

  return pendingTxn.hash;
}

/**
 * Cancel escrow and refund to sender
 */
export async function cancelEscrow(
  senderAccount: KeylessAccount,
  escrowId: number
): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    sender: senderAccount.accountAddress,
    data: {
      function: `${CONTRACT_ADDRESS}::escrow_v2::cancel_escrow`,
      functionArguments: [escrowId],
    },
  });

  const pendingTxn = await aptos.signAndSubmitTransaction({
    signer: senderAccount,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: pendingTxn.hash,
  });

  return pendingTxn.hash;
}

/**
 * Claim expired escrow (auto-refund to sender)
 * Anyone can call this after expiry_time
 */
export async function claimExpiredEscrow(
  callerAccount: KeylessAccount,
  escrowId: number
): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    sender: callerAccount.accountAddress,
    data: {
      function: `${CONTRACT_ADDRESS}::escrow_v2::claim_expired_escrow`,
      functionArguments: [escrowId],
    },
  });

  const pendingTxn = await aptos.signAndSubmitTransaction({
    signer: callerAccount,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: pendingTxn.hash,
  });

  return pendingTxn.hash;
}

/**
 * Get escrow details
 */
export async function getEscrowDetails(escrowId: number): Promise<EscrowV2 | null> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESS}::escrow_v2::get_escrow_details`,
        functionArguments: [escrowId],
      },
    });

    const [escrow_type, sender, recipient, arbitrator_opt, amount, release_time, expiry_time, released, cancelled] = result;

    // Parse optional arbitrator
    let arbitrator: string | null = null;
    if (Array.isArray(arbitrator_opt) && arbitrator_opt.length > 0) {
      const innerArray = arbitrator_opt[0];
      if (Array.isArray(innerArray) && innerArray.length > 0) {
        arbitrator = innerArray[0] as string;
      }
    }

    return {
      escrow_id: escrowId,
      escrow_type: parseInt(escrow_type as string),
      sender: sender as string,
      recipient: recipient as string,
      arbitrator,
      amount: parseInt(amount as string),
      release_time: parseInt(release_time as string),
      expiry_time: parseInt(expiry_time as string),
      released: released as boolean,
      cancelled: cancelled as boolean,
      released_by: null, // Not returned by view function
    };
  } catch (error) {
    console.error(`Escrow ${escrowId} not found:`, error);
    return null;
  }
}

/**
 * Check if escrow exists
 */
export async function escrowExists(escrowId: number): Promise<boolean> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESS}::escrow_v2::escrow_exists`,
        functionArguments: [escrowId],
      },
    });

    return result[0] as boolean;
  } catch {
    return false;
  }
}

/**
 * Check if escrow has expired
 */
export async function isExpired(escrowId: number): Promise<boolean> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESS}::escrow_v2::is_expired`,
        functionArguments: [escrowId],
      },
    });

    return result[0] as boolean;
  } catch {
    return false;
  }
}

/**
 * Check if escrow can be claimed
 */
export async function isClaimable(escrowId: number): Promise<boolean> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESS}::escrow_v2::is_claimable`,
        functionArguments: [escrowId],
      },
    });

    return result[0] as boolean;
  } catch {
    return false;
  }
}

/**
 * Get registry statistics
 */
export async function getRegistryStats(): Promise<EscrowV2Stats> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESS}::escrow_v2::get_registry_stats`,
      },
    });

    const [total_escrows, total_released, total_cancelled, total_expired,
           total_standard, total_time_locked, total_arbitrated, total_volume] = result;

    return {
      total_escrows: parseInt(total_escrows as string),
      total_released: parseInt(total_released as string),
      total_cancelled: parseInt(total_cancelled as string),
      total_expired: parseInt(total_expired as string),
      total_standard: parseInt(total_standard as string),
      total_time_locked: parseInt(total_time_locked as string),
      total_arbitrated: parseInt(total_arbitrated as string),
      total_volume: parseInt(total_volume as string),
    };
  } catch (error) {
    console.error("Error fetching registry stats:", error);
    return {
      total_escrows: 0,
      total_released: 0,
      total_cancelled: 0,
      total_expired: 0,
      total_standard: 0,
      total_time_locked: 0,
      total_arbitrated: 0,
      total_volume: 0,
    };
  }
}

/**
 * Get all escrows for an address (as sender or recipient)
 * Note: This is inefficient but works for hackathon demo
 * Production should use Aptos indexer to query events
 */
export async function getEscrowsForAddress(
  address: string,
  maxEscrowId: number = 100
): Promise<EscrowV2[]> {
  const escrows: EscrowV2[] = [];

  for (let escrowId = 1; escrowId <= maxEscrowId; escrowId++) {
    const escrow = await getEscrowDetails(escrowId);
    if (escrow && (
      escrow.sender.toLowerCase() === address.toLowerCase() ||
      escrow.recipient.toLowerCase() === address.toLowerCase() ||
      (escrow.arbitrator && escrow.arbitrator.toLowerCase() === address.toLowerCase())
    )) {
      escrows.push(escrow);
    }
  }

  return escrows;
}

/**
 * Format amount from Octas to APT
 */
export function formatOctasToAPT(octas: number): string {
  const apt = octas / 100_000_000;
  return apt.toFixed(8).replace(/\.?0+$/, "");
}

/**
 * Get human-readable escrow type
 */
export function getEscrowTypeName(escrowType: number): string {
  switch (escrowType) {
    case ESCROW_TYPE_STANDARD:
      return "Standard";
    case ESCROW_TYPE_TIME_LOCKED:
      return "Time-Locked";
    case ESCROW_TYPE_ARBITRATED:
      return "Arbitrated";
    default:
      return "Unknown";
  }
}

/**
 * Get human-readable escrow status
 */
export function getEscrowStatus(escrow: EscrowV2): string {
  if (escrow.released) {
    return "Released";
  }

  if (escrow.cancelled) {
    return "Cancelled";
  }

  const now = Math.floor(Date.now() / 1000);

  if (escrow.expiry_time > 0 && now >= escrow.expiry_time) {
    return "Expired";
  }

  if (escrow.release_time > 0 && now < escrow.release_time) {
    return "Locked";
  }

  return "Active";
}

/**
 * Calculate time remaining until release or expiry
 */
export function getTimeRemaining(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = timestamp - now;

  if (diff <= 0) {
    return "Now";
  }

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}
