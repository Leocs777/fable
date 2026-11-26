import { type DivinationMethod } from "@/lib/api";
import { l, type LocalizedCopy } from "@/lib/i18n";

export type DivinationMotionMethod = "meihua" | "qimen" | "liuren";
export type DivinationMotionState =
  | "idle"
  | "pressed"
  | "entering"
  | "generating_start"
  | "generating_loop"
  | "generating_complete"
  | "result_header"
  | "error"
  | "retry";

export const DIVINATION_MIN_GENERATING_MS = 16000;
export const DIVINATION_COMPLETION_MS = 3000;
export const MOTION_METHOD_BY_API_METHOD: Record<DivinationMethod, DivinationMotionMethod> = {
  meihua: "meihua",
  qimen: "qimen",
  daliuren: "liuren",
};

export function apiDivinationMotionTrigger(method: DivinationMethod, state: DivinationMotionState): string {
  return `${MOTION_METHOD_BY_API_METHOD[method]}_${state}`;
}

export function divinationMotionTrigger(method: DivinationMotionMethod, state: DivinationMotionState): string {
  return `${method}_${state}`;
}

const DIVINATION_METHOD_COPY_SOURCE: Record<DivinationMethod, { title: LocalizedCopy; seal: LocalizedCopy; generating: LocalizedCopy; completed: LocalizedCopy }> = {
  meihua: {
    title: { zh: "梅花易数", en: "Plum Blossom Oracle" },
    seal: { zh: "梅影入水", en: "Plum shadow enters water" },
    generating: { zh: "梅花入象，水纹成卦", en: "Petals gather, ripples form the hexagram" },
    completed: { zh: "本卦变卦已定", en: "Primary and changed hexagrams are set" },
  },
  qimen: {
    title: { zh: "奇门遁甲", en: "Qi Men Compass" },
    seal: { zh: "九宫排局", en: "Nine palaces align" },
    generating: { zh: "八门旋定，值符落宫", en: "Eight gates settle into the palaces" },
    completed: { zh: "九宫盘面已锁定", en: "The nine-palace chart is locked" },
  },
  daliuren: {
    title: { zh: "大六壬", en: "Three Transmissions" },
    seal: { zh: "三传起课", en: "Three transmissions begin" },
    generating: { zh: "十二支环列，四课三传展开", en: "Branches, lessons, and transmissions unfold" },
    completed: { zh: "因果线已收束", en: "The causal lines have gathered" },
  },
};

export const DIVINATION_METHOD_COPY: Record<DivinationMethod, { title: string; seal: string; generating: string; completed: string }> = {
  meihua: localizeMethodCopy("meihua"),
  qimen: localizeMethodCopy("qimen"),
  daliuren: localizeMethodCopy("daliuren"),
};

function localizeMethodCopy(method: DivinationMethod): { title: string; seal: string; generating: string; completed: string } {
  const copy = DIVINATION_METHOD_COPY_SOURCE[method];
  return {
    title: l(copy.title),
    seal: l(copy.seal),
    generating: l(copy.generating),
    completed: l(copy.completed),
  };
}
