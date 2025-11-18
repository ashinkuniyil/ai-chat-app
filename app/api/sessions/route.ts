import { NextRequest, NextResponse } from "next/server";
import { getSessionsByUserId } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    const sessions = await getSessionsByUserId(userId);

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[Sessions API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
