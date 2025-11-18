import { ObjectId } from "mongodb";

// User types
export interface User {
  _id?: ObjectId;
  userId: string; // e.g., "user_1", "user_2"
  name: string;
  createdAt: Date;
}

// Session types
export interface Session {
  _id?: ObjectId;
  sessionId: string;
  userId: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

// Message types
export type MessageRole = "user" | "assistant";

export interface Message {
  _id?: ObjectId;
  sessionId: string;
  userId: string;
  role: MessageRole;
  content: string;
  suggestions?: string[] | Suggestion[]; // Only for assistant messages
  createdAt: Date;
  metrics?: MessageMetrics;
}

// Metrics for observability
export interface MessageMetrics {
  requestStartAt: Date;
  firstTokenAt?: Date;
  completedAt?: Date;
  ttft?: number; // Time to first token in ms
  totalTime?: number; // Total time in ms
  tokenCount?: number;
}

// Suggestion types - Global suggestion with averaged ratings
export interface Suggestion {
  _id?: ObjectId;
  text: string; // Unique suggestion text
  totalRating: number; // Sum of all ratings
  ratingCount: number; // Number of times rated
  avgRating: number; // Calculated: totalRating / ratingCount
  clickCount: number; // Number of times clicked
  createdAt: Date;
  updatedAt: Date;
}

// API request/response types
export interface ChatRequest {
  sessionId: string;
  userId: string;
  prompt: string;
}

export interface StreamTokenEvent {
  type: "token";
  content: string;
}

export interface StreamDoneEvent {
  type: "done";
  fullText: string;
  suggestions: Suggestion[];
  metrics: {
    requestStart: string;
    firstTokenAt: string;
    completedAt: string;
    ttft: number;
    totalTime: number;
  };
}

export type StreamEvent = StreamTokenEvent | StreamDoneEvent;

export interface SessionListItem {
  sessionId: string;
  title: string;
  messageCount: number;
  lastMessageAt: Date;
  createdAt: Date;
}

export interface SessionDetail {
  sessionId: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

// Web Vitals types
export type MetricName = "LCP" | "INP" | "CLS" | "FCP" | "TTFB";
export type MetricRating = "good" | "needs-improvement" | "poor";

export interface WebVital {
  _id?: ObjectId;
  sessionId: string; // Client session ID (from web-vitals library)
  userId: string;
  metric: MetricName;
  value: number; // Milliseconds for timing metrics, unitless for CLS
  rating: MetricRating;
  timestamp: Date;
  pageUrl: string;
  userAgent?: string;
  device?: "mobile" | "tablet" | "desktop";
}
