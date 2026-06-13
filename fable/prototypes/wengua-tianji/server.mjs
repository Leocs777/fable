import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";
import { HEXAGRAM_MEANINGS, classifyRisk } from "./src/hexagrams.mjs";

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

async function callAnthropic(config, payload) {
  const body = {
    model: config.model,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(payload) }],
    output_config: { format: { type: "json_schema", schema: INTERPRET_SCHEMA } },
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

async function callCerebras(config, payload) {
  // 部分 Cerebras 模型（如 zai-glm-4.7）是推理模型，推理会先吃掉 token 预算，
  // 上限给小了会导致最终 JSON 被截断、content 为空，所以预算放宽。
  const body = {
    model: config.model,
    max_completion_tokens: 8000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(payload) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "wengua_interpretation", strict: true, schema: INTERPRET_SCHEMA },
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

function callLLM(config, payload) {
  return config.provider === "cerebras"
    ? callCerebras(config, payload)
    : callAnthropic(config, payload);
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
    const result = await callLLM(config, payload);
    sendJson(response, 200, result);
  } catch (err) {
    console.error(`interpret failed (${config.provider}):`, err.status || "", err.message, err.detail || "");
    sendJson(response, 502, { error: "model_failed" });
  }
}

const server = createServer(async (request, response) => {
  const rawPath = decodeURIComponent(request.url.split("?")[0]);

  if (request.method === "POST" && rawPath === "/api/interpret") {
    await handleInterpret(request, response);
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
