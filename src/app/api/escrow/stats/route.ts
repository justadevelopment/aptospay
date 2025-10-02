/**
 * API Route: Get Escrow Stats
 * Fetches global escrow registry statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { getEscrowStats } from "@/lib/aptos";

export async function GET(request: NextRequest) {
  try {
    const stats = await getEscrowStats();

    if (!stats) {
      return NextResponse.json(
        { error: "Failed to fetch escrow statistics" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching escrow stats:", error);

    return NextResponse.json(
      { error: "Failed to fetch escrow statistics" },
      { status: 500 }
    );
  }
}
