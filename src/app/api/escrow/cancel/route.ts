/**
 * API Route: Cancel Escrow
 * Cancels an escrow and refunds to sender
 */

import { NextRequest, NextResponse } from "next/server";
import { cancelEscrow } from "@/lib/aptos";
import { EphemeralKeyPair } from "@aptos-labs/ts-sdk";
import { deriveKeylessAccount } from "@/lib/keyless";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { escrowId, jwt, ephemeralKeyPairStr } = body;

    // Validate required fields
    if (escrowId === undefined || !jwt || !ephemeralKeyPairStr) {
      return NextResponse.json(
        { error: "Missing required fields: escrowId, jwt, ephemeralKeyPairStr" },
        { status: 400 }
      );
    }

    // Validate escrow ID
    const escrowIdNum = parseInt(escrowId);
    if (isNaN(escrowIdNum) || escrowIdNum < 0) {
      return NextResponse.json(
        { error: "Invalid escrow ID" },
        { status: 400 }
      );
    }

    // Reconstruct sender's KeylessAccount
    const ephemeralKeyPair = EphemeralKeyPair.fromBytes(
      Uint8Array.from(JSON.parse(ephemeralKeyPairStr).data)
    );
    const senderAccount = await deriveKeylessAccount(jwt, ephemeralKeyPair);

    // Cancel escrow on-chain
    console.log(`🚫 Cancelling escrow ${escrowIdNum} by ${senderAccount.accountAddress}`);

    const transactionHash = await cancelEscrow(
      senderAccount,
      escrowIdNum
    );

    console.log(`✅ Escrow cancelled! Transaction: ${transactionHash}`);

    return NextResponse.json({
      success: true,
      transactionHash,
      explorerUrl: `https://explorer.aptoslabs.com/txn/${transactionHash}?network=testnet`,
    });
  } catch (error) {
    console.error("❌ Cancel escrow error:", error);

    // Parse error message for user-friendly feedback
    let errorMessage = error instanceof Error ? error.message : "Failed to cancel escrow";

    if (errorMessage.includes("EESCROW_NOT_FOUND")) {
      errorMessage = "Escrow not found";
    } else if (errorMessage.includes("ENOT_AUTHORIZED")) {
      errorMessage = "You are not authorized to cancel this escrow";
    } else if (errorMessage.includes("EALREADY_RELEASED")) {
      errorMessage = "Escrow has already been released";
    } else if (errorMessage.includes("ECANCELLED")) {
      errorMessage = "Escrow has already been cancelled";
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
