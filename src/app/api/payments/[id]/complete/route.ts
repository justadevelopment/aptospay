/**
 * API Route: Complete Payment
 * Marks payment as completed with transaction hash
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const paymentId = resolvedParams.id;
    const body = await request.json();
    const { transactionHash, recipientAddress } = body;

    if (!transactionHash) {
      return NextResponse.json(
        { error: "Transaction hash is required" },
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

    // Update payment
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "claimed",
        transactionHash,
        recipientAddress: recipientAddress || undefined,
        claimedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Complete payment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete payment" },
      { status: 500 }
    );
  }
}
