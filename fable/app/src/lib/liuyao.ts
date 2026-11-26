export type CoinThrow = {
  faces: [boolean, boolean, boolean];
  value: 6 | 7 | 8 | 9;
};

export type LineValue = 0 | 1;

export type LineType = {
  label: "老阴" | "少阳" | "少阴" | "老阳";
  yang: boolean;
  moving: boolean;
};

export type LiuyaoCast = {
  throws: CoinThrow[];
  primaryLines: LineValue[];
  changedLines: LineValue[];
  movingPositions: number[];
  primaryName: string;
  changedName: string;
  movingLabels: string[];
};

type TrigramName = "乾" | "兑" | "离" | "震" | "巽" | "坎" | "艮" | "坤";
type RandomSource = () => number;

const TRIGRAM_NAMES: Record<string, TrigramName> = {
  "111": "乾",
  "110": "兑",
  "101": "离",
  "100": "震",
  "011": "巽",
  "010": "坎",
  "001": "艮",
  "000": "坤",
};

const HEX_NAMES: Record<TrigramName, Record<TrigramName, string>> = {
  乾: { 乾: "乾", 兑: "履", 离: "同人", 震: "无妄", 巽: "姤", 坎: "讼", 艮: "遁", 坤: "否" },
  兑: { 乾: "夬", 兑: "兑", 离: "革", 震: "随", 巽: "大过", 坎: "困", 艮: "咸", 坤: "萃" },
  离: { 乾: "大有", 兑: "睽", 离: "离", 震: "噬嗑", 巽: "鼎", 坎: "未济", 艮: "旅", 坤: "晋" },
  震: { 乾: "大壮", 兑: "归妹", 离: "丰", 震: "震", 巽: "恒", 坎: "解", 艮: "小过", 坤: "豫" },
  巽: { 乾: "小畜", 兑: "中孚", 离: "家人", 震: "益", 巽: "巽", 坎: "涣", 艮: "渐", 坤: "观" },
  坎: { 乾: "需", 兑: "节", 离: "既济", 震: "屯", 巽: "井", 坎: "坎", 艮: "蹇", 坤: "比" },
  艮: { 乾: "大畜", 兑: "损", 离: "贲", 震: "颐", 巽: "蛊", 坎: "蒙", 艮: "艮", 坤: "剥" },
  坤: { 乾: "泰", 兑: "临", 离: "明夷", 震: "复", 巽: "升", 坎: "师", 艮: "谦", 坤: "坤" },
};

export const LINE_TYPES: Record<CoinThrow["value"], LineType> = {
  6: { label: "老阴", yang: false, moving: true },
  7: { label: "少阳", yang: true, moving: false },
  8: { label: "少阴", yang: false, moving: false },
  9: { label: "老阳", yang: true, moving: true },
};

const POSITION_NAMES = ["初", "二", "三", "四", "五", "上"] as const;

export function throwCoins(random: RandomSource = Math.random): CoinThrow {
  const faces: CoinThrow["faces"] = [random() < 0.5, random() < 0.5, random() < 0.5];
  const value = faces.reduce<number>((sum, isHeads) => sum + (isHeads ? 3 : 2), 0);
  if (!isCoinThrowValue(value)) {
    throw new Error(`invalid coin throw total: ${value}`);
  }
  return { faces, value };
}

export function buildLiuyaoCast(throws: CoinThrow[]): LiuyaoCast {
  if (throws.length !== 6) {
    throw new Error(`liuyao cast requires 6 throws, received ${throws.length}`);
  }

  const primaryLines = throws.map((coinThrow) => lineValue(LINE_TYPES[coinThrow.value].yang));
  const changedLines = throws.map((coinThrow) => {
    const type = LINE_TYPES[coinThrow.value];
    if (!type.moving) return lineValue(type.yang);
    return lineValue(!type.yang);
  });
  const movingPositions = throws
    .map((coinThrow, index) => (LINE_TYPES[coinThrow.value].moving ? index : -1))
    .filter((index) => index >= 0);

  return {
    throws,
    primaryLines,
    changedLines,
    movingPositions,
    primaryName: hexagramName(primaryLines),
    changedName: hexagramName(changedLines),
    movingLabels: movingPositions.map((index) => movingLabel(index, throws[index].value)),
  };
}

export function castLiuyao(random: RandomSource = Math.random): LiuyaoCast {
  return buildLiuyaoCast(Array.from({ length: 6 }, () => throwCoins(random)));
}

export function faceText(coinThrow: CoinThrow): string {
  return coinThrow.faces.map((isHeads) => (isHeads ? "正" : "反")).join("");
}

function hexagramName(lines: LineValue[]): string {
  const lower = trigramName(lines.slice(0, 3));
  const upper = trigramName(lines.slice(3, 6));
  return HEX_NAMES[upper][lower];
}

function trigramName(lines: LineValue[]): TrigramName {
  const key = lines.join("");
  const trigram = TRIGRAM_NAMES[key];
  if (!trigram) {
    throw new Error(`invalid trigram lines: ${key}`);
  }
  return trigram;
}

function movingLabel(index: number, value: CoinThrow["value"]): string {
  const numeral = LINE_TYPES[value].yang ? "九" : "六";
  if (index === 0 || index === 5) return `${POSITION_NAMES[index]}${numeral}`;
  return `${numeral}${POSITION_NAMES[index]}`;
}

function isCoinThrowValue(value: number): value is CoinThrow["value"] {
  return value === 6 || value === 7 || value === 8 || value === 9;
}

function lineValue(yang: boolean): LineValue {
  return yang ? 1 : 0;
}
