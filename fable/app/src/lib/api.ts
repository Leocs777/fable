// Fable 解读后端客户端 —— 指向已部署的 Cloudflare Worker。
// 解读由云端 Worker 调 Cerebras 完成，key 不在 App 里。
import { appLocale } from "@/lib/i18n";

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

export type DivinationMethod = "meihua" | "qimen" | "daliuren";

export type MeihuaChart = {
  method: "meihua";
  methodName: string;
  hexagram: string;
  changed: string;
  moving: number;
  lines: number[];
  changedLines: number[];
  upperName: string;
  lowerName: string;
  useTrigram: string;
  bodyTrigram: string;
  timeLabel: string;
};

export type QimenChart = {
  method: "qimen";
  methodName: string;
  dun: string;
  ju: number;
  fuPalace: string;
  palaces: { no: string; name: string; dir: string; gate: string; stem: string }[];
  timeLabel: string;
  note: string;
};

export type DaliurenChart = {
  method: "daliuren";
  methodName: string;
  dayGanzhi: string;
  monthGeneral: string;
  hour: string;
  plate: { earth: string; heaven: string }[];
  fourLessons: { label: string; lower: string; upper: string }[];
  transmissions: { label: string; branch: string }[];
  note: string;
};

export type DivineChart = MeihuaChart | QimenChart | DaliurenChart;

export type DivineResponse = { chart: DivineChart | null; reading: Reading };

export type FollowUpMessage = {
  role: "user" | "assistant";
  content: string;
};

export type FollowUpRequest = {
  method: "liuyao" | DivinationMethod;
  methodTitle: string;
  question: string;
  detail: string;
  chartSummary: string;
  reading: Reading;
  messages: FollowUpMessage[];
};

export type FollowUpResponse = {
  answer: string;
  actions: string[];
  risk_notice: string;
  confidence: Reading["confidence"];
  safety_block: boolean;
};

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const locale = appLocale();
  const localizedBody = body && typeof body === "object" && !Array.isArray(body) ? { ...(body as Record<string, unknown>), locale } : body;
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-fable-locale": locale },
    body: JSON.stringify(localizedBody),
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
  method: DivinationMethod;
  question: string;
  time?: string;
}): Promise<DivineResponse> {
  return postJson("/api/divine", input);
}

export function followUp(input: FollowUpRequest): Promise<FollowUpResponse> {
  return postJson("/api/followup", input);
}

export async function dailyHexagram(date: string): Promise<DailyHexagram> {
  const locale = appLocale();
  const res = await fetch(`${BASE}/api/daily?date=${encodeURIComponent(date)}&locale=${encodeURIComponent(locale)}`, {
    headers: { "x-fable-locale": locale },
  });
  if (!res.ok) throw new Error(`/api/daily -> ${res.status}`);
  return (await res.json()) as DailyHexagram;
}
