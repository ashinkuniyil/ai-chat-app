"use client";

import { useState, useRef, useEffect, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  onStop?: () => void;
  isStreaming?: boolean;
}

const ChatInput = memo(function ChatInput({
  onSend,
  disabled = false,
  onStop,
  isStreaming = false,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;

    onSend(input);
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t bg-background p-3 sm:p-4"
    >
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={
              isStreaming
                ? "Streaming response..."
                : "Type your message... (Enter to send, Shift+Enter for new line)"
            }
            rows={1}
            className="resize-none max-h-32 overflow-y-auto leading-tight min-h-[42px] sm:min-h-[46px]"
            aria-label="Chat message input"
          />
        </div>

        {isStreaming ? (
          <Button
            type="button"
            onClick={onStop}
            variant="destructive"
            size="lg"
            className="flex-shrink-0 h-[42px] sm:h-[46px]"
            aria-label="Stop generating response"
          >
            Stop
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={disabled || !input.trim()}
            size="lg"
            className="flex-shrink-0 h-[42px] sm:h-[46px]"
            aria-label="Send message"
          >
            Send
          </Button>
        )}
      </div>

      <div className="mt-2 text-xs text-muted-foreground text-center max-w-4xl mx-auto">
        Press Enter to send, Shift+Enter for new line
      </div>
    </form>
  );
});

export default ChatInput;
