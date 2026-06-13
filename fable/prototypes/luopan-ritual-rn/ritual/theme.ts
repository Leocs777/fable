// 罗盘仪式动画的视觉与时序常量。
// 调性：暗铜、古金、玉绿、柔烟——克制、仪式感，避免游戏化炫光。

export const RITUAL_COLORS = {
  bgTop: "#0d0b08", // 深夜暗底
  bgBottom: "#1a140d",
  bronze: "#3a2e1f", // 暗铜
  bronzeLight: "#6b5836",
  gold: "#c9a227", // 古金
  goldSoft: "#e8cd7a",
  jade: "#4f7a6a", // 玉绿
  smoke: "rgba(120, 110, 95, 0.16)", // 柔烟
  glow: "#f4cf76", // 落地金光
  cardBg: "rgba(26, 20, 13, 0.92)",
  cardBorder: "rgba(201, 162, 39, 0.35)",
  ink: "#efe6d2",
  muted: "rgba(239, 230, 210, 0.6)",
};

// 所有时长以毫秒计，整段仪式约 5.2s。结果由规则引擎决定，动画只是固定参数的演出。
export const RITUAL_TIMING = {
  spinAccel: 1400, // 罗盘加速旋转
  spinDecel: 2600, // 罗盘减速
  dropStart: 1800, // 旋转减速途中开始落币
  coinFall: 620, // 单枚下落时长
  coinStagger: 220, // 三枚错落间隔
  glowFlash: 180, // 金光闪起
  glowFade: 900, // 金光回落
  revealDelay: 700, // 落定到揭晓的留白
  revealDuration: 900, // 结果卡揭晓
};

// 罗盘旋转角度（度）。加速段转 2.5 圈，减速段再转 3.5 圈后停。
export const SPIN_ACCEL_DEG = 900;
export const SPIN_TOTAL_DEG = SPIN_ACCEL_DEG + 1260;
