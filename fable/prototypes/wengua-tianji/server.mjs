import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";
import { HEXAGRAM_MEANINGS, classifyRisk } from "./src/hexagrams.mjs";
import { castDivination } from "./src/divination.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4174);
const host = process.env.HOST || "0.0.0.0";

// 解释引擎支持两个 provider，可切换：
//  - cerebras：OpenAI 兼容，跑 Qwen/Llama/GLM 等开源模型（中文术数解读默认用 qwen-3-32b）
//  - anthropic：Claude（claude-opus-4-8）
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const DEFAULT_MODELS = { anthropic: "claude-opus-4-8", cerebras: "gpt-oss-120b" };

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
};

// 解析 provider + key + model：环境变量优先，其次 config.local.json（gitignored）
async function resolveConfig() {
  const model = process.env.FABLE_MODEL || null;
  if (process.env.CEREBRAS_API_KEY) {
    return { provider: "cerebras", apiKey: process.env.CEREBRAS_API_KEY, model: model || DEFAULT_MODELS.cerebras };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY, model: model || DEFAULT_MODELS.anthropic };
  }
  try {
    const raw = await readFile(join(root, "config.local.json"), "utf8");
    const c = JSON.parse(raw);
    const apiKey = c.apiKey || c.CEREBRAS_API_KEY || c.ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    const provider = c.provider || (c.CEREBRAS_API_KEY ? "cerebras" : "anthropic");
    return { provider, apiKey, model: c.model || model || DEFAULT_MODELS[provider] || DEFAULT_MODELS.anthropic };
  } catch {
    return null;
  }
}

const INTERPRET_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "一句话核心结论，回应用户的具体问题，不超过 20 字" },
    interpretation: { type: "string", description: "结合卦象与问题的白话局势解释，2-3 句" },
    actions: {
      type: "array",
      items: { type: "string" },
      description: "恰好 3 条具体、可立即执行的行动建议，每条带一个动作前缀",
    },
    risk_notice: { type: "string", description: "风险或限制提示，一句话" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    safety_block: { type: "boolean", description: "是否为高风险问题已转为安全反思" },
  },
  required: ["title", "interpretation", "actions", "risk_notice", "confidence", "safety_block"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `你是 Fable App 的「问卦解释引擎」。卦象由确定性规则引擎算出，你只负责把结果翻译成贴合用户问题的白话解读，绝不自己改动卦象或编造卦义。

铁律：
1. 解读必须紧扣用户的具体问题。用户问时机就谈时机，问感情就谈感情，不要给放之四海皆准的空话。
2. 只依据「卦义依据」提供的卦义来解释，可结合动爻表达「正在转变」，但不要发明卦义。
3. 输出白话，不堆术语；面向看不懂术数的普通用户。
4. 每条行动建议必须具体、今天就能做；用「动词短语：具体做法」的格式（例如「先算成本：列出两地租房与薪资差距」），不要用方括号标签，不要"顺其自然"这类废话。
5. 不做确定性承诺，不说"一定""保证""注定"。
6. 安全：仅当问题涉及医疗诊断/用药、法律诉讼、或把大额积蓄投入赌博/高杠杆投机时，safety_block=true，title 与 actions 改为温和提示"这类决定建议咨询专业人士"，confidence=low，不给确定性断言。换工作、创业、搬家、感情、考试、人际等正常人生决策不属于高风险，正常解读、不要拦截。
7. confidence：有动爻、卦义与问题契合时可 medium；问题模糊或高风险时 low；不要轻易 high。`;

function buildUserMessage(payload) {
  const { question, primaryName, changedName, movingLabels, hasMoving } = payload;
  const primaryMeaning = HEXAGRAM_MEANINGS[primaryName] || "（卦义缺失）";
  const lines = [
    `用户的问题：${question || "（未填写）"}`,
    "",
    "规则引擎起卦结果：",
    `- 本卦：${primaryName}——${primaryMeaning}`,
  ];
  if (hasMoving && changedName) {
    const changedMeaning = HEXAGRAM_MEANINGS[changedName] || "（卦义缺失）";
    lines.push(`- 动爻：${(movingLabels || []).join("、")}（局势正在朝变卦方向转变）`);
    lines.push(`- 变卦：${changedName}——${changedMeaning}`);
  } else {
    lines.push("- 无动爻：卦象安定，以本卦为最终参考。");
  }
  lines.push("", "请基于以上依据，针对用户的问题生成解读。");
  return lines.join("\n");
}

async function httpError(res, label) {
  const detail = await res.text();
  const error = new Error(`${label} ${res.status}`);
  error.status = res.status;
  error.detail = detail;
  return error;
}

// req: { system, user, schema, schemaName }
async function callAnthropic(config, req) {
  const body = {
    model: config.model,
    max_tokens: 2000,
    system: req.system,
    messages: [{ role: "user", content: req.user }],
    output_config: { format: { type: "json_schema", schema: req.schema } },
  };
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await httpError(res, "anthropic");
  const data = await res.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  if (!textBlock) throw new Error("no text block in response");
  return JSON.parse(textBlock.text);
}

async function callCerebras(config, req) {
  // 部分 Cerebras 模型（如 zai-glm-4.7）是推理模型，推理会先吃掉 token 预算，
  // 上限给小了会导致最终 JSON 被截断、content 为空，所以预算放宽。
  const body = {
    model: config.model,
    max_completion_tokens: 8000,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: req.schemaName, strict: true, schema: req.schema },
    },
  };
  const res = await fetch(CEREBRAS_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await httpError(res, "cerebras");
  const data = await res.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  if (!content) {
    throw new Error(`no content (finish_reason: ${choice?.finish_reason || "unknown"})`);
  }
  return JSON.parse(content);
}

function callLLM(config, req) {
  return config.provider === "cerebras"
    ? callCerebras(config, req)
    : callAnthropic(config, req);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 64 * 1024) {
        reject(new Error("payload too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (err) {
        reject(err);
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, status, obj) {
  const payload = JSON.stringify(obj);
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(payload);
}

async function handleInterpret(request, response) {
  let payload;
  try {
    payload = await readBody(request);
  } catch {
    sendJson(response, 400, { error: "bad_request" });
    return;
  }

  // 入口安全分类：危机类直接拦截，不调模型、不起卦解读
  const risk = classifyRisk(payload.question);
  if (risk === "crisis") {
    sendJson(response, 200, {
      safety_block: true,
      confidence: "low",
      title: "这件事值得认真对待",
      interpretation:
        "听起来你正承受很重的压力。这不是卦象能回答的问题，也不该由一个 App 替你判断。",
      actions: [
        "现在联系信任的人：找一位家人或朋友说说当下的感受。",
        "寻求专业帮助：美国可拨打或发短信 988（自杀与危机生命线，24 小时）。",
        "若有立即危险：请拨打当地紧急电话。",
      ],
      risk_notice: "Fable 是文化参考工具，不能替代专业心理或医疗帮助。",
    });
    return;
  }

  const config = await resolveConfig();
  if (!config) {
    sendJson(response, 503, { error: "no_api_key" });
    return;
  }

  try {
    const result = await callLLM(config, {
      system: SYSTEM_PROMPT,
      user: buildUserMessage(payload),
      schema: INTERPRET_SCHEMA,
      schemaName: "wengua_interpretation",
    });
    sendJson(response, 200, result);
  } catch (err) {
    console.error(`interpret failed (${config.provider}):`, err.status || "", err.message, err.detail || "");
    sendJson(response, 502, { error: "model_failed" });
  }
}

// ---- 八字解读 ----
const BAZI_SCHEMA = {
  type: "object",
  properties: {
    career: { type: "string", description: "事业主题解读，2-3 句白话" },
    love: { type: "string", description: "感情主题解读，2-3 句白话" },
    year: { type: "string", description: "本年度趋势解读，2-3 句白话" },
    confidence_note: { type: "string", description: "置信度与限制提示，一句话" },
  },
  required: ["career", "love", "year", "confidence_note"],
  additionalProperties: false,
};

const BAZI_SYSTEM = `你是 Fable App 的八字解读引擎。四柱与五行由规则引擎排定，你只把它翻译成普通人看得懂的事业/感情/年度趋势三段白话解读。

铁律：
1. 只依据提供的四柱、五行分布来解读，不编造命主不存在的信息。
2. 白话、不堆术语；每段 2-3 句，落到现实生活，不空谈。
3. 不算寿命、疾病、生死，不做确定性断言（不说"必定""注定"）。
4. 时辰置信度为"中"或"低"时，明显弱化结论、多用"倾向""可能"，confidence_note 说明时柱不确定。
5. 八字是文化参考，不替代职业、医疗、心理等专业意见。`;

function buildBaziMessage(payload) {
  const { pillars, elements, certainty } = payload;
  const certaintyText =
    { accurate: "准确时辰（置信度高）", approx: "大概时段（置信度中，时柱为估算）", unknown: "时辰未知（置信度低，时柱不可用）" }[certainty] ||
    "未知";
  const pillarText = pillars
    ? `年柱 ${pillars.year}，月柱 ${pillars.month}，日柱 ${pillars.day}，时柱 ${pillars.hour}`
    : "（缺）";
  const elementText = elements ? elements.map((e) => `${e.name} ${e.level}`).join("，") : "（缺）";
  return [
    "规则引擎排定的命盘（原型示例命盘）：",
    `- 四柱：${pillarText}`,
    `- 五行分布：${elementText}`,
    `- 时辰置信度：${certaintyText}`,
    "",
    "请据此生成事业、感情、年度趋势三段白话解读。",
  ].join("\n");
}

async function handleBazi(request, response) {
  let payload;
  try {
    payload = await readBody(request);
  } catch {
    sendJson(response, 400, { error: "bad_request" });
    return;
  }
  const config = await resolveConfig();
  if (!config) {
    sendJson(response, 503, { error: "no_api_key" });
    return;
  }
  try {
    const result = await callLLM(config, {
      system: BAZI_SYSTEM,
      user: buildBaziMessage(payload),
      schema: BAZI_SCHEMA,
      schemaName: "bazi_reading",
    });
    sendJson(response, 200, result);
  } catch (err) {
    console.error(`bazi failed (${config.provider}):`, err.status || "", err.message, err.detail || "");
    sendJson(response, 502, { error: "model_failed" });
  }
}

// ---- 每日一卦（确定性按日期选卦，纯查表不调模型）----
const HEX_NAMES_LIST = Object.keys(HEXAGRAM_MEANINGS);

function dailyHexagram(dateStr) {
  let hash = 0;
  const s = dateStr || "";
  for (let i = 0; i < s.length; i += 1) hash = (hash * 131 + s.charCodeAt(i)) % 1000003;
  const name = HEX_NAMES_LIST[hash % HEX_NAMES_LIST.length];
  return { name, meaning: HEXAGRAM_MEANINGS[name] };
}

function handleDaily(request, response) {
  const url = new URL(request.url, "http://localhost");
  const date = url.searchParams.get("date") || "";
  const { name, meaning } = dailyHexagram(date);
  const parts = meaning.split(/[；;]/); // 卦义格式「<状态>；<指引>」，取指引部分更通顺
  const line = (parts.length > 1 ? parts[1] : parts[0]).trim();
  sendJson(response, 200, { date, hexagram: name, line, meaning });
}

// ---- 风水 Lite 解读 ----
const FENGSHUI_SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: { type: "string" },
      description: "恰好 6 条可执行的居家调整建议",
    },
    note: { type: "string", description: "一句话提示（如朝向误差或安全）" },
  },
  required: ["suggestions", "note"],
  additionalProperties: false,
};

const FENGSHUI_SYSTEM = `你是 Fable 风水 Lite 解读引擎。根据用户手工输入的房间类型、朝向和家具位置，给出可执行的低成本居家调整建议。

铁律：
1. 只做阳宅居家摆设建议（床/桌/门窗/动线/采光/收纳），落到能马上动手做的小调整。
2. 不把吉凶绝对化、不制造焦虑，不说"必出事""破财""影响健康"这类断言。
3. suggestions 恰好 6 条，每条具体可执行（如"床头靠实墙，床尾不正对房门"），不空泛。
4. 朝向是手工输入、可能有误差，note 里温和提示这一点。
5. 风水是文化与居住舒适参考，不替代专业设计或安全意见。`;

function buildFengshuiMessage(payload) {
  const { roomType, direction, layout } = payload;
  const layoutText = Array.isArray(layout) && layout.length ? layout.join("、") : "（未标注具体位置）";
  return [
    "用户手工输入的房间：",
    `- 房间类型：${roomType || "未知"}`,
    `- 主要朝向：${direction || "未知"}`,
    `- 家具/门窗位置：${layoutText}`,
    "",
    "请给出恰好 6 条可执行的居家调整建议。",
  ].join("\n");
}

async function handleFengshui(request, response) {
  let payload;
  try {
    payload = await readBody(request);
  } catch {
    sendJson(response, 400, { error: "bad_request" });
    return;
  }
  const config = await resolveConfig();
  if (!config) {
    sendJson(response, 503, { error: "no_api_key" });
    return;
  }
  try {
    const result = await callLLM(config, {
      system: FENGSHUI_SYSTEM,
      user: buildFengshuiMessage(payload),
      schema: FENGSHUI_SCHEMA,
      schemaName: "fengshui_reading",
    });
    sendJson(response, 200, result);
  } catch (err) {
    console.error(`fengshui failed (${config.provider}):`, err.status || "", err.message, err.detail || "");
    sendJson(response, 502, { error: "model_failed" });
  }
}

// ---- 多术数解读（梅花/奇门/六壬）----
const DIVINE_METHOD_DESC = {
  meihua:
    "你按梅花易数解读：体卦代表求测者自身，用卦代表所问之事，重点看体用之间的五行生克与旺衰——用生体、体克用多吉，用克体多不利。",
  qimen:
    "你按奇门遁甲意象解读：参考值符落宫、八门吉凶（开/休/生为吉，伤/杜/景/死/惊为平或凶）与方位。这是原型简化局，重在给方位与时机的方向性参考。",
  daliuren:
    "你按大六壬意象解读：四课看人我关系与现状，三传看事情的初传（起因/当下）、中传（过程）、末传（结果走向）。这是原型简化课，重在给事情发展的方向性参考。",
};

function divineSystem(method) {
  return `你是 Fable App 的术数解读引擎。盘面由规则引擎起出，你只负责把它翻译成贴合用户问题的白话解读，绝不改动盘面或编造。

${DIVINE_METHOD_DESC[method]}

铁律：
1. 解读紧扣用户的具体问题，不给放之四海皆准的空话。
2. 只依据提供的盘面解读；奇门/六壬是原型简化盘，不要假装精确排盘，可用"盘面倾向""参考方向"这类措辞。
3. 白话、不堆术语；输出一句话结论 + 局势解释 + 恰好 3 条今天就能做的具体建议。
4. 不做确定性承诺，不说"一定""注定"。
5. 涉及医疗诊断/用药、法律诉讼、赌博高杠杆等高风险问题，safety_block=true、改为建议咨询专业人士、confidence=low。换工作/创业/搬家/感情等正常人生决策正常解读。
6. confidence 不轻易给 high。`;
}

function buildDivineMessage(method, chart, question) {
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
      `- 九宫（宫·方位·地盘干·八门）：${chart.palaces.map((p) => `${p.name}${p.dir}${p.stem}${p.gate}`).join("；")}`,
      "",
      "这是原型简化局，请基于盘面意象，针对问题给方位、时机与行动的方向性参考，不要假装是精确排盘。",
    ].join("\n");
  }
  // daliuren
  return [
    q,
    "",
    `大六壬（${chart.dayGanzhi}日，月将 ${chart.monthGeneral}，${chart.hour}时）：`,
    `- 四课：${chart.fourLessons.map((l) => `${l.label} ${l.lower}/${l.upper}`).join("，")}`,
    `- 三传：${chart.transmissions.map((t) => `${t.label} ${t.branch}`).join("，")}`,
    "",
    "这是原型简化课，请以四课三传看事情初/中/末发展，针对问题给方向性参考，不要假装是精确排盘。",
  ].join("\n");
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

async function handleDivine(request, response) {
  let payload;
  try {
    payload = await readBody(request);
  } catch {
    sendJson(response, 400, { error: "bad_request" });
    return;
  }
  const { method, question, time } = payload;
  if (!["meihua", "qimen", "daliuren"].includes(method)) {
    sendJson(response, 400, { error: "bad_method" });
    return;
  }
  if (classifyRisk(question) === "crisis") {
    sendJson(response, 200, { chart: null, reading: CRISIS_READING });
    return;
  }
  let chart;
  try {
    chart = castDivination(method, time ? new Date(time) : new Date());
  } catch {
    sendJson(response, 400, { error: "cast_failed" });
    return;
  }
  const config = await resolveConfig();
  if (!config) {
    sendJson(response, 503, { error: "no_api_key", chart });
    return;
  }
  try {
    const reading = await callLLM(config, {
      system: divineSystem(method),
      user: buildDivineMessage(method, chart, question),
      schema: INTERPRET_SCHEMA,
      schemaName: "divine_reading",
    });
    sendJson(response, 200, { chart, reading });
  } catch (err) {
    console.error(`divine ${method} failed (${config.provider}):`, err.status || "", err.message, err.detail || "");
    sendJson(response, 502, { error: "model_failed", chart });
  }
}

const server = createServer(async (request, response) => {
  const rawPath = decodeURIComponent(request.url.split("?")[0]);

  if (request.method === "POST" && rawPath === "/api/interpret") {
    await handleInterpret(request, response);
    return;
  }

  if (request.method === "POST" && rawPath === "/api/bazi") {
    await handleBazi(request, response);
    return;
  }

  if (request.method === "POST" && rawPath === "/api/fengshui") {
    await handleFengshui(request, response);
    return;
  }

  if (request.method === "POST" && rawPath === "/api/divine") {
    await handleDivine(request, response);
    return;
  }

  if (request.method === "GET" && rawPath === "/api/daily") {
    handleDaily(request, response);
    return;
  }

  const path = rawPath === "/" ? "/index.html" : rawPath;
  const filePath = join(root, normalize(path).replace(/^(\.\.[/\\])+/, ""));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-type": types[extname(filePath)] || "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

server.listen(port, host, async () => {
  const localUrls = Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === "IPv4" && !net.internal)
    .map((net) => `http://${net.address}:${port}`);

  const config = await resolveConfig();
  console.log(`Tianji prototype local http://127.0.0.1:${port}`);
  localUrls.forEach((url) => console.log(`Tianji prototype mobile ${url}`));
  console.log(
    config
      ? `AI interpret: enabled (${config.provider} · ${config.model})`
      : "AI interpret: DISABLED — no API key. Set CEREBRAS_API_KEY / ANTHROPIC_API_KEY or create config.local.json. Prototype falls back to sample copy.",
  );
});
