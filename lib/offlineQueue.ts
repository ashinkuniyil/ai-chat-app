// Offline queue manager for analytics events
// Uses IndexedDB for persistent storage and implements exponential backoff retry logic

interface QueuedEvent {
  id: string;
  url: string;
  method: string;
  body: any;
  headers: Record<string, string>;
  timestamp: number;
  retryCount: number;
  nextRetryAt: number;
}

const DB_NAME = "ai-chat-app-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "events";
const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds

class OfflineQueueManager {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = true;
  private syncInterval: NodeJS.Timeout | null = null;

  async init(): Promise<void> {
    if (typeof window === "undefined") return;

    // Initialize IndexedDB
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("nextRetryAt", "nextRetryAt", { unique: false });
        }
      };
    });
  }

  async enqueue(
    url: string,
    method: string,
    body: any,
    headers: Record<string, string> = {}
  ): Promise<string> {
    if (!this.db) await this.init();

    const event: QueuedEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url,
      method,
      body,
      headers,
      timestamp: Date.now(),
      retryCount: 0,
      nextRetryAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(event);

      request.onsuccess = () => resolve(event.id);
      request.onerror = () => reject(request.error);
    });
  }

  async dequeue(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(): Promise<QueuedEvent[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateRetry(id: string, retryCount: number, nextRetryAt: number): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const event = getRequest.result;
        if (event) {
          event.retryCount = retryCount;
          event.nextRetryAt = nextRetryAt;
          const updateRequest = store.put(event);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async processQueue(): Promise<void> {
    if (!this.isOnline) return;

    const events = await this.getAll();
    const now = Date.now();

    for (const event of events) {
      // Skip if not ready for retry
      if (event.nextRetryAt > now) continue;

      // Skip if exceeded max retries
      if (event.retryCount >= MAX_RETRY_ATTEMPTS) {
        console.warn(`[Offline Queue] Max retries exceeded for event ${event.id}, removing`);
        await this.dequeue(event.id);
        continue;
      }

      try {
        const response = await fetch(event.url, {
          method: event.method,
          headers: event.headers,
          body: JSON.stringify(event.body),
        });

        if (response.ok) {
          console.log(`[Offline Queue] Successfully sent event ${event.id}`);
          await this.dequeue(event.id);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.warn(`[Offline Queue] Retry ${event.retryCount + 1} failed for event ${event.id}:`, error);

        // Calculate exponential backoff: 2s, 4s, 8s, 16s, 32s
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, event.retryCount);
        const nextRetryAt = now + delay;

        await this.updateRetry(event.id, event.retryCount + 1, nextRetryAt);
      }
    }
  }

  startSync(): void {
    if (typeof window === "undefined") return;

    // Listen for online/offline events
    window.addEventListener("online", () => {
      console.log("[Offline Queue] Network online, processing queue");
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener("offline", () => {
      console.log("[Offline Queue] Network offline, queueing events");
      this.isOnline = false;
    });

    // Check initial online status
    this.isOnline = navigator.onLine;

    // Process queue periodically (every 10 seconds)
    this.syncInterval = setInterval(() => {
      this.processQueue();
    }, 10000);

    // Process immediately on start
    this.processQueue();
  }

  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async sendOrQueue(
    url: string,
    method: string,
    body: any,
    headers: Record<string, string> = { "Content-Type": "application/json" }
  ): Promise<void> {
    if (!this.db) await this.init();

    // If online, try to send immediately
    if (this.isOnline && navigator.onLine) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: JSON.stringify(body),
        });

        if (response.ok) {
          console.log(`[Offline Queue] Successfully sent to ${url}`);
          return;
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.warn(`[Offline Queue] Failed to send, queueing:`, error);
      }
    }

    // If offline or send failed, queue it
    const eventId = await this.enqueue(url, method, body, headers);
    console.log(`[Offline Queue] Queued event ${eventId} for ${url}`);
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueueManager();

// Initialize and start sync on module load (client-side only)
if (typeof window !== "undefined") {
  offlineQueue.init().then(() => {
    offlineQueue.startSync();
  });
}
