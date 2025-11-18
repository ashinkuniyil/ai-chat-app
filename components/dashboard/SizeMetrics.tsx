import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface SizeMetricsProps {
  metrics: {
    avgWordCount: number;
    avgTokenCount: number;
    avgCharsPerResponse: number;
  };
  trends: {
    wordCountDelta: number;
  };
}

export function SizeMetrics({ metrics, trends }: SizeMetricsProps) {
  // Prepare data for size comparison
  const sizeData = [
    {
      metric: "Words",
      count: Math.round(metrics.avgWordCount),
    },
    {
      metric: "Tokens",
      count: Math.round(metrics.avgTokenCount),
    },
    {
      metric: "Characters",
      count: Math.round(metrics.avgCharsPerResponse),
    },
  ];

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

  return (
    <div className="space-y-6 mb-8">
      {/* Section Header */}
      <div>
        <h2 className="text-2xl font-bold">Size Metrics</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Response size in words, tokens, and characters
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Average Response Size</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">vs previous period:</span>
            <TrendIndicator value={trends.wordCountDelta} />
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sizeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px"
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend />
              <Bar dataKey="count" fill="hsl(var(--chart-4))" name="Average Count" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-muted-foreground">Avg Words</div>
              <div className="text-2xl font-bold">{metrics.avgWordCount.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">per response</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-muted-foreground">Avg Tokens</div>
              <div className="text-2xl font-bold">{metrics.avgTokenCount.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">approximate</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-muted-foreground">Avg Characters</div>
              <div className="text-2xl font-bold">{metrics.avgCharsPerResponse.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">per response</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
