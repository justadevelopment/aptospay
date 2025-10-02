/**
 * API Route: Create Escrow
 * Creates a new escrow payment using the Move contract
 */

import { NextRequest, NextResponse } from "next/server";
import { createEscrow } from "@/lib/aptos";
import { EphemeralKeyPair } from "@aptos-labs/ts-sdk";
import { deriveKeylessAccount } from "@/lib/keyless";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipient, amount, memo = "", jwt, ephemeralKeyPairStr } = body;

    // Validate required fields
    if (!recipient || !amount || !jwt || !ephemeralKeyPairStr) {
      return NextResponse.json(
        { error: "Missing required fields: recipient, amount, jwt, ephemeralKeyPairStr" },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Validate recipient address format
    if (!recipient.match(/^0x[a-fA-F0-9]{1,64}$/)) {
      return NextResponse.json(
        { error: "Invalid Aptos address format" },
        { status: 400 }
      );
    }

    // Reconstruct sender's KeylessAccount
    const ephemeralKeyPair = EphemeralKeyPair.fromBytes(
      Uint8Array.from(JSON.parse(ephemeralKeyPairStr).data)
    );
    const senderAccount = await deriveKeylessAccount(jwt, ephemeralKeyPair);

    // Create escrow on-chain
    console.log(`🔐 Creating escrow: ${amountNum} APT from ${senderAccount.accountAddress} to ${recipient}`);

    const transactionHash = await createEscrow(
      senderAccount,
      recipient,
      amountNum,
      memo
    );

    console.log(`✅ Escrow created! Transaction: ${transactionHash}`);

    return NextResponse.json({
      success: true,
      transactionHash,
      explorerUrl: `https://explorer.aptoslabs.com/txn/${transactionHash}?network=testnet`,
    });
  } catch (error) {
    console.error("❌ Create escrow error:", error);

    // Parse error message for user-friendly feedback
    let errorMessage = error instanceof Error ? error.message : "Failed to create escrow";

    if (errorMessage.includes("EINSUFFICIENT_BALANCE")) {
      errorMessage = "Insufficient balance to create escrow";
    } else if (errorMessage.includes("EINVALID_AMOUNT")) {
      errorMessage = "Invalid amount specified";
    } else if (errorMessage.includes("EINVALID_RECIPIENT")) {
      errorMessage = "Invalid recipient address";
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
