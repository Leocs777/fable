const shell = document.querySelector(".prototype-shell");
const questionInput = document.querySelector("#questionInput");
const charCount = document.querySelector("#charCount");
const castButton = document.querySelector("#castButton");
const trayButton = document.querySelector("#trayButton");
const trayHint = document.querySelector("#trayHint");
const buttonSubcopy = document.querySelector("#buttonSubcopy");
const castingBackdrop = document.querySelector(".casting-backdrop");
const resultPanel = document.querySelector("#resultPanel");
const resultQuestion = document.querySelector("#resultQuestion");
const primaryGlyph = document.querySelector("#primaryGlyph");
const changedGlyph = document.querySelector("#changedGlyph");
const primaryName = document.querySelector("#primaryName");
const changedName = document.querySelector("#changedName");
const changedBlock = document.querySelector("#changedBlock");
const hexaArrow = document.querySelector("#hexaArrow");
const movingNote = document.querySelector("#movingNote");
const riskNotice = document.querySelector("#riskNotice");
const resultSource = document.querySelector("#resultSource");
const resultTitle = document.querySelector(".result-panel h2");
const resultReading = document.querySelector(".result-panel .reading");
const resultActions = Array.from(document.querySelectorAll(".result-panel .actions div span"));
const resetButton = document.querySelector("#resetButton");
const unlockButton = document.querySelector("#unlockButton");
const deepReportDrawer = document.querySelector("#deepReportDrawer");
const closeDeepReport = document.querySelector("#closeDeepReport");
const deepHexName = document.querySelector("#deepReportDrawer .deep-head strong");
const unlockedReport = document.querySelector("#unlockedReport");
const followUpInput = document.querySelector("#followUpInput");
const followUpButton = document.querySelector("#followUpButton");
const followUpAnswer = document.querySelector("#followUpAnswer");
const paywallButton = document.querySelector("#paywallButton");
const paywallDrawer = document.querySelector("#paywallDrawer");
const closePaywall = document.querySelector("#closePaywall");
const confirmPaywall = document.querySelector("#confirmPaywall");
const paywallNote = document.querySelector("#paywallNote");
const paywallOptions = Array.from(document.querySelectorAll(".paywall-option"));
const privacyDrawer = document.querySelector("#privacyDrawer");
const privacyButton = document.querySelector("#privacyButton");
const closePrivacy = document.querySelector("#closePrivacy");
const acceptPrivacy = document.querySelector("#acceptPrivacy");
const privacyStatus = document.querySelector("#privacyStatus");
const historyDrawer = document.querySelector("#historyDrawer");
const historyButton = document.querySelector("#historyButton");
const closeHistory = document.querySelector("#closeHistory");
const deleteHistory = document.querySelector("#deleteHistory");
const historyCount = document.querySelector("#historyCount");
const historyEmpty = document.querySelector("#historyEmpty");
const historyDetailTime = document.querySelector("#historyDetailTime");
const historyDetailTitle = document.querySelector("#historyDetailTitle");
const historyDetailSummary = document.querySelector("#historyDetailSummary");
const historyItems = Array.from(document.querySelectorAll(".history-item"));
const moduleTabs = Array.from(document.querySelectorAll("[data-module-tab]"));
const moduleViews = {
  wengua: document.querySelector("#wenguaModule"),
  bazi: document.querySelector("#baziModule"),
  fengshui: document.querySelector("#fengshuiModule"),
};
const baziButton = document.querySelector("#baziButton");
const baziSubcopy = document.querySelector("#baziSubcopy");
const baziResult = document.querySelector("#baziResult");
const confidenceBanner = document.querySelector("#confidenceBanner");
const hourPillar = document.querySelector("#hourPillar strong");
const certaintyButtons = Array.from(document.querySelectorAll("[data-time-certainty]"));
const baziCareer = document.querySelector("#baziCareer");
const baziLove = document.querySelector("#baziLove");
const baziYear = document.querySelector("#baziYear");
const baziThemeCards = document.querySelector("#baziThemeCards");
const baziSource = document.querySelector("#baziSource");
const dailyCard = document.querySelector("#dailyCard");
const dailyEyebrow = document.querySelector("#dailyEyebrow");
const dailyHex = document.querySelector("#dailyHex");
const dailyLine = document.querySelector("#dailyLine");
const dailyBell = document.querySelector("#dailyBell");
const methodTabs = Array.from(document.querySelectorAll("[data-method]"));
const trayStage = document.querySelector(".tray-stage");
const wenguaNotes = document.querySelector("#wenguaModule .notes");
const hexagramBuilderEl = document.querySelector("#hexagramBuilder");
const divineStage = document.querySelector("#divineStage");
const divineIntro = document.querySelector("#divineIntro");
const divineButton = document.querySelector("#divineButton");
const divineButtonText = document.querySelector("#divineButtonText");
const divineButtonSub = document.querySelector("#divineButtonSub");
const divineResult = document.querySelector("#divineResult");
const divineQuestion = document.querySelector("#divineQuestion");
const divineChart = document.querySelector("#divineChart");
const divineChartNote = document.querySelector("#divineChartNote");
const divineTitle = document.querySelector("#divineTitle");
const divineReading = document.querySelector("#divineReading");
const divineActions = document.querySelector("#divineActions");
const divineRisk = document.querySelector("#divineRisk");
const divineSource = document.querySelector("#divineSource");
const divineReset = document.querySelector("#divineReset");
const roomType = document.querySelector("#roomType");
const roomDirection = document.querySelector("#roomDirection");
const fengshuiButton = document.querySelector("#fengshuiButton");
const fengshuiSubcopy = document.querySelector("#fengshuiSubcopy");
const fengshuiResult = document.querySelector("#fengshuiResult");
const roomCompass = document.querySelector("#roomCompass");
const fengshuiChecklist = document.querySelector("#fengshuiChecklist");
const fengshuiBanner = document.querySelector("#fengshuiBanner");
const layoutChoices = Array.from(document.querySelectorAll("[data-layout-choice]"));
const chips = Array.from(document.querySelectorAll("[data-chip]"));
const builderLines = document.querySelector("#builderLines");
const builderCaption = document.querySelector("#builderCaption");
const coins = Array.from(document.querySelectorAll(".coin"));

const privacyConsentKey = "tianjiPrivacyAccepted";
let casting = false;
let skipRequested = false;
let activeSkipHandler = null;
let selectedPlan = "subscription";
let deepReportUnlocked = false;
let selectedTimeCertainty = "accurate";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------------------------------------------------------------------
 * 六爻规则引擎（原型内置版）
 * 金钱卦：三枚铜钱掷六次，自下而上成爻。
 * 每枚铜钱 正面(阳)=3 / 反面(阴)=2，三枚之和：
 *   6 = 老阴（动，阴变阳） 7 = 少阳 8 = 少阴 9 = 老阳（动，阳变阴）
 * 本卦取爻的当前阴阳，变卦把动爻翻转。卦名按上/下三宫查表。
 * ------------------------------------------------------------------------- */

const TRIGRAM_NAMES = {
  "111": "乾", "110": "兑", "101": "离", "100": "震",
  "011": "巽", "010": "坎", "001": "艮", "000": "坤",
};

// HEX_NAMES[上卦][下卦] = 卦名（标准六十四卦方阵）
const HEX_NAMES = {
  乾: { 乾: "乾", 兑: "履", 离: "同人", 震: "无妄", 巽: "姤", 坎: "讼", 艮: "遁", 坤: "否" },
  兑: { 乾: "夬", 兑: "兑", 离: "革", 震: "随", 巽: "大过", 坎: "困", 艮: "咸", 坤: "萃" },
  离: { 乾: "大有", 兑: "睽", 离: "离", 震: "噬嗑", 巽: "鼎", 坎: "未济", 艮: "旅", 坤: "晋" },
  震: { 乾: "大壮", 兑: "归妹", 离: "丰", 震: "震", 巽: "恒", 坎: "解", 艮: "小过", 坤: "豫" },
  巽: { 乾: "小畜", 兑: "中孚", 离: "家人", 震: "益", 巽: "巽", 坎: "涣", 艮: "渐", 坤: "观" },
  坎: { 乾: "需", 兑: "节", 离: "既济", 震: "屯", 巽: "井", 坎: "坎", 艮: "蹇", 坤: "比" },
  艮: { 乾: "大畜", 兑: "损", 离: "贲", 震: "颐", 巽: "蛊", 坎: "蒙", 艮: "艮", 坤: "剥" },
  坤: { 乾: "泰", 兑: "临", 离: "明夷", 震: "复", 巽: "升", 坎: "师", 艮: "谦", 坤: "坤" },
};

const LINE_TYPES = {
  6: { label: "老阴", yang: false, moving: true },
  7: { label: "少阳", yang: true, moving: false },
  8: { label: "少阴", yang: false, moving: false },
  9: { label: "老阳", yang: true, moving: true },
};

const POSITION_NAMES = ["初", "二", "三", "四", "五", "上"];

function throwCoins() {
  // 每枚铜钱：true = 正面(3)，false = 反面(2)
  const faces = [Math.random() < 0.5, Math.random() < 0.5, Math.random() < 0.5];
  const value = faces.reduce((sum, isHeads) => sum + (isHeads ? 3 : 2), 0);
  return { faces, value };
}

function hexagramName(lines) {
  // lines: 自下而上的 0/1 数组
  const lower = TRIGRAM_NAMES[`${lines[0]}${lines[1]}${lines[2]}`];
  const upper = TRIGRAM_NAMES[`${lines[3]}${lines[4]}${lines[5]}`];
  return HEX_NAMES[upper][lower];
}

function buildCast(throws) {
  const primaryLines = throws.map((t) => (LINE_TYPES[t.value].yang ? 1 : 0));
  const changedLines = throws.map((t) => {
    const type = LINE_TYPES[t.value];
    if (!type.moving) return type.yang ? 1 : 0;
    return type.yang ? 0 : 1;
  });
  const movingPositions = throws
    .map((t, index) => (LINE_TYPES[t.value].moving ? index : -1))
    .filter((index) => index >= 0);
  const movingLabels = movingPositions.map((index) => {
    const numeral = LINE_TYPES[throws[index].value].yang ? "九" : "六";
    // 初/上爻为「初九」「上六」式，中间四爻为「九二」「六五」式
    if (index === 0 || index === 5) return `${POSITION_NAMES[index]}${numeral}`;
    return `${numeral}${POSITION_NAMES[index]}`;
  });
  return {
    throws,
    primaryLines,
    changedLines,
    movingPositions,
    primaryName: hexagramName(primaryLines),
    changedName: hexagramName(changedLines),
    movingLabels,
  };
}

/* 解释文案：原型示例，按卦名稳定取样，正式版由「规则结果 + 知识库 + AI 解释」替换 */
const readingVariants = [
  {
    title: "先稳住节奏，再择机推进",
    reading: "当前更适合蓄力和整理资源，不宜仓促拍板。外部条件正在改善，把关键准备做扎实，会比立即冲刺更稳。",
    actions: ["稳住当下：先梳理资源，减少不必要的分支。", "主动蓄力：补齐关键能力，为下一步行动做准备。", "择机推进：等待条件成熟，再果断出手。"]
  },
  {
    title: "主动靠近，但别急着证明",
    reading: "局势适合低姿态推进。与其一次性争取结果，不如先建立信任、补充信息，让对方自然看到你的价值。",
    actions: ["先给价值：补一条对对方有帮助的信息。", "控制频率：主动跟进一次即可，不连续催促。", "留出余地：把选择权交给对方，避免压迫感。"]
  },
  {
    title: "先看清格局，再小步试探",
    reading: "这件事还不到重押的时候。先观察关键人的态度和资源流向，用小动作验证方向，比直接摊牌更稳。",
    actions: ["观察信号：记录对方是否持续投入注意力。", "小步验证：先提出一个低成本试探方案。", "暂缓承诺：不要在信息不足时给长期承诺。"]
  },
  {
    title: "守住边界，用真诚换确定性",
    reading: "当前机会里有可推进的空间，但需要注意分寸。清楚表达立场，同时保持诚意，会比讨好或强推更有效。",
    actions: ["明确底线：先写下自己不能让步的条件。", "真诚沟通：把担忧说清楚，不用包装成绝对判断。", "稳步推进：先完成一个可交付的小结果。"]
  }
];

function pickReading(cast) {
  // 同一卦名稳定映射到同一示例文案，避免随机感
  let hash = 0;
  for (const char of cast.primaryName + cast.changedName) {
    hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  }
  return readingVariants[hash % readingVariants.length];
}

/* ---------------------------------------------------------------------------
 * 起卦动画与渲染
 * ------------------------------------------------------------------------- */

// ?slow=1 放慢节奏，便于设计评审逐掷查看
const slowMode = new URLSearchParams(window.location.search).get("slow") === "1";
const THROW_INTERVAL = slowMode ? 2200 : 880;
const COIN_SETTLE = 620;

function renderBuilderSlots() {
  builderLines.innerHTML = POSITION_NAMES.map(
    (name, index) => `
    <div class="builder-line" data-line="${index}">
      <span class="line-pos">${name}</span>
      <span class="line-glyph"><i></i><i></i></span>
      <span class="line-meta">待掷</span>
    </div>`
  ).reverse().join("");
}

function paintBuilderLine(index, throwResult) {
  const slot = builderLines.querySelector(`[data-line="${index}"]`);
  if (!slot) return;
  const type = LINE_TYPES[throwResult.value];
  slot.classList.add("cast", type.yang ? "yang" : "yin");
  if (type.moving) slot.classList.add("moving");
  const faceText = throwResult.faces.map((isHeads) => (isHeads ? "正" : "反")).join("");
  slot.querySelector(".line-meta").textContent = `${faceText} · ${type.label}${type.moving ? " 动" : ""}`;
}

function animateCoins(throwResult) {
  coins.forEach((coin, index) => {
    coin.classList.remove("tossing");
    // 强制 reflow 以便重新触发动画
    void coin.offsetWidth;
    coin.style.setProperty("--coin-delay", `${index * 70}ms`);
    coin.classList.toggle("tails", !throwResult.faces[index]);
    coin.classList.add("tossing");
  });
}

function renderGlyph(container, lines, movingPositions, markMoving) {
  // 显示顺序自上而下：上爻在最上
  container.innerHTML = lines
    .map((line, index) => {
      const moving = markMoving && movingPositions.includes(index);
      return `<span class="glyph-row ${line ? "yang" : "yin"}${moving ? " moving" : ""}"><i></i><i></i></span>`;
    })
    .reverse()
    .join("");
}

let interpretRequestId = 0;

function renderResult(cast) {
  // 同步部分：卦象结构与问题回显，规则引擎结果立即可见
  resultQuestion.textContent = questionInput.value.trim() || "（未填写问题）";
  renderGlyph(primaryGlyph, cast.primaryLines, cast.movingPositions, true);
  primaryName.textContent = cast.primaryName;
  const hasMoving = cast.movingPositions.length > 0;
  changedBlock.style.display = hasMoving ? "" : "none";
  hexaArrow.style.display = hasMoving ? "" : "none";
  if (hasMoving) {
    renderGlyph(changedGlyph, cast.changedLines, [], false);
    changedName.textContent = cast.changedName;
    movingNote.textContent = `动爻：${cast.movingLabels.join("、")}`;
  } else {
    movingNote.textContent = "无动爻：卦象安定，本卦即为最终参考。";
  }
  if (deepHexName) {
    deepHexName.textContent = hasMoving ? `${cast.primaryName}卦变${cast.changedName}卦` : `${cast.primaryName}卦（无动爻）`;
  }
  // 异步部分：把卦象+卦义+问题交给后端 AI 生成贴合问题的白话解读
  requestInterpretation(cast, hasMoving);
}

function setInterpretLoading() {
  resultPanel.dataset.interpret = "loading";
  resultPanel.classList.remove("safety");
  resultTitle.textContent = "正在结合卦象生成解读…";
  resultReading.textContent = "规则引擎已起卦，正在针对你的问题生成白话解读。";
  resultActions.forEach((action) => {
    action.textContent = "·";
  });
  riskNotice.hidden = true;
  resultSource.textContent = "";
}

function applyInterpretation(data, fromAI) {
  resultPanel.dataset.interpret = "done";
  resultPanel.classList.toggle("safety", Boolean(data.safety_block));
  resultTitle.textContent = data.title || "";
  resultReading.textContent = data.interpretation || "";
  const actions = data.actions || [];
  resultActions.forEach((action, index) => {
    action.textContent = actions[index] || "";
  });
  if (data.risk_notice) {
    riskNotice.textContent = data.risk_notice;
    riskNotice.hidden = false;
  } else {
    riskNotice.hidden = true;
  }
  if (data.safety_block) {
    resultSource.textContent = "安全提示 · ";
  } else if (fromAI) {
    resultSource.textContent = "AI 解读 · ";
  } else {
    resultSource.textContent = "示例解读（未配置 AI）· ";
  }
}

function localFallback(cast) {
  const reading = pickReading(cast);
  return {
    title: reading.title,
    interpretation: reading.reading,
    actions: reading.actions,
    risk_notice: "",
    confidence: "low",
    safety_block: false,
  };
}

async function requestInterpretation(cast, hasMoving) {
  const reqId = ++interpretRequestId;
  setInterpretLoading();
  try {
    const res = await fetch("/api/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question: questionInput.value.trim(),
        primaryName: cast.primaryName,
        changedName: cast.changedName,
        movingLabels: cast.movingLabels,
        hasMoving,
      }),
    });
    if (reqId !== interpretRequestId) return; // 已被新一次起卦取代
    const data = await res.json().catch(() => ({}));
    if (reqId !== interpretRequestId) return;
    if (res.ok && data.title) {
      applyInterpretation(data, true);
    } else {
      applyInterpretation(localFallback(cast), false);
    }
  } catch {
    if (reqId !== interpretRequestId) return;
    applyInterpretation(localFallback(cast), false);
  }
}

function finishCasting(cast) {
  renderResult(cast);
  shell.dataset.state = "result";
  trayHint.textContent = "卦象已成";
  builderCaption.textContent = "三枚铜钱掷六次，自下而上成卦";
  buttonSubcopy.textContent = "深度报告可解锁";
  castButton.disabled = false;
  casting = false;
  resultPanel.removeAttribute("aria-hidden");
}

function startCasting() {
  if (casting) return;

  casting = true;
  skipRequested = false;
  resultPanel.setAttribute("aria-hidden", "true");
  shell.dataset.state = "casting";
  trayHint.textContent = "轻点任意处可跳过动画";
  castButton.disabled = true;
  buttonSubcopy.textContent = "正在生成本卦与变卦";
  renderBuilderSlots();

  const throws = [];
  let throwIndex = 0;
  let nextThrowTimer = null;

  function completeRemaining() {
    if (!casting) return;
    clearTimeout(nextThrowTimer);
    while (throws.length < 6) {
      throws.push(throwCoins());
    }
    throws.forEach((result, index) => paintBuilderLine(index, result));
    finishCasting(buildCast(throws));
  }

  activeSkipHandler = completeRemaining;

  function nextThrow() {
    if (skipRequested) {
      completeRemaining();
      return;
    }
    if (throwIndex >= 6) {
      nextThrowTimer = setTimeout(() => finishCasting(buildCast(throws)), 520);
      return;
    }
    const current = throwIndex;
    throwIndex += 1;
    const result = throwCoins();
    throws.push(result);
    builderCaption.textContent = `第 ${current + 1} 掷 · 三枚铜钱落定中`;
    animateCoins(result);
    setTimeout(() => {
      if (skipRequested || !casting) return;
      paintBuilderLine(current, result);
      const type = LINE_TYPES[result.value];
      const faceText = result.faces.map((isHeads) => (isHeads ? "正" : "反")).join("");
      builderCaption.textContent = `第 ${current + 1} 掷 · ${faceText} → ${type.label}${type.moving ? "（动）" : ""}`;
    }, COIN_SETTLE);
    nextThrowTimer = setTimeout(nextThrow, reduceMotion ? 60 : THROW_INTERVAL);
  }

  if (reduceMotion) {
    completeRemaining();
    return;
  }
  nextThrow();
}

function skipCasting() {
  if (!casting || skipRequested) return;
  skipRequested = true;
  if (activeSkipHandler) activeSkipHandler();
}

function showResultState() {
  const throws = Array.from({ length: 6 }, () => throwCoins());
  renderBuilderSlots();
  throws.forEach((result, index) => paintBuilderLine(index, result));
  renderResult(buildCast(throws));
  shell.dataset.state = "result";
  trayHint.textContent = "卦象已成";
  buttonSubcopy.textContent = "深度报告可解锁";
  resultPanel.removeAttribute("aria-hidden");
}

/* ---------------------------------------------------------------------------
 * 通用 UI（抽屉、模块切换、八字、风水）
 * ------------------------------------------------------------------------- */

function openDrawer(drawer) {
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer(drawer) {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
}

function unlockDeepReport() {
  deepReportUnlocked = true;
  deepReportDrawer.classList.add("unlocked");
  unlockedReport.setAttribute("aria-hidden", "false");
  paywallButton.textContent = "已解锁 · 继续追问";
}

function setHistoryDetail(item) {
  historyItems.forEach((historyItem) => historyItem.classList.toggle("active", historyItem === item));
  historyDetailTime.textContent = `${item.dataset.time} · ${item.dataset.hexagram}`;
  historyDetailTitle.textContent = item.dataset.title;
  historyDetailSummary.textContent = item.dataset.summary;
}

function setModule(moduleName) {
  moduleTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.moduleTab === moduleName));
  Object.entries(moduleViews).forEach(([name, view]) => {
    view.classList.toggle("active", name === moduleName);
  });
  closeDrawer(deepReportDrawer);
  closeDrawer(paywallDrawer);
  closeDrawer(historyDrawer);
  shell.dataset.module = moduleName;
}

function setTimeCertainty(certainty) {
  selectedTimeCertainty = certainty;
  certaintyButtons.forEach((button) => button.classList.toggle("active", button.dataset.timeCertainty === certainty));
}

const baziFallback = {
  career: "适合以稳定积累换长期机会，先建立可信成果，再争取更大的职责。",
  love: "关系里需要把期待说清楚，避免用沉默测试对方。",
  year: "今年宜整理资源、人脉和节奏，机会会在准备充分后变得更顺。",
};

let baziReqId = 0;

function setBaziBanner() {
  if (selectedTimeCertainty === "unknown") {
    confidenceBanner.classList.add("low");
    confidenceBanner.textContent = "置信度低：未提供时辰，时柱暂不确定，主题解释只给低确定性参考。";
    hourPillar.textContent = "未知";
    baziSubcopy.textContent = "已生成低置信度命盘";
  } else if (selectedTimeCertainty === "approx") {
    confidenceBanner.classList.add("low");
    confidenceBanner.textContent = "置信度中：按大概时段估算时柱，建议后续补准确出生时间。";
    hourPillar.textContent = "戊辰";
    baziSubcopy.textContent = "已按大概时段估算";
  } else {
    confidenceBanner.classList.remove("low");
    confidenceBanner.textContent = "置信度高：已使用准确时辰生成基础命盘。";
    hourPillar.textContent = "戊辰";
    baziSubcopy.textContent = "已生成基础命盘";
  }
}

function applyBazi(data, fromAI) {
  baziThemeCards.classList.remove("loading");
  baziCareer.textContent = data.career;
  baziLove.textContent = data.love;
  baziYear.textContent = data.year;
  baziSource.textContent = fromAI ? "AI 解读 · " : "示例解读（未配置 AI）· ";
}

async function requestBaziReading() {
  const reqId = (baziReqId += 1);
  baziThemeCards.classList.add("loading");
  baziCareer.textContent = "正在生成解读…";
  baziLove.textContent = "正在生成解读…";
  baziYear.textContent = "正在生成解读…";
  baziSource.textContent = "";
  const pillarEls = document.querySelectorAll(".pillar-grid strong");
  const payload = {
    pillars: {
      year: pillarEls[0]?.textContent,
      month: pillarEls[1]?.textContent,
      day: pillarEls[2]?.textContent,
      hour: hourPillar.textContent,
    },
    elements: Array.from(document.querySelectorAll(".element-row")).map((row) => ({
      name: row.querySelector("span").textContent,
      level: row.querySelector("strong").textContent,
    })),
    certainty: selectedTimeCertainty,
  };
  try {
    const res = await fetch("/api/bazi", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (reqId !== baziReqId) return;
    const data = await res.json().catch(() => ({}));
    if (reqId !== baziReqId) return;
    if (res.ok && data.career) applyBazi(data, true);
    else applyBazi(baziFallback, false);
  } catch {
    if (reqId !== baziReqId) return;
    applyBazi(baziFallback, false);
  }
}

function showBaziResult() {
  baziResult.classList.add("show");
  baziResult.setAttribute("aria-hidden", "false");
  setBaziBanner();
  requestBaziReading();
}

async function fetchDaily() {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  dailyEyebrow.textContent = `${today.getMonth() + 1}月${today.getDate()}日 · 今日天机`;
  try {
    const res = await fetch(`/api/daily?date=${date}`);
    if (!res.ok) return;
    const data = await res.json();
    dailyHex.textContent = data.hexagram;
    dailyLine.textContent = data.line;
    dailyCard.hidden = false;
  } catch {
    // 取卦失败就保持隐藏，不打扰首屏
  }
}

/* ---------------- 多术数：选择器 + 起卦 + 盘面 ---------------- */
let selectedMethod = "liuyao";
let divineReqId = 0;

const DIVINE_INFO = {
  meihua: { intro: "梅花易数：以此刻的时间起卦，看体用生克。", btn: "以此刻起卦" },
  qimen: { intro: "奇门遁甲：以此刻起局，看用神落宫与八门方位（原型简化局）。", btn: "以此刻起局" },
  daliuren: { intro: "大六壬：以此刻起课，看四课三传（原型简化课）。", btn: "以此刻起课" },
};

function setMethod(method) {
  selectedMethod = method;
  methodTabs.forEach((t) => t.classList.toggle("active", t.dataset.method === method));
  const isLiuyao = method === "liuyao";
  trayStage.hidden = !isLiuyao;
  hexagramBuilderEl.hidden = !isLiuyao;
  castButton.hidden = !isLiuyao;
  wenguaNotes.hidden = !isLiuyao;
  shell.dataset.state = "idle"; // 复位六爻结果 overlay
  divineStage.hidden = isLiuyao;
  divineResult.classList.remove("show", "safety");
  divineResult.setAttribute("aria-hidden", "true");
  if (!isLiuyao) {
    divineIntro.textContent = DIVINE_INFO[method].intro;
    divineButtonText.textContent = DIVINE_INFO[method].btn;
    divineButtonSub.textContent = "免费先看核心结论";
    divineButton.disabled = false;
  }
}

function glyphHTML(lines, movingIdx) {
  const rows = lines
    .map((line, i) => {
      const moving = i === movingIdx ? " moving" : "";
      return `<span class="glyph-row ${line ? "yang" : "yin"}${moving}"><i></i><i></i></span>`;
    })
    .reverse()
    .join("");
  return `<div class="glyph-lines">${rows}</div>`;
}

function renderChart(method, chart) {
  if (!chart) {
    divineChart.innerHTML = "";
    divineChartNote.hidden = true;
    return;
  }
  if (method === "meihua") {
    divineChart.innerHTML = `
      <div class="mh-pair">
        <div class="mh-glyph"><span>本卦</span>${glyphHTML(chart.lines, chart.moving - 1)}<strong>${chart.hexagram}</strong></div>
        <div class="mh-arrow">→</div>
        <div class="mh-glyph"><span>变卦</span>${glyphHTML(chart.changedLines, -1)}<strong>${chart.changed}</strong></div>
      </div>
      <p class="mh-bodyuse">体卦 ${chart.bodyTrigram} · 用卦 ${chart.useTrigram} · 动第 ${chart.moving} 爻</p>`;
    divineChartNote.hidden = true;
  } else if (method === "qimen") {
    const order = [3, 8, 1, 2, 4, 6, 7, 0, 5]; // 洛书显示位 → palaces 索引
    const cells = order
      .map((i) => {
        const p = chart.palaces[i];
        return `<div class="qm-cell"><span class="qm-pos">${p.name}·${p.dir}</span><strong>${p.stem}</strong><span class="qm-gate">${p.gate || "—"}</span></div>`;
      })
      .join("");
    divineChart.innerHTML = `<div class="qm-grid">${cells}</div><p class="qm-meta">${chart.dun} ${chart.ju} 局 · 值符落 ${chart.fuPalace} 宫</p>`;
    divineChartNote.textContent = chart.note;
    divineChartNote.hidden = false;
  } else {
    const lessons = chart.fourLessons
      .map((l) => `<div class="lr-lesson"><span>${l.label}</span><strong>${l.upper}</strong><em>${l.lower}</em></div>`)
      .join("");
    const trans = chart.transmissions
      .map((t) => `<div class="lr-trans"><span>${t.label}</span><strong>${t.branch}</strong></div>`)
      .join("");
    divineChart.innerHTML = `
      <div class="lr-meta">${chart.dayGanzhi}日 · 月将 ${chart.monthGeneral} · ${chart.hour}时</div>
      <div class="lr-lessons">${lessons}</div>
      <div class="lr-transmissions">${trans}</div>`;
    divineChartNote.textContent = chart.note;
    divineChartNote.hidden = false;
  }
}

function applyDivineReading(r) {
  divineResult.dataset.interpret = "done";
  divineResult.classList.toggle("safety", Boolean(r.safety_block));
  divineTitle.textContent = r.title || "";
  divineReading.textContent = r.interpretation || "";
  divineActions.innerHTML = (r.actions || [])
    .map((a, i) => `<div><strong>${i + 1}</strong><span></span></div>`)
    .join("");
  Array.from(divineActions.querySelectorAll("span")).forEach((span, i) => {
    span.textContent = (r.actions || [])[i] || "";
  });
  if (r.risk_notice) {
    divineRisk.textContent = r.risk_notice;
    divineRisk.hidden = false;
  } else {
    divineRisk.hidden = true;
  }
  divineSource.textContent = r.safety_block ? "安全提示 · " : "AI 解读 · ";
}

async function requestDivine(method) {
  const reqId = (divineReqId += 1);
  divineResult.classList.add("show");
  divineResult.classList.remove("safety");
  divineResult.setAttribute("aria-hidden", "false");
  divineResult.dataset.interpret = "loading";
  divineQuestion.textContent = questionInput.value.trim() || "（未填写问题）";
  divineChart.innerHTML = "";
  divineChartNote.hidden = true;
  divineTitle.textContent = "正在起盘并生成解读…";
  divineReading.textContent = "规则引擎起盘后，AI 正在针对你的问题解读。";
  divineActions.innerHTML = '<div><strong>·</strong><span>…</span></div>'.repeat(3);
  divineRisk.hidden = true;
  divineSource.textContent = "";
  divineButton.disabled = true;
  try {
    const res = await fetch("/api/divine", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method, question: questionInput.value.trim(), time: new Date().toISOString() }),
    });
    if (reqId !== divineReqId) return;
    const data = await res.json().catch(() => ({}));
    if (reqId !== divineReqId) return;
    renderChart(method, data.chart);
    if (res.ok && data.reading && data.reading.title) {
      applyDivineReading(data.reading);
    } else {
      divineResult.dataset.interpret = "done";
      divineTitle.textContent = "盘面已起，解读待配置 AI";
      divineReading.textContent = "已按规则起出盘面（见上）。配置 API key 后可生成贴合你问题的白话解读。";
      divineActions.innerHTML = "";
      divineSource.textContent = "仅盘面（未配置 AI）· ";
    }
  } catch {
    if (reqId !== divineReqId) return;
    divineResult.dataset.interpret = "done";
    divineTitle.textContent = "起盘失败";
    divineReading.textContent = "网络或服务异常，请稍后再试。";
    divineActions.innerHTML = "";
  } finally {
    if (reqId === divineReqId) divineButton.disabled = false;
  }
}

function fengshuiFallback(type, direction) {
  const roomSpecific = {
    "卧室": "床头保持靠实墙，床边至少留出一侧顺畅通道，先稳睡眠区。",
    "书房": "书桌避免背门而坐，优先让座位后方有墙或高柜形成支撑。",
    "客厅": "沙发宜靠实墙，主通道保持开阔，避免一进门直接被杂物阻断。",
    "厨房": "水火区域保持清楚分区，台面减少堆叠，优先处理潮湿和油烟。",
  };
  const directionSpecific = {
    "东": "朝东空间适合保持清晨采光，入口处不要堆放高物。",
    "东南": "东南向可用绿植或木质收纳增强清爽感，但不要挡窗。",
    "南": "南向光强，建议用柔和窗帘调光，避免过亮影响休息。",
    "西南": "西南向宜稳定、低饱和配色，减少厚重杂物。",
    "西": "西晒位置注意隔热，傍晚强光处不宜放长时间办公位。",
    "西北": "西北角保持整洁有序，适合放稳定收纳，不宜堆临时物。",
    "北": "北向偏冷，建议补暖光和柔软材质，提升舒适度。",
    "东北": "东北角适合保持安静和低杂物，避免变成杂物集中区。",
  };
  return [
    roomSpecific[type] || "核心家具靠实墙，留出顺畅主通道。",
    directionSpecific[direction] || "结合朝向调整采光与收纳。",
    "门口到核心家具之间留出连续动线，减少进出时的阻滞感。",
    "窗边先保留采光和通风，不用高柜或杂物压住主光源。",
    "暗角用一盏暖色辅助光处理，比增加装饰物更有效。",
    "床、桌、沙发等高频位置旁边保留一个可随手收纳的低矮容器。",
  ];
}

let fengshuiReqId = 0;

function renderFengshuiList(suggestions) {
  fengshuiChecklist.innerHTML = suggestions
    .map((suggestion, index) => `<div><strong>${index + 1}</strong><span>${suggestion}</span></div>`)
    .join("");
}

async function requestFengshui(type, direction) {
  const reqId = (fengshuiReqId += 1);
  fengshuiChecklist.classList.add("loading");
  renderFengshuiList(["正在生成建议…", "正在生成建议…", "正在生成建议…"]);
  const layout = layoutChoices.filter((c) => c.classList.contains("active")).map((c) => c.textContent.trim());
  const finish = (suggestions, note, fromAI) => {
    fengshuiChecklist.classList.remove("loading");
    renderFengshuiList(suggestions);
    fengshuiBanner.textContent = `${fromAI ? "AI 解读 · " : "示例解读（未配置 AI）· "}${note || "适合先做低成本调整。"}`;
  };
  try {
    const res = await fetch("/api/fengshui", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roomType: type, direction, layout }),
    });
    if (reqId !== fengshuiReqId) return;
    const data = await res.json().catch(() => ({}));
    if (reqId !== fengshuiReqId) return;
    if (res.ok && Array.isArray(data.suggestions) && data.suggestions.length) {
      finish(data.suggestions, data.note, true);
    } else {
      finish(fengshuiFallback(type, direction), "", false);
    }
  } catch {
    if (reqId !== fengshuiReqId) return;
    finish(fengshuiFallback(type, direction), "", false);
  }
}

function showFengshuiResult() {
  const type = roomType.value;
  const direction = roomDirection.value;
  roomCompass.textContent = `朝向：${direction} · ${type}`;
  fengshuiResult.classList.add("show");
  fengshuiResult.setAttribute("aria-hidden", "false");
  fengshuiSubcopy.textContent = `已生成 ${type} 建议`;
  requestFengshui(type, direction);
}

function updateCount() {
  charCount.textContent = questionInput.value.length;
}

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    chips.forEach((item) => item.classList.remove("active"));
    chip.classList.add("active");
    questionInput.value = chip.dataset.chip;
    updateCount();
    questionInput.focus();
  });
});

questionInput.addEventListener("input", updateCount);
castButton.addEventListener("click", startCasting);
trayButton.addEventListener("click", () => {
  if (casting) {
    skipCasting();
    return;
  }
  startCasting();
});
castingBackdrop.addEventListener("click", skipCasting);

moduleTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setModule(tab.dataset.moduleTab);
  });
});

certaintyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setTimeCertainty(button.dataset.timeCertainty);
  });
});

baziButton.addEventListener("click", showBaziResult);

layoutChoices.forEach((choice) => {
  choice.classList.add("active");
  choice.addEventListener("click", () => {
    choice.classList.toggle("active");
  });
});

fengshuiButton.addEventListener("click", showFengshuiResult);

resetButton.addEventListener("click", () => {
  shell.dataset.state = "idle";
  interpretRequestId += 1; // 取消任何进行中的解读请求
  resultPanel.classList.remove("safety");
  delete resultPanel.dataset.interpret;
  riskNotice.hidden = true;
  resultSource.textContent = "";
  coins.forEach((coin) => coin.classList.remove("tossing", "tails"));
  trayHint.textContent = "轻点天机盘，或点击下方按钮开始起卦";
  buttonSubcopy.textContent = "免费先看核心结论";
  builderCaption.textContent = "三枚铜钱掷六次，自下而上成卦";
  renderBuilderSlots();
  closeDrawer(deepReportDrawer);
  closeDrawer(paywallDrawer);
  closeDrawer(historyDrawer);
  closeDrawer(privacyDrawer);
  deepReportUnlocked = false;
  deepReportDrawer.classList.remove("unlocked");
  unlockedReport.setAttribute("aria-hidden", "true");
  paywallButton.textContent = "解锁完整追问";
  followUpInput.value = "";
  followUpAnswer.textContent = "解锁后可围绕同一卦象继续追问。";
  followUpAnswer.parentElement.classList.remove("answered");
  questionInput.focus();
});

unlockButton.addEventListener("click", () => {
  openDrawer(deepReportDrawer);
});

closeDeepReport.addEventListener("click", () => {
  closeDrawer(deepReportDrawer);
});

deepReportDrawer.addEventListener("click", (event) => {
  if (event.target === deepReportDrawer) {
    closeDrawer(deepReportDrawer);
  }
});

paywallButton.addEventListener("click", () => {
  if (deepReportUnlocked) {
    followUpInput.focus();
    return;
  }
  paywallNote.textContent = "内测原型仅演示购买流程，不会发起真实扣款。";
  closeDrawer(deepReportDrawer);
  openDrawer(paywallDrawer);
});

closePaywall.addEventListener("click", () => {
  closeDrawer(paywallDrawer);
});

paywallDrawer.addEventListener("click", (event) => {
  if (event.target === paywallDrawer) {
    closeDrawer(paywallDrawer);
  }
});

paywallOptions.forEach((option) => {
  option.addEventListener("click", () => {
    selectedPlan = option.dataset.plan;
    paywallOptions.forEach((item) => item.classList.toggle("selected", item === option));
    paywallNote.textContent = selectedPlan === "subscription"
      ? "已选择月度订阅：适合频繁问卦和查看历史深度报告。"
      : "已选择单次报告：只解锁当前这一次卦象的完整解释。";
  });
});

confirmPaywall.addEventListener("click", () => {
  paywallNote.textContent = selectedPlan === "subscription"
    ? "内测版已模拟订阅成功，完整追问入口已准备好。"
    : "内测版已模拟单次解锁成功，本次深度报告已准备好。";
  unlockDeepReport();
  closeDrawer(paywallDrawer);
  openDrawer(deepReportDrawer);
});

followUpButton.addEventListener("click", () => {
  const question = followUpInput.value.trim() || "我现在最该补齐哪一项准备？";
  followUpInput.value = question;
  followUpAnswer.textContent = "追问回答：先把这件事拆成资源、承诺、时机三项。当前最该补齐的是可验证的信息和备用方案；等关键人态度更明确后，再做最终决定。";
  followUpAnswer.parentElement.classList.add("answered");
});

privacyButton.addEventListener("click", () => {
  openDrawer(privacyDrawer);
});

closePrivacy.addEventListener("click", () => {
  closeDrawer(privacyDrawer);
});

privacyDrawer.addEventListener("click", (event) => {
  if (event.target === privacyDrawer) {
    closeDrawer(privacyDrawer);
  }
});

acceptPrivacy.addEventListener("click", () => {
  localStorage.setItem(privacyConsentKey, "true");
  privacyStatus.textContent = "已同意";
  acceptPrivacy.textContent = "已同意";
  closeDrawer(privacyDrawer);
});

historyButton.addEventListener("click", () => {
  openDrawer(historyDrawer);
});

closeHistory.addEventListener("click", () => {
  closeDrawer(historyDrawer);
});

historyDrawer.addEventListener("click", (event) => {
  if (event.target === historyDrawer) {
    closeDrawer(historyDrawer);
  }
});

historyItems.forEach((item) => {
  item.addEventListener("click", () => {
    setHistoryDetail(item);
  });
});

deleteHistory.addEventListener("click", () => {
  historyDrawer.classList.add("empty");
  historyItems.forEach((item) => {
    item.hidden = true;
  });
  historyCount.textContent = "已保存 0 条";
  historyEmpty.setAttribute("aria-hidden", "false");
  deleteHistory.disabled = true;
  deleteHistory.textContent = "记录已删除";
});

updateCount();
renderBuilderSlots();

// 每日一卦留存钩子
const dailyBellKey = "tianjiDailyBell";
function setBell(on) {
  dailyBell.classList.toggle("on", on);
  dailyBell.textContent = on ? "已开提醒" : "每日提醒";
}
dailyBell.addEventListener("click", () => {
  const on = localStorage.getItem(dailyBellKey) !== "true";
  localStorage.setItem(dailyBellKey, String(on));
  setBell(on);
});
setBell(localStorage.getItem(dailyBellKey) === "true");
fetchDaily();

// 术数选择器
methodTabs.forEach((tab) => {
  tab.addEventListener("click", () => setMethod(tab.dataset.method));
});
divineButton.addEventListener("click", () => requestDivine(selectedMethod));
divineReset.addEventListener("click", () => {
  divineReqId += 1;
  divineResult.classList.remove("show", "safety");
  divineResult.setAttribute("aria-hidden", "true");
  questionInput.focus();
});

if (localStorage.getItem(privacyConsentKey) === "true") {
  privacyStatus.textContent = "已同意";
  acceptPrivacy.textContent = "已同意";
} else {
  openDrawer(privacyDrawer);
}

const params = new URLSearchParams(window.location.search);
if (params.get("module") === "bazi") {
  setModule("bazi");
}

if (params.get("module") === "fengshui") {
  setModule("fengshui");
}

if (params.get("state") === "result") {
  questionInput.value = "我该不该接受这个新机会？";
  updateCount();
  showResultState();
}

if (params.get("state") === "history") {
  historyDrawer.classList.add("open");
  historyDrawer.setAttribute("aria-hidden", "false");
}

if (params.get("state") === "casting") {
  questionInput.value = "我该不该接受这个新机会？";
  updateCount();
  startCasting();
}
