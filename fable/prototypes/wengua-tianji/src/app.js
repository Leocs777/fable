const shell = document.querySelector(".prototype-shell");
const questionInput = document.querySelector("#questionInput");
const charCount = document.querySelector("#charCount");
const castButton = document.querySelector("#castButton");
const trayButton = document.querySelector("#trayButton");
const trayHint = document.querySelector("#trayHint");
const buttonSubcopy = document.querySelector("#buttonSubcopy");
const resultPanel = document.querySelector("#resultPanel");
const resultHexagrams = Array.from(document.querySelectorAll(".result-head span"));
const resultTitle = document.querySelector(".result-panel h2");
const resultReading = document.querySelector(".result-panel .reading");
const resultActions = Array.from(document.querySelectorAll(".result-panel .actions div span"));
const resetButton = document.querySelector("#resetButton");
const unlockButton = document.querySelector("#unlockButton");
const deepReportDrawer = document.querySelector("#deepReportDrawer");
const closeDeepReport = document.querySelector("#closeDeepReport");
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
const roomType = document.querySelector("#roomType");
const roomDirection = document.querySelector("#roomDirection");
const fengshuiButton = document.querySelector("#fengshuiButton");
const fengshuiSubcopy = document.querySelector("#fengshuiSubcopy");
const fengshuiResult = document.querySelector("#fengshuiResult");
const roomCompass = document.querySelector("#roomCompass");
const fengshuiChecklist = document.querySelector("#fengshuiChecklist");
const layoutChoices = Array.from(document.querySelectorAll("[data-layout-choice]"));
const chips = Array.from(document.querySelectorAll("[data-chip]"));
const steps = Array.from(document.querySelectorAll(".cast-step"));

const privacyConsentKey = "tianjiPrivacyAccepted";
let casting = false;
let selectedPlan = "subscription";
let deepReportUnlocked = false;
let selectedTimeCertainty = "accurate";

const readingVariants = [
  {
    primary: "需",
    changed: "泰",
    title: "先稳住节奏，再择机推进",
    reading: "当前更适合蓄力和整理资源，不宜仓促拍板。外部条件正在改善，把关键准备做扎实，会比立即冲刺更稳。",
    actions: ["稳住当下：先梳理资源，减少不必要的分支。", "主动蓄力：补齐关键能力，为下一步行动做准备。", "择机推进：等待条件成熟，再果断出手。"]
  },
  {
    primary: "谦",
    changed: "升",
    title: "主动靠近，但别急着证明",
    reading: "局势适合低姿态推进。与其一次性争取结果，不如先建立信任、补充信息，让对方自然看到你的价值。",
    actions: ["先给价值：补一条对对方有帮助的信息。", "控制频率：主动跟进一次即可，不连续催促。", "留出余地：把选择权交给对方，避免压迫感。"]
  },
  {
    primary: "观",
    changed: "渐",
    title: "先看清格局，再小步试探",
    reading: "这件事还不到重押的时候。先观察关键人的态度和资源流向，用小动作验证方向，比直接摊牌更稳。",
    actions: ["观察信号：记录对方是否持续投入注意力。", "小步验证：先提出一个低成本试探方案。", "暂缓承诺：不要在信息不足时给长期承诺。"]
  },
  {
    primary: "履",
    changed: "中孚",
    title: "守住边界，用真诚换确定性",
    reading: "当前机会里有可推进的空间，但需要注意分寸。清楚表达立场，同时保持诚意，会比讨好或强推更有效。",
    actions: ["明确底线：先写下自己不能让步的条件。", "真诚沟通：把担忧说清楚，不用包装成绝对判断。", "稳步推进：先完成一个可交付的小结果。"]
  }
];

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

function showBaziResult() {
  baziResult.classList.add("show");
  baziResult.setAttribute("aria-hidden", "false");
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

function showFengshuiResult() {
  const type = roomType.value;
  const direction = roomDirection.value;
  const roomSpecific = {
    "卧室": "床头保持靠实墙，床边至少留出一侧顺畅通道，先稳睡眠区。",
    "书房": "书桌避免背门而坐，优先让座位后方有墙或高柜形成支撑。",
    "客厅": "沙发宜靠实墙，主通道保持开阔，避免一进门直接被杂物阻断。",
    "厨房": "水火区域保持清楚分区，台面减少堆叠，优先处理潮湿和油烟。"
  };
  const directionSpecific = {
    "东": "朝东空间适合保持清晨采光，入口处不要堆放高物。",
    "东南": "东南向可用绿植或木质收纳增强清爽感，但不要挡窗。",
    "南": "南向光强，建议用柔和窗帘调光，避免过亮影响休息。",
    "西南": "西南向宜稳定、低饱和配色，减少厚重杂物。",
    "西": "西晒位置注意隔热，傍晚强光处不宜放长时间办公位。",
    "西北": "西北角保持整洁有序，适合放稳定收纳，不宜堆临时物。",
    "北": "北向偏冷，建议补暖光和柔软材质，提升舒适度。",
    "东北": "东北角适合保持安静和低杂物，避免变成杂物集中区。"
  };
  const suggestions = [
    roomSpecific[type],
    directionSpecific[direction],
    "门口到核心家具之间留出连续动线，减少进出时的阻滞感。",
    "窗边先保留采光和通风，不用高柜或杂物压住主光源。",
    "暗角用一盏暖色辅助光处理，比增加装饰物更有效。",
    "床、桌、沙发等高频位置旁边保留一个可随手收纳的低矮容器。"
  ];
  roomCompass.textContent = `朝向：${direction} · ${type}`;
  fengshuiChecklist.innerHTML = suggestions
    .map((suggestion, index) => `<div><strong>${index + 1}</strong><span>${suggestion}</span></div>`)
    .join("");
  fengshuiResult.classList.add("show");
  fengshuiResult.setAttribute("aria-hidden", "false");
  fengshuiSubcopy.textContent = `已生成 ${type} 建议`;
}

function setStep(index, state, label) {
  const step = steps[index];
  step.classList.remove("active", "done");
  if (state) step.classList.add(state);
  step.querySelector("strong").textContent = label;
}

function updateCount() {
  charCount.textContent = questionInput.value.length;
}

function applyRandomReading() {
  const reading = readingVariants[Math.floor(Math.random() * readingVariants.length)];
  resultHexagrams[0].textContent = `本卦：${reading.primary}`;
  resultHexagrams[1].textContent = `变卦：${reading.changed}`;
  resultTitle.textContent = reading.title;
  resultReading.textContent = reading.reading;
  resultActions.forEach((action, index) => {
    action.textContent = reading.actions[index];
  });
}

function startCasting() {
  if (casting) return;

  casting = true;
  resultPanel.setAttribute("aria-hidden", "true");
  shell.dataset.state = "casting";
  trayHint.textContent = "天机盘已启，三枚铜钱正在落定";
  castButton.disabled = true;
  buttonSubcopy.textContent = "正在生成本卦与变卦";

  steps.forEach((_, index) => setStep(index, "", "待掷"));

  setTimeout(() => setStep(0, "active", "落下"), 420);
  setTimeout(() => setStep(0, "done", "已定"), 4380);
  setTimeout(() => setStep(1, "active", "落下"), 1240);
  setTimeout(() => setStep(1, "done", "已定"), 5320);
  setTimeout(() => setStep(2, "active", "落下"), 2040);
  setTimeout(() => setStep(2, "done", "已定"), 6120);

  setTimeout(() => {
    applyRandomReading();
    shell.dataset.state = "result";
    trayHint.textContent = "卦象已成";
    buttonSubcopy.textContent = "深度报告可解锁";
    castButton.disabled = false;
    casting = false;
    resultPanel.removeAttribute("aria-hidden");
  }, 6900);
}

function showResultState() {
  steps.forEach((_, index) => setStep(index, "done", "已成"));
  applyRandomReading();
  shell.dataset.state = "result";
  trayHint.textContent = "卦象已成";
  buttonSubcopy.textContent = "深度报告可解锁";
  resultPanel.removeAttribute("aria-hidden");
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
trayButton.addEventListener("click", startCasting);

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
  trayHint.textContent = "轻点天机盘，或点击下方按钮开始起卦";
  buttonSubcopy.textContent = "免费先看核心结论";
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
  steps.forEach((_, index) => setStep(index, "", "待掷"));
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
  shell.dataset.state = "casting";
  trayHint.textContent = "天机盘已启，三枚铜钱正在落定";
  setStep(0, "active", "落下");
}
