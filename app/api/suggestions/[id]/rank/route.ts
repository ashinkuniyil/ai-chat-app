import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { updateSuggestionRating } from "@/lib/models";

interface RankSuggestionRequest {
  rank: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: RankSuggestionRequest = await request.json();
    const { rank } = body;

    // Validate suggestion ID
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid suggestion ID" },
        { status: 400 }
      );
    }

    // Validate rank
    if (rank === undefined || rank < 1 || rank > 5) {
      return NextResponse.json(
        { error: "Rank must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Add rating to global suggestion and recalculate average
    await updateSuggestionRating(new ObjectId(id), rank);

    return NextResponse.json({ success: true, rank }, { status: 200 });
  } catch (error) {
    console.error("[Rank Suggestion API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
