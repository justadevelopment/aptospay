/**
 * API Route: Send Direct Transfer
 * Directly transfer APT or USDC to an address without payment link flow
 */

import { NextRequest, NextResponse } from "next/server";
import { transfer, getBalance } from "@/lib/aptos";
import { TokenSymbol } from "@/lib/tokens";
import { getEphemeralKeyPair, deriveKeylessAccount } from "@/lib/keyless";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, recipientAddress, jwt, nonce, token = 'APT' } = body;

    if (!amount || !recipientAddress || !jwt || !nonce) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate token
    if (token !== 'APT' && token !== 'USDC') {
      return NextResponse.json(
        { error: "Invalid token. Must be APT or USDC" },
        { status: 400 }
      );
    }

    // Validate address format
    if (!recipientAddress.match(/^0x[a-fA-F0-9]{64}$/)) {
      return NextResponse.json(
        { error: "Invalid Aptos address format" },
        { status: 400 }
      );
    }

    // Reconstruct sender's KeylessAccount
    const ephemeralKeyPair = getEphemeralKeyPair(nonce);

    if (!ephemeralKeyPair) {
      return NextResponse.json(
        { error: "Ephemeral key pair not found. Please sign in again." },
        { status: 401 }
      );
    }

    const senderAccount = await deriveKeylessAccount(jwt, ephemeralKeyPair);

    // Check sender balance
    const senderBalance = await getBalance(senderAccount.accountAddress.toString(), token as TokenSymbol);

    if (senderBalance < amount) {
      return NextResponse.json(
        {
          error: `Insufficient balance. You have ${senderBalance.toFixed(6)} ${token} but need ${amount} ${token}`,
        },
        { status: 400 }
      );
    }

    // Execute transfer
    console.log(
      `🔥 DIRECT TRANSFER: ${amount} ${token} from ${senderAccount.accountAddress} to ${recipientAddress}`
    );

    const transactionHash = await transfer(
      senderAccount,
      recipientAddress,
      amount,
      token as TokenSymbol
    );

    console.log(`✅ Transfer successful! Hash: ${transactionHash}`);

    return NextResponse.json({
      success: true,
      transactionHash,
      amount,
      token,
      recipientAddress,
    });
  } catch (error) {
    console.error("Direct transfer error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send payment",
      },
      { status: 500 }
    );
  }
}
