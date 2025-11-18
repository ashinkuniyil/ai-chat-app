import { useState, useCallback, useRef } from "react";
import { Message, StreamEvent, Suggestion } from "@/lib/types";

interface UseChatOptions {
  sessionId: string;
  userId: string;
  onError?: (error: Error) => void;
}

interface ChatMetrics {
  ttft?: number;
  totalTime?: number;
}

export function useChat({ sessionId, userId, onError }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentSuggestions, setCurrentSuggestions] = useState<Suggestion[]>([]);
  const [metrics, setMetrics] = useState<ChatMetrics>({});
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || isStreaming) return;

      // Add user message optimistically
      const userMessage: Message = {
        sessionId,
        userId,
        role: "user",
        content: prompt,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setStreamingContent("");
      setCurrentSuggestions([]);
      setMetrics({});
      setStreamError(null);
      setLastFailedPrompt(null);

      try {
        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            userId,
            prompt,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          let errorMessage = `Failed to send message (status: ${response.status})`;

          try {
            const errorData = await response.text();
            if (errorData) {
              errorMessage = errorData;
            }
          } catch {
            // If we can't parse the error, use the default message
          }

          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              try {
                const event: StreamEvent = JSON.parse(data);

                if (event.type === "token") {
                  setStreamingContent((prev) => prev + event.content);
                } else if (event.type === "done") {
                  // Add complete assistant message
                  const assistantMessage: Message = {
                    sessionId,
                    userId,
                    role: "assistant",
                    content: event.fullText,
                    suggestions: event.suggestions,
                    createdAt: new Date(),
                    metrics: {
                      requestStartAt: new Date(event.metrics.requestStart),
                      firstTokenAt: new Date(event.metrics.firstTokenAt),
                      completedAt: new Date(event.metrics.completedAt),
                      ttft: event.metrics.ttft,
                      totalTime: event.metrics.totalTime,
                    },
                  };

                  setMessages((prev) => [...prev, assistantMessage]);
                  setCurrentSuggestions(event.suggestions);
                  setMetrics({
                    ttft: event.metrics.ttft,
                    totalTime: event.metrics.totalTime,
                  });
                  setStreamingContent("");
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Request aborted");
          setStreamError(new Error("Request was cancelled"));
          setLastFailedPrompt(prompt);
        } else {
          console.error("Error sending message:", error);
          const errorObj = error as Error;
          setStreamError(errorObj);
          setLastFailedPrompt(prompt);
          onError?.(errorObj);
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [sessionId, userId, isStreaming, onError]
  );

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setStreamingContent("");
    }
  }, []);

  const retryLastMessage = useCallback(() => {
    if (lastFailedPrompt && !isStreaming) {
      setStreamError(null);
      sendMessage(lastFailedPrompt);
    }
  }, [lastFailedPrompt, isStreaming, sendMessage]);

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);

      if (!response.ok) {
        // Handle different error cases
        if (response.status === 404) {
          // Session doesn't exist yet - this is expected for new sessions
          console.log(`Session ${sessionId} not found - will be created on first message`);
          setMessages([]);
          setCurrentSuggestions([]);
          setMetrics({});
          return;
        }

        // For other errors, try to get the error message from the response
        let errorMessage = `Failed to load session (status: ${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If we can't parse the error, use the default message
        }

        const error = new Error(errorMessage);
        console.error("Error loading messages:", error);
        onError?.(error);
        return;
      }

      const data = await response.json();
      setMessages(data.session.messages || []);
      setMetrics({});
      setCurrentSuggestions([]);
    } catch (error) {
      // Network errors or other unexpected errors
      console.error("Error loading messages:", error);
      onError?.(error as Error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return {
    messages,
    isStreaming,
    streamingContent,
    currentSuggestions,
    metrics,
    streamError,
    lastFailedPrompt,
    sendMessage,
    stopStreaming,
    retryLastMessage,
    loadMessages,
  };
}
