# Fable / 天机快问 — 交接文档

> 给接手的 agent：这份文档让你冷启动就能继续。先读完它，再看 `README.md`、`docs/phase-1/`，以及下面点名的具体文件。沟通用中文（用户偏好）。

---

## 0. 一句话现状

**正在把网页原型「天机快问」重写成可上架的 iOS 原生 App（React Native / Expo SDK 56），解读后端已搬到 Cloudflare Workers。** 后端（阶段1）和 RN 工程骨架（阶段2）已完成并验证；问卦/八字/风水模块的原生 UI（阶段3-5）还没做。

---

## 1. 项目是什么

Fable 是一个**东方决策与居家运势 App**，三个模块：问卦决策（六爻/梅花/奇门/六壬）、四柱八字、风水 Lite。核心理念：**规则引擎做确定性计算（起卦/排盘），AI 只做白话解释**；每个结果都要落到可执行行动 + 安全/置信度提示。

- **目标市场**：海外华人 + 对中华文化感兴趣的非中文用户。**不面向中国大陆**。合规基准是商店全球政策 + GDPR/CCPA。详见 `docs/phase-1/`。
- **付费**：免费看核心结论，深度/追问付费（按深度 vs 按次数是待 A/B 的假设）。

---

## 2. 仓库结构（外层 `fable/` 是 git 仓库，内层 `fable/fable/` 是项目目录）

| 路径 | 是什么 | 状态 |
|---|---|---|
| `app/` | **正式 RN App（Expo SDK 56）** — 上架目标 | 骨架完成，模块待迁移 |
| `worker/` | **Cloudflare Worker 解读后端** | 完成，已部署线上 |
| `prototypes/wengua-tianji/` | **网页原型**，功能最全（问卦/八字/风水/多术数/每日一卦/AI解读/付费墙/历史/隐私） | 完整可跑，**是 RN 迁移的参考蓝本** |
| `prototypes/luopan-ritual-rn/` | 罗盘起卦 3D 仪式动画（独立 Expo 实验，three.js+expo-gl） | 真 3D 可跑，未集成进主 App |
| `docs/phase-1/` | 一期 BRD、范围、架构、合规、评测 | 已按海外市场更新 |

**网页原型（wengua-tianji）是金标准**：要做的 RN 功能那里都已经实现并调好（起卦规则、各模块 UI、AI 解读交互、安全文案）。迁移时对着它抄逻辑。它怎么跑：`cd prototypes/wengua-tianji && node server.mjs`，手机浏览器开局域网地址。

---

## 3. 线上资源 / 账号（都是用户的）

- **Worker 线上 URL**：`https://fable-worker.founders-497.workers.dev`（已部署，daily/interpret/divine 实测通过）
- **iOS bundle id**：`com.founders.fable`
- **EAS projectId**：`73673f81-0bfb-40ad-a12d-4e95e63fb620`（已在 app.json）
- 用户有：**付费 Apple Developer**、**Cloudflare** 账号、**Cerebras** API key、Expo 账号。
- **Cerebras key 不在 git**：原型用 `prototypes/wengua-tianji/config.local.json`（gitignored），Worker 用 `worker/.dev.vars`（本地 dev，gitignored）+ 线上 `wrangler secret`。线上 Worker 的 secret 已配好，**新 agent 不需要 key 就能调线上 Worker**。

---

## 4. 后端：`worker/`（阶段1，完成）

Cloudflare Worker，移植自原型 `server.mjs`。

- `src/index.ts`：fetch handler，路由 `/api/interpret`(六爻)、`/api/bazi`、`/api/fengshui`、`/api/divine`(梅花/奇门/六壬)、`/api/daily`(每日一卦)、`/health`。各模块有 system prompt + json_schema 约束的 Cerebras 调用 + 入口安全分类（自伤危机直接拦截给 988）+ CORS。
- `src/hexagrams.ts` / `src/divination.ts`：从原型复制的卦义表 + 安全分类 + 梅花/奇门/六壬起盘规则。
- 模型：Cerebras **gpt-oss-120b**（约 1s，快）。key 走 env secret `CEREBRAS_API_KEY`。
- 本地开发：`cd worker && npm i && echo 'CEREBRAS_API_KEY=...' > .dev.vars && npx wrangler dev`。
- 部署：`npx wrangler deploy`（已部署过；改代码后重跑）。
- 验证过：`tsc --noEmit` 干净；wrangler dev 实测 daily/interpret/divine 真实返回。
- 注意：Cerebras 的 json_schema **要求所有 object 显式 `additionalProperties:false`**；gpt-oss/glm 是推理模型，`max_completion_tokens` 给到 8000（小了 JSON 会被截断成空）。

---

## 5. 前端：`app/`（阶段2，骨架完成）

正式 Expo App，**SDK 56**（expo-router, RN 0.85, React 19.2, reanimated 4.3, expo-dev-client）。

- `src/app/_layout.tsx`：expo-router Tabs，3 个 tab — 问卦(`index`)/八字(`bazi`)/风水(`fengshui`)。
- `src/app/index.tsx`：问卦屏，目前是占位 + 「测试云端连通」按钮（拉 `/api/daily` 验证 App↔Worker 通）。
- `src/app/bazi.tsx` / `fengshui.tsx`：占位屏。
- `src/lib/api.ts`：**指向线上 Worker 的 typed client**（interpret/bazi/fengshui/divine/daily），新模块直接调它。
- `app.json`：name=天机快问, slug/scheme=fable, ios.bundleId=com.founders.fable, EAS projectId 已配。
- `eas.json`：development/preview/production profiles。
- 验证过：`tsc --noEmit` 干净；`npx expo export --platform ios` 打包 1520 模块成功。
- **起这个工程**：`cd app && npm install`（SDK 一致，不用 --legacy-peer-deps）。`eas build --platform ios --profile development` 出 dev build 装真机（用户在做这步验证签名链路）。

---

## 6. 下一步（阶段3起，按顺序）

### 阶段3：问卦模块（最优先）
把原型 `prototypes/wengua-tianji/src/app.js` 的问卦逻辑搬成 RN：
1. **六爻起卦规则**（确定性，App 端算）：三枚铜钱掷六次 → 6/7/8/9 爻值 → 本卦/变卦/动爻 → 64 卦名查表。逻辑见 `app.js` 的 `throwCoins`/`buildCast`/`HEX_NAMES`，直接移植成 TS（可放 `app/src/lib/liuyao.ts`）。
2. **梅花/奇门/六壬**：起盘规则已在 `worker/src/divination.ts`（也在原型 `src/divination.mjs`）。App 端可复用一份 TS，或让 `/api/divine` 端 Worker 起盘（Worker 已支持，返回 chart+reading）。
3. **起卦交互/动画**：原型有铜钱逐爻成卦动画（CSS）；RN 用 reanimated 重做（参考原型节奏）。**罗盘 3D 仪式见 `prototypes/luopan-ritual-rn/`**（three.js+expo-gl，可作为问卦起卦的高级动画集成进来）。
4. **结果页 + 解读**：调 `api.interpretWengua(...)` 或 `api.divine(...)`，渲染卦象图 + AI 解读（title/interpretation/actions/risk_notice）+ 免责声明。
5. 术数选择器（六爻/梅花/奇门/六壬）。**奇门/六壬是原型简化排盘，UI 上要标注「原型，待术数顾问审校」**（不能伪装精确排盘）。

### 阶段4：八字 + 风水
对着原型迁移。八字：出生信息 → 四柱五行（原型四柱目前是**静态示例数据**，真排盘是阶段性工程）→ 调 `api.interpretBazi`。风水：房间/朝向/布局 → 调 `api.interpretFengshui`。

### 阶段5：每日一卦 / 历史 / 隐私同意 / 付费墙(IAP) / 上架
- 每日一卦：调 `/api/daily`（确定性按日期），做留存钩子 + 本地通知。
- 历史/隐私/数据删除导出（GDPR/CCPA）。
- 付费墙：Apple IAP（expo 用 RevenueCat 或 expo-in-app-purchases）。
- **EAS build → TestFlight → App Store**。注意 App Store 审核：占卜类如实分级、不宣传"保证准确/发财"、每页"文化参考不替代专业意见"。

---

## 7. 关键决策 & 坑（省踩坑时间）

- **架构铁律**：规则引擎算、AI 只解释。别让模型算卦象/排盘（会算错）。
- **奇门/六壬排盘是原型简化版**（地盘/天地盘对，定局/三传简化），全程标注，不可当精确排盘上架。八字四柱目前也是示例数据。这两块要做准需要术数顾问。
- **安全**：自伤/危机问题入口拦截给求助资源（988），医疗/法律/重大财务拒绝确定性断言。已在 Worker `classifyRisk` + prompt。
- **数据最小化**：调 LLM 只传结构化结果，不传出生信息原文/地址。
- **环境/工具链坑**（在这台机器上反复遇到）：
  - npm 装 RN 依赖常撞 peer 冲突 → 用 `--legacy-peer-deps`（但 `app/` SDK 一致时不用）。
  - `rm -rf node_modules` 常被正在跑的 `expo start`/`wrangler dev` 进程锁住（"Directory not empty"）→ 先停进程。
  - **Skia 不在 Expo Go**（需 dev build）；**React Three Fiber 8 不兼容 React 19** → 罗盘 3D 用的是**纯 three.js + expo-gl 命令式**（见 luopan README）。
  - reanimated 4 起 worklets 拆成 `react-native-worklets`，babel 插件是 `react-native-worklets/plugin`。
  - 单面 PNG 不能真翻转（rotateX 翻面会消失），2.5D transform 有遮挡 bug → 所以才上真 3D。
- **本环境限制**：跑不了 iOS 模拟器，**看不到 RN 运行画面**，只能 `tsc --noEmit` + `expo export` 验证「编译/打包通过」。运行时观感（动画手感、3D 效果）必须靠用户在真机/dev build 上看 + 反馈。**每改一处 RN，至少跑 tsc + expo export 验证**。

---

## 8. 验证清单（每个改动）

- 后端：`cd worker && npm run typecheck`；改 prompt/逻辑后 `wrangler dev` + curl 真测一个端点；`wrangler deploy` 上线。
- 前端：`cd app && npx tsc --noEmit` + `npx expo export --platform ios`（要看到 "Bundled ... modules" + "Exported"）。运行/观感让用户在 dev build 上看。

---

## 9. git / 发布

- 远程：`origin = https://github.com/Leocs777/fable.git`。本机 `gh` 可能未登录；push 需要用户的 GitHub 凭证。之前的提交都在本地，按需 push。
- 提交习惯：信息结尾 `Co-Authored-By: Claude ...`。secret 文件（config.local.json / .dev.vars）已 gitignored，**提交前确认没 staged 任何 key**。
