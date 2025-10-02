/**
 * API Route: Register User
 * Creates email mapping and user record after successful Google OAuth
 */

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, aptosAddress } = body;

    if (!email || !aptosAddress) {
      return NextResponse.json(
        { error: "Email and Aptos address are required" },
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

    // Validate Aptos address format
    if (!aptosAddress.match(/^0x[a-fA-F0-9]{64}$/)) {
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

    // Register email mapping
    await prisma.emailMapping.upsert({
      where: { email: email.toLowerCase() },
      update: { aptosAddress },
      create: { email: email.toLowerCase(), aptosAddress },
    });

    // Register user
    await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: { aptosAddress },
      create: { email: email.toLowerCase(), aptosAddress },
    });

    return NextResponse.json({
      success: true,
      message: "User registered successfully",
      email: email.toLowerCase(),
      aptosAddress
    });
  } catch (error) {
    console.error("User registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to register user" },
      { status: 500 }
    );
  }
}
