# Local AI Chat App

A local-first AI chat web application with suggestion-driven conversations and built-in observability. Built with Next.js, TypeScript, MongoDB, and Server-Sent Events (SSE) for streaming responses.

> Built with assistance from **Claude Code Research Preview** - an AI-powered development assistant by Anthropic.

# Live URL

> [https://roshn.kuniyil.me](https://roshn.kuniyil.me)

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Metrics Computation](#metrics-computation)
- [Design Trade-offs](#design-trade-offs)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Development](#development)
- [Mock LLM](#mock-llm)
- [Accessibility](#accessibility)
- [Performance Considerations](#performance-considerations)
- [Troubleshooting](#troubleshooting)

## Features

### Core Functionality
- **Streaming Chat**: Real-time token-by-token streaming responses with visual feedback
- **Smart Suggestions**: After each assistant response, get 3 contextual follow-up suggestions
- **Suggestion Loop**: Click any suggestion to automatically send it as your next message
- **Multi-User Support**: Switch between users (User 1 and User 2) with separate conversation histories
- **Persistent Storage**: All conversations stored in MongoDB for later retrieval

### User Experience
- **Accessible Design**: Full keyboard navigation, ARIA labels, and screen reader support
- **Responsive UI**: Clean, modern interface that works on all screen sizes
- **Dark Mode**: Automatic dark mode support based on system preferences
- **Auto-scroll**: Messages automatically scroll into view as they arrive
- **Stop Generation**: Ability to stop streaming responses mid-generation

### Observability
- **Performance Metrics**: Track Time to First Token (TTFT) and total response time
- **Real-time Logging**: Server-side logging for all requests and operations
- **Suggestion Analytics**: Rate suggestions (1-5 stars) to track quality

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB
- **Streaming**: Server-Sent Events (SSE)
- **Mock LLM**: Built-in streaming mock with realistic delays

## Project Structure

```
ai-chat-app/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts          # Streaming chat endpoint
│   │   ├── sessions/
│   │   │   ├── route.ts          # List sessions
│   │   │   └── [id]/route.ts     # Get session detail
│   │   └── suggestions/
│   │       └── rate/route.ts     # Rate suggestions
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main chat page
├── components/
│   ├── ChatInput.tsx             # Chat input component
│   ├── Message.tsx               # Message display component
│   └── SuggestionChips.tsx       # Suggestion chips with rating
├── hooks/
│   └── useChat.ts                # Chat state management hook
├── lib/
│   ├── llm/
│   │   └── mock-llm.ts           # Mock LLM with streaming
│   ├── models.ts                 # Database models/repositories
│   ├── mongodb.ts                # MongoDB connection
│   └── types.ts                  # TypeScript type definitions
├── scripts/
│   └── seed.ts                   # Database seeding script
├── docker-compose.yml            # MongoDB Docker setup
├── .env.example                  # Environment variables template
└── package.json
```

## Quick Start

Get the app running with a single command:

```bash
npm run setup
```

This will:
1. Install all npm dependencies
2. Start MongoDB in Docker
3. Seed the database with sample data

Then start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start chatting!

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │  Chat UI   │  │  Suggestions │  │  User Selector   │    │
│  │  (React)   │  │   & Rating   │  │                  │    │
│  └─────┬──────┘  └──────┬───────┘  └────────┬─────────┘    │
│        │                 │                   │               │
│        └─────────────────┴───────────────────┘               │
│                          │                                   │
│                    useChat Hook                              │
│                 (State Management)                           │
└──────────────────────────┼──────────────────────────────────┘
                           │ SSE (Server-Sent Events)
                           │ HTTP/JSON
┌──────────────────────────┼──────────────────────────────────┐
│                  Next.js Server (API Routes)                 │
│  ┌────────────────┬──────────────┬─────────────────────┐    │
│  │  /api/chat     │  /api/       │  /api/suggestions/  │    │
│  │  (Streaming)   │  sessions    │  rate               │    │
│  └────────┬───────┴──────┬───────┴─────────┬───────────┘    │
│           │              │                 │                 │
│      ┌────▼────────┐     │                 │                 │
│      │  Mock LLM   │     │                 │                 │
│      │  (Streaming)│     │                 │                 │
│      │  - Tokenize │     │                 │                 │
│      │  - Generate │     │                 │                 │
│      └────┬────────┘     │                 │                 │
│           │              │                 │                 │
│      ┌────▼──────────────▼─────────────────▼───────┐         │
│      │         Models/Repository Layer            │         │
│      │  - Users   - Sessions   - Messages         │         │
│      │  - Suggestions   - Ratings                 │         │
│      └────────────────────┬───────────────────────┘         │
└─────────────────────────────┼──────────────────────────────┘
                              │ MongoDB Driver
┌─────────────────────────────▼──────────────────────────────┐
│                     MongoDB (Docker)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  users   │ │ sessions │ │ messages │ │ suggestions  │  │
│  │          │ │          │ │          │ │ _ratings     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Request Flow

1. **User Input** → Browser sends prompt via POST to `/api/chat`
2. **Session Management** → Server creates/retrieves session and user records
3. **Message Storage** → User message saved to MongoDB with timestamp
4. **LLM Processing** → Mock LLM tokenizes response and streams tokens
5. **SSE Streaming** → Each token sent via Server-Sent Events as it's generated
6. **Metrics Tracking** → TTFT and total time measured during streaming
7. **Suggestions** → Generated based on conversation context
8. **Final Storage** → Assistant message saved with metrics and suggestions
9. **Client Display** → UI updates in real-time, shows metrics and suggestion chips

---

## Metrics Computation

### Time to First Token (TTFT)

**Definition**: The time elapsed from when the server receives the chat request until the first token is streamed back to the client.

**Calculation**:
```typescript
// When request arrives (app/api/chat/route.ts:57)
metrics.requestStartAt = new Date()

// When first token is yielded (app/api/chat/route.ts:74)
metrics.firstTokenAt = new Date()
metrics.ttft = metrics.firstTokenAt.getTime() - metrics.requestStartAt.getTime()
```

**What it measures**:
- Initial LLM processing time (100ms default in mock)
- Database query latency (session/message retrieval)
- Model "thinking" time before output begins

**Typical values** (Mock LLM):
- ~105-120ms (100ms initial delay + minimal overhead)

### Total Response Time

**Definition**: The complete time from request start to when the full response is generated.

**Calculation**:
```typescript
// When streaming completes (app/api/chat/route.ts:104-106)
metrics.completedAt = new Date()
metrics.totalTime = metrics.completedAt.getTime() - metrics.requestStartAt.getTime()
```

**What it measures**:
- TTFT + all token generation time
- Full end-to-end response latency
- Streaming overhead

**Typical values** (Mock LLM):
- ~500-2000ms depending on response length
- Longer responses = higher total time

### Token Count Estimation

**Definition**: Approximate number of tokens in the response.

**Calculation**:
```typescript
// Simple word-based estimation (app/api/chat/route.ts:107)
metrics.tokenCount = fullText.split(/\s+/).length
```

**Method**:
- Splits response text on whitespace
- Counts resulting words
- **Trade-off**: Not true token count (see below)

**Actual Tokenization** (lib/llm/mock-llm.ts:118-129):
```typescript
// For streaming, we use more granular tokenization:
const tokens = text.split(/(\s+|[.,!?;:])/)
// This splits on whitespace AND punctuation
```

**Why the difference?**
- **Streaming tokens**: Split on punctuation for smoother visual effect (smaller chunks)
- **Counted tokens**: Word-based for simpler estimation closer to LLM tokens
- Real LLM tokens would use BPE/WordPiece (e.g., "tokenization" might be 2-3 tokens)

### Metrics Storage

All metrics are stored in the `messages` collection:

```typescript
{
  metrics: {
    requestStartAt: Date,    // When request received
    firstTokenAt: Date,      // When first token sent
    completedAt: Date,       // When response complete
    ttft: number,            // Time to first token (ms)
    totalTime: number,       // Total response time (ms)
    tokenCount: number       // Estimated token count
  }
}
```

### Observability

**Server Logs**:
```
[Metrics] TTFT: 105ms for session abc-123-def
[Metrics] Total time: 850ms, Tokens: 42, Session: abc-123-def
```

**Client Display**:
- Metrics shown below each assistant message
- Format: "TTFT: XXms | Total: XXXms"

---

## Design Trade-offs

### 1. Token Counting Method

**Current Approach**: Simple word-based split (`text.split(/\s+/)`)

**Pros**:
- Fast and simple
- No external dependencies
- Reasonable approximation for cost estimation

**Cons**:
- Not accurate for real LLM tokens
- Doesn't account for BPE/WordPiece tokenization
- Can be off by 20-40% vs. actual token count

**Alternative**: Use tiktoken or similar library
- More accurate token counts
- Matches billing from providers (OpenAI, Anthropic)
- Adds dependency and complexity

### 2. Streaming Granularity

**Current Approach**: Split on whitespace and punctuation for streaming

**Pros**:
- Smooth visual experience
- Punctuation appears immediately (readable sentences)
- Mimics real LLM streaming behavior

**Cons**:
- More SSE events (higher overhead)
- Slight network chattiness

**Alternative**: Stream full words only
- Fewer SSE events
- Less smooth visual experience

### 3. Mock LLM vs. Real LLM

**Current Approach**: Mock LLM with configurable delays (default)

**Pros**:
- No API costs during development
- Predictable latency for testing
- No rate limits
- Works offline

**Cons**:
- Not real AI responses
- Can't test actual model behavior
- Suggestions are template-based

**How to Switch**: Set `USE_REAL_LLM=true` and implement `streamRealLLMResponse()` in lib/llm/mock-llm.ts

### 4. Database Schema Design

**Current Approach**: Separate collections for users, sessions, messages, ratings

**Pros**:
- Clear separation of concerns
- Easy to query individual entities
- Flexible for future extensions

**Cons**:
- More collections to manage
- Requires joins for full conversation view
- Slightly higher query complexity

**Alternative**: Embed messages in sessions
- Faster single-document queries
- Document size limits (16MB in MongoDB)
- Harder to query across sessions

### 5. Suggestion Storage

**Current Approach**: Dual storage - text array in messages + separate suggestion_ratings collection

**Pros**:
- Easy to show suggestions with messages
- Tracks global suggestion quality
- Can analyze which suggestions work best

**Cons**:
- Data duplication (suggestion text stored twice)
- More complex to update

**Alternative**: Only store suggestion IDs in messages
- No duplication
- Harder to display historical suggestions

### 6. Server-Sent Events (SSE) vs. WebSockets

**Current Approach**: SSE for streaming responses

**Pros**:
- Simpler than WebSockets (HTTP-based)
- Auto-reconnect built-in
- Works through most proxies/firewalls
- Perfect for server-to-client streaming

**Cons**:
- Unidirectional (server → client only)
- Limited browser connection pool (6 per domain)
- No binary data support

**When to Switch to WebSockets**:
- Need bidirectional communication
- Want to stream large binary data
- Need lower latency (ws:// handshake faster)

### 7. Metrics Precision

**Current Approach**: JavaScript `Date.getTime()` (millisecond precision)

**Pros**:
- Simple and universally supported
- Sufficient for user-facing metrics
- No additional dependencies

**Cons**:
- Only millisecond precision
- Not suitable for micro-benchmarking
- Clock skew possible (though unlikely for same process)

**Alternative**: `performance.now()` (microsecond precision)
- Better for detailed profiling
- Browser-only (need polyfill for Node)

### 8. Docker Setup

**Current Approach**: MongoDB in Docker, app runs natively

**Pros**:
- Fast development cycle (no app rebuild)
- Easy to debug Node.js process
- Consistent database environment

**Cons**:
- Requires Node.js installed locally
- Different from production environment

**Alternative**: Full Docker Compose with app container
- True environment parity
- Slower dev cycle (need rebuilds)
- More complex setup

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for MongoDB)

### Installation

**Option 1: Quick Setup (Recommended)**

Use the automated setup script:
```bash
npm run setup && npm run dev
```

This single command handles everything: dependencies, Docker, database seeding, and starts the dev server.

**Option 2: Manual Setup**

For more control over each step:

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-chat-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   The default `.env` file is pre-configured for local development:
   ```
   MONGODB_URI=mongodb://localhost:27017/ai-chat-app
   USE_REAL_LLM=false
   ```

4. **Start MongoDB with Docker**
   ```bash
   docker-compose up -d
   # or use the npm script:
   npm run db:start
   ```

   This will start MongoDB on `localhost:27017`. To check if it's running:
   ```bash
   docker-compose ps
   # Should show ai-chat-mongodb with status "Up"
   ```

   To view MongoDB logs:
   ```bash
   docker-compose logs -f mongodb
   ```

5. **Seed the database** (optional but recommended)
   ```bash
   npm run seed
   ```

   **What the seed script does**:
   - Creates 2 users: `user_1` (User 1) and `user_2` (User 2)
   - Generates 30-40 realistic chat sessions distributed across both users
   - Each session contains 3-8 messages with user/assistant turns
   - Includes realistic metrics (TTFT, total time, token counts)
   - Pre-populates suggestion ratings for analytics
   - Creates conversations on varied topics (programming, weather, explanations, etc.)

   **Seed script behavior**:
   - Safe to run multiple times (creates new sessions each time)
   - Uses random data for variety
   - Completes in ~2-3 seconds
   - Outputs progress: "Created X users", "Generated Y sessions"

   **To reset the database**:
   ```bash
   npm run db:reset
   npm run seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

   You should see:
   - User selector dropdown (User 1 / User 2)
   - Chat interface ready for input
   - If seeded: previous sessions available in session history

## Usage

### Starting a Chat

1. Select a user from the dropdown (User 1 or User 2)
2. Type a message in the input box and press Enter (or click Send)
3. Watch as the AI streams its response token-by-token
4. After the response completes, you'll see 3 suggestion chips appear

### Using Suggestions

- Click any suggestion chip to automatically send it as your next message
- Rate suggestions using the 1-5 star rating below each chip
- Suggestions are contextual and adapt to your conversation

### Keyboard Navigation

- **Tab**: Navigate through suggestions and interactive elements
- **Enter/Space**: Activate buttons and suggestions
- **Enter**: Send message (in input field)
- **Shift+Enter**: New line (in input field)

### Switching Users

- Use the user dropdown in the header to switch between User 1 and User 2
- Each user has their own separate conversation history
- Switching users automatically starts a new chat

### Starting a New Chat

- Click the "New Chat" button in the header
- This creates a fresh session while preserving your history

## API Endpoints

### POST /api/chat

Stream a chat response.

**Request:**
```json
{
  "sessionId": "uuid-v4",
  "userId": "user_1",
  "prompt": "Your message here"
}
```

**Response:** Server-Sent Events stream
```
data: {"type":"token","content":"Hello"}
data: {"type":"token","content":" there"}
data: {"type":"done","fullText":"Hello there","suggestions":["..."],"metrics":{...}}
```

### GET /api/sessions?userId=user_1

List all sessions for a user.

**Response:**
```json
{
  "sessions": [
    {
      "sessionId": "uuid",
      "title": "Chat title",
      "messageCount": 6,
      "lastMessageAt": "2024-01-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET /api/sessions/[id]

Get detailed session data including all messages.

**Response:**
```json
{
  "session": {
    "sessionId": "uuid",
    "userId": "user_1",
    "title": "Chat title",
    "messages": [...],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### POST /api/suggestions/rate

Rate a suggestion.

**Request:**
```json
{
  "sessionId": "uuid",
  "userId": "user_1",
  "messageId": "mongodb-objectid",
  "suggestion": "The suggestion text",
  "rating": 4
}
```

## Database Schema

### Users Collection
```typescript
{
  _id: ObjectId,
  userId: string,        // "user_1", "user_2"
  name: string,
  createdAt: Date
}
```

### Sessions Collection
```typescript
{
  _id: ObjectId,
  sessionId: string,     // UUID v4
  userId: string,
  title: string,
  messageCount: number,
  createdAt: Date,
  updatedAt: Date
}
```

### Messages Collection
```typescript
{
  _id: ObjectId,
  sessionId: string,
  userId: string,
  role: "user" | "assistant",
  content: string,
  suggestions?: string[],  // Only for assistant messages
  createdAt: Date,
  metrics?: {
    requestStartAt: Date,
    firstTokenAt: Date,
    completedAt: Date,
    ttft: number,          // Time to first token (ms)
    totalTime: number,     // Total response time (ms)
    tokenCount: number
  }
}
```

### Suggestion Ratings Collection
```typescript
{
  _id: ObjectId,
  sessionId: string,
  userId: string,
  messageId: ObjectId,
  suggestion: string,
  rating: number,          // 1-5
  createdAt: Date
}
```

## Observability

### Performance Metrics

Every assistant response includes:
- **TTFT (Time to First Token)**: How long before the first token appears
- **Total Time**: Complete response generation time
- **Token Count**: Number of tokens in the response

These are logged server-side and displayed in the UI.

### Logging

Server-side logs include:
- Request start times
- TTFT measurements
- Total response times
- Session IDs for traceability
- Error tracking

Example logs:
```
[Metrics] TTFT: 105ms for session abc-123
[Metrics] Total time: 850ms, Tokens: 42, Session: abc-123
```

## Mock LLM

The app includes a sophisticated mock LLM that:

- Streams responses token-by-token with realistic delays (30ms ± 10ms per token)
- Generates contextual suggestions based on conversation content
- Simulates initial processing delay (100ms)
- Provides varied responses based on prompt keywords

### Switching to a Real LLM

To integrate a real LLM (OpenAI, Anthropic, etc.):

1. Set `USE_REAL_LLM=true` in `.env`
2. Add your API key to `.env`
3. Implement `streamRealLLMResponse()` in `lib/llm/mock-llm.ts`
4. The architecture already supports streaming from any LLM provider

## Development

### Available Scripts

**Application:**
```bash
npm run dev      # Start development server (with hot reload)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

**Database:**
```bash
npm run seed       # Seed database with sample data
npm run db:start   # Start MongoDB in Docker
npm run db:stop    # Stop MongoDB container
npm run db:reset   # Reset database (removes all data)
```

**Convenience:**
```bash
npm run setup      # Full setup: install + start DB + seed
```

### Docker Commands

**MongoDB Management:**
```bash
# Start MongoDB
docker-compose up -d

# Stop MongoDB (keeps data)
docker-compose down

# Stop and remove all data
docker-compose down -v

# View logs
docker-compose logs -f mongodb

# Check status
docker-compose ps

# Execute MongoDB shell
docker exec -it ai-chat-mongodb mongosh ai-chat-app
```

**Inside MongoDB shell:**
```javascript
// View collections
show collections

// Count messages
db.messages.countDocuments()

// View recent sessions
db.sessions.find().sort({createdAt: -1}).limit(5)

// Check metrics
db.messages.find({role: "assistant"}).limit(1).pretty()
```

### Environment Variables

- `MONGODB_URI`: MongoDB connection string (default: `mongodb://localhost:27017/ai-chat-app`)
- `USE_REAL_LLM`: Use real LLM instead of mock (default: `false`)

### Build for Production

```bash
npm run build
npm start
```

Production optimizations:
- Code minification
- Tree shaking
- Image optimization
- Font optimization
- Static page generation where possible

## Accessibility

This app follows WCAG 2.1 Level AA guidelines:

- Semantic HTML with proper ARIA labels
- Full keyboard navigation support
- Visible focus indicators
- Screen reader compatible
- Sufficient color contrast
- Responsive text sizing

## Performance Considerations

- **Streaming**: SSE provides efficient real-time updates without polling
- **Memoization**: Components use React.memo and useMemo where appropriate
- **Code Splitting**: Next.js automatically splits code for optimal loading
- **Database Indexes**: All collections have appropriate indexes for fast queries

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
docker-compose ps

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Port Conflicts

If port 3000 or 27017 is already in use:

```bash
# For Next.js, use a different port
PORT=3001 npm run dev

# For MongoDB, edit docker-compose.yml to use a different port
ports:
  - "27018:27017"
```

### Clear Database

```bash
# Stop and remove containers with data
docker-compose down -v

# Start fresh
docker-compose up -d
npm run seed
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.
