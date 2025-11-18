// Load environment variables before any other imports
import dotenv from "dotenv";
dotenv.config();

import { v4 as uuidv4 } from "uuid";
import { ObjectId } from "mongodb";
import {
  ensureUser,
  createSession,
  createMessage,
  ensureIndexes,
  getOrCreateSuggestions,
  updateSuggestionRating,
  incrementSuggestionClick,
} from "../lib/models";
import { generateSuggestions } from "../lib/llm/mock-llm";
import clientPromise from "../lib/mongodb";

// Sample conversation starters and responses
const conversationTopics = [
  {
    userPrompt: "Hello! How are you today?",
    assistantResponse:
      "Hello! I'm doing well, thank you for asking. I'm here to help you with any questions or tasks you have. How can I assist you today?",
  },
  {
    userPrompt: "What is artificial intelligence?",
    assistantResponse:
      "Artificial Intelligence (AI) refers to the simulation of human intelligence in machines that are programmed to think and learn. It encompasses various technologies including machine learning, natural language processing, and computer vision. AI systems can perform tasks that typically require human intelligence, such as understanding language, recognizing patterns, and making decisions.",
  },
  {
    userPrompt: "Tell me about climate change",
    assistantResponse:
      "Climate change refers to long-term shifts in global temperatures and weather patterns. While climate change is a natural phenomenon, scientific evidence shows that human activities, particularly burning fossil fuels, have been the main driver since the 1800s. This leads to greenhouse gas emissions that trap heat in the atmosphere, causing global warming and various environmental impacts.",
  },
  {
    userPrompt: "How do I learn programming?",
    assistantResponse:
      "Learning programming is an exciting journey! Here are some steps to get started: 1) Choose a beginner-friendly language like Python or JavaScript, 2) Follow online tutorials and courses, 3) Practice by building small projects, 4) Join coding communities for support, 5) Read others' code to learn best practices. Remember, consistency is key - try to code a little bit every day!",
  },
  {
    userPrompt: "What's the best way to stay healthy?",
    assistantResponse:
      "Staying healthy involves several key factors: 1) Regular exercise (aim for 150 minutes of moderate activity weekly), 2) Balanced nutrition with plenty of fruits and vegetables, 3) Adequate sleep (7-9 hours for adults), 4) Stress management through meditation or hobbies, 5) Regular health check-ups, and 6) Staying hydrated. Remember, small consistent changes make the biggest difference!",
  },
  {
    userPrompt: "Explain quantum computing",
    assistantResponse:
      "Quantum computing is a revolutionary computing paradigm that uses quantum mechanical phenomena like superposition and entanglement. Unlike classical computers that use bits (0 or 1), quantum computers use qubits that can exist in multiple states simultaneously. This allows them to process vast amounts of information in parallel, potentially solving complex problems much faster than classical computers in specific areas like cryptography and drug discovery.",
  },
  {
    userPrompt: "What are best practices for software development?",
    assistantResponse:
      "Here are key software development best practices: 1) Write clean, readable code with meaningful names, 2) Follow SOLID principles and design patterns, 3) Write comprehensive tests (unit, integration, e2e), 4) Use version control effectively, 5) Practice code reviews, 6) Document your code and APIs, 7) Keep security in mind, 8) Refactor regularly, and 9) Follow agile methodologies. Consistency and continuous improvement are essential!",
  },
  {
    userPrompt: "How does the internet work?",
    assistantResponse:
      "The internet is a global network of interconnected computers that communicate using standardized protocols. When you access a website, your device sends a request through your ISP to DNS servers that translate domain names to IP addresses. The request then travels through routers across the network to reach the destination server, which sends back the requested data. This all happens using protocols like TCP/IP, HTTP, and others that ensure reliable data transmission.",
  },
  {
    userPrompt: "What is machine learning?",
    assistantResponse:
      "Machine Learning (ML) is a subset of AI that enables systems to learn and improve from experience without being explicitly programmed. It works by training algorithms on data to find patterns and make predictions. There are three main types: supervised learning (learning from labeled data), unsupervised learning (finding patterns in unlabeled data), and reinforcement learning (learning through trial and error). ML powers many applications from recommendation systems to autonomous vehicles.",
  },
  {
    userPrompt: "Tell me about renewable energy",
    assistantResponse:
      "Renewable energy comes from natural sources that are constantly replenished. The main types include: 1) Solar energy from the sun, 2) Wind energy from air currents, 3) Hydroelectric from flowing water, 4) Geothermal from Earth's heat, and 5) Biomass from organic materials. These clean energy sources are crucial for reducing carbon emissions and combating climate change, though each has its own advantages and challenges regarding efficiency, cost, and implementation.",
  },
];

// Helper to get random item from array
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to create a random date within the last 30 days
function randomDate(daysAgo: number): Date {
  const now = new Date();
  const msAgo = daysAgo * 24 * 60 * 60 * 1000;
  const randomMs = Math.floor(Math.random() * msAgo);
  return new Date(now.getTime() - randomMs);
}

async function seed() {
  console.log("Starting database seeding...");

  try {
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db();
    console.log("Connected to MongoDB");

    // Clear existing data
    console.log("Clearing existing data...");
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      await db.collection(collection.name).drop();
      console.log(`  Dropped collection: ${collection.name}`);
    }

    // Ensure indexes
    await ensureIndexes();
    console.log("Indexes created");

    // Create users
    const user1 = await ensureUser("user_1", "User 1");
    const user2 = await ensureUser("user_2", "User 2");
    console.log("Users created");

    const users = [user1, user2];
    let totalChats = 0;
    const targetChats = 35 + Math.floor(Math.random() * 6); // 35-40 chats total

    // Distribute sessions across users
    const sessionsPerUser = [
      Math.floor(targetChats * 0.6), // User 1 gets 60%
      Math.ceil(targetChats * 0.4),  // User 2 gets 40%
    ];

    for (let userIndex = 0; userIndex < users.length; userIndex++) {
      const user = users[userIndex];
      const sessionCount = sessionsPerUser[userIndex];
      console.log(`Creating ${sessionCount} sessions for ${user.userId}...`);

      for (let i = 0; i < sessionCount; i++) {
        const sessionId = uuidv4();
        const sessionCreatedAt = randomDate(30);

        // Create 2-5 conversation exchanges per session
        const exchangeCount = 2 + Math.floor(Math.random() * 4); // 2-5 exchanges
        let messageCount = 0;
        let lastMessageTime = sessionCreatedAt;

        // Pick random conversation topics for this session
        const topicsInSession = [];
        for (let j = 0; j < exchangeCount; j++) {
          topicsInSession.push(randomItem(conversationTopics));
        }

        // Create session
        const topic = topicsInSession[0];
        const session = await createSession({
          sessionId,
          userId: user.userId,
          title: topic.userPrompt.slice(0, 50),
          createdAt: sessionCreatedAt,
          updatedAt: lastMessageTime,
          messageCount: 0,
        });

        // Create conversation exchanges
        for (const topic of topicsInSession) {
          // User message
          const userMessageTime = new Date(
            lastMessageTime.getTime() + 1000 + Math.random() * 10000
          );
          await createMessage({
            sessionId,
            userId: user.userId,
            role: "user",
            content: topic.userPrompt,
            createdAt: userMessageTime,
          });
          messageCount++;
          lastMessageTime = userMessageTime;

          // Assistant message with varied performance metrics
          const assistantMessageTime = new Date(
            lastMessageTime.getTime() + 500 + Math.random() * 2000
          );
          const previousMessages = await Promise.resolve([]);
          const suggestionTexts = generateSuggestions(
            topic.userPrompt,
            previousMessages
          );

          // Varied latency - some fast, some slow, a few very slow
          let ttft: number;
          let totalTime: number;
          const randomPerf = Math.random();
          if (randomPerf < 0.7) {
            // 70% fast responses
            ttft = 50 + Math.floor(Math.random() * 100); // 50-150ms
            totalTime = ttft + 200 + Math.floor(Math.random() * 500); // +200-700ms
          } else if (randomPerf < 0.9) {
            // 20% medium responses
            ttft = 150 + Math.floor(Math.random() * 150); // 150-300ms
            totalTime = ttft + 500 + Math.floor(Math.random() * 1000); // +500-1500ms
          } else {
            // 10% slow responses for top 10 slowest
            ttft = 300 + Math.floor(Math.random() * 500); // 300-800ms
            totalTime = ttft + 1000 + Math.floor(Math.random() * 3000); // +1000-4000ms
          }

          // Get or create global suggestions
          const suggestions = await getOrCreateSuggestions(suggestionTexts);

          await createMessage({
            sessionId,
            userId: user.userId,
            role: "assistant",
            content: topic.assistantResponse,
            suggestions: suggestions.map(s => s.text),
            createdAt: assistantMessageTime,
            metrics: {
              requestStartAt: userMessageTime,
              firstTokenAt: new Date(userMessageTime.getTime() + ttft),
              completedAt: new Date(userMessageTime.getTime() + totalTime),
              ttft,
              totalTime,
              tokenCount: topic.assistantResponse.split(/\s+/).length,
            },
          });
          messageCount++;
          lastMessageTime = assistantMessageTime;

          // Simulate suggestion interactions (clicks and ratings)
          for (const suggestion of suggestions) {
            if (!suggestion._id) continue;

            // 30% chance of click
            if (Math.random() < 0.3) {
              await incrementSuggestionClick(suggestion._id);

              // If clicked, 60% chance of rating
              if (Math.random() < 0.6) {
                // Weighted towards higher ratings
                const ratingRand = Math.random();
                let rating: number;
                if (ratingRand < 0.5) rating = 5;
                else if (ratingRand < 0.75) rating = 4;
                else if (ratingRand < 0.9) rating = 3;
                else if (ratingRand < 0.97) rating = 2;
                else rating = 1;

                await updateSuggestionRating(suggestion._id, rating);
              }
            }
          }
        }

        totalChats++;
        console.log(
          `  Session ${i + 1}/${sessionCount}: ${messageCount} messages`
        );
      }
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`   Total users: 2`);
    console.log(`   Total sessions: ${totalChats}`);
    console.log(`   Total messages: ${totalChats * 4} (approx)`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the seed function
seed();
