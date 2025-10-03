import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  EphemeralKeyPair,
  KeylessAccount
} from "@aptos-labs/ts-sdk";
import { TokenSymbol, TOKENS, toUnits, fromUnits } from "./tokens";

const APTOS_NETWORK = (process.env.NEXT_PUBLIC_APTOS_NETWORK || "testnet") as Network;

const config = new AptosConfig({
  network: APTOS_NETWORK,
});

export const aptos = new Aptos(config);

/**
 * Get token balance for an address
 * @param address - Aptos address
 * @param token - Token symbol (APT or USDC)
 * @returns Balance in human-readable format
 */
export async function getBalance(address: string, token: TokenSymbol = 'APT'): Promise<number> {
  try {
    if (token === 'APT') {
      // Get APT balance using SDK method
      const balance = await aptos.getAccountAPTAmount({
        accountAddress: address,
      });
      return fromUnits(balance, 'APT');
    } else if (token === 'USDC') {
      // Get USDC balance using primary_fungible_store::balance view function
      const usdcConfig = TOKENS.USDC;
      const result = await aptos.view({
        payload: {
          function: '0x1::primary_fungible_store::balance',
          typeArguments: ['0x1::fungible_asset::Metadata'],
          functionArguments: [address, usdcConfig.address],
        },
      });

      const balance = result[0] as string;
      return fromUnits(parseInt(balance), 'USDC');
    }

    return 0;
  } catch (error) {
    console.error(`Error fetching ${token} balance:`, error);
    return 0;
  }
}

/**
 * Transfer tokens (APT or USDC)
 * @param from - Sender account
 * @param to - Recipient address
 * @param amount - Amount in human-readable format
 * @param token - Token symbol (default: APT)
 * @returns Transaction hash
 */
export async function transfer(
  from: Account | KeylessAccount,
  to: string,
  amount: number,
  token: TokenSymbol = 'APT'
): Promise<string> {
  const tokenConfig = TOKENS[token];
  const amountInUnits = toUnits(amount, token);

  let transaction;

  if (token === 'APT') {
    // APT transfer using coin transfer
    transaction = await aptos.transaction.build.simple({
      sender: from.accountAddress,
      data: {
        function: tokenConfig.transferFunction,
        functionArguments: [to, amountInUnits],
      },
    });
  } else if (token === 'USDC') {
    // USDC transfer using fungible asset transfer
    const usdcConfig = TOKENS.USDC;
    transaction = await aptos.transaction.build.simple({
      sender: from.accountAddress,
      data: {
        function: usdcConfig.transferFunction,
        typeArguments: [...(usdcConfig.typeArguments || [])],
        functionArguments: [
          usdcConfig.address, // USDC metadata object address
          to,
          amountInUnits,
        ],
      },
    });
  } else {
    throw new Error(`Unsupported token: ${token}`);
  }

  const pendingTransaction = await aptos.signAndSubmitTransaction({
    signer: from,
    transaction,
  });

  const committedTransaction = await aptos.waitForTransaction({
    transactionHash: pendingTransaction.hash,
  });

  return committedTransaction.hash;
}

/**
 * Legacy APT transfer function (kept for backward compatibility)
 * @deprecated Use transfer() instead
 */
export async function transferAPT(
  from: Account | KeylessAccount,
  to: string,
  amount: number
): Promise<string> {
  return transfer(from, to, amount, 'APT');
}

// ======================== Escrow Functions ========================

const ESCROW_MODULE_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_MODULE_ADDRESS || "0xCAFE";

export interface EscrowDetails {
  escrowId: number;
  sender: string;
  recipient: string;
  amount: number; // In APT (human-readable)
  released: boolean;
  cancelled: boolean;
}

export interface EscrowStats {
  totalEscrows: number;
  totalReleased: number;
  totalCancelled: number;
  totalVolume: number; // In APT (human-readable)
}

/**
 * Create a new escrow payment
 * @param sender - Sender's KeylessAccount or Account
 * @param recipient - Recipient's Aptos address
 * @param amount - Amount in APT (human-readable, e.g., 1.5)
 * @param memo - Optional memo/description
 * @returns Transaction hash
 */
export async function createEscrow(
  sender: Account | KeylessAccount,
  recipient: string,
  amount: number,
  memo: string = ""
): Promise<string> {
  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  if (!recipient || recipient === "0x0") {
    throw new Error("Invalid recipient address");
  }

  const amountInOctas = toUnits(amount, 'APT');

  const transaction = await aptos.transaction.build.simple({
    sender: sender.accountAddress,
    data: {
      function: `${ESCROW_MODULE_ADDRESS}::payment_escrow::create_escrow`,
      functionArguments: [
        recipient,
        amountInOctas,
        new TextEncoder().encode(memo), // Convert string to vector<u8>
      ],
    },
  });

  const pendingTransaction = await aptos.signAndSubmitTransaction({
    signer: sender,
    transaction,
  });

  const committedTransaction = await aptos.waitForTransaction({
    transactionHash: pendingTransaction.hash,
  });

  return committedTransaction.hash;
}

/**
 * Release an escrow to the recipient
 * @param recipient - Recipient's KeylessAccount or Account
 * @param escrowId - ID of the escrow to release
 * @returns Transaction hash
 */
export async function releaseEscrow(
  recipient: Account | KeylessAccount,
  escrowId: number
): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    sender: recipient.accountAddress,
    data: {
      function: `${ESCROW_MODULE_ADDRESS}::payment_escrow::release_escrow`,
      functionArguments: [escrowId],
    },
  });

  const pendingTransaction = await aptos.signAndSubmitTransaction({
    signer: recipient,
    transaction,
  });

  const committedTransaction = await aptos.waitForTransaction({
    transactionHash: pendingTransaction.hash,
  });

  return committedTransaction.hash;
}

/**
 * Cancel an escrow and refund to sender
 * @param sender - Sender's KeylessAccount or Account
 * @param escrowId - ID of the escrow to cancel
 * @returns Transaction hash
 */
export async function cancelEscrow(
  sender: Account | KeylessAccount,
  escrowId: number
): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    sender: sender.accountAddress,
    data: {
      function: `${ESCROW_MODULE_ADDRESS}::payment_escrow::cancel_escrow`,
      functionArguments: [escrowId],
    },
  });

  const pendingTransaction = await aptos.signAndSubmitTransaction({
    signer: sender,
    transaction,
  });

  const committedTransaction = await aptos.waitForTransaction({
    transactionHash: pendingTransaction.hash,
  });

  return committedTransaction.hash;
}

/**
 * Check if an escrow exists
 * @param escrowId - ID of the escrow
 * @returns True if escrow exists
 */
export async function escrowExists(escrowId: number): Promise<boolean> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${ESCROW_MODULE_ADDRESS}::payment_escrow::escrow_exists`,
        functionArguments: [escrowId],
      },
    });
    return result[0] as boolean;
  } catch (error) {
    console.error("Error checking escrow existence:", error);
    return false;
  }
}

/**
 * Get escrow details
 * @param escrowId - ID of the escrow
 * @returns Escrow details or null if not found
 */
export async function getEscrowDetails(escrowId: number): Promise<EscrowDetails | null> {
  try {
    const exists = await escrowExists(escrowId);
    if (!exists) {
      return null;
    }

    const result = await aptos.view({
      payload: {
        function: `${ESCROW_MODULE_ADDRESS}::payment_escrow::get_escrow_details`,
        functionArguments: [escrowId],
      },
    });

    // Result is [sender, recipient, amount, released, cancelled]
    const [sender, recipient, amount, released, cancelled] = result as [string, string, number, boolean, boolean];

    return {
      escrowId,
      sender,
      recipient,
      amount: fromUnits(amount, 'APT'),
      released,
      cancelled,
    };
  } catch (error) {
    console.error("Error fetching escrow details:", error);
    return null;
  }
}

/**
 * Get escrow registry statistics
 * @returns Registry stats or null on error
 */
export async function getEscrowStats(): Promise<EscrowStats | null> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${ESCROW_MODULE_ADDRESS}::payment_escrow::get_registry_stats`,
        functionArguments: [],
      },
    });

    // Result is [total_escrows, total_released, total_cancelled, total_volume]
    const [totalEscrows, totalReleased, totalCancelled, totalVolume] = result as [number, number, number, number];

    return {
      totalEscrows,
      totalReleased,
      totalCancelled,
      totalVolume: fromUnits(totalVolume, 'APT'),
    };
  } catch (error) {
    console.error("Error fetching escrow stats:", error);
    return null;
  }
}

/**
 * Get all escrows for a user (as sender or recipient)
 * This requires indexing events since Move doesn't support iteration
 * For now, returns empty array - will be implemented with event indexing
 */
export async function getUserEscrows(_userAddress: string): Promise<EscrowDetails[]> {
  // TODO: Implement event indexing to fetch user's escrows
  // This would require:
  // 1. Querying EscrowCreatedEvent events
  // 2. Filtering by sender or recipient
  // 3. Checking current status via get_escrow_details
  console.warn("getUserEscrows not yet implemented - requires event indexing");
  return [];
}

export { Network, Account, EphemeralKeyPair, KeylessAccount };