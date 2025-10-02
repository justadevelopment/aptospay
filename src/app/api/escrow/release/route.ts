/**
 * API Route: Release Escrow
 * Releases an escrow to the recipient
 */

import { NextRequest, NextResponse } from "next/server";
import { releaseEscrow } from "@/lib/aptos";
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

    // Reconstruct recipient's KeylessAccount
    const ephemeralKeyPair = EphemeralKeyPair.fromBytes(
      Uint8Array.from(JSON.parse(ephemeralKeyPairStr).data)
    );
    const recipientAccount = await deriveKeylessAccount(jwt, ephemeralKeyPair);

    // Release escrow on-chain
    console.log(`🔓 Releasing escrow ${escrowIdNum} to ${recipientAccount.accountAddress}`);

    const transactionHash = await releaseEscrow(
      recipientAccount,
      escrowIdNum
    );

    console.log(`✅ Escrow released! Transaction: ${transactionHash}`);

    return NextResponse.json({
      success: true,
      transactionHash,
      explorerUrl: `https://explorer.aptoslabs.com/txn/${transactionHash}?network=testnet`,
    });
  } catch (error) {
    console.error("❌ Release escrow error:", error);

    // Parse error message for user-friendly feedback
    let errorMessage = error instanceof Error ? error.message : "Failed to release escrow";

    if (errorMessage.includes("EESCROW_NOT_FOUND")) {
      errorMessage = "Escrow not found";
    } else if (errorMessage.includes("ENOT_AUTHORIZED")) {
      errorMessage = "You are not authorized to release this escrow";
    } else if (errorMessage.includes("EALREADY_RELEASED")) {
      errorMessage = "Escrow has already been released";
    } else if (errorMessage.includes("ECANCELLED")) {
      errorMessage = "Escrow has been cancelled";
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
