/**
 * API Route: Get Transaction History
 * Fetches all payments sent and received by a user's Aptos address
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Validate Aptos address format
    if (!address.match(/^0x[a-fA-F0-9]{64}$/)) {
      return NextResponse.json(
        { error: "Invalid Aptos address format" },
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

    // Fetch all payments where user is sender or recipient
    const [sent, received] = await Promise.all([
      // Payments sent by this address
      prisma.payment.findMany({
        where: { senderAddress: address },
        orderBy: { createdAt: "desc" },
      }),
      // Payments received by this address
      prisma.payment.findMany({
        where: { recipientAddress: address },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Combine and sort by date
    const allTransactions = [...sent, ...received].sort((a, b) =>
      b.createdAt.getTime() - a.createdAt.getTime()
    );

    // Format transactions with user-friendly labels
    const formatted = allTransactions.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      type: tx.senderAddress === address ? "sent" : "received",
      recipientEmail: tx.recipientEmail,
      senderAddress: tx.senderAddress,
      recipientAddress: tx.recipientAddress,
      status: tx.status,
      transactionHash: tx.transactionHash,
      createdAt: tx.createdAt,
      claimedAt: tx.claimedAt,
      errorMessage: tx.errorMessage,
      explorerUrl: tx.transactionHash
        ? `https://explorer.aptoslabs.com/txn/${tx.transactionHash}?network=testnet`
        : null,
    }));

    return NextResponse.json({
      success: true,
      address,
      transactions: formatted,
      summary: {
        total: formatted.length,
        sent: sent.length,
        received: received.length,
        completed: formatted.filter(tx => tx.status === "claimed").length,
        pending: formatted.filter(tx => tx.status === "pending").length,
      },
    });
  } catch (error) {
    console.error("Transaction history error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
