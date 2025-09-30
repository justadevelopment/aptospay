/**
 * API Route: Claim Payment
 * Server-side payment claiming with account registration
 * NO TRANSACTION EXECUTION - just marks recipient ready
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, recipientEmail, recipientAddress } = body;

    if (!paymentId || !recipientEmail || !recipientAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Get payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    if (payment.status !== "pending") {
      return NextResponse.json(
        { error: `Payment already ${payment.status}` },
        { status: 400 }
      );
    }

    // Register email mapping
    await prisma.emailMapping.upsert({
      where: { email: recipientEmail.toLowerCase() },
      update: { aptosAddress: recipientAddress },
      create: { email: recipientEmail.toLowerCase(), aptosAddress: recipientAddress },
    });

    // Register user
    await prisma.user.upsert({
      where: { email: recipientEmail.toLowerCase() },
      update: { aptosAddress: recipientAddress },
      create: { email: recipientEmail.toLowerCase(), aptosAddress: recipientAddress },
    });

    // Update payment with recipient address (still pending)
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        recipientAddress,
        // Status stays "pending" until sender executes transaction
      },
    });

    return NextResponse.json({
      success: true,
      message: "Recipient registered. Waiting for sender to execute transfer.",
      payment: {
        id: payment.id,
        amount: payment.amount,
        senderAddress: payment.senderAddress,
        recipientAddress,
      },
    });
  } catch (error) {
    console.error("Claim payment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to claim payment" },
      { status: 500 }
      );
  }
}
