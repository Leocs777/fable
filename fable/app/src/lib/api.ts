// Fable 解读后端客户端 —— 指向已部署的 Cloudflare Worker。
// 解读由云端 Worker 调 Cerebras 完成，key 不在 App 里。
const BASE = "https://fable-worker.founders-497.workers.dev";

export type Reading = {
  title: string;
  interpretation: string;
  actions: string[];
  risk_notice: string;
  confidence: "high" | "medium" | "low";
  safety_block: boolean;
};

export type BaziReading = {
  career: string;
  love: string;
  year: string;
  confidence_note: string;
};

export type FengshuiReading = { suggestions: string[]; note: string };

export type DailyHexagram = { date: string; hexagram: string; line: string; meaning: string };

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()) as T;
}

export function interpretWengua(input: {
  question: string;
  primaryName: string;
  changedName?: string;
  movingLabels?: string[];
  hasMoving: boolean;
}): Promise<Reading> {
  return postJson("/api/interpret", input);
}

export function interpretBazi(input: {
  pillars: { year: string; month: string; day: string; hour: string };
  elements: { name: string; level: string }[];
  certainty: "accurate" | "approx" | "unknown";
}): Promise<BaziReading> {
  return postJson("/api/bazi", input);
}

export function interpretFengshui(input: {
  roomType: string;
  direction: string;
  layout: string[];
}): Promise<FengshuiReading> {
  return postJson("/api/fengshui", input);
}

export function divine(input: {
  method: "meihua" | "qimen" | "daliuren";
  question: string;
  time?: string;
}): Promise<{ chart: any; reading: Reading }> {
  return postJson("/api/divine", input);
}

export async function dailyHexagram(date: string): Promise<DailyHexagram> {
  const res = await fetch(`${BASE}/api/daily?date=${encodeURIComponent(date)}`);
  if (!res.ok) throw new Error(`/api/daily -> ${res.status}`);
  return (await res.json()) as DailyHexagram;
}
