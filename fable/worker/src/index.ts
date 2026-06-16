// Fable 解读后端 —— Cloudflare Worker。
// 把原 server.mjs 的 /api/* 解读逻辑搬上云：规则引擎结果由 App 端传入，
// Worker 负责构造 prompt + 调 Cerebras + schema 约束 + 入口安全分类。
// Cerebras key 存 Worker secret（CEREBRAS_API_KEY），不暴露给 App。
import { HEXAGRAM_MEANINGS, classifyRisk } from "./hexagrams";
import { castDivination } from "./divination";

export interface Env {
  CEREBRAS_API_KEY: string;
  FABLE_MODEL?: string;
}

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const DEFAULT_MODEL = "gpt-oss-120b";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS },
  });
}

/* ---------------- schemas（Cerebras 要求所有 object 显式 additionalProperties:false） ---------------- */
const READING_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "一句话核心结论，回应用户的具体问题" },
    interpretation: { type: "string", description: "结合盘面与问题的白话局势解释，2-3 句" },
    actions: { type: "array", items: { type: "string" }, description: "恰好 3 条具体可执行的行动建议" },
    risk_notice: { type: "string", description: "风险或限制提示，一句话" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    safety_block: { type: "boolean" },
  },
  required: ["title", "interpretation", "actions", "risk_notice", "confidence", "safety_block"],
  additionalProperties: false,
};

const BAZI_SCHEMA = {
  type: "object",
  properties: {
    career: { type: "string" },
    love: { type: "string" },
    year: { type: "string" },
    confidence_note: { type: "string" },
  },
  required: ["career", "love", "year", "confidence_note"],
  additionalProperties: false,
};

const FENGSHUI_SCHEMA = {
  type: "object",
  properties: {
    suggestions: { type: "array", items: { type: "string" } },
    note: { type: "string" },
  },
  required: ["suggestions", "note"],
  additionalProperties: false,
};

/* ---------------- prompts ---------------- */
const WENGUA_SYSTEM = `你是 Fable App 的问卦解释引擎。卦象由确定性规则引擎算出，你只把结果翻译成贴合用户问题的白话解读，绝不改动卦象或编造卦义。

铁律：
1. 解读必须紧扣用户的具体问题，不要给放之四海皆准的空话。
2. 只依据「卦义依据」提供的卦义来解释，可结合动爻表达「正在转变」，但不要发明卦义。
3. 输出白话，不堆术语；面向看不懂术数的普通用户。
4. 每条行动建议用「动词短语：具体做法」格式（例如「先算成本：列出两地差距」），具体、今天能做，不要方括号标签、不要"顺其自然"这类废话。
5. 不做确定性承诺，不说"一定""保证""注定"。
6. 安全：仅当问题涉及医疗诊断/用药、法律诉讼、把大额积蓄投入赌博/高杠杆投机时，safety_block=true，title 与 actions 改为温和提示"这类决定建议咨询专业人士"，confidence=low。换工作/创业/搬家/感情/考试等正常人生决策正常解读、不要拦截。
7. confidence：有动爻、卦义与问题契合时可 medium；问题模糊或高风险时 low；不轻易 high。`;

const BAZI_SYSTEM = `你是 Fable App 的八字解读引擎。四柱与五行由规则引擎排定，你只把它翻译成普通人看得懂的事业/感情/年度趋势三段白话解读。

铁律：
1. 只依据提供的四柱、五行分布来解读，不编造命主不存在的信息。
2. 白话、不堆术语；每段 2-3 句，落到现实生活，不空谈。
3. 不算寿命、疾病、生死，不做确定性断言（不说"必定""注定"）。
4. 时辰置信度为"中"或"低"时，明显弱化结论、多用"倾向""可能"，confidence_note 说明时柱不确定。
5. 八字是文化参考，不替代职业、医疗、心理等专业意见。`;

const FENGSHUI_SYSTEM = `你是 Fable 风水 Lite 解读引擎。根据用户手工输入的房间类型、朝向和家具位置，给出可执行的低成本居家调整建议。

铁律：
1. 只做阳宅居家摆设建议（床/桌/门窗/动线/采光/收纳），落到能马上动手做的小调整。
2. 不把吉凶绝对化、不制造焦虑，不说"必出事""破财""影响健康"这类断言。
3. suggestions 恰好 6 条，每条具体可执行（如"床头靠实墙，床尾不正对房门"），不空泛。
4. 朝向是手工输入、可能有误差，note 里温和提示这一点。
5. 风水是文化与居住舒适参考，不替代专业设计或安全意见。`;

const DIVINE_METHOD_DESC: Record<string, string> = {
  meihua:
    "你按梅花易数解读：体卦代表求测者自身，用卦代表所问之事，重点看体用之间的五行生克与旺衰——用生体、体克用多吉，用克体多不利。",
  qimen:
    "你按奇门遁甲意象解读：参考值符落宫、八门吉凶（开/休/生为吉，伤/杜/景/死/惊为平或凶）与方位。这是原型简化局，重在给方位与时机的方向性参考。",
  daliuren:
    "你按大六壬意象解读：四课看人我关系与现状，三传看事情的初传（起因/当下）、中传（过程）、末传（结果走向）。这是原型简化课，重在给事情发展的方向性参考。",
};

function divineSystem(method: string): string {
  return `你是 Fable App 的术数解读引擎。盘面由规则引擎起出，你只负责把它翻译成贴合用户问题的白话解读，绝不改动盘面或编造。

${DIVINE_METHOD_DESC[method] ?? ""}

铁律：
1. 解读紧扣用户的具体问题，不给放之四海皆准的空话。
2. 只依据提供的盘面解读；奇门/六壬是原型简化盘，不要假装精确排盘，可用"盘面倾向""参考方向"这类措辞。
3. 白话、不堆术语；输出一句话结论 + 局势解释 + 恰好 3 条今天就能做的具体建议。
4. 不做确定性承诺，不说"一定""注定"。
5. 涉及医疗诊断/用药、法律诉讼、赌博高杠杆等高风险问题，safety_block=true、改为建议咨询专业人士、confidence=low。换工作/创业/搬家/感情等正常人生决策正常解读。
6. confidence 不轻易给 high。`;
}

const CRISIS_READING = {
  safety_block: true,
  confidence: "low",
  title: "这件事值得认真对待",
  interpretation: "听起来你正承受很重的压力。这不是卦象能回答的问题，也不该由一个 App 替你判断。",
  actions: [
    "现在联系信任的人：找一位家人或朋友说说当下的感受。",
    "寻求专业帮助：美国可拨打或发短信 988（自杀与危机生命线，24 小时）。",
    "若有立即危险：请拨打当地紧急电话。",
  ],
  risk_notice: "Fable 是文化参考工具，不能替代专业心理或医疗帮助。",
};

/* ---------------- message builders ---------------- */
type Json = Record<string, any>;

function buildWenguaMessage(p: Json): string {
  const lines = [
    `用户的问题：${p.question || "（未填写）"}`,
    "",
    "规则引擎起卦结果：",
    `- 本卦：${p.primaryName}——${HEXAGRAM_MEANINGS[p.primaryName] || ""}`,
  ];
  if (p.hasMoving && p.changedName) {
    lines.push(`- 动爻：${(p.movingLabels || []).join("、")}（局势正在朝变卦方向转变）`);
    lines.push(`- 变卦：${p.changedName}——${HEXAGRAM_MEANINGS[p.changedName] || ""}`);
  } else {
    lines.push("- 无动爻：卦象安定，以本卦为最终参考。");
  }
  lines.push("", "请基于以上依据，针对用户的问题生成解读。");
  return lines.join("\n");
}

function buildBaziMessage(p: Json): string {
  const certaintyText =
    ({ accurate: "准确时辰（置信度高）", approx: "大概时段（置信度中，时柱为估算）", unknown: "时辰未知（置信度低，时柱不可用）" } as Record<string, string>)[
      p.certainty
    ] || "未知";
  const pillars = p.pillars || {};
  const elements = Array.isArray(p.elements) ? p.elements : [];
  return [
    "规则引擎排定的命盘（原型示例命盘）：",
    `- 四柱：年柱 ${pillars.year}，月柱 ${pillars.month}，日柱 ${pillars.day}，时柱 ${pillars.hour}`,
    `- 五行分布：${elements.map((e: Json) => `${e.name} ${e.level}`).join("，")}`,
    `- 时辰置信度：${certaintyText}`,
    "",
    "请据此生成事业、感情、年度趋势三段白话解读。",
  ].join("\n");
}

function buildFengshuiMessage(p: Json): string {
  const layout = Array.isArray(p.layout) && p.layout.length ? p.layout.join("、") : "（未标注具体位置）";
  return [
    "用户手工输入的房间：",
    `- 房间类型：${p.roomType || "未知"}`,
    `- 主要朝向：${p.direction || "未知"}`,
    `- 家具/门窗位置：${layout}`,
    "",
    "请给出恰好 6 条可执行的居家调整建议。",
  ].join("\n");
}

function buildDivineMessage(method: string, chart: Json, question: string): string {
  const q = `用户的问题：${question || "（未填写）"}`;
  if (method === "meihua") {
    return [
      q,
      "",
      `梅花易数（${chart.timeLabel} 起卦）：`,
      `- 本卦：${chart.hexagram}——${HEXAGRAM_MEANINGS[chart.hexagram] || ""}`,
      `- 体卦：${chart.bodyTrigram}（求测者自身），用卦：${chart.useTrigram}（所问之事）`,
      `- 动爻：第 ${chart.moving} 爻；变卦：${chart.changed}——${HEXAGRAM_MEANINGS[chart.changed] || ""}`,
      "",
      "请以体用生克为纲，针对问题给出白话解读。",
    ].join("\n");
  }
  if (method === "qimen") {
    return [
      q,
      "",
      `奇门遁甲（${chart.dun} ${chart.ju} 局，${chart.timeLabel}）：`,
      `- 值符落宫：${chart.fuPalace}宫`,
      `- 九宫（宫·方位·地盘干·八门）：${(chart.palaces || []).map((pl: Json) => `${pl.name}${pl.dir}${pl.stem}${pl.gate}`).join("；")}`,
      "",
      "这是原型简化局，请基于盘面意象，针对问题给方位、时机与行动的方向性参考，不要假装是精确排盘。",
    ].join("\n");
  }
  return [
    q,
    "",
    `大六壬（${chart.dayGanzhi}日，月将 ${chart.monthGeneral}，${chart.hour}时）：`,
    `- 四课：${(chart.fourLessons || []).map((l: Json) => `${l.label} ${l.lower}/${l.upper}`).join("，")}`,
    `- 三传：${(chart.transmissions || []).map((t: Json) => `${t.label} ${t.branch}`).join("，")}`,
    "",
    "这是原型简化课，请以四课三传看事情初/中/末发展，针对问题给方向性参考，不要假装是精确排盘。",
  ].join("\n");
}

/* ---------------- Cerebras 调用 ---------------- */
async function callCerebras(
  env: Env,
  system: string,
  user: string,
  schema: unknown,
  schemaName: string,
): Promise<Json> {
  const res = await fetch(CEREBRAS_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.CEREBRAS_API_KEY}` },
    body: JSON.stringify({
      model: env.FABLE_MODEL || DEFAULT_MODEL,
      max_completion_tokens: 8000, // 推理模型先吃 token，预算放宽
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema } },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`cerebras ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data: Json = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`no content (finish_reason: ${data.choices?.[0]?.finish_reason || "unknown"})`);
  return JSON.parse(content);
}

async function readJson(request: Request): Promise<Json> {
  return (await request.json()) as Json;
}

/* ---------------- fetch handler ---------------- */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (request.method === "POST" && path === "/api/interpret") {
        const p = await readJson(request);
        if (classifyRisk(p.question) === "crisis") return json(CRISIS_READING);
        const reading = await callCerebras(env, WENGUA_SYSTEM, buildWenguaMessage(p), READING_SCHEMA, "wengua_interpretation");
        return json(reading);
      }

      if (request.method === "POST" && path === "/api/bazi") {
        const p = await readJson(request);
        const reading = await callCerebras(env, BAZI_SYSTEM, buildBaziMessage(p), BAZI_SCHEMA, "bazi_reading");
        return json(reading);
      }

      if (request.method === "POST" && path === "/api/fengshui") {
        const p = await readJson(request);
        const reading = await callCerebras(env, FENGSHUI_SYSTEM, buildFengshuiMessage(p), FENGSHUI_SCHEMA, "fengshui_reading");
        return json(reading);
      }

      if (request.method === "POST" && path === "/api/divine") {
        const p = await readJson(request);
        const method = p.method;
        if (!["meihua", "qimen", "daliuren"].includes(method)) return json({ error: "bad_method" }, 400);
        if (classifyRisk(p.question) === "crisis") return json({ chart: null, reading: CRISIS_READING });
        const chart = castDivination(method, p.time ? new Date(p.time) : new Date());
        const reading = await callCerebras(env, divineSystem(method), buildDivineMessage(method, chart, p.question), READING_SCHEMA, "divine_reading");
        return json({ chart, reading });
      }

      if (request.method === "GET" && path === "/api/daily") {
        const date = url.searchParams.get("date") || "";
        // 每日一卦确定性选卦（卦义查表在 App 端也可，这里一并提供）
        const names = Object.keys(HEXAGRAM_MEANINGS);
        let hash = 0;
        for (let i = 0; i < date.length; i += 1) hash = (hash * 131 + date.charCodeAt(i)) % 1000003;
        const name = names[hash % names.length];
        const meaning = HEXAGRAM_MEANINGS[name];
        const parts = meaning.split(/[；;]/);
        const line = (parts.length > 1 ? parts[1] : parts[0]).trim();
        return json({ date, hexagram: name, line, meaning });
      }

      if (path === "/" || path === "/health") {
        return json({ ok: true, service: "fable-worker" });
      }

      return json({ error: "not_found" }, 404);
    } catch (err: any) {
      console.error("worker error:", path, err?.message);
      return json({ error: "model_failed" }, 502);
    }
  },
};
