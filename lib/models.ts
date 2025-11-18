import { ObjectId } from "mongodb";
import { getDatabase, Collections } from "./mongodb";
import {
  User,
  Session,
  Message,
  Suggestion,
  SessionListItem,
  SessionDetail,
  WebVital,
} from "./types";

// User operations
export async function createUser(user: Omit<User, "_id">): Promise<User> {
  const db = await getDatabase();
  const result = await db.collection<User>(Collections.USERS).insertOne(user);
  return { ...user, _id: result.insertedId };
}

export async function findUserByUserId(userId: string): Promise<User | null> {
  const db = await getDatabase();
  return db.collection<User>(Collections.USERS).findOne({ userId });
}

export async function ensureUser(userId: string, name: string): Promise<User> {
  const existing = await findUserByUserId(userId);
  if (existing) return existing;

  return createUser({
    userId,
    name,
    createdAt: new Date(),
  });
}

// Session operations
export async function createSession(
  session: Omit<Session, "_id">
): Promise<Session> {
  const db = await getDatabase();
  const result = await db
    .collection<Session>(Collections.SESSIONS)
    .insertOne(session);
  return { ...session, _id: result.insertedId };
}

export async function findSessionById(
  sessionId: string
): Promise<Session | null> {
  const db = await getDatabase();
  return db.collection<Session>(Collections.SESSIONS).findOne({ sessionId });
}

export async function updateSession(
  sessionId: string,
  update: Partial<Session>
): Promise<void> {
  const db = await getDatabase();
  await db
    .collection<Session>(Collections.SESSIONS)
    .updateOne({ sessionId }, { $set: { ...update, updatedAt: new Date() } });
}

export async function getSessionsByUserId(
  userId: string
): Promise<SessionListItem[]> {
  const db = await getDatabase();
  const sessions = await db
    .collection<Session>(Collections.SESSIONS)
    .find({ userId })
    .sort({ updatedAt: -1 })
    .toArray();

  const sessionsWithDetails = await Promise.all(
    sessions.map(async (session) => {
      const messages = await db
        .collection<Message>(Collections.MESSAGES)
        .find({ sessionId: session.sessionId })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();

      return {
        sessionId: session.sessionId,
        title: session.title || "New Chat",
        messageCount: session.messageCount,
        lastMessageAt: messages[0]?.createdAt || session.createdAt,
        createdAt: session.createdAt,
      };
    })
  );

  return sessionsWithDetails;
}

export async function getSessionDetail(
  sessionId: string
): Promise<SessionDetail | null> {
  const db = await getDatabase();
  const session = await findSessionById(sessionId);
  if (!session) return null;

  const messages = await db
    .collection<Message>(Collections.MESSAGES)
    .find({ sessionId })
    .sort({ createdAt: 1 })
    .toArray();

  // Load global suggestion documents for each message to include averaged ratings
  const messagesWithSuggestions = await Promise.all(
    messages.map(async (message) => {
      if (message.role === "assistant" && message.suggestions) {
        // Get suggestion texts (handle both string[] and Suggestion[])
        const suggestionTexts = Array.isArray(message.suggestions)
          ? typeof message.suggestions[0] === "string"
            ? (message.suggestions as string[])
            : (message.suggestions as Suggestion[]).map((s) => s.text)
          : [];

        if (suggestionTexts.length > 0) {
          // Load global suggestion documents with ratings
          const suggestionDocs = await getSuggestionsByTexts(suggestionTexts);

          return {
            ...message,
            suggestions: suggestionDocs,
          };
        }
      }
      return message;
    })
  );

  return {
    sessionId: session.sessionId,
    userId: session.userId,
    title: session.title || "New Chat",
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messages: messagesWithSuggestions,
  };
}

// Message operations
export async function createMessage(
  message: Omit<Message, "_id">
): Promise<Message> {
  const db = await getDatabase();
  const result = await db
    .collection<Message>(Collections.MESSAGES)
    .insertOne(message);

  // Update session's message count and updatedAt
  await db
    .collection<Session>(Collections.SESSIONS)
    .updateOne(
      { sessionId: message.sessionId },
      { $inc: { messageCount: 1 }, $set: { updatedAt: new Date() } }
    );

  return { ...message, _id: result.insertedId };
}

export async function getMessagesBySessionId(
  sessionId: string
): Promise<Message[]> {
  const db = await getDatabase();
  const messages = await db
    .collection<Message>(Collections.MESSAGES)
    .find({ sessionId })
    .sort({ createdAt: 1 })
    .toArray();

  // Load global suggestion documents for each message to include averaged ratings
  const messagesWithSuggestions = await Promise.all(
    messages.map(async (message) => {
      if (message.role === "assistant" && message.suggestions) {
        // Get suggestion texts (handle both string[] and Suggestion[])
        const suggestionTexts = Array.isArray(message.suggestions)
          ? typeof message.suggestions[0] === "string"
            ? (message.suggestions as string[])
            : (message.suggestions as Suggestion[]).map((s) => s.text)
          : [];

        if (suggestionTexts.length > 0) {
          // Load global suggestion documents with ratings
          const suggestionDocs = await getSuggestionsByTexts(suggestionTexts);

          return {
            ...message,
            suggestions: suggestionDocs,
          };
        }
      }
      return message;
    })
  );

  return messagesWithSuggestions;
}

// Suggestion operations - Global suggestions with averaged ratings
export async function getOrCreateSuggestions(
  suggestionTexts: string[]
): Promise<Suggestion[]> {
  if (suggestionTexts.length === 0) return [];

  const db = await getDatabase();
  const now = new Date();
  const suggestions: Suggestion[] = [];

  // For each suggestion text, get or create it
  for (const text of suggestionTexts) {
    // Try to find existing suggestion
    let suggestion = await db
      .collection<Suggestion>(Collections.SUGGESTIONS)
      .findOne({ text });

    if (!suggestion) {
      // Create new suggestion with default values
      const newSuggestion: Omit<Suggestion, "_id"> = {
        text,
        totalRating: 0,
        ratingCount: 0,
        avgRating: 0,
        clickCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      const result = await db
        .collection<Suggestion>(Collections.SUGGESTIONS)
        .insertOne(newSuggestion);

      suggestion = { ...newSuggestion, _id: result.insertedId };
      console.log(`[DB] Created new suggestion: "${text.substring(0, 40)}"`);
    } else {
      console.log(`[DB] Found existing suggestion: "${text.substring(0, 40)}" with avgRating: ${suggestion.avgRating}`);
    }

    suggestions.push(suggestion);
  }

  return suggestions;
}

export async function getSuggestionsByTexts(
  texts: string[]
): Promise<Suggestion[]> {
  if (texts.length === 0) return [];

  const db = await getDatabase();
  const suggestions = await db
    .collection<Suggestion>(Collections.SUGGESTIONS)
    .find({ text: { $in: texts } })
    .toArray();

  console.log(`[DB] Loaded ${suggestions.length} suggestions with ratings:`,
    suggestions.map(s => ({ text: s.text.substring(0, 30), avgRating: s.avgRating, ratingCount: s.ratingCount })));

  return suggestions;
}

export async function updateSuggestionRating(
  suggestionId: ObjectId,
  newRating: number
): Promise<void> {
  const db = await getDatabase();

  // Increment rating count, add to total, and recalculate average
  const result = await db
    .collection<Suggestion>(Collections.SUGGESTIONS)
    .findOneAndUpdate(
      { _id: suggestionId },
      {
        $inc: { totalRating: newRating, ratingCount: 1 },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" }
    );

  if (result) {
    // Recalculate average rating
    const avgRating = result.totalRating / result.ratingCount;
    await db
      .collection<Suggestion>(Collections.SUGGESTIONS)
      .updateOne({ _id: suggestionId }, { $set: { avgRating } });

    console.log(`[DB] Updated suggestion ${suggestionId} rating: ${newRating}, new avg: ${avgRating.toFixed(2)} (from ${result.ratingCount} ratings)`);
  }
}

export async function incrementSuggestionClick(
  suggestionId: ObjectId
): Promise<void> {
  const db = await getDatabase();
  const result = await db
    .collection<Suggestion>(Collections.SUGGESTIONS)
    .updateOne(
      { _id: suggestionId },
      {
        $inc: { clickCount: 1 },
        $set: { updatedAt: new Date() },
      }
    );

  console.log(`[DB] Incremented click count for suggestion ${suggestionId}, matched: ${result.matchedCount}`);
}

// Web Vitals operations
export async function createWebVital(
  webVital: Omit<WebVital, "_id">
): Promise<WebVital> {
  const db = await getDatabase();
  const result = await db
    .collection<WebVital>(Collections.WEBVITALS)
    .insertOne(webVital);
  return { ...webVital, _id: result.insertedId };
}

export async function getWebVitalsByUserId(
  userId: string,
  metric?: string,
  startDate?: Date,
  endDate?: Date
): Promise<WebVital[]> {
  const db = await getDatabase();
  const query: any = { userId };

  if (metric) {
    query.metric = metric;
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  return db
    .collection<WebVital>(Collections.WEBVITALS)
    .find(query)
    .sort({ timestamp: -1 })
    .toArray();
}

export async function getWebVitalsAggregated(
  userId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<any[]> {
  const db = await getDatabase();
  const matchStage: any = {};

  if (userId) {
    matchStage.userId = userId;
  }

  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = startDate;
    if (endDate) matchStage.timestamp.$lte = endDate;
  }

  const pipeline: any[] = [];

  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  pipeline.push(
    {
      $group: {
        _id: "$metric",
        avgValue: { $avg: "$value" },
        p75: { $percentile: { input: "$value", p: [0.75], method: "approximate" } },
        p95: { $percentile: { input: "$value", p: [0.95], method: "approximate" } },
        count: { $sum: 1 },
        goodCount: {
          $sum: { $cond: [{ $eq: ["$rating", "good"] }, 1, 0] }
        },
        needsImprovementCount: {
          $sum: { $cond: [{ $eq: ["$rating", "needs-improvement"] }, 1, 0] }
        },
        poorCount: {
          $sum: { $cond: [{ $eq: ["$rating", "poor"] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        metric: "$_id",
        avgValue: 1,
        p75: { $arrayElemAt: ["$p75", 0] },
        p95: { $arrayElemAt: ["$p95", 0] },
        count: 1,
        goodCount: 1,
        needsImprovementCount: 1,
        poorCount: 1,
        _id: 0
      }
    }
  );

  return db
    .collection<WebVital>(Collections.WEBVITALS)
    .aggregate(pipeline)
    .toArray();
}

export async function ensureIndexes(): Promise<void> {
  const db = await getDatabase();

  // Users indexes
  await db
    .collection(Collections.USERS)
    .createIndex({ userId: 1 }, { unique: true });

  // Sessions indexes
  await db
    .collection(Collections.SESSIONS)
    .createIndex({ sessionId: 1 }, { unique: true });
  await db.collection(Collections.SESSIONS).createIndex({ userId: 1 });
  await db.collection(Collections.SESSIONS).createIndex({ updatedAt: -1 });

  // Messages indexes
  await db.collection(Collections.MESSAGES).createIndex({ sessionId: 1 });
  await db.collection(Collections.MESSAGES).createIndex({ userId: 1 });
  await db
    .collection(Collections.MESSAGES)
    .createIndex({ sessionId: 1, createdAt: 1 });

  // Suggestions indexes - text is unique, index on avgRating for sorting
  await db
    .collection(Collections.SUGGESTIONS)
    .createIndex({ text: 1 }, { unique: true });
  await db.collection(Collections.SUGGESTIONS).createIndex({ avgRating: -1 });
  await db.collection(Collections.SUGGESTIONS).createIndex({ clickCount: -1 });

  // Web Vitals indexes
  await db.collection(Collections.WEBVITALS).createIndex({ userId: 1 });
  await db.collection(Collections.WEBVITALS).createIndex({ metric: 1 });
  await db.collection(Collections.WEBVITALS).createIndex({ timestamp: -1 });
  await db
    .collection(Collections.WEBVITALS)
    .createIndex({ userId: 1, metric: 1, timestamp: -1 });
}
