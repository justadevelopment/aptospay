/**
 * API Route: Create Payment Link
 * Server-side payment creation with database persistence
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { validateEmail, validatePaymentAmount } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, recipientEmail, senderAddress } = body;

    // Validate inputs
    const amountValidation = validatePaymentAmount(amount.toString());
    const emailValidation = validateEmail(recipientEmail);

    if (!amountValidation.isValid) {
      return NextResponse.json(
        { error: amountValidation.error },
        { status: 400 }
      );
    }

    if (!emailValidation.isValid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      );
    }

    const prisma = await getPrisma();

    if (!prisma) {
      return NextResponse.json(
        { error: "Database connection required for production" },
        { status: 500 }
      );
    }

    // Generate unique payment ID
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create payment in database
    const payment = await prisma.payment.create({
      data: {
        id: paymentId,
        amount: parseFloat(amount),
        recipientEmail: recipientEmail.toLowerCase(),
        senderAddress: senderAddress || null,
        status: "pending",
      },
    });

    const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/$${amount}/to/${recipientEmail}?id=${payment.id}`;

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      paymentUrl,
    });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payment" },
      { status: 500 }
    );
  }
}
