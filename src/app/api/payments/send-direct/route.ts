/**
 * API Route: Send Direct Transfer
 * Directly transfer APT to an address without payment link flow
 */

import { NextRequest, NextResponse } from "next/server";
import { aptos, transferAPT } from "@/lib/aptos";
import { EphemeralKeyPair } from "@aptos-labs/ts-sdk";
import { deriveKeylessAccount } from "@/lib/keyless";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, recipientAddress, jwt, ephemeralKeyPairStr } = body;

    if (!amount || !recipientAddress || !jwt || !ephemeralKeyPairStr) {
      return NextResponse.json(
        { error: "Missing required fields" },
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
    const ephemeralKeyPair = EphemeralKeyPair.fromBytes(
      Uint8Array.from(JSON.parse(ephemeralKeyPairStr).data)
    );
    const senderAccount = await deriveKeylessAccount(jwt, ephemeralKeyPair);

    // Check sender balance
    const senderResources = await aptos.getAccountResources({
      accountAddress: senderAccount.accountAddress,
    });

    const aptCoinStore = senderResources.find(
      (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
    );

    if (!aptCoinStore || !("data" in aptCoinStore)) {
      return NextResponse.json(
        { error: "Sender account has no APT balance" },
        { status: 400 }
      );
    }

    const senderBalance =
      parseInt((aptCoinStore.data as { coin: { value: string } }).coin.value) /
      100000000;

    if (senderBalance < amount) {
      return NextResponse.json(
        {
          error: `Insufficient balance. You have ${senderBalance.toFixed(
            4
          )} APT but need ${amount} APT`,
        },
        { status: 400 }
      );
    }

    // Execute transfer
    console.log(
      `🔥 DIRECT TRANSFER: ${amount} APT from ${senderAccount.accountAddress} to ${recipientAddress}`
    );

    const transactionHash = await transferAPT(
      senderAccount,
      recipientAddress,
      amount
    );

    console.log(`✅ Transfer successful! Hash: ${transactionHash}`);

    return NextResponse.json({
      success: true,
      transactionHash,
      amount,
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
