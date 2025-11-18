import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { ObjectId } from "mongodb";
import {
  ensureUser,
  createSession,
  findSessionById,
  createMessage,
  getMessagesBySessionId,
  getOrCreateSuggestions,
} from "@/lib/models";
import { streamLLMResponse, generateSuggestions } from "@/lib/llm/mock-llm";
import { ChatRequest, StreamEvent, MessageMetrics } from "@/lib/types";

// Disable response buffering for SSE
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { sessionId, userId, prompt } = body;

    if (!sessionId || !userId || !prompt) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Ensure user exists
    await ensureUser(userId, userId);

    // Find or create session
    let session = await findSessionById(sessionId);
    if (!session) {
      session = await createSession({
        sessionId,
        userId,
        title: prompt.slice(0, 50),
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
      });
    }

    // Save user message
    await createMessage({
      sessionId,
      userId,
      role: "user",
      content: prompt,
      createdAt: new Date(),
    });

    // Get conversation history
    const conversationHistory = await getMessagesBySessionId(sessionId);

    // Set up metrics tracking
    const metrics: MessageMetrics = {
      requestStartAt: new Date(),
    };

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    let fullText = "";
    let firstToken = true;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream the LLM response
          for await (const token of streamLLMResponse(
            prompt,
            conversationHistory
          )) {
            if (firstToken) {
              metrics.firstTokenAt = new Date();
              metrics.ttft =
                metrics.firstTokenAt.getTime() -
                metrics.requestStartAt.getTime();
              firstToken = false;

              console.log(
                `[Metrics] TTFT: ${metrics.ttft}ms for session ${sessionId}`
              );
            }

            fullText += token;

            // Send token event
            const tokenEvent: StreamEvent = {
              type: "token",
              content: token,
            };

            const data = `data: ${JSON.stringify(tokenEvent)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          // Generate suggestions
          const suggestionTexts = generateSuggestions(
            prompt,
            conversationHistory
          );

          // Complete metrics
          metrics.completedAt = new Date();
          metrics.totalTime =
            metrics.completedAt.getTime() - metrics.requestStartAt.getTime();
          metrics.tokenCount = fullText.split(/\s+/).length;

          console.log(
            `[Metrics] Total time: ${metrics.totalTime}ms, Tokens: ${metrics.tokenCount}, Session: ${sessionId}`
          );

          // Save assistant message with suggestion texts
          await createMessage({
            sessionId,
            userId,
            role: "assistant",
            content: fullText,
            suggestions: suggestionTexts,
            createdAt: new Date(),
            metrics,
          });

          // Get or create global suggestion documents with ratings
          const suggestionDocs = await getOrCreateSuggestions(suggestionTexts);

          // Send done event
          const doneEvent: StreamEvent = {
            type: "done",
            fullText,
            suggestions: suggestionDocs,
            metrics: {
              requestStart: metrics.requestStartAt.toISOString(),
              firstTokenAt: metrics.firstTokenAt?.toISOString() || "",
              completedAt: metrics.completedAt?.toISOString() || "",
              ttft: metrics.ttft || 0,
              totalTime: metrics.totalTime || 0,
            },
          };

          const data = `data: ${JSON.stringify(doneEvent)}\n\n`;
          controller.enqueue(encoder.encode(data));

          controller.close();
        } catch (error) {
          console.error("[Chat API] Error streaming response:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
