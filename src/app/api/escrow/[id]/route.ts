/**
 * API Route: Get Escrow Details
 * Fetches details of a specific escrow
 */

import { NextRequest, NextResponse } from "next/server";
import { getEscrowDetails } from "@/lib/aptos";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const escrowId = parseInt(id);

    if (isNaN(escrowId) || escrowId < 0) {
      return NextResponse.json(
        { error: "Invalid escrow ID" },
        { status: 400 }
      );
    }

    const escrowDetails = await getEscrowDetails(escrowId);

    if (!escrowDetails) {
      return NextResponse.json(
        { error: "Escrow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      escrow: escrowDetails,
    });
  } catch (error) {
    console.error("Error fetching escrow details:", error);

    return NextResponse.json(
      { error: "Failed to fetch escrow details" },
      { status: 500 }
    );
  }
}
