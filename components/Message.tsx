"use client";

import { Message as MessageType, Suggestion } from "@/lib/types";
import SuggestionChips from "./SuggestionChips";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMemo, memo } from "react";

interface MessageProps {
  message: MessageType;
  sessionId: string;
  userId: string;
  onSuggestionClick: (suggestion: string) => void;
  isStreaming?: boolean;
  streamingContent?: string;
}

const Message = memo(function Message({
  message,
  sessionId,
  userId,
  onSuggestionClick,
  isStreaming = false,
  streamingContent = "",
}: MessageProps) {
  const isUser = message.role === "user";
  const displayContent = isStreaming ? streamingContent : message.content;

  // Convert string[] suggestions to Suggestion[] if needed (fallback)
  const suggestions = useMemo(() => {
    if (!message.suggestions || message.suggestions.length === 0) {
      return [];
    }

    // Check if already Suggestion objects
    if (typeof message.suggestions[0] === "object") {
      return message.suggestions as Suggestion[];
    }

    // Fallback: Convert string[] to Suggestion[] with default values
    const now = new Date();
    return (message.suggestions as string[]).map((text) => ({
      text,
      totalRating: 0,
      ratingCount: 0,
      avgRating: 0,
      clickCount: 0,
      createdAt: now,
      updatedAt: now,
    }));
  }, [message.suggestions]);

  return (
    <div
      className={cn(
        "flex mb-4 sm:mb-6",
        isUser ? "justify-end" : "justify-start"
      )}
      role="article"
      aria-label={`${isUser ? "User" : "Assistant"} message`}
    >
      <div className={cn(
        "max-w-[95%] sm:max-w-[85%] md:max-w-[80%]",
        isUser ? "order-2" : "order-1"
      )}>
        <div
          className={cn(
            "flex items-start gap-2 sm:gap-3",
            isUser ? "flex-row-reverse" : "flex-row"
          )}
        >
          {/* Avatar */}
          <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
            <AvatarFallback className={cn(
              "text-xs sm:text-sm font-semibold",
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}>
              {isUser ? "U" : "AI"}
            </AvatarFallback>
          </Avatar>

          {/* Message content */}
          <div className="flex-1 min-w-0">
            <div
              className={cn(
                "rounded-lg px-3 py-2 sm:px-4 sm:py-3",
                isUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                {displayContent}
              </p>

              {isStreaming && (
                <span
                  className="inline-block w-2 h-4 ml-1 bg-current animate-pulse"
                  aria-label="Typing indicator"
                />
              )}
            </div>

            {/* Metrics for assistant messages */}
            {!isUser && message.metrics && !isStreaming && (
              <div
                className="mt-1.5 sm:mt-2 flex gap-2"
                aria-label="Response metrics"
              >
                <Badge variant="secondary" className="text-xs">
                  TTFT: {message.metrics.ttft}ms
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Total: {message.metrics.totalTime}ms
                </Badge>
              </div>
            )}

            {/* Suggestions for assistant messages */}
            {!isUser && !isStreaming && suggestions.length > 0 && (
              <div className="mt-3 sm:mt-4">
                <SuggestionChips
                  suggestions={suggestions}
                  onSuggestionClick={onSuggestionClick}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default Message;
