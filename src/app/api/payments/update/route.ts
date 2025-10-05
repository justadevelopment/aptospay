/**
 * API Route: Update Payment
 * Updates payment record in database after client-side execution
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, transactionHash, status } = body;

    if (!paymentId || !transactionHash) {
      return NextResponse.json(
        { error: "Missing required fields: paymentId, transactionHash" },
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

    // Update payment in database
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: status || "claimed",
        transactionHash,
        claimedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Payment update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update payment" },
      { status: 500 }
    );
  }
}
