"use client";

import { useState, memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Suggestion } from "@/lib/types";
import { offlineQueue } from "@/lib/offlineQueue";

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  onSuggestionClick: (suggestion: string, suggestionId?: string) => void;
  disabled?: boolean;
}

const SuggestionChips = memo(function SuggestionChips({
  suggestions,
  onSuggestionClick,
  disabled = false,
}: SuggestionChipsProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [hoveredRating, setHoveredRating] = useState<Record<string, number>>(
    {}
  );

  // Debug: Log suggestions to see if ranks are loaded
  console.log("[SuggestionChips] Loaded suggestions:", suggestions);

  const handleRate = async (suggestionId: string, rating: number) => {
    setRatings((prev) => ({ ...prev, [suggestionId]: rating }));

    try {
      // Use offline queue for reliable delivery
      await offlineQueue.sendOrQueue(
        `/api/suggestions/${suggestionId}/rank`,
        "POST",
        { rank: rating }
      );
    } catch (error) {
      console.error("Error rating suggestion:", error);
    }
  };

  const handleClick = async (suggestion: Suggestion) => {
    if (disabled) return;

    // Track click with offline queue support
    if (suggestion._id) {
      try {
        await offlineQueue.sendOrQueue(
          "/api/suggestions/click",
          "POST",
          { suggestionId: suggestion._id.toString() }
        );
      } catch (error) {
        console.error("Error tracking suggestion click:", error);
      }
    }

    onSuggestionClick(suggestion.text, suggestion._id?.toString());
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    suggestion: Suggestion,
    action: "click" | "rate",
    rating?: number
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (action === "click") {
        handleClick(suggestion);
      } else if (action === "rate" && rating && suggestion._id) {
        handleRate(suggestion._id.toString(), rating);
      }
    }
  };

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2" role="group" aria-label="Follow-up suggestions">
      {suggestions.map((suggestion, index) => {
        const suggestionId = suggestion._id?.toString() || `${suggestion.text}-${index}`;
        // Show global average rating, or local state if user just rated
        const currentRating = ratings[suggestionId] || suggestion.avgRating || 0;

        return (
          <Card
            key={suggestionId}
            className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 transition-colors hover:bg-accent flex-shrink-0"
          >
            {/* Suggestion text - clickable */}
            <Button
              onClick={() => handleClick(suggestion)}
              onKeyDown={(e) => handleKeyDown(e, suggestion, "click")}
              disabled={disabled}
              variant="ghost"
              className="text-left text-xs h-auto py-0.5 px-1.5 sm:px-2 justify-start hover:text-primary font-normal focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={`Send suggestion: ${suggestion.text}`}
              tabIndex={0}
            >
              {suggestion.text}
            </Button>

            {/* Rating stars - inline */}
            <div
              className="flex items-center gap-0.5 flex-shrink-0"
              role="group"
              aria-label={`Rate suggestion: ${suggestion.text}`}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    suggestion._id && handleRate(suggestion._id.toString(), star);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, suggestion, "rate", star)}
                  onMouseEnter={() =>
                    setHoveredRating((prev) => ({ ...prev, [suggestionId]: star }))
                  }
                  onMouseLeave={() =>
                    setHoveredRating((prev) => {
                      const newRatings = { ...prev };
                      delete newRatings[suggestionId];
                      return newRatings;
                    })
                  }
                  className="h-4 w-4 sm:h-5 sm:w-5 p-0 text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
                  aria-label={`Rate ${star} out of 5 stars`}
                  aria-pressed={currentRating >= star}
                  tabIndex={0}
                >
                  <span
                    className={cn(
                      star <= (hoveredRating[suggestionId] || currentRating || 0)
                        ? "text-yellow-400"
                        : "text-muted-foreground/50"
                    )}
                  >
                    ★
                  </span>
                </Button>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
});

export default SuggestionChips;
