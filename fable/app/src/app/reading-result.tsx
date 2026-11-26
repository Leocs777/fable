import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MethodResultHeaderAnimation } from "@/components/divination/MethodRitualStage";
import { MysticBackdrop } from "@/components/MysticBackdrop";
import { durationBucket, questionLengthBucket, trackAnalytics } from "@/lib/analytics";
import { followUp, type DivineChart, type FollowUpMessage, type FollowUpResponse, type Reading } from "@/lib/api";
import { confidenceLabelText, l } from "@/lib/i18n";
import { LINE_TYPES, type CoinThrow, type LineValue, type LiuyaoCast } from "@/lib/liuyao";
import {
  buildDeepReport,
  getReadingResultSession,
  readingSummary,
  type ReadingMethodKey,
  type ReadingResultSession,
} from "@/lib/readingSession";
import { mystic } from "@/theme/mystic";

type FollowUp = {
  id: string;
  question: string;
  answer: string;
  actions: string[];
  riskNotice: string;
  confidence: FollowUpResponse["confidence"];
  safetyBlock: boolean;
  isPending?: boolean;
  error?: string;
};

const FOLLOW_UP_LIMIT = 120;

export default function ReadingResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const session = useMemo(() => getReadingResultSession(params.id ?? ""), [params.id]);
  const [detailVisible, setDetailVisible] = useState(() => Boolean(session?.cast || session?.reading.safety_block));
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [followUpBusy, setFollowUpBusy] = useState(false);
  const [followUpError, setFollowUpError] = useState("");

  useEffect(() => {
    if (!session) return;
    trackAnalytics("result_view", {
      method: session.method,
      source: "result_screen",
      summaryOnly: session.method !== "liuyao" && !session.reading.safety_block,
      confidence: session.reading.confidence,
      safetyBlock: session.reading.safety_block,
    });
  }, [session]);

  if (!session) {
    return (
      <View style={[styles.screen, styles.missingScreen, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 24 }]}>
        <MysticBackdrop />
        <Text style={styles.missingTitle}>{l({ zh: "结果已离开当前会话", en: "This result is no longer in the current session" })}</Text>
        <Text style={styles.missingBody}>{l({ zh: "这次起卦结果只保存在本机内存中。回到问卦页后，可以重新起卦或从本次历史中打开。", en: "Reading results are kept only in local session memory. Return to the reading page to cast again or reopen a recent result." })}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace("/")} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{l({ zh: "返回问卦", en: "Back to readings" })}</Text>
        </Pressable>
      </View>
    );
  }

  const canShowSummaryOnly = session.method !== "liuyao" && !session.reading.safety_block;
  const showSummaryOnly = canShowSummaryOnly && !detailVisible;
  const summary = readingSummary(session.reading);
  const canSubmitFollowUp = Boolean(followUpQuestion.trim()) && !followUpBusy;

  const addFollowUp = async () => {
    const nextQuestion = followUpQuestion.trim().slice(0, FOLLOW_UP_LIMIT);
    if (!nextQuestion || followUpBusy) return;
    const startedAt = Date.now();
    const pendingId = `${Date.now()}-${followUps.length}`;
    const messages = buildFollowUpMessages(followUps, nextQuestion);
    trackAnalytics("followup_start", { method: session.method, questionLengthBucket: questionLengthBucket(nextQuestion), previousFollowupCount: followUps.length });
    setFollowUpBusy(true);
    setFollowUpError("");
    setFollowUps((items) => [
      ...items,
      {
        id: pendingId,
        question: nextQuestion,
        answer: l({ zh: "正在沿用本次盘面继续推演...", en: "Continuing from this chart..." }),
        actions: [],
        riskNotice: "",
        confidence: "low",
        safetyBlock: false,
        isPending: true,
      },
    ]);
    setFollowUpQuestion("");
    try {
      const response = await followUp({
        method: session.method,
        methodTitle: session.methodTitle,
        question: session.question,
        detail: session.detail,
        chartSummary: followUpChartSummary(session),
        reading: session.reading,
        messages,
      });
      setFollowUps((items) =>
        items.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                answer: response.answer,
                actions: response.actions,
                riskNotice: response.risk_notice,
                confidence: response.confidence,
                safetyBlock: response.safety_block,
                isPending: false,
              }
            : item,
        ),
      );
      trackAnalytics("followup_success", {
        method: session.method,
        durationBucket: durationBucket(Date.now() - startedAt),
        confidence: response.confidence,
        safetyBlock: response.safety_block,
      });
    } catch {
      const errorText = l({ zh: "追问没有完成，请检查网络后重新尝试。", en: "The follow-up did not complete. Check your connection and try again." });
      setFollowUpError(errorText);
      setFollowUps((items) =>
        items.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                answer: errorText,
                actions: [],
                riskNotice: l({ zh: "本次追问未写入结果，你可以直接重新提问。", en: "This follow-up was not saved into the result. You can ask again directly." }),
                confidence: "low",
                safetyBlock: false,
                isPending: false,
                error: errorText,
              }
            : item,
        ),
      );
      trackAnalytics("followup_error", { method: session.method, durationBucket: durationBucket(Date.now() - startedAt), errorType: "FollowUpRequestError" });
    } finally {
      setFollowUpBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.keyboard}>
      <ScrollView
        style={styles.screen}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}
      >
        <MysticBackdrop />
        <View style={styles.topbar}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.topTitleGroup}>
            <Text style={styles.kicker}>{l({ zh: "起卦结果", en: "Reading result" })}</Text>
            <Text style={styles.title}>{l({ zh: `${session.methodTitle}解读`, en: `${session.methodTitle} reading` })}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.replace("/")} style={styles.newButton}>
            <Text style={styles.newButtonText}>{l({ zh: "再问", en: "Ask again" })}</Text>
          </Pressable>
        </View>

        <View style={styles.questionCard}>
          <Text style={styles.questionKicker}>{l({ zh: "本次问题", en: "Question" })}</Text>
          <Text style={styles.question}>{session.question}</Text>
          <Text style={styles.detailLine}>{session.detail}</Text>
        </View>

        <ProgressPanel session={session} />

        <View style={[styles.panel, styles.resultPanel]}>
          {session.chart ? <MethodResultHeaderAnimation method={session.chart.method} chart={session.chart} /> : null}
          {session.cast ? <LiuyaoChart cast={session.cast} /> : <DivineChartView chart={session.chart} />}
          <Text style={styles.resultSource}>{session.reading.safety_block ? l({ zh: "安全提示", en: "Safety note" }) : l({ zh: `AI 解读 · ${confidenceLabel(session.reading.confidence)}`, en: `AI reading · ${confidenceLabel(session.reading.confidence)}` })}</Text>
          <Text style={styles.resultTitle}>{session.reading.title}</Text>
          <Text style={styles.summaryText}>{showSummaryOnly ? summary : session.reading.interpretation}</Text>

          {showSummaryOnly ? (
            <>
              <ActionPreview reading={session.reading} />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  trackAnalytics("result_detail_expand", { method: session.method });
                  setDetailVisible(true);
                }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>{l({ zh: "查看详细解读", en: "View detailed reading" })}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActionList reading={session.reading} />
              {session.reading.risk_notice ? <Text style={styles.riskNotice}>{session.reading.risk_notice}</Text> : null}
              <DeepReport reading={session.reading} cast={session.cast} chart={session.chart} />
            </>
          )}
        </View>

        <View style={styles.panel}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionKicker}>{l({ zh: "继续追问", en: "Follow up" })}</Text>
            <Text style={styles.sectionTitle}>{l({ zh: "围绕本卦追一个更具体的问题", en: "Ask a more specific question about this chart" })}</Text>
          </View>
          <TextInput
            value={followUpQuestion}
            onChangeText={(text) => setFollowUpQuestion(text.slice(0, FOLLOW_UP_LIMIT))}
            placeholder={l({ zh: "例如：我现在最该先做哪一步？", en: "Example: What should I do first now?" })}
            placeholderTextColor="rgba(255,247,223,0.36)"
            multiline
            maxLength={FOLLOW_UP_LIMIT}
            textAlignVertical="top"
            editable={!followUpBusy}
            style={styles.followInput}
          />
          <View style={styles.followMeta}>
            <Text style={styles.followHint}>{l({ zh: "围绕同一卦象继续追问，不重新起卦。", en: "Continue from the same chart without casting again." })}</Text>
            <Text style={styles.followCount}>{followUpQuestion.length}/{FOLLOW_UP_LIMIT}</Text>
          </View>
          {followUpError ? <Text style={styles.followError}>{followUpError}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={!canSubmitFollowUp}
            onPress={addFollowUp}
            style={[styles.secondaryButton, !canSubmitFollowUp && styles.disabledButton]}
          >
            {followUpBusy ? <ActivityIndicator color={mystic.gold} size="small" /> : null}
            <Text style={styles.secondaryButtonText}>{followUpBusy ? l({ zh: "正在追问...", en: "Asking..." }) : l({ zh: "追问本卦", en: "Ask follow-up" })}</Text>
          </Pressable>
          {followUps.length > 0 ? (
            <View style={styles.followList}>
              {followUps.map((item) => (
                <View key={item.id} style={[styles.followItem, item.error && styles.followItemError]}>
                  <Text style={styles.followQuestion}>{l({ zh: `问：${item.question}`, en: `Q: ${item.question}` })}</Text>
                  <Text style={[styles.followAnswer, item.isPending && styles.followPending]}>{l({ zh: `答：${item.answer}`, en: `A: ${item.answer}` })}</Text>
                  {item.actions.length > 0 ? (
                    <View style={styles.followActions}>
                      {item.actions.map((action, index) => (
                        <Text key={`${index}-${action}`} style={styles.followAction}>· {action}</Text>
                      ))}
                    </View>
                  ) : null}
                  {item.riskNotice ? <Text style={styles.followRisk}>{item.riskNotice}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ProgressPanel({ session }: { session: ReadingResultSession }) {
  const steps = progressSteps(session);
  return (
    <View style={styles.panel}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionKicker}>{l({ zh: "起卦进度", en: "Casting progress" })}</Text>
        <Text style={styles.sectionTitle}>{l({ zh: `${session.methodTitle}盘面已完成`, en: `${session.methodTitle} chart completed` })}</Text>
      </View>
      <View style={styles.timeline}>
        {steps.map((step, index) => (
          <View key={`${index}-${step.title}`} style={styles.timelineItem}>
            <View style={styles.timelineDot}>
              <Text style={styles.timelineDotText}>{index + 1}</Text>
            </View>
            <View style={styles.timelineBody}>
              <Text style={styles.timelineTitle}>{step.title}</Text>
              <Text style={styles.timelineText}>{step.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function progressSteps(session: ReadingResultSession): { title: string; body: string }[] {
  if (session.cast) {
    return session.cast.throws.map((coinThrow, index) => ({
      title: l({ zh: `第 ${index + 1} 次落币`, en: `Coin cast ${index + 1}` }),
      body: `${coinFacesText(coinThrow)} · ${lineTypeLabel(coinThrow.value)}`,
    }));
  }

  if (session.chart?.method === "meihua") {
    return [
      { title: l({ zh: "一念起象", en: "Intent forms" }), body: l({ zh: "以问题和此刻时间定数。", en: "The question and this moment set the pattern." }) },
      { title: l({ zh: "水纹成卦", en: "Ripples form the hexagram" }), body: l({ zh: `${session.chart.hexagram} 本卦显现。`, en: `${session.chart.hexagram} appears as the primary hexagram.` }) },
      { title: l({ zh: "动爻点亮", en: "Changing line lights" }), body: l({ zh: `第 ${session.chart.moving} 爻发动，转为 ${session.chart.changed}。`, en: `Line ${session.chart.moving} changes into ${session.chart.changed}.` }) },
      { title: l({ zh: "解读完成", en: "Reading complete" }), body: l({ zh: "summary 已生成，可继续展开细读。", en: "A summary is ready; expand for details." }) },
    ];
  }

  if (session.chart?.method === "qimen") {
    return [
      { title: l({ zh: "时间定局", en: "Time anchors the chart" }), body: `${session.chart.dun} ${session.chart.ju}` },
      { title: l({ zh: "九宫展开", en: "Nine palaces unfold" }), body: l({ zh: "九宫格、天盘和地盘完成对齐。", en: "The nine palaces, heaven plate, and earth plate align." }) },
      { title: l({ zh: "八门落宫", en: "Eight gates settle" }), body: l({ zh: `值符落 ${session.chart.fuPalace} 宫。`, en: `Chief sign settles in palace ${session.chart.fuPalace}.` }) },
      { title: l({ zh: "奇门局已成", en: "Qi Men chart formed" }), body: l({ zh: "关键宫位已锁定，可展开详细解读。", en: "The key palace is locked; detailed reading is available." }) },
    ];
  }

  if (session.chart?.method === "daliuren") {
    return [
      { title: l({ zh: "占时起课", en: "Hour forms the lesson" }), body: l({ zh: `${session.chart.dayGanzhi}日 · ${session.chart.hour}时。`, en: `${session.chart.dayGanzhi} day · ${session.chart.hour} hour.` }) },
      { title: l({ zh: "四课成象", en: "Four lessons appear" }), body: session.chart.fourLessons.map((lesson) => `${lesson.label}${lesson.upper}/${lesson.lower}`).join(" · ") },
      { title: l({ zh: "三传展开", en: "Three transmissions unfold" }), body: session.chart.transmissions.map((item) => `${item.label}${item.branch}`).join(" → ") },
      { title: l({ zh: "三传已明", en: "Transmissions clarified" }), body: l({ zh: "因果线索已收束，可展开详细解读。", en: "The causal thread has gathered; detailed reading is available." }) },
    ];
  }

  return [
    { title: l({ zh: "定问", en: "Question set" }), body: l({ zh: "问题已经记录。", en: "The question has been recorded." }) },
    { title: l({ zh: "起盘", en: "Chart cast" }), body: l({ zh: "盘面已经生成。", en: "The chart has been generated." }) },
    { title: l({ zh: "解读", en: "Reading" }), body: l({ zh: "结果已经完成。", en: "The result is complete." }) },
  ];
}

function LiuyaoChart({ cast }: { cast: LiuyaoCast }) {
  return (
    <View>
      <View style={styles.hexagramPair}>
        <HexCard title={l({ zh: "本卦", en: "Primary" })} name={cast.primaryName} lines={cast.primaryLines} movingPositions={cast.movingPositions} />
        <Text style={styles.hexaArrow}>→</Text>
        <HexCard title={l({ zh: "变卦", en: "Changed" })} name={cast.changedName} lines={cast.changedLines} movingPositions={[]} />
      </View>
      <Text style={styles.chartNote}>
        {cast.movingLabels.length > 0 ? l({ zh: `动爻：${cast.movingLabels.join("、")}`, en: `Changing lines: ${cast.movingLabels.join(", ")}` }) : l({ zh: "无动爻：卦象安定。", en: "No changing lines: the pattern is stable." })}
      </Text>
    </View>
  );
}

function DivineChartView({ chart }: { chart: DivineChart | null }) {
  if (!chart) {
    return <Text style={styles.emptyText}>{l({ zh: "盘面数据暂不可用。", en: "Chart data is not available yet." })}</Text>;
  }

  if (chart.method === "meihua") {
    return (
      <View>
        <View style={styles.hexagramPair}>
          <HexCard title={l({ zh: "本卦", en: "Primary" })} name={chart.hexagram} lines={normalizeLines(chart.lines)} movingPositions={[chart.moving - 1]} />
          <Text style={styles.hexaArrow}>→</Text>
          <HexCard title={l({ zh: "变卦", en: "Changed" })} name={chart.changed} lines={normalizeLines(chart.changedLines)} movingPositions={[]} />
        </View>
        <Text style={styles.chartNote}>
          {l({ zh: `体卦 ${chart.bodyTrigram} · 用卦 ${chart.useTrigram} · 动第 ${chart.moving} 爻 · ${chart.timeLabel}`, en: `Body ${chart.bodyTrigram} · Use ${chart.useTrigram} · Changing line ${chart.moving} · ${chart.timeLabel}` })}
        </Text>
      </View>
    );
  }

  if (chart.method === "qimen") {
    const order = [3, 8, 1, 2, 4, 6, 7, 0, 5];
    return (
      <View>
        <View style={styles.qimenGrid}>
          {order.map((index) => {
            const palace = chart.palaces[index];
            if (!palace) return null;
            return (
              <View key={`${palace.no}-${palace.name}`} style={styles.qimenCell}>
                <Text style={styles.qimenPos}>{palace.name} · {palace.dir}</Text>
                <Text style={styles.qimenStem}>{palace.stem}</Text>
                <Text style={styles.qimenGate}>{palace.gate || "—"}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.chartNote}>{l({ zh: `${chart.dun} ${chart.ju} 局 · 值符落 ${chart.fuPalace} 宫 · ${chart.timeLabel}`, en: `${chart.dun} ${chart.ju} · Chief sign in palace ${chart.fuPalace} · ${chart.timeLabel}` })}</Text>
        <Text style={styles.prototypeNote}>{chart.note}</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.daliurenMeta}>{l({ zh: `${chart.dayGanzhi}日 · 月将 ${chart.monthGeneral} · ${chart.hour}时`, en: `${chart.dayGanzhi} day · Month general ${chart.monthGeneral} · ${chart.hour} hour` })}</Text>
      <View style={styles.lessonGrid}>
        {chart.fourLessons.map((lesson) => (
          <View key={lesson.label} style={styles.lessonCard}>
            <Text style={styles.lessonLabel}>{lesson.label}</Text>
            <Text style={styles.lessonUpper}>{lesson.upper}</Text>
            <Text style={styles.lessonLower}>{lesson.lower}</Text>
          </View>
        ))}
      </View>
      <View style={styles.transmissionRow}>
        {chart.transmissions.map((item) => (
          <View key={item.label} style={styles.transmissionPill}>
            <Text style={styles.transmissionLabel}>{item.label}</Text>
            <Text style={styles.transmissionBranch}>{item.branch}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.prototypeNote}>{chart.note}</Text>
    </View>
  );
}

function HexCard({ title, name, lines, movingPositions }: { title: string; name: string; lines: LineValue[]; movingPositions: number[] }) {
  return (
    <View style={styles.hexCard}>
      <Text style={styles.hexCardTitle}>{title}</Text>
      <Glyph lines={lines} movingPositions={movingPositions} />
      <Text style={styles.hexName}>{name}</Text>
    </View>
  );
}

function Glyph({ lines, movingPositions }: { lines: LineValue[]; movingPositions: number[] }) {
  return (
    <View style={styles.glyph}>
      {lines
        .map((line, index) => ({ line, index }))
        .reverse()
        .map(({ line, index }) => (
          <LineBars key={index} value={line} moving={movingPositions.includes(index)} />
        ))}
    </View>
  );
}

function LineBars({ value, moving = false }: { value: LineValue; moving?: boolean }) {
  return (
    <View style={styles.lineBars}>
      {value === 1 ? (
        <View style={[styles.yangLine, moving && styles.movingLine]} />
      ) : (
        <View style={styles.yinLine}>
          <View style={[styles.yinHalf, moving && styles.movingLine]} />
          <View style={[styles.yinHalf, moving && styles.movingLine]} />
        </View>
      )}
    </View>
  );
}

function ActionPreview({ reading }: { reading: Reading }) {
  const action = reading.actions[0];
  if (!action) return null;
  return (
    <View style={styles.actionPreview}>
      <Text style={styles.actionPreviewKicker}>{l({ zh: "先看一句", en: "First signal" })}</Text>
      <Text style={styles.actionPreviewText}>{action}</Text>
    </View>
  );
}

function ActionList({ reading }: { reading: Reading }) {
  return (
    <View style={styles.actions}>
      {reading.actions.map((action, index) => (
        <View key={`${index}-${action}`} style={styles.actionItem}>
          <Text style={styles.actionIndex}>{index + 1}</Text>
          <Text style={styles.actionText}>{action}</Text>
        </View>
      ))}
    </View>
  );
}

function DeepReport({ reading, cast, chart }: { reading: Reading; cast: LiuyaoCast | null; chart: DivineChart | null }) {
  return (
    <View style={styles.deepReport}>
      <Text style={styles.deepReportKicker}>{l({ zh: "后续详细解读", en: "Detailed reading" })}</Text>
      {buildDeepReport(reading, cast, chart).map((item) => (
        <View key={item.title} style={styles.deepSection}>
          <Text style={styles.deepTitle}>{item.title}</Text>
          <Text style={styles.deepBody}>{item.body}</Text>
        </View>
      ))}
    </View>
  );
}

function buildFollowUpMessages(followUps: FollowUp[], nextQuestion: string): FollowUpMessage[] {
  const previous: FollowUpMessage[] = [];
  followUps
    .filter((item) => !item.isPending && !item.error)
    .forEach((item) => {
      previous.push({ role: "user", content: item.question });
      previous.push({ role: "assistant", content: item.answer });
    });
  const latest: FollowUpMessage = { role: "user", content: nextQuestion };
  return [...previous, latest].slice(-8);
}

function followUpChartSummary(session: ReadingResultSession): string {
  if (session.cast) {
    const throws = session.cast.throws.map((coinThrow, index) => l({ zh: `第${index + 1}爻${LINE_TYPES[coinThrow.value].label}`, en: `Line ${index + 1}: ${lineTypeLabel(coinThrow.value)}` })).join(l({ zh: "；", en: "; " }));
    const moving = session.cast.movingLabels.length > 0 ? l({ zh: session.cast.movingLabels.join("、"), en: session.cast.movingLabels.join(", ") }) : l({ zh: "无动爻", en: "no changing lines" });
    return l({ zh: `六爻铜钱：本卦${session.cast.primaryName}，变卦${session.cast.changedName}，${moving}。${throws}`, en: `Coin Oracle: primary ${session.cast.primaryName}, changed ${session.cast.changedName}, ${moving}. ${throws}` });
  }
  if (session.chart?.method === "meihua") {
    return l({ zh: `梅花易数：本卦${session.chart.hexagram}，变卦${session.chart.changed}，动第${session.chart.moving}爻，体卦${session.chart.bodyTrigram}，用卦${session.chart.useTrigram}。`, en: `Plum Blossom Oracle: primary ${session.chart.hexagram}, changed ${session.chart.changed}, changing line ${session.chart.moving}, body trigram ${session.chart.bodyTrigram}, use trigram ${session.chart.useTrigram}.` });
  }
  if (session.chart?.method === "qimen") {
    const palaces = session.chart.palaces.map((palace) => `${palace.name}${palace.dir}${palace.stem}${palace.gate}`).join("；");
    return l({ zh: `奇门遁甲简化局：${session.chart.dun}${session.chart.ju}局，值符落${session.chart.fuPalace}宫。九宫：${palaces}`, en: `Simplified Qi Men chart: ${session.chart.dun}${session.chart.ju}, chief sign in palace ${session.chart.fuPalace}. Palaces: ${palaces}` });
  }
  if (session.chart?.method === "daliuren") {
    const lessons = session.chart.fourLessons.map((lesson) => `${lesson.label}${lesson.lower}/${lesson.upper}`).join("；");
    const transmissions = session.chart.transmissions.map((item) => `${item.label}${item.branch}`).join("→");
    return l({ zh: `大六壬简化课：${session.chart.dayGanzhi}日，${session.chart.monthGeneral}将，${session.chart.hour}时。四课：${lessons}。三传：${transmissions}`, en: `Three Transmissions prototype: ${session.chart.dayGanzhi} day, ${session.chart.monthGeneral} general, ${session.chart.hour} hour. Lessons: ${lessons}. Transmissions: ${transmissions}` });
  }
  return session.detail;
}

function confidenceLabel(confidence: Reading["confidence"]): string {
  return confidenceLabelText(confidence);
}

function lineTypeLabel(value: CoinThrow["value"]): string {
  const label = LINE_TYPES[value].label;
  if (label === "老阴") return l({ zh: "老阴", en: "Old yin" });
  if (label === "少阳") return l({ zh: "少阳", en: "Young yang" });
  if (label === "少阴") return l({ zh: "少阴", en: "Young yin" });
  return l({ zh: "老阳", en: "Old yang" });
}

function coinFacesText(coinThrow: CoinThrow): string {
  return coinThrow.faces.map((isHeads) => (isHeads ? l({ zh: "正", en: "heads" }) : l({ zh: "反", en: "tails" }))).join(l({ zh: "", en: ", " }));
}

function normalizeLines(lines: number[]): LineValue[] {
  return lines.map((line) => (line === 1 ? 1 : 0));
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  screen: {
    backgroundColor: mystic.bg,
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
  },
  missingScreen: {
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  missingTitle: {
    color: mystic.ink,
    fontFamily: "Songti SC",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 12,
  },
  missingBody: {
    color: mystic.muted,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 22,
  },
  topbar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,244,214,0.08)",
    borderColor: "rgba(255,244,214,0.16)",
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  backText: {
    color: mystic.gold,
    fontSize: 34,
    lineHeight: 36,
    marginTop: -3,
  },
  topTitleGroup: {
    flex: 1,
  },
  kicker: {
    color: mystic.goldSoft,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    color: mystic.ink,
    fontFamily: "Songti SC",
    fontSize: 25,
    fontWeight: "900",
    marginTop: 3,
  },
  newButton: {
    backgroundColor: "rgba(93, 169, 143, 0.15)",
    borderColor: "rgba(122, 212, 181, 0.32)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  newButtonText: {
    color: mystic.jade,
    fontSize: 13,
    fontWeight: "900",
  },
  questionCard: {
    backgroundColor: "rgba(255,244,214,0.07)",
    borderColor: "rgba(217,170,77,0.18)",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  questionKicker: {
    color: mystic.goldSoft,
    fontSize: 12,
    fontWeight: "900",
  },
  question: {
    color: mystic.ink,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 27,
    marginTop: 8,
  },
  detailLine: {
    color: mystic.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  panel: {
    backgroundColor: "rgba(12, 15, 17, 0.82)",
    borderColor: "rgba(255,244,214,0.13)",
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    padding: 16,
  },
  resultPanel: {
    borderColor: "rgba(217,170,77,0.24)",
  },
  sectionHead: {
    marginBottom: 14,
  },
  sectionKicker: {
    color: mystic.goldSoft,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  sectionTitle: {
    color: mystic.ink,
    fontFamily: "Songti SC",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 4,
  },
  timeline: {
    gap: 12,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
  },
  timelineDot: {
    alignItems: "center",
    backgroundColor: "rgba(217,170,77,0.15)",
    borderColor: "rgba(242,213,138,0.5)",
    borderRadius: 999,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  timelineDotText: {
    color: mystic.gold,
    fontSize: 12,
    fontWeight: "900",
  },
  timelineBody: {
    flex: 1,
  },
  timelineTitle: {
    color: mystic.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  timelineText: {
    color: mystic.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  hexagramPair: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    justifyContent: "center",
    marginVertical: 12,
  },
  hexaArrow: {
    color: mystic.gold,
    fontSize: 20,
    fontWeight: "900",
  },
  hexCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,244,214,0.06)",
    borderColor: "rgba(217,170,77,0.18)",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    maxWidth: 132,
    padding: 12,
  },
  hexCardTitle: {
    color: mystic.goldSoft,
    fontSize: 12,
    fontWeight: "900",
  },
  glyph: {
    gap: 5,
    marginVertical: 10,
  },
  lineBars: {
    height: 7,
    justifyContent: "center",
    width: 54,
  },
  yangLine: {
    backgroundColor: mystic.ink,
    borderRadius: 999,
    height: 5,
    width: "100%",
  },
  yinLine: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  yinHalf: {
    backgroundColor: mystic.ink,
    borderRadius: 999,
    height: 5,
    width: 22,
  },
  movingLine: {
    backgroundColor: mystic.gold,
  },
  hexName: {
    color: mystic.ink,
    fontFamily: "Songti SC",
    fontSize: 22,
    fontWeight: "900",
  },
  chartNote: {
    color: mystic.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  qimenGrid: {
    borderColor: "rgba(185,126,49,0.5)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    overflow: "hidden",
  },
  qimenCell: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: "rgba(47, 68, 56, 0.42)",
    borderColor: "rgba(217,170,77,0.26)",
    borderWidth: 0.5,
    justifyContent: "center",
    padding: 6,
    width: "33.333%",
  },
  qimenPos: {
    color: mystic.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  qimenStem: {
    color: mystic.ink,
    fontFamily: "Songti SC",
    fontSize: 23,
    fontWeight: "900",
    marginVertical: 3,
  },
  qimenGate: {
    color: mystic.gold,
    fontSize: 13,
    fontWeight: "900",
  },
  prototypeNote: {
    color: "rgba(255,247,223,0.46)",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    textAlign: "center",
  },
  daliurenMeta: {
    color: mystic.goldSoft,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 12,
    textAlign: "center",
  },
  lessonGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  lessonCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,244,214,0.06)",
    borderColor: "rgba(217,170,77,0.16)",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    padding: 9,
  },
  lessonLabel: {
    color: mystic.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  lessonUpper: {
    color: mystic.ink,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 4,
  },
  lessonLower: {
    color: mystic.gold,
    fontSize: 13,
    fontWeight: "900",
  },
  transmissionRow: {
    flexDirection: "row",
    gap: 9,
  },
  transmissionPill: {
    alignItems: "center",
    backgroundColor: "rgba(93,169,143,0.12)",
    borderColor: "rgba(122,212,181,0.24)",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 9,
  },
  transmissionLabel: {
    color: mystic.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  transmissionBranch: {
    color: mystic.jade,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  emptyText: {
    color: mystic.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  resultSource: {
    color: mystic.goldSoft,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 10,
  },
  resultTitle: {
    color: mystic.ink,
    fontFamily: "Songti SC",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 31,
    marginTop: 8,
  },
  summaryText: {
    color: mystic.ink,
    fontSize: 16,
    lineHeight: 26,
    marginTop: 10,
  },
  actionPreview: {
    backgroundColor: "rgba(93,169,143,0.12)",
    borderColor: "rgba(122,212,181,0.22)",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    padding: 13,
  },
  actionPreviewKicker: {
    color: mystic.jade,
    fontSize: 12,
    fontWeight: "900",
  },
  actionPreviewText: {
    color: mystic.ink,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
  },
  actions: {
    gap: 10,
    marginTop: 14,
  },
  actionItem: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  actionIndex: {
    backgroundColor: "rgba(217,170,77,0.14)",
    borderRadius: 999,
    color: mystic.gold,
    fontSize: 12,
    fontWeight: "900",
    height: 24,
    lineHeight: 24,
    overflow: "hidden",
    textAlign: "center",
    width: 24,
  },
  actionText: {
    color: mystic.ink,
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  riskNotice: {
    color: mystic.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14,
  },
  deepReport: {
    backgroundColor: "rgba(255,244,214,0.05)",
    borderColor: "rgba(255,244,214,0.12)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 16,
    padding: 14,
  },
  deepReportKicker: {
    color: mystic.goldSoft,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  deepSection: {
    gap: 5,
  },
  deepTitle: {
    color: mystic.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  deepBody: {
    color: mystic.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: mystic.cinnabar,
    borderRadius: 999,
    marginTop: 16,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#fffaf0",
    fontSize: 15,
    fontWeight: "900",
  },
  followInput: {
    backgroundColor: "rgba(255,244,214,0.07)",
    borderColor: "rgba(255,244,214,0.13)",
    borderRadius: 16,
    borderWidth: 1,
    color: mystic.ink,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 92,
    padding: 14,
  },
  followMeta: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 8,
  },
  followHint: {
    color: mystic.faint,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  followCount: {
    color: mystic.faint,
    fontSize: 12,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "rgba(217,170,77,0.16)",
    borderColor: "rgba(242,213,138,0.34)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 13,
    paddingVertical: 13,
  },
  disabledButton: {
    opacity: 0.45,
  },
  secondaryButtonText: {
    color: mystic.gold,
    fontSize: 14,
    fontWeight: "900",
  },
  followList: {
    gap: 10,
    marginTop: 14,
  },
  followItem: {
    backgroundColor: "rgba(255,244,214,0.055)",
    borderColor: "rgba(255,244,214,0.1)",
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
  },
  followQuestion: {
    color: mystic.ink,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  followAnswer: {
    color: mystic.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  followPending: {
    color: mystic.goldSoft,
  },
  followActions: {
    gap: 5,
    marginTop: 10,
  },
  followAction: {
    color: mystic.ink,
    fontSize: 13,
    lineHeight: 20,
  },
  followRisk: {
    color: mystic.faint,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
  },
  followError: {
    color: mystic.goldSoft,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
  },
  followItemError: {
    borderColor: "rgba(217,170,77,0.26)",
  },
});
