import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

interface TopTablesProps {
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
}

export function TopTables({
  slowestTurns,
  topClickedSuggestions,
  topRatedSuggestions,
}: TopTablesProps) {
  const RatingDisplay = ({ rating }: { rating: number }) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < Math.round(rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-muted-foreground">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Section Header */}
      <div>
        <h2 className="text-2xl font-bold">Top Performance Insights</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Slowest responses and most engaged suggestions
        </p>
      </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Slowest Turns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Slowest Turns</CardTitle>
        </CardHeader>
        <CardContent>
          {slowestTurns.length > 0 ? (
            <div className="space-y-4">
              {slowestTurns.map((turn, index) => (
                <div
                  key={turn.messageId || index}
                  className="border-b pb-3 last:border-b-0"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-semibold">#{index + 1}</span>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-500">
                        {turn.totalTime.toFixed(0)}ms
                      </div>
                      <div className="text-xs text-muted-foreground">
                        TTFT: {turn.ttft.toFixed(0)}ms
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {turn.content}
                  </p>
                  <div className="text-xs text-muted-foreground mt-1">
                    Session: {turn.sessionId.substring(0, 8)}...
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Clicked Suggestions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Clicked Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          {topClickedSuggestions.length > 0 ? (
            <div className="space-y-4">
              {topClickedSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="border-b pb-3 last:border-b-0"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-semibold">#{index + 1}</span>
                    <div className="text-right">
                      <div className="text-sm font-bold text-blue-500">
                        {suggestion.clickCount} clicks
                      </div>
                      {suggestion.ratingCount > 0 && (
                        <div className="text-xs">
                          <RatingDisplay rating={suggestion.avgRating} />
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm line-clamp-2">{suggestion.text}</p>
                  {suggestion.ratingCount > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {suggestion.ratingCount} ratings
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Rated Suggestions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Rated Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          {topRatedSuggestions.length > 0 ? (
            <div className="space-y-4">
              {topRatedSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="border-b pb-3 last:border-b-0"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-semibold">#{index + 1}</span>
                    <div className="text-right">
                      <RatingDisplay rating={suggestion.avgRating} />
                      <div className="text-xs text-muted-foreground">
                        {suggestion.ratingCount} ratings
                      </div>
                    </div>
                  </div>
                  <p className="text-sm line-clamp-2">{suggestion.text}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    {suggestion.clickCount} clicks
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No suggestions have been rated yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
