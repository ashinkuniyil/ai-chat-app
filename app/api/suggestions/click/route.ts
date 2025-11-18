import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { incrementSuggestionClick } from "@/lib/models";

interface ClickSuggestionRequest {
  suggestionId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ClickSuggestionRequest = await request.json();
    const { suggestionId } = body;

    // Validate suggestion ID
    if (!suggestionId || !ObjectId.isValid(suggestionId)) {
      return NextResponse.json(
        { error: "Invalid suggestion ID" },
        { status: 400 }
      );
    }

    // Increment click count for global suggestion
    await incrementSuggestionClick(new ObjectId(suggestionId));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Click Suggestion API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
