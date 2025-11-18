import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface VolumeMetricsProps {
  metrics: {
    totalChats: number;
    totalMessages: number;
    messagesPerUser: Record<string, number>;
    suggestionClickRate: number;
    totalSuggestionClicks: number;
    totalSuggestionImpressions: number;
  };
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

export function VolumeMetrics({ metrics }: VolumeMetricsProps) {
  // Prepare data for messages per user chart
  const messagesPerUserData = Object.entries(metrics.messagesPerUser).map(([userId, count]) => ({
    user: userId === "user_1" ? "User 1" : userId === "user_2" ? "User 2" : userId,
    messages: count,
  }));

  // Prepare data for suggestion engagement
  const suggestionData = [
    {
      name: "Clicked",
      value: metrics.totalSuggestionClicks,
    },
    {
      name: "Not Clicked",
      value: metrics.totalSuggestionImpressions - metrics.totalSuggestionClicks,
    },
  ];

  return (
    <div className="space-y-6 mb-8">
      {/* Section Header */}
      <div>
        <h2 className="text-2xl font-bold">Volume Metrics</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Message counts and user activity
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Messages per User</CardTitle>
        </CardHeader>
        <CardContent>
          {messagesPerUserData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={messagesPerUserData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="user" stroke="hsl(var(--muted-foreground))" />
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
                <Bar dataKey="messages" fill="hsl(var(--chart-1))" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suggestion Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.totalSuggestionImpressions > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={suggestionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {suggestionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px"
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No suggestion data available
            </div>
          )}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Total Suggestions: {metrics.totalSuggestionImpressions} | Clicks: {metrics.totalSuggestionClicks}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
