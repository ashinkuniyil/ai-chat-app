import { NextRequest, NextResponse } from "next/server";
import { getDatabase, Collections } from "@/lib/mongodb";
import { Message, Suggestion, WebVital } from "@/lib/types";

export const dynamic = "force-dynamic";

interface DashboardMetrics {
  volume: {
    totalChats: number;
    totalMessages: number;
    messagesPerUser: Record<string, number>;
    suggestionClickRate: number;
    totalSuggestionClicks: number;
    totalSuggestionImpressions: number;
  };
  latency: {
    avgTtft: number;
    p95Ttft: number;
    avgTotalTime: number;
    p95TotalTime: number;
    avgResponseTime: number;
    p95ResponseTime: number;
  };
  size: {
    avgWordCount: number;
    avgTokenCount: number;
    avgCharsPerResponse: number;
  };
  trends: {
    ttftDelta: number; // % change vs previous period
    totalTimeDelta: number;
    wordCountDelta: number;
    messageDelta: number;
  };
  slowestTurns: Array<{
    sessionId: string;
    messageId: string;
    content: string;
    ttft: number;
    totalTime: number;
    createdAt: Date;
  }>;
  topClickedSuggestions: Array<{
    text: string;
    clickCount: number;
    avgRating: number;
    ratingCount: number;
  }>;
  topRatedSuggestions: Array<{
    text: string;
    avgRating: number;
    ratingCount: number;
    clickCount: number;
  }>;
  webVitals?: {
    lcp: {
      avg: number;
      p75: number;
      p95: number;
      good: number;
      needsImprovement: number;
      poor: number;
      timeSeries: Array<{ timestamp: Date; value: number }>;
    };
    inp: {
      avg: number;
      p75: number;
      p95: number;
      good: number;
      needsImprovement: number;
      poor: number;
    };
    cls: {
      avg: number;
      p75: number;
      p95: number;
      good: number;
      needsImprovement: number;
      poor: number;
    };
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const db = await getDatabase();

    // Build date filter
    const dateFilter: any = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    // Build query filter
    const query: any = {};
    if (userId) query.userId = userId;
    if (Object.keys(dateFilter).length > 0) query.createdAt = dateFilter;

    // Calculate period duration for trends
    const periodStart = from ? new Date(from) : new Date(0);
    const periodEnd = to ? new Date(to) : new Date();
    const periodDuration = periodEnd.getTime() - periodStart.getTime();
    const previousPeriodStart = new Date(periodStart.getTime() - periodDuration);
    const previousPeriodEnd = periodStart;

    // Get all messages in current period
    const messages = await db
      .collection<Message>(Collections.MESSAGES)
      .find(query)
      .toArray();

    // Get all messages in previous period for trends
    const previousQuery = { ...query };
    if (previousQuery.createdAt) {
      previousQuery.createdAt = {
        $gte: previousPeriodStart,
        $lt: previousPeriodEnd,
      };
    } else {
      previousQuery.createdAt = {
        $gte: previousPeriodStart,
        $lt: previousPeriodEnd,
      };
    }
    const previousMessages = await db
      .collection<Message>(Collections.MESSAGES)
      .find(previousQuery)
      .toArray();

    // Get sessions count
    const sessionQuery: any = {};
    if (userId) sessionQuery.userId = userId;
    if (Object.keys(dateFilter).length > 0) sessionQuery.createdAt = dateFilter;

    const totalChats = await db
      .collection(Collections.SESSIONS)
      .countDocuments(sessionQuery);

    // Calculate volume metrics
    const totalMessages = messages.length;
    const messagesPerUser: Record<string, number> = {};
    let totalSuggestionClicks = 0;
    let totalSuggestionImpressions = 0;

    for (const message of messages) {
      messagesPerUser[message.userId] =
        (messagesPerUser[message.userId] || 0) + 1;

      // Count suggestions (impressions)
      if (message.role === "assistant" && message.suggestions) {
        const suggestionCount = Array.isArray(message.suggestions)
          ? message.suggestions.length
          : 0;
        totalSuggestionImpressions += suggestionCount;
      }
    }

    // Get suggestion click data from global suggestions
    const suggestions = await db
      .collection<Suggestion>(Collections.SUGGESTIONS)
      .find({})
      .toArray();

    totalSuggestionClicks = suggestions.reduce(
      (sum, s) => sum + s.clickCount,
      0
    );

    const suggestionClickRate =
      totalSuggestionImpressions > 0
        ? (totalSuggestionClicks / totalSuggestionImpressions) * 100
        : 0;

    // Calculate latency metrics (only for assistant messages with metrics)
    const assistantMessages = messages.filter(
      (m) => m.role === "assistant" && m.metrics
    );
    const ttftValues = assistantMessages
      .map((m) => m.metrics?.ttft)
      .filter((v): v is number => v !== undefined);
    const totalTimeValues = assistantMessages
      .map((m) => m.metrics?.totalTime)
      .filter((v): v is number => v !== undefined);

    const avgTtft =
      ttftValues.length > 0
        ? ttftValues.reduce((a, b) => a + b, 0) / ttftValues.length
        : 0;
    const avgTotalTime =
      totalTimeValues.length > 0
        ? totalTimeValues.reduce((a, b) => a + b, 0) / totalTimeValues.length
        : 0;

    // Calculate 95th percentile
    const p95Ttft = calculatePercentile(ttftValues, 95);
    const p95TotalTime = calculatePercentile(totalTimeValues, 95);

    // Calculate size metrics
    const wordCounts = assistantMessages.map((m) =>
      m.content.split(/\s+/).filter(Boolean).length
    );
    const tokenCounts = assistantMessages.map(
      (m) => m.metrics?.tokenCount || Math.ceil(m.content.length / 4)
    );
    const charCounts = assistantMessages.map((m) => m.content.length);

    const avgWordCount =
      wordCounts.length > 0
        ? wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length
        : 0;
    const avgTokenCount =
      tokenCounts.length > 0
        ? tokenCounts.reduce((a, b) => a + b, 0) / tokenCounts.length
        : 0;
    const avgCharsPerResponse =
      charCounts.length > 0
        ? charCounts.reduce((a, b) => a + b, 0) / charCounts.length
        : 0;

    // Calculate trends (compare with previous period)
    const previousAssistantMessages = previousMessages.filter(
      (m) => m.role === "assistant" && m.metrics
    );
    const previousTtftValues = previousAssistantMessages
      .map((m) => m.metrics?.ttft)
      .filter((v): v is number => v !== undefined);
    const previousTotalTimeValues = previousAssistantMessages
      .map((m) => m.metrics?.totalTime)
      .filter((v): v is number => v !== undefined);
    const previousWordCounts = previousAssistantMessages.map((m) =>
      m.content.split(/\s+/).filter(Boolean).length
    );

    const previousAvgTtft =
      previousTtftValues.length > 0
        ? previousTtftValues.reduce((a, b) => a + b, 0) /
          previousTtftValues.length
        : 0;
    const previousAvgTotalTime =
      previousTotalTimeValues.length > 0
        ? previousTotalTimeValues.reduce((a, b) => a + b, 0) /
          previousTotalTimeValues.length
        : 0;
    const previousAvgWordCount =
      previousWordCounts.length > 0
        ? previousWordCounts.reduce((a, b) => a + b, 0) /
          previousWordCounts.length
        : 0;

    const ttftDelta = calculateDelta(avgTtft, previousAvgTtft);
    const totalTimeDelta = calculateDelta(avgTotalTime, previousAvgTotalTime);
    const wordCountDelta = calculateDelta(avgWordCount, previousAvgWordCount);
    const messageDelta = calculateDelta(
      totalMessages,
      previousMessages.length
    );

    // Get slowest turns (top 10 by totalTime)
    const slowestTurns = assistantMessages
      .filter((m) => m.metrics?.totalTime)
      .sort((a, b) => (b.metrics?.totalTime || 0) - (a.metrics?.totalTime || 0))
      .slice(0, 10)
      .map((m) => ({
        sessionId: m.sessionId,
        messageId: m._id?.toString() || "",
        content: m.content.substring(0, 100) + "...",
        ttft: m.metrics?.ttft || 0,
        totalTime: m.metrics?.totalTime || 0,
        createdAt: m.createdAt,
      }));

    // Get top clicked suggestions
    const topClickedSuggestions = suggestions
      .sort((a, b) => b.clickCount - a.clickCount)
      .slice(0, 10)
      .map((s) => ({
        text: s.text,
        clickCount: s.clickCount,
        avgRating: s.avgRating,
        ratingCount: s.ratingCount,
      }));

    // Get top rated suggestions (only those with ratings)
    const topRatedSuggestions = suggestions
      .filter((s) => s.ratingCount > 0)
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 10)
      .map((s) => ({
        text: s.text,
        avgRating: s.avgRating,
        ratingCount: s.ratingCount,
        clickCount: s.clickCount,
      }));

    // Fetch Web Vitals data
    const webVitalsQuery: any = {};
    if (userId) webVitalsQuery.userId = userId;
    if (Object.keys(dateFilter).length > 0) webVitalsQuery.timestamp = dateFilter;

    const webVitalsData = await db
      .collection<WebVital>(Collections.WEBVITALS)
      .find(webVitalsQuery)
      .toArray();

    // Aggregate Web Vitals by metric type
    const webVitalsMetrics = {
      lcp: calculateWebVitalMetrics(
        webVitalsData.filter((v) => v.metric === "LCP")
      ),
      inp: calculateWebVitalMetrics(
        webVitalsData.filter((v) => v.metric === "INP")
      ),
      cls: calculateWebVitalMetrics(
        webVitalsData.filter((v) => v.metric === "CLS")
      ),
    };

    const metrics: DashboardMetrics = {
      volume: {
        totalChats,
        totalMessages,
        messagesPerUser,
        suggestionClickRate,
        totalSuggestionClicks,
        totalSuggestionImpressions,
      },
      latency: {
        avgTtft,
        p95Ttft,
        avgTotalTime,
        p95TotalTime,
        avgResponseTime: avgTotalTime,
        p95ResponseTime: p95TotalTime,
      },
      size: {
        avgWordCount,
        avgTokenCount,
        avgCharsPerResponse,
      },
      trends: {
        ttftDelta,
        totalTimeDelta,
        wordCountDelta,
        messageDelta,
      },
      slowestTurns,
      topClickedSuggestions,
      topRatedSuggestions,
      webVitals: webVitalsData.length > 0 ? webVitalsMetrics : undefined,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard metrics" },
      { status: 500 }
    );
  }
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function calculateDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function calculateWebVitalMetrics(vitals: WebVital[]) {
  if (vitals.length === 0) {
    return {
      avg: 0,
      p75: 0,
      p95: 0,
      good: 0,
      needsImprovement: 0,
      poor: 0,
      timeSeries: [],
    };
  }

  const values = vitals.map((v) => v.value);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const p75 = calculatePercentile(values, 75);
  const p95 = calculatePercentile(values, 95);

  const good = vitals.filter((v) => v.rating === "good").length;
  const needsImprovement = vitals.filter(
    (v) => v.rating === "needs-improvement"
  ).length;
  const poor = vitals.filter((v) => v.rating === "poor").length;

  // Create time series for LCP (sorted by timestamp)
  const timeSeries = vitals
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .map((v) => ({
      timestamp: v.timestamp,
      value: v.value,
    }));

  return {
    avg,
    p75,
    p95,
    good,
    needsImprovement,
    poor,
    timeSeries,
  };
}
