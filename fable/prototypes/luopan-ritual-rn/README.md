# 罗盘仪式动画（React Native / Expo 参考实现）

沉浸式起卦仪式：暗夜柔烟中，铜罗盘呼吸 → 加速旋转 → 减速，三枚铜钱自上方错落落下、旋转、弹跳落定，落地瞬间罗盘轻震并迸出放射金光，随后结果卡柔和浮现。调性为暗铜 / 古金 / 玉绿 / 柔烟，克制、仪式感、非游戏化。

> ⚠️ **这是参考实现，未在真机/模拟器跑过**（本仓库的可运行原型是 `wengua-tianji` 的 Web 版，环境跑不了 RN）。代码按 **react-native-reanimated 3** 与 **@shopify/react-native-skia 1.x** 的 API 编写；集成到你的 Expo 项目后，按实际版本可能要微调（个别 prop 名/类型）。

## 依赖

```bash
npx expo install react-native-reanimated @shopify/react-native-skia
# 可选（若用 Rive 罗盘资产）：
# npx expo install rive-react-native
```

`babel.config.js` 必须启用 reanimated 插件（放在 plugins 最后一项）：

```js
module.exports = function (api) {
  api.cache(true);
  return { presets: ["babel-preset-expo"], plugins: ["react-native-reanimated/plugin"] };
};
```

## 资产

把两张透明底 PNG 放进你的 assets（本仓库 `wengua-tianji/assets/` 里已有可直接复用的）：

- `compass.png` —— 罗盘/天机盘，建议正方形透明底（可用 `tianji-tray-empty.png`）
- `coin.png` —— 古铜钱，透明底（可用 `coin-cutout.png`）

## 集成

```tsx
// App.tsx
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LuopanRitual } from "./ritual/LuopanRitual";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LuopanRitual
        compassSource={require("./assets/compass.png")}
        coinSource={require("./assets/coin.png")}
        // result 由你的规则引擎 + /api/divine 解读后端在起卦前准备好
        result={{
          hexagram: "需 → 节",
          title: "先稳住节奏，再择机推进",
          interpretation: "当前更适合蓄力与整理资源，把关键准备做扎实，会比立即冲刺更稳。",
        }}
        // onStart={() => 触发真正的起卦/请求解读}
      />
    </GestureHandlerRootView>
  );
}
```

## 架构

| 文件 | 职责 |
|---|---|
| `useRitualTimeline.ts` | **统一时间轴**：一处编排呼吸/旋转/落币/金光/震动/揭晓，各层只消费 shared value。三套动画系统的时序对齐都在这里。 |
| `CompassScene.tsx` | 罗盘：呼吸缩放 + 旋转 + 落地震动（Reanimated）。留有换 Rive 状态机的注释。 |
| `CoinDropLayer.tsx` | 三枚铜钱：下落缓入 → 弹簧落定，落点/旋向/起移为预设参数（确定性）。 |
| `RitualGlow.tsx` | Skia 氛围：暗底渐变 + 两层柔烟 + 单次绘制的金粒子 + 落地放射金光。 |
| `ResultReveal.tsx` | 结果卡淡入（透明度+位移+轻放大）；含真模糊渐清的替换说明。 |
| `LuopanRitual.tsx` | 组合 + 起卦/重置交互。 |

## 设计取舍

- **确定性而非随机**：结果由规则引擎决定，动画只是固定参数的演出（`withTiming`/`withSpring` 同参数同结果）。这与 Web 原型一致。
- **一条时间轴编排**：不让 Skia/Reanimated/(Rive) 各自回调拼时序——避免三系统对不齐。
- **性能**：粒子用单个 `<Points>` 一次绘制；柔烟只用 2 层 blurred 圆；动画值全部在 UI 线程。低端 Android 把 `RitualGlow.tsx` 的 `PARTICLE_COUNT` 调小、必要时去掉 `<Blur>`。Reanimated 默认尊重系统「减弱动态效果」可在 `LuopanRitual` 里读 `AccessibilityInfo.isReduceMotionEnabled()` 后跳过旋转/落币、直接揭晓。

## 扩展点

- **Rive 罗盘**：若有带 idle/spin/decel 状态机的 `.riv`，把 `CompassScene` 的 `Animated.Image` 换成 `<Rive>`，用 `useAnimatedReaction` 监听 `spin`/`shake` 去 `setNumber`/`fireState` 驱动状态机。
- **真模糊渐清**：把结果卡内容渲染进 Skia `<Canvas>` 并加 `<Blur blur={derived}>`，blur 从 ~12 降到 0；见 `ResultReveal.tsx` 注释。

## 已知未验证项（集成时重点测）

1. Skia 组件直接消费 reanimated `useDerivedValue` 的写法依赖 skia↔reanimated 集成版本，旧版可能要用 `useSharedValueEffect`。
2. `<Points mode="stroke">` 的点大小/端点在不同 skia 版本表现略有差异。
3. 三枚铜钱落点 / `landY` 需按你实际罗盘图尺寸与位置微调。
