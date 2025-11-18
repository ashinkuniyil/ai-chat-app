"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Minus, ArrowLeft } from "lucide-react";
import { VolumeMetrics } from "@/components/dashboard/VolumeMetrics";
import { LatencyMetrics } from "@/components/dashboard/LatencyMetrics";
import { SizeMetrics } from "@/components/dashboard/SizeMetrics";
import { TopTables } from "@/components/dashboard/TopTables";
import WebVitalsMetrics from "@/components/dashboard/WebVitalsMetrics";

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
    ttftDelta: number;
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

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("7d");

  useEffect(() => {
    fetchMetrics();
  }, [userId, timeRange]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (userId !== "all") params.append("userId", userId);

      // Calculate date range
      const now = new Date();
      const to = now.toISOString();
      let from: string;

      switch (timeRange) {
        case "24h":
          from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          break;
        case "7d":
          from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case "30d":
          from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        default:
          from = new Date(0).toISOString();
      }

      params.append("from", from);
      params.append("to", to);

      const response = await fetch(`/api/dashboard/metrics?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch metrics");

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const TrendIndicator = ({ value }: { value: number }) => {
    if (Math.abs(value) < 0.1) {
      return (
        <span className="flex items-center text-muted-foreground">
          <Minus className="h-4 w-4 mr-1" />
          <span className="text-sm">0%</span>
        </span>
      );
    }

    const isPositive = value > 0;
    const Icon = isPositive ? ArrowUp : ArrowDown;
    const color = isPositive ? "text-green-500" : "text-red-500";

    return (
      <span className={`flex items-center ${color}`}>
        <Icon className="h-4 w-4 mr-1" />
        <span className="text-sm font-semibold">{Math.abs(value).toFixed(1)}%</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">Analytics Dashboard</h1>
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">Analytics Dashboard</h1>
          <div className="text-center py-12">
            <p className="text-destructive text-lg">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Chat
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="user_1">User 1</SelectItem>
                <SelectItem value="user_2">User 2</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
            <TrendIndicator value={metrics.trends.messageDelta} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.volume.totalChats}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.volume.totalMessages} messages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <TrendIndicator value={metrics.trends.totalTimeDelta} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.latency.avgTotalTime.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              95th: {metrics.latency.p95TotalTime.toFixed(0)}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg TTFT</CardTitle>
            <TrendIndicator value={metrics.trends.ttftDelta} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.latency.avgTtft.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              95th: {metrics.latency.p95Ttft.toFixed(0)}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suggestion Click Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.volume.suggestionClickRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.volume.totalSuggestionClicks} / {metrics.volume.totalSuggestionImpressions} clicks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Volume Metrics */}
      <VolumeMetrics metrics={metrics.volume} />

      {/* Latency Metrics */}
      <LatencyMetrics metrics={metrics.latency} />

      {/* Size Metrics */}
      <SizeMetrics metrics={metrics.size} trends={metrics.trends} />

      {/* Top Tables */}
      <TopTables
        slowestTurns={metrics.slowestTurns}
        topClickedSuggestions={metrics.topClickedSuggestions}
        topRatedSuggestions={metrics.topRatedSuggestions}
      />

      {/* Web Vitals Metrics - Only show if data exists */}
      {metrics.webVitals && (
        <div className="mt-8">
          <WebVitalsMetrics data={metrics.webVitals} />
        </div>
      )}
      </div>
    </div>
  );
}
