# 一期技术架构

## 推荐技术栈

- 移动端：React Native + TypeScript。
- 后端：FastAPI + Python。
- 数据库：PostgreSQL；知识库准备好后再接 pgvector。
- AI：正式实现时由后端调用 OpenAI API。
- 支付：iOS 用 StoreKit，Android 用 Google Play Billing，后端统一成 entitlement。
- 动画：Rive 做铜钱起卦和主要仪式状态，Lottie 做轻量动效。

后端负责敏感逻辑和所有模型调用。移动端不能保存模型 API key，也不能自行判断付费权益。

## 系统边界

### 移动端 App

职责：

- App 导航和 onboarding。
- 隐私同意 UI。
- 问卦起卦交互。
- 出生信息和房间信息表单。
- 结果页渲染。
- 付费墙展示。
- 本地临时 UI 状态。

移动端可以缓存非敏感 UI 资源和最近查看的结果摘要，但不要在没有明确策略时持久化原始敏感数据。

### 后端 API

职责：

- 用户和 session 身份。
- 同意记录。
- 历史记录。
- 计算流程编排。
- AI 请求构造。
- 安全分类。
- 权益校验。
- 删除/导出流程。
- 埋点事件接收。

### 规则引擎

职责：

- 三枚铜钱起卦、爻值和卦象映射。
- 八字历法、节气、时区、真太阳时、四柱、十神、五行计算。
- 风水 Lite 房间位置规则。

规则输出必须结构化、可测试。AI 不能发明计算结果。

### AI 解释引擎

职责：

- 把规则结果改写成白话结果卡。
- 用固定 JSON schema 约束输出。
- 包含置信度和限制说明。
- 只把检索到的知识片段作为解释依据。
- 对高风险请求拒绝确定性建议或转为安全思考框架。

建议输出结构：

```json
{
  "summary": "简短结论",
  "basis": ["规则或来源依据"],
  "interpretation": "白话解释",
  "actions": ["建议 1", "建议 2", "建议 3"],
  "risk_notice": "安全或限制提示",
  "confidence": "high | medium | low",
  "paid_expansion_teaser": "深度报告会补充什么"
}
```

## 问卦请求流程

1. 移动端提交问题和可选上下文。
2. 后端校验长度、语言和滥用信号。
3. 安全分类器路由：
   - `allowed`：继续起卦。
   - `needs_clarification`：最多追问一个问题。
   - `high_risk`：返回安全思考框架，不给确定性建议。
4. 规则引擎记录 cast seed、铜钱结果、六爻、本卦、动爻和变卦。
5. 检索层取回相关卦象和来源说明。
6. AI 解释引擎生成结构化结果。
7. 后端校验 schema 并保存结果。
8. 移动端根据权益展示免费或付费视图。

## 八字请求流程

1. 移动端提交出生信息和时辰置信度。
2. 后端规范化出生地、时区和时间。
3. 规则引擎计算四柱和派生字段。
4. 时辰置信度低时，后端屏蔽依赖时柱的解释。
5. AI 解释引擎基于结构化命盘生成主题卡。
6. 后端保存命盘和生成报告。

## 风水 Lite 请求流程

1. 移动端提交房间类型、朝向和手工位置。
2. 后端校验朝向置信度和必填房间字段。
3. 规则引擎返回区域、问题点和调整候选。
4. AI 解释引擎把候选项改写为清单，并加置信度提示。
5. 用户同意后，后端保存房间分析。

## 错误处理

- 用户输入无效时返回明确校验错误，不创建结果。
- 计算失败要记录后端错误，并向用户展示可重试失败。
- AI schema 校验失败时只允许一次受限重试；再次失败就返回明确错误，不能伪造成功。
- 安全分类失败时默认走保守安全输出。
- 购买校验失败时不能解锁付费内容。
- 删除失败时要创建可追踪的支持/升级记录。

## 观测和埋点

一期先记录这些事件：

- `onboarding_consent_completed`
- `wengua_question_submitted`
- `wengua_result_viewed`
- `paywall_viewed`
- `purchase_started`
- `purchase_completed`
- `bazi_profile_submitted`
- `bazi_result_viewed`
- `fengshui_room_submitted`
- `fengshui_result_viewed`
- `record_deleted`
- `high_risk_prompt_blocked`

不要把原始出生信息、完整问题、地址、房间图片写进第三方分析工具。埋点只用记录 ID 和脱敏分类。

