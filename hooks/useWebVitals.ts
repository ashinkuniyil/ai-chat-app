import { useEffect } from "react";
import { onCLS, onINP, onLCP, onFCP, onTTFB, Metric } from "web-vitals";
import { offlineQueue } from "@/lib/offlineQueue";

interface WebVitalsConfig {
  userId: string;
  enabled?: boolean;
}

// Generate a unique session ID for Web Vitals tracking
const getSessionId = (): string => {
  if (typeof window === "undefined") return "";

  const storageKey = "webvitals_session_id";
  let sessionId = sessionStorage.getItem(storageKey);

  if (!sessionId) {
    sessionId = `wv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(storageKey, sessionId);
  }

  return sessionId;
};

// Detect device type
const getDeviceType = (): "mobile" | "tablet" | "desktop" => {
  if (typeof window === "undefined") return "desktop";

  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
};

// Get rating based on metric thresholds
const getRating = (metric: Metric): "good" | "needs-improvement" | "poor" => {
  return metric.rating;
};

// Send metric to API with offline queue support
const sendMetric = async (metric: Metric, userId: string) => {
  try {
    const sessionId = getSessionId();
    const device = getDeviceType();
    const pageUrl = window.location.pathname;
    const userAgent = navigator.userAgent;

    const payload = {
      sessionId,
      userId,
      metric: metric.name,
      value: metric.value,
      rating: getRating(metric),
      pageUrl,
      userAgent,
      device,
    };

    // Use offline queue for reliable delivery
    await offlineQueue.sendOrQueue("/api/vitals", "POST", payload);

    console.log(`[Web Vitals] Sent ${metric.name}:`, metric.value, getRating(metric));
  } catch (error) {
    console.error(`[Web Vitals] Failed to send ${metric.name}:`, error);
  }
};

export function useWebVitals({ userId, enabled = true }: WebVitalsConfig) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // Register Web Vitals observers
    onCLS((metric) => sendMetric(metric, userId));
    onINP((metric) => sendMetric(metric, userId));
    onLCP((metric) => sendMetric(metric, userId));
    onFCP((metric) => sendMetric(metric, userId));
    onTTFB((metric) => sendMetric(metric, userId));

    console.log("[Web Vitals] Initialized for user:", userId);
  }, [userId, enabled]);
}
