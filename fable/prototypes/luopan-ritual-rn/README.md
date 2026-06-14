# 罗盘仪式动画（React Native / Expo 参考实现）

沉浸式起卦仪式：暗夜柔烟中，铜罗盘呼吸 → 加速旋转 → 减速，三枚铜钱自上方错落落下、旋转、弹跳落定，落地瞬间罗盘轻震并迸出放射金光，随后结果卡柔和浮现。调性为暗铜 / 古金 / 玉绿 / 柔烟，克制、仪式感、非游戏化。

> ✅ **可直接运行的 Expo 项目。`App.tsx` 现在默认渲染真 3D 场景**（`ritual3d/Ritual3D.tsx`，three.js + expo-gl 命令式，**Expo Go 可跑，无需 dev build**）；旧的 2.5D 版保留在 `ritual/`（需对比时把 `App.tsx` 换回 `LuopanRitual`）。已在本机静态验证：`tsc --noEmit` 通过、`expo export`（Metro 打包，1109 模块，含 three）成功。**运行时画面需在你的设备/模拟器上看**——这台机器没有模拟器，我无法替你截图确认观感。
>
> 实测依赖版本（**Expo SDK 54**，匹配当前 Expo Go）：**expo 54 · react 19 · react-native 0.81 · react-native-reanimated 4.1（+ react-native-worklets）· react-native-gesture-handler 2.28 · expo-linear-gradient · react-native-svg · expo-asset**。版本都钉在 `package.json` 里。
>
> **氛围层（暗底/金粒子/落地金光）用 `expo-linear-gradient` + `react-native-svg` + reanimated**，在 Expo Go 里直接可见。
>
> ⚠️ **这是 2.5D（transform）版，质感有天花板**——给不了真厚度/真翻转/真回弹，且伪 3D 会有遮挡问题。要做"高级冥想 App + 3D 占卜"那种质感，正路是真 3D（React Three Fiber + expo-gl，**也能在 Expo Go 跑**）：完整方案见 **[REAL-3D-PLAN.md](./REAL-3D-PLAN.md)**。

## 运行

```bash
cd fable/prototypes/luopan-ritual-rn
npm install
npx expo start        # 用 Expo Go 扫码，或按 i / a 开 iOS / Android 模拟器
```

入口是 `App.tsx`（已接好 `LuopanRitual`），资产在 `assets/compass.png` 与 `assets/coin.png`（已从 `wengua-tianji/assets/` 复制好）。`result` 字段实际应由规则引擎 + `/api/divine` 解读后端在起卦前准备好——动画只负责揭晓。

## 复制到你已有的 Expo 项目

如果你已有 App，把 `ritual/` 目录和两张资产拷过去，确保：

1. `npx expo install react-native-reanimated react-native-worklets @shopify/react-native-skia react-native-gesture-handler expo-asset`
2. `babel.config.js` 的 plugins 最后一项是 `"react-native-worklets/plugin"`（reanimated 4 起 worklets 独立成包，插件改名；旧版是 `react-native-reanimated/plugin`）
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

- ✅ `npx tsc --noEmit` —— 类型干净（Expo SDK 54）
- ✅ `npx expo export --platform ios` —— Metro 打包成功（1237 模块，含资产）

实际修掉的问题：

- **Skia 在 Expo Go 不可用 → 氛围层重写**：`@shopify/react-native-skia` 需要 development build，Expo Go 跑不了它，导致暗底/烟雾/粒子/金光整层不显示（罗盘的方形纸背景也因此露出还跟着转）。已把氛围层换成 `expo-linear-gradient` + `react-native-svg` + reanimated，Expo Go 直接可见。
- **罗盘 2.5D + 裁圆**：加 `perspective` + `rotateX` 透视后仰；`borderRadius` 裁圆去掉方形纸背景（之前整张方图连背景一起转）。
- **铜钱 3D 翻滚**：从平面旋转改为 `perspective` + `rotateX` 空中翻滚，落地停在 360° 倍数正面朝上。
- **Expo SDK 54 = reanimated 4**：worklets 拆为独立包 `react-native-worklets`，babel 插件改 `react-native-worklets/plugin`。基础 API 在 v4 不变，动画业务代码无需改。
- 补了漏掉的 `expo-asset` 依赖（`require('./assets/*.png')` 需要）。

仍需在设备/模拟器上确认（无法靠打包验证）：

1. 运行时观感与节奏（呼吸/旋转/落币/金光/揭晓的时序手感）——`ritual/theme.ts` 的 `RITUAL_TIMING` 可调。
2. 三枚铜钱落点 / `landY` 需按你实际罗盘图尺寸与位置微调（`CoinDropLayer.tsx` 的 `COIN_SPECS`）。
3. 低端 Android 帧率：必要时降 `RitualGlow.tsx` 的 `PARTICLE_COUNT`、去掉 `<Blur>`。
4. `<Points mode="points">` 的点大小/端点在不同 skia 小版本表现可能略有差异。
