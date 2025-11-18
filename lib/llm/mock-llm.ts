import { Message } from "../types";

// Mock responses based on common prompts
const MOCK_RESPONSES: Record<string, string> = {
  hello:
    "Hello! I'm here to help you with any questions or tasks you have. How can I assist you today?",
  "how are you":
    "I'm functioning well, thank you for asking! I'm ready to help you with whatever you need.",
  "what can you do":
    "I can help you with a variety of tasks including answering questions, providing explanations, helping with problem-solving, writing, and much more. What would you like to explore?",
  weather:
    "I don't have access to real-time weather data, but I'd be happy to discuss weather patterns, climate, or help you find weather resources!",
  programming:
    "I'd be happy to help with programming! I can assist with code explanation, debugging, architecture design, best practices, and more. What programming topic interests you?",
  default:
    "That's an interesting question. Let me provide you with a thoughtful response. Based on what you're asking, I can offer several perspectives and insights that might be helpful.",
};

// Generate suggestions based on context
export function generateSuggestions(
  prompt: string,
  conversationHistory: Message[]
): string[] {
  const lowerPrompt = prompt.toLowerCase();

  // Context-aware suggestions
  if (lowerPrompt.includes("hello") || lowerPrompt.includes("hi")) {
    return [
      "What can you help me with?",
      "Tell me about your capabilities",
      "Let's discuss programming",
    ];
  }

  if (lowerPrompt.includes("programming") || lowerPrompt.includes("code")) {
    return [
      "Explain TypeScript best practices",
      "Help me debug an issue",
      "Discuss software architecture",
    ];
  }

  if (lowerPrompt.includes("weather")) {
    return [
      "Tell me about climate patterns",
      "What causes rain?",
      "Explain weather forecasting",
    ];
  }

  if (lowerPrompt.includes("explain") || lowerPrompt.includes("what is")) {
    return [
      "Can you give me an example?",
      "Tell me more details",
      "How does this apply in practice?",
    ];
  }

  if (
    lowerPrompt.includes("how") ||
    lowerPrompt.includes("why") ||
    lowerPrompt.includes("when")
  ) {
    return [
      "Can you elaborate on that?",
      "What are some examples?",
      "Are there alternatives?",
    ];
  }

  // Generic follow-ups
  const genericSuggestions = [
    "Tell me more about this",
    "What are the key considerations?",
    "Can you provide an example?",
    "How does this work in practice?",
    "What are common pitfalls?",
    "Explain this in simpler terms",
    "What are the benefits?",
    "What are the trade-offs?",
    "How can I learn more?",
    "What's the next step?",
  ];

  // Rotate through suggestions based on conversation length
  const startIndex = conversationHistory.length % genericSuggestions.length;
  return [
    genericSuggestions[startIndex],
    genericSuggestions[(startIndex + 3) % genericSuggestions.length],
    genericSuggestions[(startIndex + 6) % genericSuggestions.length],
  ];
}

// Get mock response based on prompt
function getMockResponse(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  for (const [key, response] of Object.entries(MOCK_RESPONSES)) {
    if (key !== "default" && lowerPrompt.includes(key)) {
      return response;
    }
  }

  // Generate a contextual default response
  if (lowerPrompt.includes("?")) {
    return `That's a great question about "${prompt.slice(
      0,
      50
    )}...". Let me provide a comprehensive answer. ${
      MOCK_RESPONSES.default
    } I hope this helps clarify things!`;
  }

  return MOCK_RESPONSES.default + " Feel free to ask follow-up questions!";
}

// Tokenize text for streaming (simple word-based tokenization)
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const words = text.split(/(\s+|[.,!?;:])/);

  for (const word of words) {
    if (word.length > 0) {
      tokens.push(word);
    }
  }

  return tokens;
}

// Stream configuration
export interface StreamConfig {
  delayMs?: number; // Delay between tokens
  initialDelayMs?: number; // Delay before first token
}

// Mock LLM streaming generator
export async function* streamMockResponse(
  prompt: string,
  conversationHistory: Message[],
  config: StreamConfig = {}
): AsyncGenerator<string, void, unknown> {
  const { delayMs = 30, initialDelayMs = 100 } = config;

  // Simulate initial processing delay
  await new Promise((resolve) => setTimeout(resolve, initialDelayMs));

  const response = getMockResponse(prompt);
  const tokens = tokenize(response);

  for (const token of tokens) {
    yield token;
    // Vary the delay slightly for more realistic streaming
    const variance = Math.random() * 20 - 10; // -10 to +10 ms
    await new Promise((resolve) =>
      setTimeout(resolve, delayMs + variance)
    );
  }
}

// Real LLM placeholder (can be implemented later)
export async function* streamRealLLMResponse(
  prompt: string,
  conversationHistory: Message[]
): AsyncGenerator<string, void, unknown> {
  // TODO: Implement real LLM integration (OpenAI, Anthropic, etc.)
  throw new Error(
    "Real LLM not implemented. Set USE_REAL_LLM=false to use mock."
  );
}

// Main LLM service interface
export async function* streamLLMResponse(
  prompt: string,
  conversationHistory: Message[]
): AsyncGenerator<string, void, unknown> {
  const useRealLLM = process.env.USE_REAL_LLM === "true";

  if (useRealLLM) {
    yield* streamRealLLMResponse(prompt, conversationHistory);
  } else {
    yield* streamMockResponse(prompt, conversationHistory);
  }
}
