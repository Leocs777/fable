import AsyncStorage from "@react-native-async-storage/async-storage";

import { divine, type Reading } from "@/lib/api";
import { l } from "@/lib/i18n";
import type { LineValue } from "@/lib/liuyao";

export type DailyGuaTheme = "综合" | "事业" | "感情" | "财运" | "情绪";

export type DailyGuaHexagram = {
  name: string;
  upperTrigram: string;
  lowerTrigram: string;
  changingLine: number;
  changedHexagramName: string;
  lines: LineValue[];
  changedLines: LineValue[];
};

export type DailyGuaResult = {
  date: string;
  seed: string;
  method: "meihua";
  theme: DailyGuaTheme;
  hexagram: DailyGuaHexagram;
  keyword: string;
  summary: string;
  career: string;
  love: string;
  wealth: string;
  emotion: string;
  suitable: string[];
  avoid: string[];
  oneLineAdvice: string;
  generatedAt: string;
  aiUpdatedAt?: string;
  aiError?: string;
};

export type DailyGuaLoadResult = {
  result: DailyGuaResult;
  source: "cache" | "generated";
  storageError?: string;
};

type StoredDailyGua = DailyGuaResult & {
  firstOpenedAt: string;
};

const DEVICE_SEED_KEY = "fable_daily_gua_device_seed";
const DEFAULT_THEME: DailyGuaTheme = "综合";

const TRIGRAMS = [
  { bits: "111", name: "乾", image: "天" },
  { bits: "110", name: "兑", image: "泽" },
  { bits: "101", name: "离", image: "火" },
  { bits: "100", name: "震", image: "雷" },
  { bits: "011", name: "巽", image: "风" },
  { bits: "010", name: "坎", image: "水" },
  { bits: "001", name: "艮", image: "山" },
  { bits: "000", name: "坤", image: "地" },
] as const;

const HEX_NAMES: Record<string, Record<string, string>> = {
  乾: { 乾: "乾", 兑: "履", 离: "同人", 震: "无妄", 巽: "姤", 坎: "讼", 艮: "遁", 坤: "否" },
  兑: { 乾: "夬", 兑: "兑", 离: "革", 震: "随", 巽: "大过", 坎: "困", 艮: "咸", 坤: "萃" },
  离: { 乾: "大有", 兑: "睽", 离: "离", 震: "噬嗑", 巽: "鼎", 坎: "未济", 艮: "旅", 坤: "晋" },
  震: { 乾: "大壮", 兑: "归妹", 离: "丰", 震: "震", 巽: "恒", 坎: "解", 艮: "小过", 坤: "豫" },
  巽: { 乾: "小畜", 兑: "中孚", 离: "家人", 震: "益", 巽: "巽", 坎: "涣", 艮: "渐", 坤: "观" },
  坎: { 乾: "需", 兑: "节", 离: "既济", 震: "屯", 巽: "井", 坎: "坎", 艮: "蹇", 坤: "比" },
  艮: { 乾: "大畜", 兑: "损", 离: "贲", 震: "颐", 巽: "蛊", 坎: "蒙", 艮: "艮", 坤: "剥" },
  坤: { 乾: "泰", 兑: "临", 离: "明夷", 震: "复", 巽: "升", 坎: "师", 艮: "谦", 坤: "坤" },
};

const KEYWORD_POOLS = [
  ["整理", "沟通", "修饰"],
  ["蓄力", "观察", "稳住"],
  ["调整", "边界", "取舍"],
  ["复盘", "协作", "转圜"],
  ["节制", "耐心", "修正"],
  ["开端", "提醒", "减速"],
  ["聚焦", "信任", "收束"],
  ["更新", "表达", "行动"],
] as const;

const SUITABLE_POOLS = [
  ["复盘", "沟通", "整理", "修正计划"],
  ["慢决策", "写清单", "补证据", "提前确认"],
  ["打磨方案", "约定边界", "温和表达", "清理待办"],
  ["学习", "归档", "轻量推进", "请教他人"],
] as const;

const AVOID_POOLS = [
  ["逞强", "急躁", "过度承诺"],
  ["情绪化回复", "临时加码", "冲动消费"],
  ["同时开太多事", "含糊表达", "忽略细节"],
  ["把话说死", "熬夜硬撑", "用猜测代替确认"],
] as const;

export async function loadDailyGua(now: Date = new Date(), theme: DailyGuaTheme = DEFAULT_THEME): Promise<DailyGuaLoadResult> {
  const date = localDateKey(now);
  const key = dailyGuaCacheKey(date);
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached) as StoredDailyGua;
      if (isDailyGuaResult(parsed) && parsed.date === date) {
        return { result: parsed, source: "cache" };
      }
    }
    const deviceSeed = await getOrCreateDeviceSeed();
    const firstOpenedAt = now.toISOString();
    const result = generateDailyGua({
      date,
      deviceSeed,
      firstOpenedAt,
      hour: now.getHours(),
      theme,
    });
    await AsyncStorage.setItem(key, JSON.stringify({ ...result, firstOpenedAt }));
    return { result, source: "generated" };
  } catch (error) {
    const fallback = generateDailyGua({
      date,
      deviceSeed: "session-fallback",
      firstOpenedAt: `${date}T00:00:00.000Z`,
      hour: now.getHours(),
      theme,
    });
    return { result: fallback, source: "generated", storageError: errorMessage(error) };
  }
}

export async function enrichDailyGuaWithAi(base: DailyGuaResult): Promise<DailyGuaResult> {
  const response = await divine({
    method: "meihua",
    question: l({
      zh: `今日一卦，主题：${base.theme}。请基于 ${base.date} 的 ${base.hexagram.name} 之 ${base.hexagram.changedHexagramName}，给出温和、白话、可行动的今日提醒。`,
      en: `Daily Plum Oracle reading, theme: ${base.theme}. Based on ${base.date}, ${base.hexagram.name} changing to ${base.hexagram.changedHexagramName}, give a gentle, plain-language, actionable daily reading in English.`,
    }),
    time: base.generatedAt,
  });
  const reading = response.reading;
  const enriched: DailyGuaResult = {
    ...base,
    summary: reading.interpretation || base.summary,
    career: mergeAdvice(base.career, reading.actions[0]),
    love: mergeAdvice(base.love, reading.actions[1]),
    wealth: mergeAdvice(base.wealth, reading.actions[2]),
    emotion: reading.risk_notice || base.emotion,
    oneLineAdvice: reading.actions[0] ?? base.oneLineAdvice,
    aiUpdatedAt: new Date().toISOString(),
    aiError: undefined,
  };
  await saveDailyGua(enriched);
  return enriched;
}

export async function saveDailyGua(result: DailyGuaResult): Promise<void> {
  await AsyncStorage.setItem(dailyGuaCacheKey(result.date), JSON.stringify(result));
}

export function generateDailyGua(input: {
  date: string;
  deviceSeed: string;
  firstOpenedAt: string;
  hour: number;
  theme?: DailyGuaTheme;
}): DailyGuaResult {
  const theme = input.theme ?? DEFAULT_THEME;
  const seed = `${input.date}|${input.deviceSeed}|${shichenLabel(input.hour)}|${input.firstOpenedAt}|${theme}`;
  const random = seededRandom(seed);
  const lines = Array.from({ length: 6 }, () => (random() > 0.5 ? 1 : 0)) as LineValue[];
  const changingLine = 1 + Math.floor(random() * 6);
  const changedLines = lines.map((line, index) => (index === changingLine - 1 ? (line === 1 ? 0 : 1) : line)) as LineValue[];
  const primary = hexagramFromLines(lines);
  const changed = hexagramFromLines(changedLines);
  const poolIndex = Math.floor(random() * KEYWORD_POOLS.length);
  const keywords = KEYWORD_POOLS[poolIndex];
  const suitable = SUITABLE_POOLS[Math.floor(random() * SUITABLE_POOLS.length)];
  const avoid = AVOID_POOLS[Math.floor(random() * AVOID_POOLS.length)];
  const localizedKeywords = keywords.map(localizedDailyTerm);
  const focus = localizedKeywords.join(l({ zh: "、", en: ", " }));

  return {
    date: input.date,
    seed,
    method: "meihua",
    theme,
    hexagram: {
      name: `${primary.upper.image}${primary.lower.image}${primary.name}`,
      upperTrigram: primary.upper.name,
      lowerTrigram: primary.lower.name,
      changingLine,
      changedHexagramName: `${changed.upper.image}${changed.lower.image}${changed.name}`,
      lines,
      changedLines,
    },
    keyword: focus,
    summary: l({ zh: `今天的重点是${focus}。适合先把眼前的结构理顺，再决定是否推进。遇到不确定的事，先问清边界，不急着给出承诺。`, en: `Today's focus is ${focus}. First organize what is in front of you, then decide whether to move forward. When something is unclear, ask about boundaries before making promises.` }),
    career: careerAdvice(theme, localizedKeywords[0]),
    love: loveAdvice(theme, localizedKeywords[1]),
    wealth: wealthAdvice(theme, localizedKeywords[2]),
    emotion: emotionAdvice(localizedKeywords[0]),
    suitable: suitable.map(localizedDailyTerm),
    avoid: avoid.map(localizedDailyTerm),
    oneLineAdvice: oneLineAdvice(localizedKeywords[0], primary.name),
    generatedAt: input.firstOpenedAt,
  };
}

export function dailyGuaCacheKey(date: string): string {
  return `daily_gua_${date}`;
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hexagramFromLines(lines: LineValue[]) {
  const lower = trigramFromLines(lines.slice(0, 3));
  const upper = trigramFromLines(lines.slice(3, 6));
  return { name: HEX_NAMES[upper.name][lower.name], upper, lower };
}

function trigramFromLines(lines: number[]) {
  const key = lines.join("");
  return TRIGRAMS.find((trigram) => trigram.bits === key) ?? TRIGRAMS[0];
}

async function getOrCreateDeviceSeed(): Promise<string> {
  const cached = await AsyncStorage.getItem(DEVICE_SEED_KEY);
  if (cached) return cached;
  const nextSeed = `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_SEED_KEY, nextSeed);
  return nextSeed;
}

function seededRandom(seed: string): () => number {
  let state = stableHash(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1000000) / 1000000;
  };
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shichenLabel(hour: number): string {
  const labels = ["子", "丑", "丑", "寅", "寅", "卯", "卯", "辰", "辰", "巳", "巳", "午", "午", "未", "未", "申", "申", "酉", "酉", "戌", "戌", "亥", "亥", "子"];
  return labels[Math.max(0, Math.min(23, hour))];
}

function careerAdvice(theme: DailyGuaTheme, keyword: string): string {
  if (theme === "事业") return l({ zh: `今天适合把工作重心放在${keyword}，先确认目标和边界，再推进对外承诺。`, en: `Put work focus on ${keyword} today. Confirm goals and boundaries before making external commitments.` });
  return l({ zh: "适合复盘、沟通、整理方案，不适合贸然承诺。先处理能收口的小事。", en: "Review, communicate, and organize plans. Avoid rushed promises; close small tasks first." });
}

function loveAdvice(theme: DailyGuaTheme, keyword: string): string {
  if (theme === "感情") return l({ zh: `感情里更需要${keyword}，少用试探，多用清楚、温和的表达。`, en: `Relationships need ${keyword} today. Use clear, gentle expression instead of testing.` });
  return l({ zh: "少用猜测，多问一句。把真实感受说清楚，比追求立刻有答案更稳。", en: "Guess less and ask one more clear question. Naming the real feeling is steadier than forcing an instant answer." });
}

function wealthAdvice(theme: DailyGuaTheme, keyword: string): string {
  if (theme === "财运") return l({ zh: `财务上适合${keyword}和核对，不宜因为情绪做临时消费。`, en: `Money matters favor ${keyword} and careful checking. Avoid emotional impulse spending.` });
  return l({ zh: "适合整理账目、检查订阅和预算，不宜冲动下单或临时加码。", en: "Review accounts, subscriptions, and budget. Avoid impulse purchases or sudden extra commitments." });
}

function emotionAdvice(keyword: string): string {
  return l({ zh: `情绪容易被细节牵动，可以先降低节奏，把注意力放回${keyword}。`, en: `Small details may pull on your mood. Slow the pace and return attention to ${keyword}.` });
}

function oneLineAdvice(keyword: string, hexagramName: string): string {
  if (hexagramName === "乾" || hexagramName === "大壮") return l({ zh: "先稳住方向，再谈突破。", en: "Stabilize direction before reaching for a breakthrough." });
  if (hexagramName === "坤" || hexagramName === "谦") return l({ zh: "先接住现实，再慢慢调整。", en: "Meet reality first, then adjust gently." });
  return l({ zh: `先做好${keyword}，今天的路就会清楚一些。`, en: `Start with ${keyword}; the path will become clearer today.` });
}

function mergeAdvice(base: string, aiAdvice: string | undefined): string {
  if (!aiAdvice) return base;
  return aiAdvice.length > 80 ? aiAdvice.slice(0, 78) + "…" : aiAdvice;
}

function isDailyGuaResult(value: unknown): value is DailyGuaResult {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<DailyGuaResult>;
  return item.method === "meihua" && typeof item.date === "string" && typeof item.seed === "string" && typeof item.keyword === "string";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function localizedDailyTerm(term: string): string {
  const copy: Record<string, string> = {
    整理: "organizing",
    沟通: "communication",
    修饰: "refinement",
    蓄力: "gathering strength",
    观察: "observation",
    稳住: "steadying",
    调整: "adjustment",
    边界: "boundaries",
    取舍: "prioritizing",
    复盘: "review",
    协作: "collaboration",
    转圜: "flexibility",
    节制: "restraint",
    耐心: "patience",
    修正: "correction",
    开端: "beginning",
    提醒: "reminder",
    减速: "slowing down",
    聚焦: "focus",
    信任: "trust",
    收束: "closure",
    更新: "renewal",
    表达: "expression",
    行动: "action",
    修正计划: "revising plans",
    慢决策: "slow decisions",
    写清单: "making lists",
    补证据: "adding evidence",
    提前确认: "confirming early",
    打磨方案: "polishing plans",
    约定边界: "setting boundaries",
    温和表达: "gentle expression",
    清理待办: "clearing tasks",
    学习: "learning",
    归档: "filing",
    轻量推进: "light progress",
    请教他人: "asking for advice",
    逞强: "forcing strength",
    急躁: "impatience",
    过度承诺: "overcommitting",
    情绪化回复: "emotional replies",
    临时加码: "sudden extra commitments",
    冲动消费: "impulse spending",
    同时开太多事: "starting too many things",
    含糊表达: "vague expression",
    忽略细节: "ignoring details",
    把话说死: "speaking too absolutely",
    熬夜硬撑: "pushing through late nights",
    用猜测代替确认: "guessing instead of confirming",
  };
  return l({ zh: term, en: copy[term] ?? term });
}

export function readingToDailyFallback(base: DailyGuaResult, reading: Reading): DailyGuaResult {
  return {
    ...base,
    summary: reading.interpretation || base.summary,
    oneLineAdvice: reading.actions[0] ?? base.oneLineAdvice,
  };
}
