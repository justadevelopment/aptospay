/**
 * Vesting Stream Contract Integration
 *
 * Interacts with the deployed vesting_stream.move contract
 */

import { aptos } from "./aptos";
import { KeylessAccount } from "@aptos-labs/ts-sdk";

// Contract address (deployed on testnet)
const VESTING_CONTRACT_ADDRESS = "0x2b6848d433930a6cec8b474f9adcf2d58a1f5f88d5e17f8718a0a93737660efe";

export interface VestingStream {
  stream_id: number;
  sender: string;
  recipient: string;
  total_amount: number; // in Octas
  claimed_amount: number; // in Octas
  start_time: number; // Unix timestamp
  end_time: number; // Unix timestamp
  cliff_time: number; // Unix timestamp (0 if no cliff)
  cancelled: boolean;
}

export interface RegistryStats {
  total_streams: number;
  total_completed: number;
  total_cancelled: number;
  total_volume: number; // in Octas
}

/**
 * Create a new vesting stream
 */
export async function createVestingStream(
  senderAccount: KeylessAccount,
  recipient: string,
  totalAmount: number, // in APT (will convert to Octas)
  startTime: number, // Unix timestamp
  endTime: number, // Unix timestamp
  cliffTime: number = 0 // Unix timestamp (0 for no cliff)
): Promise<string> {
  const totalAmountOctas = Math.floor(totalAmount * 100_000_000); // Convert APT to Octas

  const transaction = await aptos.transaction.build.simple({
    sender: senderAccount.accountAddress,
    data: {
      function: `${VESTING_CONTRACT_ADDRESS}::vesting_stream::create_stream`,
      functionArguments: [
        recipient,
        totalAmountOctas,
        startTime,
        endTime,
        cliffTime,
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
 * Claim vested tokens from a stream
 */
export async function claimVested(
  recipientAccount: KeylessAccount,
  streamId: number
): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    sender: recipientAccount.accountAddress,
    data: {
      function: `${VESTING_CONTRACT_ADDRESS}::vesting_stream::claim_vested`,
      functionArguments: [streamId],
    },
  });

  const pendingTxn = await aptos.signAndSubmitTransaction({
    signer: recipientAccount,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: pendingTxn.hash,
  });

  return pendingTxn.hash;
}

/**
 * Cancel a stream and refund unvested tokens
 */
export async function cancelStream(
  senderAccount: KeylessAccount,
  streamId: number
): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    sender: senderAccount.accountAddress,
    data: {
      function: `${VESTING_CONTRACT_ADDRESS}::vesting_stream::cancel_stream`,
      functionArguments: [streamId],
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
 * Get stream details
 */
export async function getStreamDetails(streamId: number): Promise<VestingStream | null> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${VESTING_CONTRACT_ADDRESS}::vesting_stream::get_stream_details`,
        functionArguments: [streamId],
      },
    });

    const [sender, recipient, total_amount, claimed_amount, start_time, end_time, cliff_time, cancelled] = result;

    return {
      stream_id: streamId,
      sender: sender as string,
      recipient: recipient as string,
      total_amount: parseInt(total_amount as string),
      claimed_amount: parseInt(claimed_amount as string),
      start_time: parseInt(start_time as string),
      end_time: parseInt(end_time as string),
      cliff_time: parseInt(cliff_time as string),
      cancelled: cancelled as boolean,
    };
  } catch (_error) {
    console.error(`Stream ${streamId} not found:`, _error);
    return null;
  }
}

/**
 * Calculate vested amount for a stream
 */
export async function calculateVestedAmount(streamId: number): Promise<number> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${VESTING_CONTRACT_ADDRESS}::vesting_stream::calculate_vested_amount`,
        functionArguments: [streamId],
      },
    });

    return parseInt(result[0] as string);
  } catch (_error) {
    console.error("Error calculating vested amount:", _error);
    return 0;
  }
}

/**
 * Calculate claimable amount (vested - claimed)
 */
export async function calculateClaimableAmount(streamId: number): Promise<number> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${VESTING_CONTRACT_ADDRESS}::vesting_stream::calculate_claimable_amount`,
        functionArguments: [streamId],
      },
    });

    return parseInt(result[0] as string);
  } catch (_error) {
    console.error("Error calculating claimable amount:", _error);
    return 0;
  }
}

/**
 * Check if a stream exists
 */
export async function streamExists(streamId: number): Promise<boolean> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${VESTING_CONTRACT_ADDRESS}::vesting_stream::stream_exists`,
        functionArguments: [streamId],
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
export async function getRegistryStats(): Promise<RegistryStats> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${VESTING_CONTRACT_ADDRESS}::vesting_stream::get_registry_stats`,
      },
    });

    const [total_streams, total_completed, total_cancelled, total_volume] = result;

    return {
      total_streams: parseInt(total_streams as string),
      total_completed: parseInt(total_completed as string),
      total_cancelled: parseInt(total_cancelled as string),
      total_volume: parseInt(total_volume as string),
    };
  } catch (_error) {
    console.error("Error fetching registry stats:", _error);
    return {
      total_streams: 0,
      total_completed: 0,
      total_cancelled: 0,
      total_volume: 0,
    };
  }
}

/**
 * Get all streams for an address (as sender or recipient)
 * Note: This requires iterating through stream IDs since Move doesn't have reverse lookups
 * For production, consider using indexer or events
 */
export async function getStreamsForAddress(
  address: string,
  maxStreamId: number = 100
): Promise<VestingStream[]> {
  const streams: VestingStream[] = [];

  // This is inefficient but works for hackathon demo
  // Production should use Aptos indexer to query events
  for (let streamId = 1; streamId <= maxStreamId; streamId++) {
    const stream = await getStreamDetails(streamId);
    if (stream && (stream.sender === address || stream.recipient === address)) {
      streams.push(stream);
    }
  }

  return streams;
}

/**
 * Calculate vesting progress percentage (0-100)
 */
export function calculateVestingProgress(stream: VestingStream): number {
  const now = Math.floor(Date.now() / 1000);

  // Before start
  if (now < stream.start_time) {
    return 0;
  }

  // After end
  if (now >= stream.end_time) {
    return 100;
  }

  // Before cliff
  if (stream.cliff_time > 0 && now < stream.cliff_time) {
    return 0;
  }

  // During vesting
  const elapsed = now - stream.start_time;
  const duration = stream.end_time - stream.start_time;
  return Math.floor((elapsed / duration) * 100);
}

/**
 * Format amount from Octas to APT
 */
export function formatOctasToAPT(octas: number): string {
  const apt = octas / 100_000_000;
  return apt.toFixed(8).replace(/\.?0+$/, "");
}

/**
 * Get human-readable vesting status
 */
export function getVestingStatus(stream: VestingStream): string {
  const now = Math.floor(Date.now() / 1000);

  if (stream.cancelled) {
    return "Cancelled";
  }

  if (now < stream.start_time) {
    return "Pending";
  }

  if (stream.cliff_time > 0 && now < stream.cliff_time) {
    return "In Cliff";
  }

  if (now >= stream.end_time) {
    return stream.claimed_amount === stream.total_amount ? "Completed" : "Ended";
  }

  return "Active";
}
