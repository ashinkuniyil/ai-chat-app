import { NextRequest, NextResponse } from "next/server";
import { getSessionDetail } from "@/lib/models";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session ID" },
        { status: 400 }
      );
    }

    const session = await getSessionDetail(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Debug: Check if suggestions have ranks before serialization
    session.messages.forEach((msg, idx) => {
      if (msg.suggestions && Array.isArray(msg.suggestions) && msg.suggestions.length > 0) {
        console.log(`[API] Message ${idx} suggestions:`, msg.suggestions.map((s: any) =>
          typeof s === 'object' ? { text: s.text?.substring(0, 30), rank: s.rank, _id: s._id } : s
        ));
      }
    });

    // Serialize ObjectIds and ensure proper JSON conversion
    const serializedSession = JSON.parse(JSON.stringify(session));

    return NextResponse.json({ session: serializedSession });
  } catch (error) {
    console.error("[Session Detail API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
