"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";

interface WebVitalsData {
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
}

interface WebVitalsMetricsProps {
  data: WebVitalsData;
}

export default function WebVitalsMetrics({ data }: WebVitalsMetricsProps) {
  // Check if we have any data
  const hasLcpData = data.lcp.timeSeries.length > 0;
  const hasTotalData = data.lcp.good + data.lcp.needsImprovement + data.lcp.poor > 0 ||
                       data.inp.good + data.inp.needsImprovement + data.inp.poor > 0 ||
                       data.cls.good + data.cls.needsImprovement + data.cls.poor > 0;

  // Format LCP time series data for chart
  const lcpTimeSeriesData = data.lcp.timeSeries.map((item) => ({
    timestamp: new Date(item.timestamp).toLocaleDateString(),
    value: item.value,
  }));

  // Prepare data for metrics comparison
  const metricsComparison = [
    {
      metric: "LCP",
      avg: data.lcp.avg,
      p75: data.lcp.p75,
      p95: data.lcp.p95,
    },
    {
      metric: "INP",
      avg: data.inp.avg,
      p75: data.inp.p75,
      p95: data.inp.p95,
    },
    {
      metric: "CLS",
      avg: data.cls.avg * 100, // Scale CLS for visibility
      p75: data.cls.p75 * 100,
      p95: data.cls.p95 * 100,
    },
  ];

  // Prepare rating distribution data
  const ratingDistribution = [
    {
      metric: "LCP",
      good: data.lcp.good,
      needsImprovement: data.lcp.needsImprovement,
      poor: data.lcp.poor,
    },
    {
      metric: "INP",
      good: data.inp.good,
      needsImprovement: data.inp.needsImprovement,
      poor: data.inp.poor,
    },
    {
      metric: "CLS",
      good: data.cls.good,
      needsImprovement: data.cls.needsImprovement,
      poor: data.cls.poor,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Web Vitals Performance</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Core Web Vitals metrics tracked from user interactions
          </p>
        </div>
      </div>

      {/* Show message if no data */}
      {!hasTotalData && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">No Web Vitals data collected yet</p>
              <p className="text-sm text-muted-foreground">
                Data will appear here once users interact with the application and performance metrics are captured.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show charts only if we have data */}
      {hasTotalData && (
        <>
      {/* LCP Time Series */}
      {hasLcpData && (
      <Card>
        <CardHeader>
          <CardTitle>Largest Contentful Paint (LCP) Over Time</CardTitle>
          <CardDescription>
            LCP measures loading performance. Good: &lt;2.5s, Needs Improvement: 2.5-4s, Poor: &gt;4s
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lcpTimeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="timestamp"
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "currentColor" }}
                label={{ value: "LCP (ms)", angle: -90, position: "insideLeft" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="LCP (ms)"
                dot={{ fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      )}

      {/* Metrics Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Web Vitals Metrics Comparison</CardTitle>
          <CardDescription>
            Average, 75th percentile (p75), and 95th percentile (p95) values
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metricsComparison}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="metric"
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "currentColor" }}
                label={{ value: "Value (ms or ×100 for CLS)", angle: -90, position: "insideLeft" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Legend />
              <Bar dataKey="avg" fill="hsl(var(--primary))" name="Average" />
              <Bar dataKey="p75" fill="hsl(var(--secondary))" name="P75" />
              <Bar dataKey="p95" fill="hsl(var(--destructive))" name="P95" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Rating Distribution</CardTitle>
          <CardDescription>
            Distribution of good, needs improvement, and poor ratings per metric
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ratingDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="number"
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <YAxis
                type="category"
                dataKey="metric"
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Legend />
              <Bar dataKey="good" fill="#22c55e" name="Good" stackId="a" />
              <Bar dataKey="needsImprovement" fill="#f59e0b" name="Needs Improvement" stackId="a" />
              <Bar dataKey="poor" fill="#ef4444" name="Poor" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Metrics Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">LCP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.lcp.avg.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              p95: {data.lcp.p95.toFixed(0)}ms
            </p>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="text-green-600">Good: {data.lcp.good}</span>
              <span className="text-yellow-600">Fair: {data.lcp.needsImprovement}</span>
              <span className="text-red-600">Poor: {data.lcp.poor}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">INP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.inp.avg.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              p95: {data.inp.p95.toFixed(0)}ms
            </p>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="text-green-600">Good: {data.inp.good}</span>
              <span className="text-yellow-600">Fair: {data.inp.needsImprovement}</span>
              <span className="text-red-600">Poor: {data.inp.poor}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">CLS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.cls.avg.toFixed(3)}
            </div>
            <p className="text-xs text-muted-foreground">
              p95: {data.cls.p95.toFixed(3)}
            </p>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="text-green-600">Good: {data.cls.good}</span>
              <span className="text-yellow-600">Fair: {data.cls.needsImprovement}</span>
              <span className="text-red-600">Poor: {data.cls.poor}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      </>
      )}
    </div>
  );
}
