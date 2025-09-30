/**
 * API Route: Get Payment by ID
 * Server-side payment retrieval
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const prisma = await getPrisma();

    if (!prisma) {
      return NextResponse.json(
        { error: "Database connection required" },
        { status: 500 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: payment.id,
      amount: payment.amount,
      recipientEmail: payment.recipientEmail,
      senderAddress: payment.senderAddress || null,
      recipientAddress: payment.recipientAddress || null,
      status: payment.status,
      transactionHash: payment.transactionHash || null,
      createdAt: payment.createdAt.toISOString(),
      claimedAt: payment.claimedAt?.toISOString() || null,
      errorMessage: payment.errorMessage || null,
    });
  } catch (error) {
    console.error("Get payment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve payment" },
      { status: 500 }
    );
  }
}
