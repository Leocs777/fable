import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ModuleSwitch } from "@/components/ModuleSwitch";
import { CloudConsentModal, acceptCloudConsent, hasCloudConsent } from "@/components/CloudConsent";
import { DailyGuaHomeCard } from "@/components/daily/DailyGuaHomeCard";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MethodResultHeaderAnimation, MethodRitualStage } from "@/components/divination/MethodRitualStage";
import { MysticBackdrop } from "@/components/MysticBackdrop";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RitualStage } from "@/components/ritual/RitualStage";
import { COIN_THROW_MS, LIUYAO_THROW_COUNT } from "@/components/ritual/theme";
import { durationBucket, questionLengthBucket, trackAnalytics } from "@/lib/analytics";
import { divine, interpretWengua, type DivinationMethod, type DivineChart, type Reading } from "@/lib/api";
import { DIVINATION_MIN_GENERATING_MS, type DivinationMotionState } from "@/lib/divinationAnimation";
import { confidenceLabelText, l, methodTitle as localizedMethodTitle, useAppLanguage } from "@/lib/i18n";
import {
  buildLiuyaoCast,
  faceText,
  LINE_TYPES,
  throwCoins,
  type CoinThrow,
  type LineValue,
  type LiuyaoCast,
} from "@/lib/liuyao";
import { hasDeepReportAccess, listDeepReportProducts, purchaseDeepReport, type PurchasePlan, type PurchaseProduct } from "@/lib/purchases";
import { createReadingResultSession } from "@/lib/readingSession";
import { mystic, useMysticTheme, useThemeMode } from "@/theme/mystic";

type MethodKey = "liuyao" | DivinationMethod;
type WorkStatus = "idle" | "casting" | "loading" | "done" | "error";
type HistoryItem = {
  id: string;
  createdAt: number;
  method: MethodKey;
  methodTitle: string;
  question: string;
  detail: string;
  reading: Reading;
  cast: LiuyaoCast | null;
  chart: DivineChart | null;
};
type PendingDivineResult = {
  method: DivinationMethod;
  question: string;
  reading: Reading;
  chart: DivineChart;
};

type MethodConfig = {
  key: MethodKey;
  title: string;
  tabLabel: string;
  intro: string;
  action: string;
  note?: string;
};

const QUESTION_LIMIT = 120;
const DEEP_REPORT_PRODUCTS = listDeepReportProducts();

const trayImage = require("../../assets/images/tianji-tray-empty.png");
const coinImage = require("../../assets/images/coin-cutout.png");

function defaultQuestion(): string {
  return l({ zh: "这件事现在该怎么推进？", en: "How should I move this forward now?" });
}

function methodConfigs(): MethodConfig[] {
  return [
    {
      key: "liuyao",
      title: localizedMethodTitle("liuyao"),
      tabLabel: l({ zh: "六爻", en: "Coins" }),
      intro: l({ zh: "掷三枚铜钱，得一卦象", en: "Cast three coins six times to form an I Ching hexagram" }),
      action: l({ zh: "掷铜钱  开始起卦", en: "Cast the Coins" }),
    },
    {
      key: "meihua",
      title: localizedMethodTitle("meihua"),
      tabLabel: l({ zh: "梅花", en: "Plum" }),
      intro: l({ zh: "以此刻时间起卦", en: "A lighter oracle based on this moment" }),
      action: l({ zh: "以此刻起卦", en: "Read This Moment" }),
    },
    {
      key: "qimen",
      title: localizedMethodTitle("qimen"),
      tabLabel: l({ zh: "奇门", en: "Qi Men" }),
      intro: l({ zh: "原型简化局，待审校", en: "A timing-and-direction chart for strategy questions" }),
      action: l({ zh: "以此刻起局", en: "Open the Compass" }),
      note: l({ zh: "原型简化局，待术数顾问审校。", en: "Simplified Qi Men prototype pending expert review." }),
    },
    {
      key: "daliuren",
      title: localizedMethodTitle("daliuren"),
      tabLabel: l({ zh: "六壬", en: "Threads" }),
      intro: l({ zh: "原型简化课，待审校", en: "A causal-chain reading for how events may unfold" }),
      action: l({ zh: "以此刻起课", en: "Trace the Thread" }),
      note: l({ zh: "原型简化课，待术数顾问审校。", en: "Simplified Three Transmissions prototype pending expert review." }),
    },
  ];
}

function questionChips() {
  return [
    { label: l({ zh: "工作", en: "Work" }), question: l({ zh: "我该不该换工作？", en: "Should I change jobs?" }) },
    { label: l({ zh: "感情", en: "Love" }), question: l({ zh: "这段关系下一步该怎么走？", en: "What is the next step in this relationship?" }) },
    { label: l({ zh: "搬家", en: "Move" }), question: l({ zh: "现在适合搬家吗？", en: "Is now a good time to move?" }) },
    { label: l({ zh: "时机", en: "Timing" }), question: l({ zh: "这件事什么时候推进更稳？", en: "When is the steadier time to move this forward?" }) },
    { label: l({ zh: "要不要做", en: "Do it?" }), question: l({ zh: "这件事现在要不要做？", en: "Should I do this now?" }) },
    { label: l({ zh: "何时行动", en: "Act when" }), question: l({ zh: "我什么时候行动更合适？", en: "When should I act?" }) },
    { label: l({ zh: "二选一", en: "Choice" }), question: l({ zh: "两个选择里哪一个更稳？", en: "Which of these two choices is steadier?" }) },
    { label: l({ zh: "看风险", en: "Risk" }), question: l({ zh: "这件事最大的风险在哪里？", en: "What is the biggest risk here?" }) },
  ];
}

export default function WenguaScreen() {
  useAppLanguage();
  const theme = useMysticTheme();
  const light = useThemeMode() === "light";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const requestIdRef = useRef(0);
  const [method, setMethod] = useState<MethodKey>("liuyao");
  const [question, setQuestion] = useState("");
  const [questionSheetVisible, setQuestionSheetVisible] = useState(false);
  const [status, setStatus] = useState<WorkStatus>("idle");
  const [divineMotionState, setDivineMotionState] = useState<DivinationMotionState>("idle");
  const [ritualVisible, setRitualVisible] = useState(false);
  const [ritualSessionId, setRitualSessionId] = useState(0);
  const [ritualCoinRunId, setRitualCoinRunId] = useState(0);
  const [ritualThrowIndex, setRitualThrowIndex] = useState(0);
  const [partialThrows, setPartialThrows] = useState<CoinThrow[]>([]);
  const [cast, setCast] = useState<LiuyaoCast | null>(null);
  const [chart, setChart] = useState<DivineChart | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [pendingDivineResult, setPendingDivineResult] = useState<PendingDivineResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallPlan, setPaywallPlan] = useState<PurchasePlan>("subscription");
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [purchaseErr, setPurchaseErr] = useState<string | null>(null);
  const [deepReportUnlocked, setDeepReportUnlocked] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [cloudConsentVisible, setCloudConsentVisible] = useState(false);

  const methods = methodConfigs();
  const chips = questionChips();
  const defaultQuestionText = defaultQuestion();
  const selectedMethod = methods.find((item) => item.key === method) ?? methods[0];
  const busy = status === "casting" || status === "loading";
  const trimmedQuestion = question.slice(0, QUESTION_LIMIT);

  useEffect(() => {
    trackAnalytics("home_view");
  }, []);

  const selectMethod = (nextMethod: MethodKey) => {
    trackAnalytics("method_select", { method: nextMethod });
    requestIdRef.current += 1;
    const selectionId = requestIdRef.current;
    setMethod(nextMethod);
    resetResult();
    if (nextMethod === "liuyao") return;
    setDivineMotionState("pressed");
    setTimeout(() => {
      if (selectionId !== requestIdRef.current) return;
      setDivineMotionState("entering");
    }, 140);
    setTimeout(() => {
      if (selectionId !== requestIdRef.current) return;
      setDivineMotionState("idle");
    }, 820);
  };

  const updateQuestion = (nextQuestion: string) => {
    setQuestion(nextQuestion.slice(0, QUESTION_LIMIT));
  };

  const chooseChip = (nextQuestion: string) => {
    trackAnalytics("question_chip_select", { questionLengthBucket: questionLengthBucket(nextQuestion) });
    updateQuestion(nextQuestion);
  };

  const run = async () => {
    if (!hasCloudConsent()) {
      trackAnalytics("cloud_consent_show", { method });
      setCloudConsentVisible(true);
      return;
    }
    await startRun();
  };

  const startRun = async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    resetResult();

    if (method === "liuyao") {
      await runLiuyao(requestId);
      return;
    }

    await runDivine(method, requestId);
  };

  const acceptConsentAndRun = () => {
    acceptCloudConsent();
    trackAnalytics("cloud_consent_accept", { method });
    setCloudConsentVisible(false);
    void startRun();
  };

  const runLiuyao = async (requestId: number) => {
    const startedAt = Date.now();
    const throws: CoinThrow[] = [];
    const nextQuestion = normalizedQuestion(trimmedQuestion, defaultQuestionText);
    trackAnalytics("divination_start", { method: "liuyao", questionLengthBucket: questionLengthBucket(nextQuestion) });
    setRitualVisible(true);
    setRitualThrowIndex(0);
    setStatus("casting");
    setRitualSessionId((value) => value + 1);

    for (let index = 0; index < LIUYAO_THROW_COUNT; index += 1) {
      if (requestId !== requestIdRef.current) return;
      setRitualThrowIndex(index + 1);
      setRitualCoinRunId((value) => value + 1);
      await sleep(COIN_THROW_MS);
      if (requestId !== requestIdRef.current) return;
      throws.push(throwCoins());
      setPartialThrows([...throws]);
    }

    const nextCast = buildLiuyaoCast(throws);
    if (requestId !== requestIdRef.current) return;
    setCast(nextCast);
    setStatus("loading");

    try {
      const nextReading = await interpretWengua({
        question: nextQuestion,
        primaryName: nextCast.primaryName,
        changedName: nextCast.changedName,
        movingLabels: nextCast.movingLabels,
        hasMoving: nextCast.movingPositions.length > 0,
      });
      if (requestId !== requestIdRef.current) return;
      setReading(nextReading);
      setDeepReportUnlocked(hasDeepReportAccess(deepReportId(nextQuestion, nextReading, nextCast, null)));
      addHistoryRecord({
        method: "liuyao",
        question: nextQuestion,
        reading: nextReading,
        cast: nextCast,
        chart: null,
      });
      setStatus("done");
      trackAnalytics("divination_success", {
        method: "liuyao",
        durationBucket: durationBucket(Date.now() - startedAt),
        movingLineCount: nextCast.movingPositions.length,
        confidence: nextReading.confidence,
        safetyBlock: nextReading.safety_block,
      });
      const resultSession = createReadingResultSession({
        method: "liuyao",
        methodTitle: localizedMethodTitle("liuyao"),
        question: nextQuestion,
        reading: nextReading,
        cast: nextCast,
        chart: null,
      });
      router.push({ pathname: "/reading-result", params: { id: resultSession.id } });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setErr(errorMessage(error));
      setStatus("error");
      trackAnalytics("divination_error", { method: "liuyao", durationBucket: durationBucket(Date.now() - startedAt), errorType: errorName(error) });
    }
  };

  const runDivine = async (divineMethod: DivinationMethod, requestId: number) => {
    const startedAt = Date.now();
    trackAnalytics("divination_start", { method: divineMethod, questionLengthBucket: questionLengthBucket(normalizedQuestion(trimmedQuestion, defaultQuestionText)) });
    setDivineMotionState("generating_start");
    setStatus("loading");
    try {
      const result = await divine({
        method: divineMethod,
        question: normalizedQuestion(trimmedQuestion, defaultQuestionText),
        time: new Date().toISOString(),
      });
      if (requestId !== requestIdRef.current) return;
      if (!result.chart) {
        throw new Error(l({ zh: "起盘结果缺少盘面，请重新尝试。", en: "The chart was missing. Please try again." }));
      }
      await waitForMinimumDuration(startedAt, divineMinimumRitualMs(divineMethod));
      if (requestId !== requestIdRef.current) return;
      setChart(result.chart);
      const nextQuestion = normalizedQuestion(trimmedQuestion, defaultQuestionText);
      setPendingDivineResult({ method: divineMethod, question: nextQuestion, reading: result.reading, chart: result.chart });
      trackAnalytics("divination_success", {
        method: divineMethod,
        durationBucket: durationBucket(Date.now() - startedAt),
        confidence: result.reading.confidence,
        safetyBlock: result.reading.safety_block,
      });
      setDivineMotionState("generating_complete");
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      await waitForMinimumDuration(startedAt, DIVINATION_MIN_GENERATING_MS);
      if (requestId !== requestIdRef.current) return;
      setErr(errorMessage(error));
      setDivineMotionState("error");
      setStatus("error");
      trackAnalytics("divination_error", { method: divineMethod, durationBucket: durationBucket(Date.now() - startedAt), errorType: errorName(error) });
    }
  };

  const resetResult = () => {
    setStatus("idle");
    setPartialThrows([]);
    setCast(null);
    setChart(null);
    setReading(null);
    setPendingDivineResult(null);
    setErr(null);
    setDivineMotionState("idle");
    setDeepReportUnlocked(false);
    setPaywallVisible(false);
    setPurchaseBusy(false);
    setPurchaseErr(null);
  };

  const advanceDivineGeneratingLoop = () => {
    setDivineMotionState((currentState) => (currentState === "generating_start" ? "generating_loop" : currentState));
  };

  const closeRitual = () => {
    setRitualVisible(false);
  };

  const addHistoryRecord = ({
    method: recordMethod,
    question: recordQuestion,
    reading: recordReading,
    cast: recordCast,
    chart: recordChart,
  }: {
    method: MethodKey;
    question: string;
    reading: Reading;
    cast: LiuyaoCast | null;
    chart: DivineChart | null;
  }) => {
    const methodTitle = methods.find((item) => item.key === recordMethod)?.title ?? l({ zh: "问卦", en: "Reading" });
    const nextItem: HistoryItem = {
      id: `${Date.now()}-${recordMethod}`,
      createdAt: Date.now(),
      method: recordMethod,
      methodTitle,
      question: recordQuestion,
      detail: historyDetail(recordMethod, recordCast, recordChart),
      reading: recordReading,
      cast: recordCast,
      chart: recordChart,
    };
    setHistoryItems((items) => [nextItem, ...items].slice(0, 12));
  };

  const restoreHistoryItem = (item: HistoryItem) => {
    trackAnalytics("result_view", { method: item.method, source: "history" });
    requestIdRef.current += 1;
    setMethod(item.method);
    setQuestion(item.question);
    setStatus("done");
    setPartialThrows(item.cast?.throws ?? []);
    setCast(item.cast);
    setChart(item.chart);
    setReading(item.reading);
    setPendingDivineResult(null);
    setErr(null);
    setDivineMotionState("idle");
    setDeepReportUnlocked(hasDeepReportAccess(deepReportId(item.question, item.reading, item.cast, item.chart)));
    setPaywallVisible(false);
    setPurchaseBusy(false);
    setPurchaseErr(null);
    setHistoryVisible(false);
    const resultSession = createReadingResultSession({
      method: item.method,
      methodTitle: item.methodTitle,
      question: item.question,
      reading: item.reading,
      cast: item.cast,
      chart: item.chart,
    });
    router.push({ pathname: "/reading-result", params: { id: resultSession.id } });
  };

  const unlockDeepReport = async () => {
    if (!reading) return;
    const reportId = deepReportId(normalizedQuestion(trimmedQuestion, defaultQuestionText), reading, cast, chart);
    setPurchaseBusy(true);
    setPurchaseErr(null);
    try {
      await purchaseDeepReport(paywallPlan, reportId);
      setDeepReportUnlocked(true);
      setPaywallVisible(false);
    } catch (error) {
      setPurchaseErr(errorMessage(error));
    } finally {
      setPurchaseBusy(false);
    }
  };

  const viewDivineResult = () => {
    if (!pendingDivineResult) return;
    trackAnalytics("result_view", { method: pendingDivineResult.method, source: "fresh" });
    const methodTitle = methods.find((item) => item.key === pendingDivineResult.method)?.title ?? l({ zh: "问卦", en: "Reading" });
    setReading(pendingDivineResult.reading);
    setChart(pendingDivineResult.chart);
    setDeepReportUnlocked(hasDeepReportAccess(deepReportId(pendingDivineResult.question, pendingDivineResult.reading, null, pendingDivineResult.chart)));
    addHistoryRecord({
      method: pendingDivineResult.method,
      question: pendingDivineResult.question,
      reading: pendingDivineResult.reading,
      cast: null,
      chart: pendingDivineResult.chart,
    });
    const resultSession = createReadingResultSession({
      method: pendingDivineResult.method,
      methodTitle,
      question: pendingDivineResult.question,
      reading: pendingDivineResult.reading,
      cast: null,
      chart: pendingDivineResult.chart,
    });
    setPendingDivineResult(null);
    setDivineMotionState("idle");
    setStatus("done");
    router.push({ pathname: "/reading-result", params: { id: resultSession.id } });
  };

  const dismissDivineError = () => {
    if (status === "error") {
      setDivineMotionState("idle");
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 26 }]}
    >
      <MysticBackdrop />
      <View style={styles.topbar}>
        <View style={styles.titleGroup}>
          <Text style={[styles.title, { color: theme.goldSoft }]}>{l({ zh: "问卦决策", en: "Ask the Oracle" })}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>{l({ zh: "想不清楚时，问一卦，给你方向", en: "When things feel unclear, get a thoughtful signal" })}</Text>
        </View>
        <View style={styles.topActions}>
          <ThemeToggle />
          <LanguageToggle />
        </View>
      </View>

      <View style={[styles.flowRow, { borderBottomColor: theme.line }]}>
        <Text style={[styles.flowText, { color: theme.muted }]}>{l({ zh: "约 1 分钟完成", en: "About 1 minute" })}</Text>
        <Text style={[styles.flowText, { color: theme.muted }]}>{l({ zh: "隐私保护 · 文化参考", en: "Privacy protected · Cultural reference" })}</Text>
      </View>

      <View style={styles.historyQuickRow}>
        <Pressable accessibilityRole="button" onPress={() => setHistoryVisible(true)} style={[styles.historyButton, { backgroundColor: light ? "rgba(255,255,255,0.58)" : mystic.panelSoft, borderColor: theme.line }]}>
          <Text style={[styles.historyIcon, { color: theme.ink }]}>◷</Text>
          <Text style={[styles.historyText, { color: theme.ink }]}>{l({ zh: "历史记录", en: "History" })}</Text>
        </Pressable>
      </View>

      <ModuleSwitch active="wengua" />

      <DailyGuaHomeCard
        onPress={() => {
          trackAnalytics("daily_card_press");
          router.push("/daily-gua");
        }}
      />

      <View style={[styles.oracleHero, { backgroundColor: light ? "rgba(255, 251, 242, 0.72)" : "rgba(7, 9, 11, 0.62)", borderColor: theme.lineStrong }]}>
        <View style={styles.oracleHeroTop}>
          <View>
            <Text style={[styles.oracleKicker, { color: theme.gold }]}>{l({ zh: "天机仪式", en: "Ritual" })}</Text>
            <Text style={[styles.oracleTitle, { color: theme.ink }]}>{l({ zh: `${selectedMethod.title}起卦`, en: `${selectedMethod.title} reading` })}</Text>
          </View>
          <View style={[styles.oracleBadge, { backgroundColor: light ? "rgba(167,111,36,0.12)" : "rgba(217, 170, 77, 0.12)", borderColor: theme.lineStrong }]}>
            <Text style={[styles.oracleBadgeText, { color: theme.goldSoft }]}>{method === "liuyao" ? l({ zh: "六次铜钱", en: "Six coin casts" }) : l({ zh: "此刻起盘", en: "Moment chart" })}</Text>
          </View>
        </View>
        <Text style={[styles.oracleCopy, { color: theme.muted }]}>
          {l({ zh: "先定问题，再让罗盘落盘。规则引擎成卦，AI 只做白话解释。", en: "Set your question first. The rule engine casts the chart; AI only explains it in plain language." })}
        </Text>

        <View style={[styles.methodTabs, { backgroundColor: light ? "rgba(255,255,255,0.5)" : "rgba(255, 244, 214, 0.06)", borderColor: theme.line }]}>
          {methods.map((item) => {
            const active = item.key === method;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={l({ zh: `选择${item.title}`, en: `Select ${item.title}` })}
                disabled={busy}
                onPress={() => selectMethod(item.key)}
                style={[
                  styles.methodTab,
                  { backgroundColor: light ? "rgba(255,255,255,0.45)" : "rgba(255, 244, 214, 0.04)", borderColor: theme.line },
                  active && { backgroundColor: light ? "rgba(167,111,36,0.14)" : "rgba(217, 170, 77, 0.16)", borderColor: theme.lineStrong },
                  busy && styles.disabled,
                ]}
              >
                <Text style={[styles.methodTabText, { color: active ? theme.goldSoft : theme.muted }]} numberOfLines={1} adjustsFontSizeToFit>{item.tabLabel}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.trayStage}>
          {method === "liuyao" ? (
            <RitualStage
              visible={ritualVisible}
              sessionId={ritualSessionId}
              coinRunId={ritualCoinRunId}
              throwIndex={ritualThrowIndex}
              totalThrows={LIUYAO_THROW_COUNT}
              busy={busy}
              compassSource={trayImage}
              coinSource={coinImage}
              partialThrows={partialThrows}
              cast={cast}
              reading={reading}
              onPress={run}
              onClose={closeRitual}
              actionLabel={selectedMethod.action}
              hint={selectedMethod.intro}
            />
          ) : (
            <MethodRitualStage
              method={method}
              motionState={divineMotionState}
              chart={chart}
              busy={busy}
              onPress={run}
              onGeneratingStartEnd={advanceDivineGeneratingLoop}
              onGeneratingCompleteEnd={viewDivineResult}
              onDismissError={dismissDivineError}
              actionLabel={selectedMethod.action}
              hint={selectedMethod.intro}
            />
          )}
        </View>
      </View>

      <QuestionDock
        question={trimmedQuestion}
        defaultQuestionText={defaultQuestionText}
        busy={busy}
        onOpen={() => {
          trackAnalytics("question_sheet_open", { method });
          setQuestionSheetVisible(true);
        }}
      />

      {method === "liuyao" ? <LiuyaoProgress partialThrows={partialThrows} cast={cast} status={status} /> : <DivinePreview method={selectedMethod} chart={chart} />}

      <Pressable accessibilityRole="button" accessibilityLabel={selectedMethod.action} disabled={busy} onPress={run} style={[styles.primaryAction, busy && styles.primaryActionDisabled]}>
        <View style={styles.actionSeal}>
          <View style={styles.actionSealHole} />
          <Image source={coinImage} style={styles.actionCoin as ImageStyle} resizeMode="contain" />
        </View>
        <View>
          <Text style={styles.primaryActionText}>
            {status === "casting" ? l({ zh: "铜钱落定中...", en: "Coins are settling..." }) : status === "loading" ? l({ zh: "正在生成解读...", en: "Generating reading..." }) : selectedMethod.action}
          </Text>
          <Text style={styles.primaryActionSub}>{selectedMethod.note ?? l({ zh: "点击或摇动手机，掷出三枚铜钱", en: "Tap or shake the phone to cast three coins" })}</Text>
        </View>
      </Pressable>

      {status === "loading" && (
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#a51f1a" />
          <Text style={styles.loadingText}>{l({ zh: "盘面已成，Worker 正在生成白话解读。", en: "The chart is ready. Generating a plain-language reading." })}</Text>
        </View>
      )}

      {err && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>{l({ zh: "解读暂时失败", en: "Reading failed for now" })}</Text>
          <Text style={styles.errorText}>{err}</Text>
        </View>
      )}

      {reading && (
        <ReadingCard
          question={normalizedQuestion(trimmedQuestion, defaultQuestionText)}
          reading={reading}
          cast={cast}
          chart={chart}
          deepReportUnlocked={deepReportUnlocked}
          onOpenPaywall={() => {
            setPurchaseErr(null);
            setPaywallVisible(true);
          }}
          onReset={resetResult}
        />
      )}

      <PaywallModal
        visible={paywallVisible}
        plan={paywallPlan}
        products={DEEP_REPORT_PRODUCTS}
        busy={purchaseBusy}
        error={purchaseErr}
        onPlanChange={setPaywallPlan}
        onClose={() => {
          if (purchaseBusy) return;
          setPaywallVisible(false);
        }}
        onConfirm={() => {
          void unlockDeepReport();
        }}
      />

      <HistoryModal
        visible={historyVisible}
        items={historyItems}
        onClose={() => setHistoryVisible(false)}
        onSelect={restoreHistoryItem}
        onClear={() => setHistoryItems([])}
      />

      <QuestionSheet
        visible={questionSheetVisible}
        question={trimmedQuestion}
        busy={busy}
        bottomInset={insets.bottom}
        onChangeQuestion={updateQuestion}
        onChooseChip={chooseChip}
        chips={chips}
        onClose={() => setQuestionSheetVisible(false)}
      />

      <CloudConsentModal
        visible={cloudConsentVisible}
        moduleName={l({ zh: "问卦决策", en: "Reading" })}
        detail={l({ zh: "问题文本与起卦结构会发送到已部署的 Fable Worker，用于生成白话解读。", en: "Your question text and structured chart will be sent to the deployed Fable Worker to generate a plain-language reading." })}
        onCancel={() => setCloudConsentVisible(false)}
        onAccept={acceptConsentAndRun}
      />

      <SafetyRows />
      <Text style={styles.footerNote}>{l({ zh: "内容为传统文化参考，不构成对现实决策的唯一依据", en: "Cultural reference only. Do not use it as the sole basis for real decisions." })}</Text>
    </ScrollView>
  );
}

function LiuyaoProgress({ partialThrows, cast, status }: { partialThrows: CoinThrow[]; cast: LiuyaoCast | null; status: WorkStatus }) {
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>{l({ zh: "起卦进度", en: "Casting progress" })}</Text>
        <Text style={styles.progressCaption}>{progressCaption(partialThrows, status)}</Text>
      </View>
      <View style={styles.stepRow}>
        {Array.from({ length: 6 }, (_, index) => {
          const coinThrow = partialThrows[index];
          const active = Boolean(coinThrow);
          return (
            <View key={index} style={styles.stepItem}>
              <Text style={[styles.stepDot, active && styles.stepDotActive]}>{index + 1}</Text>
              <Text style={styles.stepLabel}>{l({ zh: `第${index + 1}次`, en: `Cast ${index + 1}` })}</Text>
              <Text style={styles.stepSub}>{coinThrow ? lineTypeLabel(coinThrow.value) : l({ zh: "待掷", en: "Pending" })}</Text>
            </View>
          );
        })}
      </View>

      {cast && (
        <>
          <View style={styles.hexagramPair}>
            <HexCard title={l({ zh: "本卦", en: "Primary" })} name={cast.primaryName} lines={cast.primaryLines} movingPositions={cast.movingPositions} />
            <Text style={styles.hexaArrow}>→</Text>
            <HexCard title={l({ zh: "变卦", en: "Changed" })} name={cast.changedName} lines={cast.changedLines} movingPositions={[]} />
          </View>
          <Text style={styles.movingNote}>
            {cast.movingLabels.length > 0 ? l({ zh: `动爻：${cast.movingLabels.join("、")}。`, en: `Changing lines: ${cast.movingLabels.join(", ")}.` }) : l({ zh: "无动爻：卦象安定。", en: "No changing lines: the pattern is stable." })}
            {cast.throws.map((item, index) => l({ zh: ` 第${index + 1}次${faceText(item)}`, en: ` Cast ${index + 1}: ${coinFacesText(item)}` })).join(" · ")}
          </Text>
        </>
      )}
    </View>
  );
}

function DivinePreview({ method, chart }: { method: MethodConfig; chart: DivineChart | null }) {
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>{l({ zh: `${method.title}盘面`, en: `${method.title} chart` })}</Text>
        <Text style={styles.progressCaption}>{method.note ?? l({ zh: "以当前时间起盘", en: "Cast from the current time" })}</Text>
      </View>
      <DivineChartView chart={chart} />
    </View>
  );
}

function DivineChartView({ chart }: { chart: DivineChart | null }) {
  if (!chart) {
    return <Text style={styles.emptyState}>{l({ zh: "起盘后会在这里显示盘面结构。", en: "The chart structure will appear here after casting." })}</Text>;
  }

  if (chart.method === "meihua") {
    return (
      <View style={styles.chartBlock}>
        <View style={styles.hexagramPair}>
          <HexCard title={l({ zh: "本卦", en: "Primary" })} name={chart.hexagram} lines={normalizeLines(chart.lines)} movingPositions={[chart.moving - 1]} />
          <Text style={styles.hexaArrow}>→</Text>
          <HexCard title={l({ zh: "变卦", en: "Changed" })} name={chart.changed} lines={normalizeLines(chart.changedLines)} movingPositions={[]} />
        </View>
        <Text style={styles.movingNote}>
          {l({ zh: `体卦 ${chart.bodyTrigram} · 用卦 ${chart.useTrigram} · 动第 ${chart.moving} 爻 · ${chart.timeLabel}`, en: `Body ${chart.bodyTrigram} · Use ${chart.useTrigram} · Changing line ${chart.moving} · ${chart.timeLabel}` })}
        </Text>
      </View>
    );
  }

  if (chart.method === "qimen") {
    const order = [3, 8, 1, 2, 4, 6, 7, 0, 5];
    return (
      <View style={styles.chartBlock}>
        <View style={styles.qimenGrid}>
          {order.map((index) => {
            const palace = chart.palaces[index];
            if (!palace) return null;
            return (
              <View key={`${palace.no}-${palace.name}`} style={styles.qimenCell}>
                <Text style={styles.qimenPos}>{palace.name}·{palace.dir}</Text>
                <Text style={styles.qimenStem}>{palace.stem}</Text>
                <Text style={styles.qimenGate}>{palace.gate || "—"}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.movingNote}>{chart.dun} {chart.ju} 局 · 值符落 {chart.fuPalace} 宫 · {chart.timeLabel}</Text>
        <Text style={styles.prototypeNote}>{chart.note}</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartBlock}>
      <Text style={styles.daliurenMeta}>{chart.dayGanzhi}日 · 月将 {chart.monthGeneral} · {chart.hour}时</Text>
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

function QuestionDock({
  question,
  defaultQuestionText,
  busy,
  onOpen,
}: {
  question: string;
  defaultQuestionText: string;
  busy: boolean;
  onOpen: () => void;
}) {
  const hasCustomQuestion = question.trim().length > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={l({ zh: "打开问事面板", en: "Open question panel" })}
      disabled={busy}
      onPress={onOpen}
      style={[styles.questionDock, busy && styles.disabled]}
    >
      <View style={styles.questionDockMark}>
        <Text style={styles.questionDockMarkText}>{l({ zh: "问", en: "?" })}</Text>
      </View>
      <View style={styles.questionDockBody}>
        <View style={styles.questionDockTop}>
          <Text style={styles.questionDockKicker}>{l({ zh: "问事简牍", en: "Question" })}</Text>
          <Text style={styles.questionDockEdit}>{busy ? l({ zh: "起卦中", en: "Casting" }) : hasCustomQuestion ? l({ zh: "修改", en: "Edit" }) : l({ zh: "填写", en: "Write" })}</Text>
        </View>
        <Text style={styles.questionDockText} numberOfLines={2}>
          {hasCustomQuestion ? question : defaultQuestionText}
        </Text>
      </View>
    </Pressable>
  );
}

function QuestionSheet({
  visible,
  question,
  busy,
  bottomInset,
  onChangeQuestion,
  onChooseChip,
  chips,
  onClose,
}: {
  visible: boolean;
  question: string;
  busy: boolean;
  bottomInset: number;
  onChangeQuestion: (question: string) => void;
  onChooseChip: (question: string) => void;
  chips: Array<{ label: string; question: string }>;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.questionSheetBackdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel={l({ zh: "关闭问事面板", en: "Close question panel" })} style={styles.questionSheetScrim} onPress={onClose} />
        <View style={[styles.questionSheet, { paddingBottom: Math.max(bottomInset, 14) + 18 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.questionSheetHead}>
            <View>
              <Text style={styles.questionSheetKicker}>{l({ zh: "定问", en: "Set intent" })}</Text>
              <Text style={styles.questionSheetTitle}>{l({ zh: "把问题压成一句话", en: "Turn it into one clear question" })}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.questionDone}>
              <Text style={styles.questionDoneText}>{l({ zh: "完成", en: "Done" })}</Text>
            </Pressable>
          </View>

          <TextInput
            value={question}
            editable={!busy}
            onChangeText={onChangeQuestion}
            placeholder={l({ zh: "例如：我该换工作吗？这段关系能长久吗？现在适合买房吗？", en: "Example: Should I change jobs? Can this relationship last?" })}
            placeholderTextColor="rgba(255,247,223,0.38)"
            multiline
            maxLength={QUESTION_LIMIT}
            textAlignVertical="top"
            style={[styles.input, styles.sheetInput, busy && styles.disabled]}
          />
          <View style={styles.inputMeta}>
            <Text style={styles.metaText}>{l({ zh: "专注一个问题，结果会更清晰", en: "One focused question gives a clearer reading" })}</Text>
            <Text style={styles.metaText}>{question.length}/{QUESTION_LIMIT}</Text>
          </View>

          <View style={styles.chipBlock}>
            <Text style={styles.chipTitle}>{l({ zh: "选择主题\n（可选）", en: "Choose a theme\n(optional)" })}</Text>
            <View style={styles.chips}>
              {chips.map((chip) => {
                const active = question === chip.question;
                return (
                  <Pressable
                    key={chip.label}
                    disabled={busy}
                    onPress={() => onChooseChip(chip.question)}
                    style={[styles.chip, active && styles.chipActive, busy && styles.disabled]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Text style={styles.questionSheetNote}>
            {l({ zh: "不填也可以起卦，系统会使用默认问题。AI 只解释规则引擎生成的卦象，不负责排盘。", en: "You can leave it blank and use the default question. AI only explains the chart generated by the rule engine." })}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ReadingCard({
  question,
  reading,
  cast,
  chart,
  deepReportUnlocked,
  onOpenPaywall,
  onReset,
}: {
  question: string;
  reading: Reading;
  cast: LiuyaoCast | null;
  chart: DivineChart | null;
  deepReportUnlocked: boolean;
  onOpenPaywall: () => void;
  onReset: () => void;
}) {
  const report = buildDeepReport(reading, cast, chart);
  return (
    <View style={[styles.resultPanel, reading.safety_block && styles.safetyResultPanel]}>
      <Text style={styles.resultQuestion}>{question}</Text>
      {chart ? <MethodResultHeaderAnimation method={chart.method} chart={chart} /> : null}
      {cast ? (
        <View style={styles.hexagramPair}>
          <HexCard title={l({ zh: "本卦", en: "Primary" })} name={cast.primaryName} lines={cast.primaryLines} movingPositions={cast.movingPositions} />
          <Text style={styles.hexaArrow}>→</Text>
          <HexCard title={l({ zh: "变卦", en: "Changed" })} name={cast.changedName} lines={cast.changedLines} movingPositions={[]} />
        </View>
      ) : (
        <DivineChartView chart={chart} />
      )}
      <Text style={styles.resultSource}>{reading.safety_block ? l({ zh: "安全提示", en: "Safety note" }) : l({ zh: `AI 解读 · ${confidenceLabel(reading.confidence)}`, en: `AI reading · ${confidenceLabel(reading.confidence)}` })}</Text>
      <Text style={styles.resultTitle}>{reading.title}</Text>
      <Text style={styles.reading}>{reading.interpretation}</Text>
      <View style={styles.actions}>
        {reading.actions.map((action, index) => (
          <View key={`${index}-${action}`} style={styles.actionItem}>
            <Text style={styles.actionIndex}>{index + 1}</Text>
            <Text style={styles.actionText}>{action}</Text>
          </View>
        ))}
      </View>
      {reading.risk_notice ? <Text style={styles.riskNotice}>{reading.risk_notice}</Text> : null}
      {deepReportUnlocked ? <DeepReport report={report} /> : null}
      <Pressable accessibilityRole="button" onPress={deepReportUnlocked ? onReset : onOpenPaywall} style={styles.unlock}>
        <Text style={styles.unlockText}>{deepReportUnlocked ? l({ zh: "围绕本卦再问一次", en: "Ask a follow-up" }) : l({ zh: "查看深度报告", en: "View deep report" })}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onReset} style={styles.secondaryAction}>
        <Text style={styles.secondaryActionText}>{l({ zh: "再问一次", en: "Ask again" })}</Text>
      </Pressable>
    </View>
  );
}

function DeepReport({ report }: { report: { title: string; body: string }[] }) {
  return (
    <View style={styles.deepReport}>
      <Text style={styles.deepReportKicker}>{l({ zh: "深度报告 · 已解锁", en: "Deep report · Unlocked" })}</Text>
      {report.map((item) => (
        <View key={item.title} style={styles.deepSection}>
          <Text style={styles.deepSectionTitle}>{item.title}</Text>
          <Text style={styles.deepSectionBody}>{item.body}</Text>
        </View>
      ))}
    </View>
  );
}

function PaywallModal({
  visible,
  plan,
  products,
  busy,
  error,
  onPlanChange,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  plan: PurchasePlan;
  products: PurchaseProduct[];
  busy: boolean;
  error: string | null;
  onPlanChange: (plan: PurchasePlan) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const activeProduct = products.find((product) => product.plan === plan) ?? products[0];
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.paywallBackdrop}>
        <View style={styles.paywallCard}>
          <View style={styles.paywallHead}>
            <View>
              <Text style={styles.paywallKicker}>{l({ zh: "付费解锁", en: "Unlock" })}</Text>
              <Text style={styles.paywallTitle}>{l({ zh: "完整追问与深度报告", en: "Full follow-ups and deep report" })}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.paywallClose}>
              <Text style={styles.paywallCloseText}>{l({ zh: "关闭", en: "Close" })}</Text>
            </Pressable>
          </View>
          <View style={styles.paywallOptions}>
            {products.map((product) => (
              <PlanOption
                key={product.productId}
                active={plan === product.plan}
                disabled={busy}
                product={product}
                onPress={() => onPlanChange(product.plan)}
              />
            ))}
          </View>
          {error ? <Text style={styles.paywallError}>{l({ zh: `购买暂时失败：${error}`, en: `Purchase failed for now: ${error}` })}</Text> : null}
          <Pressable accessibilityRole="button" disabled={busy} onPress={onConfirm} style={[styles.paywallConfirm, busy && styles.paywallConfirmDisabled]}>
            {busy ? <ActivityIndicator color="#fffaf0" /> : null}
            <Text style={styles.paywallConfirmText}>{busy ? l({ zh: "正在验证购买...", en: "Verifying..." }) : l({ zh: "继续解锁", en: "Continue" })}</Text>
          </Pressable>
          <Text style={styles.paywallNote}>
            {l({ zh: "当前使用沙盒购买服务层，不会发起真实扣款。后续接 Apple IAP 时替换 purchases 服务即可。", en: "This build uses a sandbox purchase layer and will not charge real money. Replace the purchases service when Apple IAP is connected." })}
          </Text>
          {activeProduct ? <Text style={styles.paywallProductId}>Sandbox product: {activeProduct.productId}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

function PlanOption({
  active,
  disabled,
  product,
  onPress,
}: {
  active: boolean;
  disabled: boolean;
  product: PurchaseProduct;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.planOption, active && styles.planOptionActive, disabled && styles.disabled]}>
      <Text style={[styles.planTitle, active && styles.planTitleActive]}>{product.title}</Text>
      <Text style={[styles.planPrice, active && styles.planTitleActive]}>{product.price}</Text>
      <Text style={[styles.planBody, active && styles.planBodyActive]}>{product.body}</Text>
    </Pressable>
  );
}

function HistoryModal({
  visible,
  items,
  onClose,
  onSelect,
  onClear,
}: {
  visible: boolean;
  items: HistoryItem[];
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.historyBackdrop}>
        <View style={styles.historySheet}>
          <View style={styles.historyHead}>
            <View>
              <Text style={styles.historyKicker}>{l({ zh: "本机历史", en: "Local history" })}</Text>
              <Text style={styles.historyTitle}>{l({ zh: "最近问过的卦", en: "Recent readings" })}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.historyClose}>
              <Text style={styles.historyCloseText}>{l({ zh: "关闭", en: "Close" })}</Text>
            </Pressable>
          </View>
          <Text style={styles.historyPrivacy}>{l({ zh: "仅保存在本次会话内，用于快速回看；不会上传或写入磁盘。", en: "Stored only in this app session for quick review. It is not uploaded or written to disk." })}</Text>

          {items.length === 0 ? (
            <View style={styles.historyEmpty}>
              <Text style={styles.historyEmptyTitle}>{l({ zh: "还没有历史记录", en: "No history yet" })}</Text>
              <Text style={styles.historyEmptyText}>{l({ zh: "完成一次问卦后，会在这里显示最近结果。", en: "After a reading, the latest result appears here." })}</Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.historyList} contentContainerStyle={styles.historyListContent}>
                {items.map((item) => (
                  <Pressable key={item.id} accessibilityRole="button" onPress={() => onSelect(item)} style={styles.historyItem}>
                    <View style={styles.historyItemMeta}>
                      <Text style={styles.historyMethod}>{item.methodTitle}</Text>
                      <Text style={styles.historyTime}>{historyTimeLabel(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.historyQuestion} numberOfLines={2}>{item.question}</Text>
                    <Text style={styles.historyResult} numberOfLines={1}>{item.reading.title}</Text>
                    <View style={styles.historyDetailRow}>
                      <Text style={styles.historyDetail} numberOfLines={1}>{item.detail}</Text>
                      <Text style={styles.historyConfidence}>{confidenceLabel(item.reading.confidence)}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable accessibilityRole="button" onPress={onClear} style={styles.historyClear}>
                <Text style={styles.historyClearText}>{l({ zh: "清空本次历史", en: "Clear history" })}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SafetyRows() {
  return (
    <View style={styles.safetyRows}>
      <InfoRow icon="✓" title={l({ zh: "隐私保护", en: "Privacy" })} body={l({ zh: "所有数据仅你可见，可随时删除", en: "Your data stays visible only to you and can be cleared anytime" })} tone="jade" />
      <InfoRow icon="×" title={l({ zh: "安全提示", en: "Safety" })} body={l({ zh: "医疗 / 法律 / 金融 / 自伤等问题，将给出安全性建议而非确定性结果。", en: "Medical, legal, financial, or self-harm topics receive safety guidance, not deterministic answers." })} tone="red" />
      <InfoRow icon="锁" title={l({ zh: "深度解读（付费）", en: "Deep report" })} body={l({ zh: "解锁动爻、时机、追问建议等完整分析", en: "Unlock changing lines, timing, follow-up suggestions, and fuller analysis" })} tone="gold" />
    </View>
  );
}

function buildDeepReport(reading: Reading, cast: LiuyaoCast | null, chart: DivineChart | null): { title: string; body: string }[] {
  const movement = cast
    ? cast.movingLabels.length > 0
      ? l({ zh: `动爻落在 ${cast.movingLabels.join("、")}，说明这件事有可改变的切入点。`, en: `The changing lines are ${cast.movingLabels.join(", ")}, pointing to places where the situation can still shift.` })
      : l({ zh: "本卦无动爻，说明局势更偏稳定，适合先守住节奏。", en: "There are no changing lines, so the situation is steadier. Hold your rhythm first." })
    : chart
      ? l({ zh: `${chart.methodName}已起盘，适合从盘面结构看时机与方位。`, en: `${chart.methodName} has been cast; read it through timing, structure, and direction.` })
      : l({ zh: "当前盘面信息较少，建议先补充问题背景。", en: "The chart has limited context. Add more background before leaning on the reading." });
  const primaryAction = reading.actions[0] ?? l({ zh: "先把当前最可控的一步做扎实。", en: "Start with the most controllable next step." });
  const secondAction = reading.actions[1] ?? l({ zh: "再观察外部条件是否变得更清楚。", en: "Then watch whether the outside conditions become clearer." });
  return [
    {
      title: l({ zh: "动爻提示", en: "Changing line" }),
      body: `${movement}${reading.title ? ` ${reading.title}` : ""}`,
    },
    {
      title: l({ zh: "时机窗口", en: "Timing window" }),
      body: l({ zh: `${primaryAction} 如果三天内信息仍不清楚，先做准备，不急着承诺。`, en: `${primaryAction} If the picture is still unclear within three days, prepare first and avoid overcommitting.` }),
    },
    {
      title: l({ zh: "风险雷达", en: "Risk radar" }),
      body: reading.risk_notice || l({ zh: "不要把卦象当成唯一依据；重大现实决策仍需要结合事实、预算和专业意见。", en: "Do not use the reading as your only basis; important decisions still need facts, budgets, and professional advice." }),
    },
    {
      title: l({ zh: "追问方向", en: "Follow-up angle" }),
      body: l({ zh: `下一步可以追问：“${secondAction.replace(/[。.!！]$/, "")}，我现在最该先做哪一步？”`, en: `A useful follow-up: "${secondAction.replace(/[。.!！]$/, "")}. What should I do first now?"` }),
    },
  ];
}

function deepReportId(question: string, reading: Reading, cast: LiuyaoCast | null, chart: DivineChart | null): string {
  const methodPart = cast ? `liuyao:${cast.primaryName}:${cast.changedName}:${cast.movingLabels.join(",")}` : chart ? `${chart.method}:${chart.methodName}` : "unknown";
  return stableHash(`${methodPart}|${question}|${reading.title}`);
}

function stableHash(input: string): string {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function historyDetail(method: MethodKey, cast: LiuyaoCast | null, chart: DivineChart | null): string {
  if (method === "liuyao" && cast) {
    const moving = cast.movingLabels.length > 0 ? l({ zh: `动爻 ${cast.movingLabels.join("、")}`, en: `Changing lines ${cast.movingLabels.join(", ")}` }) : l({ zh: "无动爻", en: "No changing lines" });
    return `${cast.primaryName} → ${cast.changedName} · ${moving}`;
  }
  if (chart?.method === "meihua") return `${chart.hexagram} → ${chart.changed} · ${l({ zh: `动第 ${chart.moving} 爻`, en: `Changing line ${chart.moving}` })}`;
  if (chart?.method === "qimen") return `${chart.dun} ${chart.ju} · ${l({ zh: `值符落 ${chart.fuPalace} 宫`, en: `Chief sign in palace ${chart.fuPalace}` })}`;
  if (chart?.method === "daliuren") return l({ zh: `${chart.dayGanzhi}日 · ${chart.monthGeneral}将 · ${chart.hour}时`, en: `${chart.dayGanzhi} day · ${chart.monthGeneral} general · ${chart.hour} hour` });
  return l({ zh: "已生成解读", en: "Reading generated" });
}

function historyTimeLabel(createdAt: number): string {
  const date = new Date(createdAt);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

function InfoRow({ icon, title, body, tone }: { icon: string; title: string; body: string; tone: "jade" | "red" | "gold" }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoIcon, styles[`${tone}Icon`]]}>{icon}</Text>
      <Text style={[styles.infoTitle, styles[`${tone}Title`]]}>{title}</Text>
      <Text style={styles.infoBody}>{body}</Text>
      <Text style={styles.infoChevron}>›</Text>
    </View>
  );
}

function progressCaption(partialThrows: CoinThrow[], status: WorkStatus): string {
  if (status === "casting") return l({ zh: `第 ${Math.min(partialThrows.length + 1, 6)} 次 · 待掷`, en: `Cast ${Math.min(partialThrows.length + 1, 6)} · Pending` });
  if (partialThrows.length === 0) return l({ zh: "三枚铜钱掷六次，自下而上成卦", en: "Cast three coins six times, building the hexagram from bottom to top" });
  return l({ zh: "六次已成，盘面如下", en: "Six casts complete. Chart below." });
}

function normalizedQuestion(question: string, fallbackQuestion: string): string {
  return question.trim() || fallbackQuestion;
}

function divineMinimumRitualMs(method: DivinationMethod): number {
  if (method === "daliuren") return 18000;
  if (method === "qimen") return 10000;
  if (method === "meihua") return 9500;
  return DIVINATION_MIN_GENERATING_MS;
}

function normalizeLines(lines: number[]): LineValue[] {
  const normalized: LineValue[] = [];
  for (const line of lines) {
    normalized.push(line === 1 ? 1 : 0);
  }
  return normalized;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForMinimumDuration(startedAt: number, minimumMs: number): Promise<void> {
  const remainingMs = minimumMs - (Date.now() - startedAt);
  if (remainingMs > 0) {
    await sleep(remainingMs);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
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

const colors = {
  paper: "rgba(255, 244, 214, 0.08)",
  paperDeep: "rgba(255, 244, 214, 0.12)",
  ink: mystic.ink,
  muted: mystic.muted,
  jade: mystic.jade,
  teal: mystic.teal,
  cinnabar: mystic.cinnabar,
  cinnabarDark: mystic.cinnabarDark,
  gold: mystic.gold,
  line: mystic.line,
};

const serif = "Songti SC";
const sans = "PingFang SC";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: mystic.bg,
  },
  content: {
    minHeight: 844,
    paddingHorizontal: 22,
    gap: 12,
    overflow: "hidden",
  },
  topbar: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  titleGroup: {
    flex: 1,
  },
  topActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  title: {
    color: mystic.goldSoft,
    fontFamily: serif,
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 42,
  },
  subtitle: {
    color: mystic.muted,
    fontFamily: sans,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  historyButton: {
    alignItems: "center",
    borderColor: mystic.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 14,
    backgroundColor: mystic.panelSoft,
  },
  historyIcon: {
    color: colors.ink,
    fontSize: 18,
  },
  historyText: {
    color: colors.ink,
    fontFamily: sans,
    fontSize: 14,
    fontWeight: "800",
  },
  flowRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  flowText: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 12,
  },
  historyQuickRow: {
    alignItems: "flex-start",
    marginTop: -2,
  },
  oracleHero: {
    backgroundColor: "rgba(7, 9, 11, 0.62)",
    borderColor: mystic.lineStrong,
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.34,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
  },
  oracleHeroTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 3,
    paddingTop: 2,
  },
  oracleKicker: {
    color: mystic.gold,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "900",
  },
  oracleTitle: {
    color: mystic.ink,
    fontFamily: serif,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 31,
    marginTop: 1,
  },
  oracleBadge: {
    backgroundColor: "rgba(217, 170, 77, 0.14)",
    borderColor: mystic.lineStrong,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  oracleBadgeText: {
    color: mystic.goldSoft,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "900",
  },
  oracleCopy: {
    color: mystic.muted,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    paddingHorizontal: 3,
  },
  methodTabs: {
    flexDirection: "row",
    gap: 7,
  },
  methodTab: {
    backgroundColor: "rgba(255, 244, 214, 0.07)",
    borderColor: mystic.line,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 34,
    justifyContent: "center",
  },
  methodTabActive: {
    backgroundColor: "rgba(217, 170, 77, 0.18)",
    borderColor: mystic.lineStrong,
  },
  methodTabText: {
    color: colors.ink,
    fontFamily: sans,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  methodTabTextActive: {
    color: mystic.goldSoft,
  },
  disabled: {
    opacity: 0.74,
  },
  trayStage: {
    alignItems: "center",
    minHeight: 360,
    justifyContent: "center",
    position: "relative",
  },
  questionDock: {
    alignItems: "center",
    backgroundColor: "rgba(9, 10, 10, 0.76)",
    borderColor: mystic.lineStrong,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 88,
    padding: 14,
  },
  questionDockMark: {
    alignItems: "center",
    backgroundColor: "rgba(217, 170, 77, 0.14)",
    borderColor: mystic.lineStrong,
    borderRadius: 18,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  questionDockMarkText: {
    color: mystic.goldSoft,
    fontFamily: serif,
    fontSize: 24,
    fontWeight: "900",
  },
  questionDockBody: {
    flex: 1,
    gap: 5,
  },
  questionDockTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  questionDockKicker: {
    color: mystic.gold,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "900",
  },
  questionDockEdit: {
    color: mystic.jade,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "900",
  },
  questionDockText: {
    color: colors.ink,
    fontFamily: sans,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 23,
  },
  questionSheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  questionSheetScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.56)",
  },
  questionSheet: {
    backgroundColor: "#101412",
    borderColor: mystic.lineStrong,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(255,247,223,0.2)",
    borderRadius: 999,
    height: 4,
    width: 46,
  },
  questionSheetHead: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  questionSheetKicker: {
    color: mystic.gold,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "900",
  },
  questionSheetTitle: {
    color: colors.ink,
    fontFamily: serif,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
    marginTop: 2,
  },
  questionDone: {
    backgroundColor: "rgba(217, 170, 77, 0.14)",
    borderColor: mystic.lineStrong,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 13,
  },
  questionDoneText: {
    color: mystic.goldSoft,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "900",
  },
  input: {
    backgroundColor: "rgba(8, 10, 10, 0.45)",
    borderColor: "rgba(217, 170, 77, 0.38)",
    borderRadius: 18,
    borderWidth: 1.5,
    color: colors.ink,
    fontFamily: sans,
    fontSize: 16,
    lineHeight: 23,
    minHeight: 120,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 30,
  },
  sheetInput: {
    backgroundColor: "rgba(255, 244, 214, 0.06)",
    marginTop: 2,
  },
  inputMeta: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -35,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  metaText: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 12,
  },
  chipBlock: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 13,
  },
  chipTitle: {
    color: colors.ink,
    fontFamily: sans,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 22,
    paddingTop: 3,
    width: 58,
  },
  chips: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "rgba(255, 244, 214, 0.08)",
    borderColor: mystic.line,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 17,
  },
  chipActive: {
    backgroundColor: colors.jade,
    borderColor: colors.jade,
  },
  chipText: {
    color: colors.ink,
    fontFamily: sans,
    fontSize: 14,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#fffaf0",
  },
  questionSheetNote: {
    color: mystic.faint,
    fontFamily: sans,
    fontSize: 12,
    lineHeight: 18,
  },
  progressCard: {
    backgroundColor: mystic.panel,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 13,
  },
  progressHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  progressTitle: {
    color: colors.ink,
    fontFamily: sans,
    fontSize: 15,
    fontWeight: "900",
  },
  progressCaption: {
    color: colors.muted,
    flex: 1,
    fontFamily: sans,
    fontSize: 12,
    textAlign: "right",
  },
  stepRow: {
    flexDirection: "row",
    gap: 7,
    justifyContent: "space-between",
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
    gap: 3,
  },
  stepDot: {
    backgroundColor: "rgba(47,111,100,0.12)",
    borderRadius: 14,
    color: colors.jade,
    fontFamily: sans,
    fontSize: 13,
    fontWeight: "900",
    height: 28,
    lineHeight: 28,
    overflow: "hidden",
    textAlign: "center",
    width: 28,
  },
  stepDotActive: {
    backgroundColor: colors.jade,
    color: "#fffaf0",
  },
  stepLabel: {
    color: colors.ink,
    fontFamily: sans,
    fontSize: 11,
    fontWeight: "800",
  },
  stepSub: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 10,
  },
  hexagramPair: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: 9,
    justifyContent: "space-between",
  },
  hexaArrow: {
    alignSelf: "center",
    color: colors.cinnabar,
    fontSize: 21,
    fontWeight: "900",
  },
  hexCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 244, 214, 0.08)",
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 7,
    padding: 11,
  },
  hexCardTitle: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "800",
  },
  hexName: {
    color: colors.cinnabarDark,
    fontFamily: serif,
    fontSize: 25,
    fontWeight: "900",
  },
  glyph: {
    gap: 5,
  },
  lineBars: {
    alignItems: "center",
    height: 10,
    justifyContent: "center",
    width: 72,
  },
  yangLine: {
    backgroundColor: mystic.goldSoft,
    borderRadius: 3,
    height: 7,
    width: 66,
  },
  yinLine: {
    flexDirection: "row",
    gap: 12,
  },
  yinHalf: {
    backgroundColor: mystic.goldSoft,
    borderRadius: 3,
    height: 7,
    width: 27,
  },
  movingLine: {
    backgroundColor: colors.cinnabar,
  },
  movingNote: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyState: {
    borderColor: colors.line,
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1,
    color: colors.muted,
    fontFamily: sans,
    fontSize: 13,
    lineHeight: 19,
    padding: 14,
    textAlign: "center",
  },
  chartBlock: {
    gap: 12,
  },
  qimenGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  qimenCell: {
    backgroundColor: "rgba(255, 244, 214, 0.08)",
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 76,
    padding: 9,
    width: "31.7%",
  },
  qimenPos: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 11,
    fontWeight: "800",
  },
  qimenStem: {
    color: colors.cinnabarDark,
    fontFamily: serif,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4,
  },
  qimenGate: {
    color: colors.ink,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "800",
  },
  prototypeNote: {
    backgroundColor: "rgba(183,131,47,0.1)",
    borderColor: "rgba(183,131,47,0.28)",
    borderRadius: 14,
    borderWidth: 1,
    color: "#775421",
    fontFamily: sans,
    fontSize: 12,
    lineHeight: 18,
    padding: 10,
  },
  daliurenMeta: {
    color: colors.ink,
    fontFamily: sans,
    fontSize: 14,
    fontWeight: "800",
  },
  lessonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  lessonCard: {
    backgroundColor: "rgba(255, 244, 214, 0.08)",
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    width: "48.5%",
  },
  lessonLabel: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "800",
  },
  lessonUpper: {
    color: colors.cinnabarDark,
    fontFamily: serif,
    fontSize: 22,
    fontWeight: "900",
  },
  lessonLower: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 12,
  },
  transmissionRow: {
    flexDirection: "row",
    gap: 8,
  },
  transmissionPill: {
    backgroundColor: colors.paperDeep,
    borderRadius: 14,
    flex: 1,
    padding: 10,
  },
  transmissionLabel: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 11,
    fontWeight: "800",
  },
  transmissionBranch: {
    color: colors.ink,
    fontFamily: serif,
    fontSize: 20,
    fontWeight: "900",
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: "rgba(44, 30, 18, 0.96)",
    borderColor: "rgba(242, 213, 138, 0.72)",
    borderRadius: 26,
    borderWidth: 2,
    flexDirection: "row",
    gap: 14,
    justifyContent: "center",
    minHeight: 78,
    paddingHorizontal: 20,
    shadowColor: mystic.gold,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  primaryActionDisabled: {
    opacity: 0.74,
  },
  actionSeal: {
    alignItems: "center",
    backgroundColor: "rgba(166, 103, 40, 0.78)",
    borderColor: "rgba(255, 232, 166, 0.72)",
    borderRadius: 999,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    overflow: "hidden",
    width: 56,
  },
  actionSealHole: {
    backgroundColor: "rgba(30, 18, 10, 0.7)",
    borderRadius: 3,
    height: 15,
    position: "absolute",
    width: 15,
  },
  actionCoin: {
    height: 50,
    opacity: 0.9,
    width: 70,
  },
  primaryActionText: {
    color: mystic.goldSoft,
    fontFamily: serif,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
    textAlign: "center",
  },
  primaryActionSub: {
    color: "rgba(255,250,240,0.72)",
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
    textAlign: "center",
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.54)",
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  loadingText: {
    color: colors.muted,
    flex: 1,
    fontFamily: sans,
    fontSize: 13,
  },
  errorCard: {
    backgroundColor: "#fff2ec",
    borderColor: "#e5b29d",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  errorTitle: {
    color: colors.cinnabar,
    fontFamily: sans,
    fontSize: 15,
    fontWeight: "900",
  },
  errorText: {
    color: "#704031",
    fontFamily: sans,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  resultPanel: {
    backgroundColor: "rgba(8, 10, 10, 0.82)",
    borderColor: mystic.lineStrong,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  safetyResultPanel: {
    borderColor: "rgba(165,31,26,0.35)",
  },
  resultQuestion: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 13,
    lineHeight: 19,
  },
  resultSource: {
    color: colors.teal,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "900",
  },
  resultTitle: {
    color: colors.ink,
    fontFamily: serif,
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 32,
  },
  reading: {
    color: "rgba(255,247,223,0.82)",
    fontFamily: sans,
    fontSize: 15,
    lineHeight: 23,
  },
  actions: {
    gap: 9,
  },
  actionItem: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  actionIndex: {
    backgroundColor: colors.jade,
    borderRadius: 14,
    color: "#fffaf0",
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "900",
    height: 25,
    lineHeight: 25,
    overflow: "hidden",
    textAlign: "center",
    width: 25,
  },
  actionText: {
    color: "rgba(255,247,223,0.86)",
    flex: 1,
    fontFamily: sans,
    fontSize: 14,
    lineHeight: 21,
  },
  riskNotice: {
    color: colors.cinnabarDark,
    fontFamily: sans,
    fontSize: 12,
    lineHeight: 18,
  },
  deepReport: {
    backgroundColor: "#251c16",
    borderColor: "rgba(183,131,47,0.46)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  deepReportKicker: {
    color: "#d8c28a",
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "900",
  },
  deepSection: {
    borderTopColor: "rgba(255,241,199,0.14)",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  deepSectionTitle: {
    color: "#fff1c7",
    fontFamily: sans,
    fontSize: 13,
    fontWeight: "900",
  },
  deepSectionBody: {
    color: "rgba(255,241,199,0.78)",
    fontFamily: sans,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  unlock: {
    alignItems: "center",
    backgroundColor: "rgba(183,131,47,0.13)",
    borderColor: "rgba(183,131,47,0.35)",
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: "center",
  },
  unlockText: {
    color: mystic.goldSoft,
    fontFamily: sans,
    fontSize: 15,
    fontWeight: "900",
  },
  paywallBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(20, 14, 10, 0.48)",
  },
  paywallCard: {
    backgroundColor: "#121514",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  paywallHead: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  paywallKicker: {
    color: colors.gold,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "900",
  },
  paywallTitle: {
    color: mystic.ink,
    fontFamily: serif,
    fontSize: 23,
    fontWeight: "900",
    marginTop: 3,
  },
  paywallClose: {
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  paywallCloseText: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "900",
  },
  paywallOptions: {
    gap: 10,
  },
  planOption: {
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    backgroundColor: "rgba(255, 244, 214, 0.08)",
  },
  planOptionActive: {
    borderColor: mystic.lineStrong,
    backgroundColor: "rgba(217, 170, 77, 0.16)",
  },
  planTitle: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 13,
    fontWeight: "900",
  },
  planTitleActive: {
    color: mystic.goldSoft,
  },
  planPrice: {
    color: mystic.ink,
    fontFamily: serif,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 3,
  },
  planBody: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 3,
  },
  planBodyActive: {
    color: "rgba(255,247,223,0.82)",
  },
  paywallConfirm: {
    alignItems: "center",
    backgroundColor: colors.cinnabarDark,
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    minHeight: 50,
    justifyContent: "center",
  },
  paywallConfirmDisabled: {
    opacity: 0.78,
  },
  paywallConfirmText: {
    color: "#fffaf0",
    fontFamily: sans,
    fontSize: 15,
    fontWeight: "900",
  },
  paywallError: {
    color: colors.cinnabarDark,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  paywallNote: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 12,
    lineHeight: 18,
  },
  paywallProductId: {
    color: "#9b9388",
    fontFamily: sans,
    fontSize: 11,
    fontWeight: "700",
  },
  historyBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(20, 14, 10, 0.46)",
  },
  historySheet: {
    backgroundColor: "#121514",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    gap: 12,
    maxHeight: "82%",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  historyHead: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  historyKicker: {
    color: colors.gold,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "900",
  },
  historyTitle: {
    color: colors.ink,
    fontFamily: serif,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2,
  },
  historyClose: {
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  historyCloseText: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "900",
  },
  historyPrivacy: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 12,
    lineHeight: 18,
  },
  historyEmpty: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: 18,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 5,
    padding: 22,
  },
  historyEmptyTitle: {
    color: colors.ink,
    fontFamily: sans,
    fontSize: 15,
    fontWeight: "900",
  },
  historyEmptyText: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  historyList: {
    marginHorizontal: -4,
  },
  historyListContent: {
    gap: 10,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  historyItem: {
    backgroundColor: "rgba(255, 244, 214, 0.08)",
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    gap: 7,
    padding: 14,
  },
  historyItemMeta: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  historyMethod: {
    color: colors.cinnabarDark,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "900",
  },
  historyTime: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 12,
    fontWeight: "800",
  },
  historyQuestion: {
    color: colors.ink,
    fontFamily: serif,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 24,
  },
  historyResult: {
    color: "#3b332b",
    fontFamily: sans,
    fontSize: 13,
    fontWeight: "800",
  },
  historyDetailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  historyDetail: {
    color: colors.muted,
    flex: 1,
    fontFamily: sans,
    fontSize: 12,
  },
  historyConfidence: {
    backgroundColor: "rgba(47,111,100,0.12)",
    borderRadius: 999,
    color: colors.jade,
    fontFamily: sans,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  historyClear: {
    alignItems: "center",
    borderColor: "rgba(165,31,26,0.24)",
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  historyClearText: {
    color: colors.cinnabarDark,
    fontFamily: sans,
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryAction: {
    alignItems: "center",
    minHeight: 40,
    justifyContent: "center",
  },
  secondaryActionText: {
    color: colors.muted,
    fontFamily: sans,
    fontSize: 14,
    fontWeight: "800",
  },
  safetyRows: {
    backgroundColor: mystic.panel,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  infoRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 13,
    minHeight: 64,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  infoIcon: {
    borderRadius: 14,
    color: "#fffaf0",
    fontFamily: sans,
    fontSize: 14,
    fontWeight: "900",
    height: 28,
    lineHeight: 28,
    overflow: "hidden",
    textAlign: "center",
    width: 28,
  },
  jadeIcon: {
    backgroundColor: "rgba(47,111,100,0.78)",
  },
  redIcon: {
    backgroundColor: "rgba(165,31,26,0.9)",
  },
  goldIcon: {
    backgroundColor: "rgba(183,131,47,0.92)",
  },
  infoTitle: {
    fontFamily: sans,
    fontSize: 15,
    fontWeight: "900",
    width: 94,
  },
  jadeTitle: {
    color: colors.jade,
  },
  redTitle: {
    color: colors.cinnabarDark,
  },
  goldTitle: {
    color: colors.gold,
  },
  infoBody: {
    color: "rgba(255,247,223,0.66)",
    flex: 1,
    fontFamily: sans,
    fontSize: 13,
    lineHeight: 19,
  },
  infoChevron: {
    color: colors.muted,
    fontSize: 27,
  },
  footerNote: {
    color: "#9b9388",
    fontFamily: sans,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
