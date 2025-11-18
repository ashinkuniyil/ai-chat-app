import { NextRequest, NextResponse } from "next/server";
import { createWebVital } from "@/lib/models";
import { MetricName, MetricRating } from "@/lib/types";

export const dynamic = "force-dynamic";

interface WebVitalPayload {
  sessionId: string;
  userId: string;
  metric: MetricName;
  value: number;
  rating: MetricRating;
  pageUrl: string;
  userAgent?: string;
  device?: "mobile" | "tablet" | "desktop";
}

export async function POST(request: NextRequest) {
  try {
    const body: WebVitalPayload = await request.json();

    // Validate required fields
    if (!body.sessionId || !body.userId || !body.metric || body.value === undefined || !body.rating) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate metric name
    const validMetrics: MetricName[] = ["LCP", "INP", "CLS", "FCP", "TTFB"];
    if (!validMetrics.includes(body.metric)) {
      return NextResponse.json(
        { error: `Invalid metric. Must be one of: ${validMetrics.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate rating
    const validRatings: MetricRating[] = ["good", "needs-improvement", "poor"];
    if (!validRatings.includes(body.rating)) {
      return NextResponse.json(
        { error: `Invalid rating. Must be one of: ${validRatings.join(", ")}` },
        { status: 400 }
      );
    }

    // Create Web Vital record
    const webVital = await createWebVital({
      sessionId: body.sessionId,
      userId: body.userId,
      metric: body.metric,
      value: body.value,
      rating: body.rating,
      timestamp: new Date(),
      pageUrl: body.pageUrl,
      userAgent: body.userAgent,
      device: body.device,
    });

    console.log(`[Web Vitals] Recorded ${body.metric} for user ${body.userId}: ${body.value} (${body.rating})`);

    return NextResponse.json(
      { success: true, id: webVital._id },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Web Vitals API] Error:", error);
    return NextResponse.json(
      { error: "Failed to record web vital" },
      { status: 500 }
    );
  }
}
