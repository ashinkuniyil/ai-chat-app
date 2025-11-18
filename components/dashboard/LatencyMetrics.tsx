import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface LatencyMetricsProps {
  metrics: {
    avgTtft: number;
    p95Ttft: number;
    avgTotalTime: number;
    p95TotalTime: number;
    avgResponseTime: number;
    p95ResponseTime: number;
  };
}

export function LatencyMetrics({ metrics }: LatencyMetricsProps) {
  // Prepare data for latency comparison
  const latencyData = [
    {
      metric: "TTFT",
      average: Math.round(metrics.avgTtft),
      p95: Math.round(metrics.p95Ttft),
    },
    {
      metric: "Total Time",
      average: Math.round(metrics.avgTotalTime),
      p95: Math.round(metrics.p95TotalTime),
    },
  ];

  return (
    <div className="space-y-6 mb-8">
      {/* Section Header */}
      <div>
        <h2 className="text-2xl font-bold">Latency Metrics</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Response time and time to first token performance
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Average vs P95 Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" />
              <YAxis
                label={{ value: "Time (ms)", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))" }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px"
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend />
              <Bar dataKey="average" fill="hsl(var(--chart-2))" name="Average" />
              <Bar dataKey="p95" fill="hsl(var(--chart-3))" name="95th Percentile" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-muted-foreground">Avg TTFT</div>
              <div className="text-2xl font-bold">{metrics.avgTtft.toFixed(0)}ms</div>
              <div className="text-xs text-muted-foreground">Time to First Token</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-muted-foreground">Avg Total Time</div>
              <div className="text-2xl font-bold">{metrics.avgTotalTime.toFixed(0)}ms</div>
              <div className="text-xs text-muted-foreground">Complete Response Time</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
