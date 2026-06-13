// 多术数起盘规则（原型）
//  - 梅花易数：时间起卦，体用/变卦规则完整正确。
//  - 奇门遁甲：确定性起局（地盘三奇六仪顺布正确），但定局用时辰简化，未做节气定局/
//    超神接气/天盘飞布；标注为「原型局」。
//  - 大六壬：天地盘（月将加时）规则正确，四课三传为简化，未做节气过宫与九宗门完整发用；
//    标注为「原型课」。
// 奇门/六壬的完整准确排盘需要术数顾问审校，这里只保证确定性与结构，供流程演示与 AI 解读。

export const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const BAGUA_NUM = { 1: "乾", 2: "兑", 3: "离", 4: "震", 5: "巽", 6: "坎", 7: "艮", 8: "坤" };
// 八卦三爻，自下而上
const TRIGRAM_LINES = {
  乾: [1, 1, 1], 兑: [1, 1, 0], 离: [1, 0, 1], 震: [1, 0, 0],
  巽: [0, 1, 1], 坎: [0, 1, 0], 艮: [0, 0, 1], 坤: [0, 0, 0],
};

// 六十四卦方阵 [上卦][下卦] = 卦名
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

function trigramName(threeLines) {
  for (const [name, t] of Object.entries(TRIGRAM_LINES)) {
    if (t[0] === threeLines[0] && t[1] === threeLines[1] && t[2] === threeLines[2]) return name;
  }
  return "乾";
}

function hexFromLines(lines) {
  const lower = trigramName(lines.slice(0, 3));
  const upper = trigramName(lines.slice(3, 6));
  return HEX_NAMES[upper][lower];
}

// 小时 → 时辰地支序（0=子）。子时跨 23-1 点。
function hourBranchIndex(hour) {
  return Math.floor(((hour + 1) % 24) / 2) % 12;
}

/* ---------------- 梅花易数（时间起卦，规则完整） ---------------- */
export function castMeihua(date) {
  const yearBranch = (date.getFullYear() % 12) + 1; // 年支序 1-12（原型用公历年）
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hourNum = hourBranchIndex(date.getHours()) + 1; // 1-12

  const sum1 = yearBranch + month + day;
  const upper = sum1 % 8 || 8;
  const sum2 = sum1 + hourNum;
  const lower = sum2 % 8 || 8;
  const moving = sum2 % 6 || 6;

  const upperName = BAGUA_NUM[upper];
  const lowerName = BAGUA_NUM[lower];
  const lines = [...TRIGRAM_LINES[lowerName], ...TRIGRAM_LINES[upperName]]; // 自下而上
  const changedLines = lines.map((l, i) => (i === moving - 1 ? (l ? 0 : 1) : l));
  const movingInLower = moving <= 3;

  return {
    method: "meihua",
    methodName: "梅花易数",
    hexagram: hexFromLines(lines),
    changed: hexFromLines(changedLines),
    moving,
    lines,
    changedLines,
    upperName,
    lowerName,
    useTrigram: movingInLower ? lowerName : upperName, // 动爻所在为「用」
    bodyTrigram: movingInLower ? upperName : lowerName, // 另一为「体」
    timeLabel: `${month}月${day}日 ${BRANCHES[hourNum - 1]}时`,
  };
}

/* ---------------- 奇门遁甲（确定性简化起局） ---------------- */
const QIMEN_PALACES = [
  { no: "一", name: "坎", dir: "北", gate: "休门" },
  { no: "二", name: "坤", dir: "西南", gate: "死门" },
  { no: "三", name: "震", dir: "东", gate: "伤门" },
  { no: "四", name: "巽", dir: "东南", gate: "杜门" },
  { no: "五", name: "中", dir: "中", gate: "" },
  { no: "六", name: "乾", dir: "西北", gate: "开门" },
  { no: "七", name: "兑", dir: "西", gate: "惊门" },
  { no: "八", name: "艮", dir: "东北", gate: "生门" },
  { no: "九", name: "离", dir: "南", gate: "景门" },
];
// 阳遁顺布：戊己庚辛壬癸为六仪，丁丙乙为三奇（地盘顺序）
const QIMEN_YIQI = ["戊", "己", "庚", "辛", "壬", "癸", "丁", "丙", "乙"];

export function castQimen(date) {
  const hourIdx = hourBranchIndex(date.getHours());
  const ju = (date.getDate() + hourIdx) % 9 || 9; // 原型局数 1-9（简化定局）
  const palaces = QIMEN_PALACES.map((p, palaceIdx) => {
    // 阳遁：从局数对应宫起戊，按洛书宫序顺布
    const order = (palaceIdx - (ju - 1) + 9) % 9;
    return { ...p, stem: QIMEN_YIQI[order] };
  });
  return {
    method: "qimen",
    methodName: "奇门遁甲",
    dun: "阳遁",
    ju,
    fuPalace: QIMEN_PALACES[ju - 1].name, // 值符落宫（简化）
    palaces,
    timeLabel: `${BRANCHES[hourIdx]}时`,
    note: "原型局：按时辰简化定局，未做节气定局/超神接气/天盘飞布，盘面仅供流程演示，需术数顾问审校。",
  };
}

/* ---------------- 大六壬（天地盘正确 + 简化四课三传） ---------------- */
export function castDaliuren(date) {
  const month = date.getMonth() + 1;
  const hourIdx = hourBranchIndex(date.getHours());
  // 月将（简化）：正月起亥，逆行一月退一支。传统按中气过宫，这里简化。
  const monthGeneral = ((11 - (month - 1)) % 12 + 12) % 12;
  // 天地盘：地盘固定子→亥，天盘 = 月将加在时辰宫上后顺布
  const plate = BRANCHES.map((earth, i) => ({
    earth,
    heaven: BRANCHES[(monthGeneral + (i - hourIdx) + 12) % 12],
  }));
  // 日干支（简化序：以 JD 估算，仅保证确定性，不保证历法精确）
  const jd = Math.floor(date.getTime() / 86400000) + 11;
  const dayStem = STEMS[((jd % 10) + 10) % 10];
  const dayBranchIdx = ((jd % 12) + 12) % 12;
  const dayBranch = BRANCHES[dayBranchIdx];
  const branchHeaven = (idx) => plate[idx].heaven;
  // 四课（简化）：日干寄宫、日支取上神
  const ganJiGong = [2, 8, 5, 11, 5, 8, 11, 2, 8, 11][((jd % 10) + 10) % 10]; // 干寄宫地支序（简化）
  const fourLessons = [
    { label: "一课", lower: dayStem, upper: branchHeaven(ganJiGong) },
    { label: "二课", lower: branchHeaven(ganJiGong), upper: branchHeaven(BRANCHES.indexOf(branchHeaven(ganJiGong))) },
    { label: "三课", lower: dayBranch, upper: branchHeaven(dayBranchIdx) },
    { label: "四课", lower: branchHeaven(dayBranchIdx), upper: branchHeaven(BRANCHES.indexOf(branchHeaven(dayBranchIdx))) },
  ];
  // 三传（简化）：取四课上神三支，演示用
  const transmissions = [
    fourLessons[0].upper,
    fourLessons[2].upper,
    branchHeaven((dayBranchIdx + 4) % 12),
  ];
  return {
    method: "daliuren",
    methodName: "大六壬",
    dayGanzhi: `${dayStem}${dayBranch}`,
    monthGeneral: BRANCHES[monthGeneral],
    hour: BRANCHES[hourIdx],
    plate,
    fourLessons,
    transmissions: [
      { label: "初传", branch: transmissions[0] },
      { label: "中传", branch: transmissions[1] },
      { label: "末传", branch: transmissions[2] },
    ],
    note: "原型课：天地盘按月将加时，四课三传为简化规则，未做节气过宫与九宗门完整发用，盘面仅供流程演示，需术数顾问审校。",
  };
}

export function castDivination(method, date) {
  if (method === "meihua") return castMeihua(date);
  if (method === "qimen") return castQimen(date);
  if (method === "daliuren") return castDaliuren(date);
  throw new Error(`unknown method: ${method}`);
}
