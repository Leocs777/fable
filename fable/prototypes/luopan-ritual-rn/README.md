# 罗盘仪式动画（React Native / Expo 参考实现）

沉浸式起卦仪式：暗夜柔烟中，铜罗盘呼吸 → 加速旋转 → 减速，三枚铜钱自上方错落落下、旋转、弹跳落定，落地瞬间罗盘轻震并迸出放射金光，随后结果卡柔和浮现。调性为暗铜 / 古金 / 玉绿 / 柔烟，克制、仪式感、非游戏化。

> ✅ **这是一个可直接运行的 Expo 项目**（不只是代码片段）。已在本机用真实依赖做过静态验证：`tsc --noEmit` 类型检查通过、`expo export`（Metro 打包，1080 模块）成功。**运行时画面仍需在你的设备/模拟器上看**——这台机器没有模拟器，我无法替你截图确认观感。
>
> 实测依赖版本：**expo 52 · react-native 0.76 · react-native-reanimated 3.16 · @shopify/react-native-skia 1.5 · react-native-gesture-handler 2.20 · expo-asset**。版本都钉在 `package.json` 里。

## 运行

```bash
cd fable/prototypes/luopan-ritual-rn
npm install
npx expo start        # 用 Expo Go 扫码，或按 i / a 开 iOS / Android 模拟器
```

入口是 `App.tsx`（已接好 `LuopanRitual`），资产在 `assets/compass.png` 与 `assets/coin.png`（已从 `wengua-tianji/assets/` 复制好）。`result` 字段实际应由规则引擎 + `/api/divine` 解读后端在起卦前准备好——动画只负责揭晓。

## 复制到你已有的 Expo 项目

如果你已有 App，把 `ritual/` 目录和两张资产拷过去，确保：

1. `npx expo install react-native-reanimated @shopify/react-native-skia react-native-gesture-handler expo-asset`
2. `babel.config.js` 的 plugins 最后一项是 `"react-native-reanimated/plugin"`
3. 根组件用 `GestureHandlerRootView` 包裹（见本项目 `App.tsx`）
4. 像 `App.tsx` 那样渲染 `<LuopanRitual compassSource coinSource result />`

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

## 验证状态与已修问题

已通过（本机，真实依赖）：

- ✅ `npx tsc --noEmit` —— 类型干净
- ✅ `npx expo export --platform ios` —— Metro 打包成功（1080 模块，含资产）

打包过程中实际修掉的问题：

- **Skia `transform` 不接受「数组内嵌 derived value」**：原本写 `transform={[{ translateX: smokeA }]}`（`smokeA` 是 `DerivedValue`）会类型报错；改为整个 transform 作为一个 derived value：`useDerivedValue(() => [{ translateX: ... }])`，传 `transform={smokeATransform}`。这正是 skia↔reanimated 集成最常见的坑。
- 补了漏掉的 `expo-asset` 依赖（`require('./assets/*.png')` 需要）。

仍需在设备/模拟器上确认（无法靠打包验证）：

1. 运行时观感与节奏（呼吸/旋转/落币/金光/揭晓的时序手感）——`ritual/theme.ts` 的 `RITUAL_TIMING` 可调。
2. 三枚铜钱落点 / `landY` 需按你实际罗盘图尺寸与位置微调（`CoinDropLayer.tsx` 的 `COIN_SPECS`）。
3. 低端 Android 帧率：必要时降 `RitualGlow.tsx` 的 `PARTICLE_COUNT`、去掉 `<Blur>`。
4. `<Points mode="points">` 的点大小/端点在不同 skia 小版本表现可能略有差异。
