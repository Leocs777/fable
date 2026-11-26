import AsyncStorage from "@react-native-async-storage/async-storage";

import { appLocale } from "@/lib/i18n";

export type AnalyticsEventName =
  | "home_view"
  | "method_select"
  | "question_sheet_open"
  | "question_chip_select"
  | "cloud_consent_show"
  | "cloud_consent_accept"
  | "divination_start"
  | "divination_success"
  | "divination_error"
  | "result_view"
  | "result_detail_expand"
  | "followup_start"
  | "followup_success"
  | "followup_error"
  | "daily_card_press"
  | "daily_view"
  | "daily_success"
  | "daily_error";

type AnalyticsPrimitive = string | number | boolean | null;
export type AnalyticsPayload = Record<string, AnalyticsPrimitive | undefined>;

export type AnalyticsEvent = {
  id: string;
  name: AnalyticsEventName;
  payload: Record<string, AnalyticsPrimitive>;
  sessionId: string;
  createdAt: string;
};

const ANALYTICS_QUEUE_KEY = "fable_analytics_queue_v1";
const ANALYTICS_ENDPOINT = "https://fable-worker.founders-497.workers.dev/api/analytics";
const MAX_QUEUE_SIZE = 200;
const FLUSH_BATCH_SIZE = 50;
const MIN_FLUSH_INTERVAL_MS = 10000;
const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let flushInFlight = false;
let lastFlushAt = 0;

export function trackAnalytics(name: AnalyticsEventName, payload: AnalyticsPayload = {}): void {
  const event: AnalyticsEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    payload: sanitizePayload({ ...payload, locale: appLocale() }),
    sessionId,
    createdAt: new Date().toISOString(),
  };
  void enqueueEvent(event).then(() => {
    void flushAnalyticsEvents();
  });
}

export async function getQueuedAnalyticsEvents(): Promise<AnalyticsEvent[]> {
  const raw = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as AnalyticsEvent[];
  return Array.isArray(parsed) ? parsed : [];
}

export async function clearQueuedAnalyticsEvents(): Promise<void> {
  await AsyncStorage.removeItem(ANALYTICS_QUEUE_KEY);
}

export async function flushAnalyticsEvents(force = false): Promise<number> {
  if (flushInFlight) return 0;
  const now = Date.now();
  if (!force && now - lastFlushAt < MIN_FLUSH_INTERVAL_MS) return 0;
  flushInFlight = true;
  lastFlushAt = now;
  try {
    const queue = await getQueuedAnalyticsEvents();
    const batch = queue.slice(0, FLUSH_BATCH_SIZE);
    if (!batch.length) return 0;
    const response = await fetch(ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events: batch }),
    });
    if (!response.ok) return 0;
    const sentIds = new Set(batch.map((event) => event.id));
    const latestQueue = await getQueuedAnalyticsEvents();
    const remaining = latestQueue.filter((event) => !sentIds.has(event.id)).slice(-MAX_QUEUE_SIZE);
    await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(remaining));
    return batch.length;
  } catch (error) {
    console.warn("[analytics] flush failed", error);
    return 0;
  } finally {
    flushInFlight = false;
  }
}

export function questionLengthBucket(question: string): string {
  const length = question.trim().length;
  if (length === 0) return "empty";
  if (length <= 20) return "short";
  if (length <= 60) return "medium";
  return "long";
}

export function durationBucket(ms: number): string {
  if (ms < 1500) return "lt_1_5s";
  if (ms < 5000) return "1_5s_5s";
  if (ms < 15000) return "5s_15s";
  return "gt_15s";
}

function sanitizePayload(payload: AnalyticsPayload): Record<string, AnalyticsPrimitive> {
  return Object.fromEntries(
    Object.entries(payload).filter((entry): entry is [string, AnalyticsPrimitive] => entry[1] !== undefined),
  );
}

async function enqueueEvent(event: AnalyticsEvent): Promise<void> {
  const queue = await getQueuedAnalyticsEvents().catch(() => []);
  const nextQueue = [...queue, event].slice(-MAX_QUEUE_SIZE);
  await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(nextQueue));
}
