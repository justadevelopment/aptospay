/**
 * API Route: Resolve Email to Aptos Address
 * Looks up email in database to find associated Aptos address
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
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

    // Look up email mapping
    const mapping = await prisma.emailMapping.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!mapping) {
      return NextResponse.json(
        {
          error: "Email not found. Recipient must sign in to AptosPay first to create their account.",
          exists: false
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      email: mapping.email,
      aptosAddress: mapping.aptosAddress,
      exists: true
    });
  } catch (error) {
    console.error("Email resolution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve email" },
      { status: 500 }
    );
  }
}
