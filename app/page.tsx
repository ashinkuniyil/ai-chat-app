"use client";

import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";
import { useChat } from "@/hooks/useChat";
import { useWebVitals } from "@/hooks/useWebVitals";
import Message from "@/components/Message";
import ChatInput from "@/components/ChatInput";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarChart3 } from "lucide-react";

export default function Home() {
  const [userId, setUserId] = useState("user_1");
  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isStreaming,
    streamingContent,
    currentSuggestions,
    streamError,
    lastFailedPrompt,
    sendMessage,
    stopStreaming,
    retryLastMessage,
    loadMessages,
  } = useChat({
    sessionId,
    userId,
    onError: (err) => setError(err.message),
  });

  // Initialize Web Vitals tracking
  useWebVitals({ userId, enabled: true });

  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent]);

  const handleSend = (message: string) => {
    setError(null);
    sendMessage(message);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleNewChat = () => {
    setSessionId(uuidv4());
    setError(null);
  };

  const handleUserSwitch = (newUserId: string) => {
    setUserId(newUserId);
    setSessionId(uuidv4());
    setError(null);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex-shrink-0 border-b bg-card px-4 py-3 sm:px-6 sm:py-4">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              AI Chat App
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Suggestion-driven chat with observability
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
            {/* User selector */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="user-select"
                className="text-xs sm:text-sm text-foreground whitespace-nowrap"
              >
                User:
              </label>
              <Select value={userId} onValueChange={handleUserSwitch}>
                <SelectTrigger className="w-[100px] h-9 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user_1">User 1</SelectItem>
                  <SelectItem value="user_2">User 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dashboard link */}
            <Link href="/dashboard">
              <Button
                variant="secondary"
                size="sm"
                className="h-9"
                aria-label="View analytics dashboard"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                <span>Dashboard</span>
              </Button>
            </Link>

            {/* New chat button */}
            <Button
              onClick={handleNewChat}
              size="sm"
              className="h-9"
              aria-label="Start new chat"
            >
              New Chat
            </Button>
          </div>
        </div>
      </header>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        <div className="max-w-4xl mx-auto">
          {/* Error message */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Stream error with retry */}
          {streamError && lastFailedPrompt && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Stream interrupted</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>{streamError.message}</span>
                <Button
                  onClick={retryLastMessage}
                  size="sm"
                  variant="outline"
                  className="ml-4"
                  aria-label="Retry last message"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Welcome message */}
          {messages.length === 0 && !isStreaming && (
            <div className="text-center py-8 sm:py-12 px-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                Welcome to AI Chat!
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                Start a conversation by typing a message below.
              </p>
              <div className="flex flex-col gap-2 sm:gap-2.5 max-w-md mx-auto">
                <Button
                  onClick={() => handleSend("Hello!")}
                  variant="secondary"
                  className="w-full"
                >
                  Say hello
                </Button>
                <Button
                  onClick={() => handleSend("What can you help me with?")}
                  variant="secondary"
                  className="w-full"
                >
                  What can you help me with?
                </Button>
                <Button
                  onClick={() => handleSend("Tell me about programming")}
                  variant="secondary"
                  className="w-full"
                >
                  Tell me about programming
                </Button>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message, index) => (
            <Message
              key={index}
              message={message}
              sessionId={sessionId}
              userId={userId}
              onSuggestionClick={handleSuggestionClick}
            />
          ))}

          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <Message
              message={{
                sessionId,
                userId,
                role: "assistant",
                content: streamingContent,
                createdAt: new Date(),
              }}
              sessionId={sessionId}
              userId={userId}
              onSuggestionClick={handleSuggestionClick}
              isStreaming={true}
              streamingContent={streamingContent}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming}
        onStop={stopStreaming}
        isStreaming={isStreaming}
      />
    </div>
  );
}
