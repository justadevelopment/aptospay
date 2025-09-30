/**
 * API Route: Execute Payment Transfer
 * REAL APT TRANSFER - requires sender's KeylessAccount
 * This is the ONLY place where actual blockchain transactions happen
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { aptos, transferAPT } from "@/lib/aptos";
import { KeylessAccount, EphemeralKeyPair } from "@aptos-labs/ts-sdk";
import { deriveKeylessAccount } from "@/lib/keyless";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, jwt, ephemeralKeyPairStr } = body;

    if (!paymentId || !jwt || !ephemeralKeyPairStr) {
      return NextResponse.json(
        { error: "Missing required fields: paymentId, jwt, ephemeralKeyPairStr" },
        { status: 400 }
      );
    }

    const prisma = await getPrisma();

    if (!prisma) {
      return NextResponse.json(
        { error: "Database connection required" },
        { status: 500 }
      );
    }

    // Get payment from database
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    if (!payment.recipientAddress) {
      return NextResponse.json(
        { error: "Payment has not been claimed yet. Recipient must claim first." },
        { status: 400 }
      );
    }

    if (payment.transactionHash) {
      return NextResponse.json(
        { error: "Payment already executed", transactionHash: payment.transactionHash },
        { status: 400 }
      );
    }

    // Reconstruct sender's KeylessAccount from JWT
    const ephemeralKeyPair = EphemeralKeyPair.fromJSON(ephemeralKeyPairStr);
    const senderAccount = await deriveKeylessAccount(jwt, ephemeralKeyPair);

    // Verify sender address matches
    if (payment.senderAddress && senderAccount.accountAddress.toString() !== payment.senderAddress) {
      return NextResponse.json(
        { error: "Sender address mismatch" },
        { status: 403 }
      );
    }

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

    const senderBalance = parseInt((aptCoinStore.data as { coin: { value: string } }).coin.value) / 100000000;

    if (senderBalance < payment.amount) {
      return NextResponse.json(
        {
          error: `Insufficient balance. You have ${senderBalance.toFixed(4)} APT but need ${payment.amount} APT`,
        },
        { status: 400 }
      );
    }

    // Execute REAL APT transfer on blockchain
    console.log(`🔥 EXECUTING REAL TRANSACTION: ${payment.amount} APT from ${senderAccount.accountAddress} to ${payment.recipientAddress}`);

    const transactionHash = await transferAPT(
      senderAccount,
      payment.recipientAddress,
      payment.amount
    );

    console.log(`✅ TRANSACTION SUCCESSFUL: ${transactionHash}`);

    // Update payment in database with REAL transaction hash
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "claimed",
        transactionHash,
        claimedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      transactionHash,
      explorerUrl: `https://explorer.aptoslabs.com/txn/${transactionHash}?network=testnet`,
    });
  } catch (error) {
    console.error("❌ Payment execution error:", error);

    // Update payment status to failed
    try {
      const prisma = await getPrisma();
      if (prisma && body.paymentId) {
        await prisma.payment.update({
          where: { id: body.paymentId },
          data: {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Transfer failed",
          },
        });
      }
    } catch (dbError) {
      console.error("Failed to update payment status:", dbError);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute transfer" },
      { status: 500 }
    );
  }
}
