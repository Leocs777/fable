import type { DivinationMethod, DivineChart, Reading } from "@/lib/api";
import { l, methodTitle as localizedMethodTitle } from "@/lib/i18n";
import type { LiuyaoCast } from "@/lib/liuyao";

export type ReadingMethodKey = "liuyao" | DivinationMethod;

export type ReadingResultSession = {
  id: string;
  createdAt: number;
  method: ReadingMethodKey;
  methodTitle: string;
  question: string;
  detail: string;
  reading: Reading;
  cast: LiuyaoCast | null;
  chart: DivineChart | null;
};

const sessions = new Map<string, ReadingResultSession>();
const MAX_SESSIONS = 24;

export function createReadingResultSession(input: {
  method: ReadingMethodKey;
  methodTitle?: string;
  question: string;
  reading: Reading;
  cast: LiuyaoCast | null;
  chart: DivineChart | null;
}): ReadingResultSession {
  const createdAt = Date.now();
  const session: ReadingResultSession = {
    id: `${createdAt}-${input.method}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
    method: input.method,
    methodTitle: input.methodTitle ?? localizedMethodTitle(input.method),
    question: input.question,
    detail: readingDetail(input.method, input.cast, input.chart),
    reading: input.reading,
    cast: input.cast,
    chart: input.chart,
  };
  sessions.set(session.id, session);
  pruneSessions();
  return session;
}

export function getReadingResultSession(id: string): ReadingResultSession | null {
  return sessions.get(id) ?? null;
}

export function readingMethodTitle(method: ReadingMethodKey): string {
  return localizedMethodTitle(method);
}

export function readingDetail(method: ReadingMethodKey, cast: LiuyaoCast | null, chart: DivineChart | null): string {
  if (method === "liuyao" && cast) {
    const moving = cast.movingLabels.length > 0 ? l({ zh: `动爻 ${cast.movingLabels.join("、")}`, en: `Changing lines ${cast.movingLabels.join(", ")}` }) : l({ zh: "无动爻", en: "No changing lines" });
    return `${cast.primaryName} → ${cast.changedName} · ${moving}`;
  }
  if (chart?.method === "meihua") return `${chart.hexagram} → ${chart.changed} · ${l({ zh: `动第 ${chart.moving} 爻`, en: `Changing line ${chart.moving}` })}`;
  if (chart?.method === "qimen") return `${chart.dun} ${chart.ju} · ${l({ zh: `值符落 ${chart.fuPalace} 宫`, en: `Chief sign in palace ${chart.fuPalace}` })}`;
  if (chart?.method === "daliuren") return l({ zh: `${chart.dayGanzhi}日 · ${chart.monthGeneral}将 · ${chart.hour}时`, en: `${chart.dayGanzhi} day · ${chart.monthGeneral} general · ${chart.hour} hour` });
  return l({ zh: "已生成解读", en: "Reading generated" });
}

export function readingSummary(reading: Reading): string {
  const normalized = reading.interpretation.replace(/\s+/g, " ").trim();
  if (!normalized) return reading.title;
  const matches = normalized.match(/[^。！？.!?]+[。！？.!?]?/g) ?? [normalized];
  return matches.slice(0, 2).join("").trim();
}

export function buildDeepReport(reading: Reading, cast: LiuyaoCast | null, chart: DivineChart | null): { title: string; body: string }[] {
  const movement = cast
    ? cast.movingLabels.length > 0
      ? l({ zh: `动爻落在 ${cast.movingLabels.join("、")}，说明这件事有可改变的切入点。`, en: `The changing lines are ${cast.movingLabels.join(", ")}, pointing to places where the situation can still shift.` })
      : l({ zh: "本卦无动爻，说明局势更偏稳定，适合先守住节奏。", en: "There are no changing lines, so the pattern is steadier; hold your rhythm before forcing movement." })
    : chart
      ? l({ zh: `${chart.methodName}已起盘，适合从盘面结构看时机与方位。`, en: `${chart.methodName} has been cast; read it through timing, structure, and direction.` })
      : l({ zh: "当前盘面信息较少，建议先补充问题背景。", en: "The chart has limited context. Add more background before leaning on the reading." });
  const primaryAction = reading.actions[0] ?? l({ zh: "先把当前最可控的一步做扎实。", en: "Start with the most controllable next step." });
  const secondAction = reading.actions[1] ?? l({ zh: "再观察外部条件是否变得更清楚。", en: "Then watch whether the outside conditions become clearer." });
  return [
    {
      title: l({ zh: "盘面提示", en: "Chart signal" }),
      body: `${movement}${reading.title ? ` ${reading.title}` : ""}`,
    },
    {
      title: l({ zh: "时机窗口", en: "Timing window" }),
      body: l({ zh: `${primaryAction} 如果三天内信息仍不清楚，先做准备，不急着承诺。`, en: `${primaryAction} If the picture is still unclear within three days, prepare first and avoid overcommitting.` }),
    },
    {
      title: l({ zh: "风险雷达", en: "Risk radar" }),
      body: reading.risk_notice || l({ zh: "不要把卦象当成唯一依据；重大现实决策仍需要结合事实、预算和专业意见。", en: "Do not use the reading as your only basis; important decisions still need facts, budgets, and professional advice." }),
    },
    {
      title: l({ zh: "追问方向", en: "Follow-up angle" }),
      body: l({ zh: `下一步可以追问：“${secondAction.replace(/[。.!！]$/, "")}，我现在最该先做哪一步？”`, en: `A useful follow-up: "${secondAction.replace(/[。.!！]$/, "")}. What should I do first now?"` }),
    },
  ];
}

export function deepReportId(question: string, reading: Reading, cast: LiuyaoCast | null, chart: DivineChart | null): string {
  const methodPart = cast ? `liuyao:${cast.primaryName}:${cast.changedName}:${cast.movingLabels.join(",")}` : chart ? `${chart.method}:${chart.methodName}` : "unknown";
  return stableHash(`${methodPart}|${question}|${reading.title}`);
}

function pruneSessions() {
  if (sessions.size <= MAX_SESSIONS) return;
  const ids = [...sessions.entries()]
    .sort((left, right) => left[1].createdAt - right[1].createdAt)
    .slice(0, sessions.size - MAX_SESSIONS)
    .map(([id]) => id);
  ids.forEach((id) => sessions.delete(id));
}

function stableHash(input: string): string {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}
