import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ModuleSwitch } from "@/components/ModuleSwitch";
import { CloudConsentModal, acceptCloudConsent, hasCloudConsent } from "@/components/CloudConsent";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MysticBackdrop } from "@/components/MysticBackdrop";
import { ThemeToggle } from "@/components/ThemeToggle";
import { interpretBazi, type BaziReading } from "@/lib/api";
import { l, useAppLanguage, type LocalizedCopy } from "@/lib/i18n";
import { mystic, mysticFonts, useMysticTheme } from "@/theme/mystic";

type Certainty = "accurate" | "approx" | "unknown";
type WorkStatus = "idle" | "loading" | "done" | "fallback" | "error";

type Pillars = {
  year: string;
  month: string;
  day: string;
  hour: string;
};

type ElementProfile = {
  name: string;
  level: string;
  percent: number;
};

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const ELEMENT_NAMES = ["木", "火", "土", "金", "水"];
const CERTAINTY_COPY: Record<Certainty, { label: LocalizedCopy; banner: LocalizedCopy; subcopy: LocalizedCopy }> = {
  accurate: {
    label: { zh: "准确时辰", en: "Exact time" },
    banner: { zh: "置信度高：已使用准确时辰生成基础命盘。", en: "Higher confidence: the birth chart uses an exact birth time." },
    subcopy: { zh: "先看基础四柱与五行", en: "Generate pillars and elements" },
  },
  approx: {
    label: { zh: "大概时段", en: "Approx. time" },
    banner: { zh: "置信度中：按大概时段估算时柱，建议后续补准确出生时间。", en: "Medium confidence: the hour pillar is estimated. Add exact birth time later if possible." },
    subcopy: { zh: "按大概时段估算", en: "Estimate from time range" },
  },
  unknown: {
    label: { zh: "不知道", en: "Unknown" },
    banner: { zh: "置信度低：未提供时辰，时柱暂不确定，主题解释只给低确定性参考。", en: "Low confidence: without birth time, the hour pillar is uncertain and interpretation stays cautious." },
    subcopy: { zh: "生成低置信度命盘", en: "Generate low-confidence chart" },
  },
};

export default function BaziScreen() {
  useAppLanguage();
  const theme = useMysticTheme();
  const insets = useSafeAreaInsets();
  const requestIdRef = useRef(0);
  const [birthDate, setBirthDate] = useState("1994-08-18");
  const [birthTime, setBirthTime] = useState("08:30");
  const [birthPlace, setBirthPlace] = useState("上海");
  const [certainty, setCertainty] = useState<Certainty>("accurate");
  const [status, setStatus] = useState<WorkStatus>("idle");
  const [pillars, setPillars] = useState<Pillars>(() => buildPillars("1994-08-18", "08:30", "accurate"));
  const [elements, setElements] = useState<ElementProfile[]>(() => buildElements("1994-08-18", "08:30"));
  const [reading, setReading] = useState<BaziReading | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cloudConsentVisible, setCloudConsentVisible] = useState(false);

  const busy = status === "loading";
  const activeCopy = certaintyCopy(certainty);
  const sourceLabel = status === "done" ? l({ zh: "AI 解读", en: "AI reading" }) : status === "fallback" ? l({ zh: "示例解读", en: "Sample reading" }) : l({ zh: "待生成", en: "Not generated" });

  const run = async () => {
    if (!hasCloudConsent()) {
      setCloudConsentVisible(true);
      return;
    }
    await startRun();
  };

  const startRun = async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const nextPillars = buildPillars(birthDate, birthTime, certainty);
    const nextElements = buildElements(birthDate, birthTime);
    setPillars(nextPillars);
    setElements(nextElements);
    setReading(null);
    setErr(null);
    setStatus("loading");

    try {
      const nextReading = await interpretBazi({
        pillars: nextPillars,
        elements: nextElements.map(({ name, level }) => ({ name, level })),
        certainty,
      });
      if (requestId !== requestIdRef.current) return;
      setReading(nextReading);
      setStatus("done");
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setReading(fallbackBaziReading());
      setErr(errorMessage(error));
      setStatus("fallback");
    }
  };

  const acceptConsentAndRun = () => {
    acceptCloudConsent();
    setCloudConsentVisible(false);
    void startRun();
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 }]}
    >
      <MysticBackdrop />
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={[styles.kicker, { color: theme.gold }]}>{l({ zh: "四柱八字", en: "Four Pillars" })}</Text>
            <Text style={[styles.title, { color: theme.goldSoft }]}>{l({ zh: "八字命盘", en: "Ba Zi Birth Chart" })}</Text>
          </View>
          <View style={styles.topActions}>
            <ThemeToggle />
            <LanguageToggle />
          </View>
        </View>
        <Text style={[styles.subtitle, { color: theme.muted }]}>{l({ zh: "输入出生信息，先生成原型命盘，再由 AI 做事业、感情与年度解读。", en: "Enter birth details to generate a prototype chart, then receive career, relationship, and yearly interpretation." })}</Text>
      </View>

      <ModuleSwitch active="bazi" />

      <View style={[styles.formPanel, { backgroundColor: theme.panel, borderColor: theme.line }]}>
        <Field label={l({ zh: "出生日期", en: "Birth date" })}>
          <TextInput
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="1994-08-18"
            placeholderTextColor="#a59a8c"
            autoCapitalize="none"
            style={styles.input}
          />
        </Field>
        <Field label={l({ zh: "出生时间", en: "Birth time" })}>
          <TextInput
            value={birthTime}
            onChangeText={setBirthTime}
            placeholder="08:30"
            placeholderTextColor="#a59a8c"
            autoCapitalize="none"
            style={styles.input}
          />
        </Field>
        <Field label={l({ zh: "出生地", en: "Birth place" })}>
          <TextInput
            value={birthPlace}
            onChangeText={setBirthPlace}
            placeholder={l({ zh: "城市，例如：上海", en: "City, for example: Shanghai" })}
            placeholderTextColor="#a59a8c"
            style={styles.input}
          />
        </Field>

        <View style={styles.segmented}>
          {(Object.keys(CERTAINTY_COPY) as Certainty[]).map((item) => {
            const active = item === certainty;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                disabled={busy}
                onPress={() => setCertainty(item)}
                style={[styles.segment, active && styles.segmentActive, busy && styles.disabled]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{l(CERTAINTY_COPY[item].label)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable accessibilityRole="button" disabled={busy} onPress={run} style={[styles.primaryAction, busy && styles.primaryActionDisabled]}>
          {busy ? <ActivityIndicator color="#fff8e6" /> : null}
          {!busy ? (
            <View style={styles.actionSigil}>
              <Text style={styles.actionSigilText}>{l({ zh: "命", en: "M" })}</Text>
            </View>
          ) : null}
          <View>
            <Text style={styles.primaryText}>{busy ? l({ zh: "正在生成命盘...", en: "Generating chart..." }) : l({ zh: "生成命盘", en: "Generate chart" })}</Text>
            <Text style={styles.primarySub}>{activeCopy.subcopy}</Text>
          </View>
        </Pressable>
      </View>

      <View style={[styles.confidenceBanner, certainty === "unknown" && styles.confidenceLow]}>
        <Text style={styles.confidenceText}>{activeCopy.banner}</Text>
      </View>

      <View style={styles.pillarGrid}>
        <Pillar label={l({ zh: "年柱", en: "Year" })} value={pillars.year} />
        <Pillar label={l({ zh: "月柱", en: "Month" })} value={pillars.month} />
        <Pillar label={l({ zh: "日柱", en: "Day" })} value={pillars.day} />
        <Pillar label={l({ zh: "时柱", en: "Hour" })} value={pillars.hour} muted={certainty === "unknown"} />
      </View>

      <View style={styles.elementPanel}>
        {elements.map((element) => (
          <View key={element.name} style={styles.elementRow}>
            <Text style={styles.elementName}>{element.name}</Text>
            <View style={styles.elementTrack}>
              <View style={[styles.elementFill, { width: `${element.percent}%` }]} />
            </View>
            <Text style={styles.elementLevel}>{element.level}</Text>
          </View>
        ))}
      </View>

      <View style={styles.readingHeader}>
        <Text style={styles.readingTitle}>{l({ zh: "主题解读", en: "Theme reading" })}</Text>
        <Text style={styles.sourceLabel}>{sourceLabel}</Text>
      </View>

      <View style={styles.themeCards}>
        <ThemeCard title={l({ zh: "事业", en: "Career" })} body={reading?.career ?? l({ zh: "生成后显示适合的节奏、机会与当前最该补齐的能力。", en: "After generation, this shows rhythm, opportunity, and the capability to strengthen now." })} />
        <ThemeCard title={l({ zh: "感情", en: "Relationships" })} body={reading?.love ?? l({ zh: "生成后显示关系里的表达方式、边界与近期相处重点。", en: "After generation, this shows expression, boundaries, and relationship focus." })} />
        <ThemeCard title={l({ zh: "年度趋势", en: "Yearly trend" })} body={reading?.year ?? l({ zh: "生成后显示今年适合整理、推进或等待的方向。", en: "After generation, this shows where to organize, move forward, or wait this year." })} />
      </View>

      {reading?.confidence_note ? <Text style={styles.note}>{reading.confidence_note}</Text> : null}
      {err ? <Text style={styles.errorText}>{l({ zh: `云端解读暂时失败：${err}。当前展示示例解读。`, en: `Cloud reading failed for now: ${err}. Showing a sample reading.` })}</Text> : null}
      <Text style={styles.footerNote}>{l({ zh: "四柱为原型示例命盘，出生地仅用于本机输入展示；AI 解读只接收结构化命盘。结果为文化参考，不替代职业、医疗、心理等专业意见。", en: "The Four Pillars chart is a prototype. Birth place is used only in local input display; AI receives only structured chart data. This is cultural reference, not professional career, medical, or mental health advice." })}</Text>
      <CloudConsentModal
        visible={cloudConsentVisible}
        moduleName={l({ zh: "八字命盘", en: "Ba Zi Birth Chart" })}
        detail={l({ zh: "仅发送本机生成的四柱、五行强弱与时辰确定性；出生地原文不会发送给云端解读接口。", en: "Only locally generated pillars, element strength, and time certainty are sent. The raw birth place text is not sent to the cloud reading endpoint." })}
        onCancel={() => setCloudConsentVisible(false)}
        onAccept={acceptConsentAndRun}
      />
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Pillar({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={[styles.pillar, muted && styles.pillarMuted]}>
      <Text style={styles.pillarLabel}>{label}</Text>
      <Text style={styles.pillarValue}>{value}</Text>
    </View>
  );
}

function ThemeCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.themeCard}>
      <Text style={styles.themeTitle}>{title}</Text>
      <Text style={styles.themeBody}>{body}</Text>
    </View>
  );
}

function buildPillars(dateText: string, timeText: string, certainty: Certainty): Pillars {
  const seed = stableSeed(`${dateText}|${timeText}`);
  return {
    year: ganzhi(seed + 7),
    month: ganzhi(seed + 19),
    day: ganzhi(seed + 31),
    hour: certainty === "unknown" ? l({ zh: "未知", en: "Unknown" }) : ganzhi(seed + hourIndex(timeText) * 5 + 43),
  };
}

function buildElements(dateText: string, timeText: string): ElementProfile[] {
  const seed = stableSeed(`${dateText}|${timeText}|elements`);
  return ELEMENT_NAMES.map((name, index) => {
    const percent = 34 + ((seed + index * 17) % 46);
    return { name, percent, level: elementLevel(percent) };
  });
}

function ganzhi(index: number): string {
  return `${STEMS[index % STEMS.length]}${BRANCHES[index % BRANCHES.length]}`;
}

function hourIndex(timeText: string): number {
  const match = /^(\d{1,2})/.exec(timeText.trim());
  const hour = match ? Number(match[1]) : 8;
  if (!Number.isFinite(hour)) return 4;
  return Math.max(0, Math.min(11, Math.floor(((hour + 1) % 24) / 2)));
}

function stableSeed(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 131 + input.charCodeAt(index)) % 1000003;
  }
  return hash;
}

function elementLevel(percent: number): string {
  if (percent < 42) return l({ zh: "偏弱", en: "Low" });
  if (percent < 54) return l({ zh: "需补", en: "Needs support" });
  if (percent < 66) return l({ zh: "可用", en: "Usable" });
  if (percent < 74) return l({ zh: "稳定", en: "Stable" });
  return l({ zh: "偏旺", en: "Strong" });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

function fallbackBaziReading(): BaziReading {
  return {
    career: l({ zh: "适合以稳定积累换长期机会，先建立可信成果，再争取更大的职责。", en: "Build steady proof before asking for larger responsibility or long-term opportunity." }),
    love: l({ zh: "关系里需要把期待说清楚，避免用沉默测试对方。", en: "Name expectations clearly instead of testing the other person through silence." }),
    year: l({ zh: "今年宜整理资源、人脉和节奏，机会会在准备充分后变得更顺。", en: "This year favors organizing resources, relationships, and rhythm before pushing harder." }),
    confidence_note: l({ zh: "示例解读：云端暂不可用时展示，用于体验流程。", en: "Sample reading shown when cloud interpretation is unavailable." }),
  };
}

function certaintyCopy(certainty: Certainty): { label: string; banner: string; subcopy: string } {
  const copy = CERTAINTY_COPY[certainty];
  return {
    label: l(copy.label),
    banner: l(copy.banner),
    subcopy: l(copy.subcopy),
  };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: mystic.bg,
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  hero: {
    gap: 6,
    paddingTop: 4,
  },
  heroTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  heroCopy: {
    flex: 1,
  },
  topActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  kicker: {
    color: mystic.gold,
    fontSize: 13,
    fontWeight: "800",
  },
  title: {
    color: mystic.goldSoft,
    fontFamily: mysticFonts.serif,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0,
  },
  subtitle: {
    color: mystic.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  formPanel: {
    borderRadius: 22,
    padding: 16,
    gap: 12,
    backgroundColor: mystic.panel,
    borderWidth: 1,
    borderColor: mystic.line,
  },
  field: {
    gap: 7,
  },
  label: {
    color: mystic.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  input: {
    minHeight: 48,
    borderRadius: 15,
    paddingHorizontal: 14,
    color: mystic.ink,
    backgroundColor: "rgba(8, 10, 10, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(217, 170, 77, 0.28)",
    fontSize: 15,
    fontWeight: "700",
  },
  segmented: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "rgba(255, 244, 214, 0.08)",
    borderWidth: 1,
    borderColor: mystic.line,
  },
  segmentActive: {
    backgroundColor: "rgba(217, 170, 77, 0.18)",
    borderColor: mystic.lineStrong,
  },
  segmentText: {
    color: mystic.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  segmentTextActive: {
    color: mystic.goldSoft,
  },
  disabled: {
    opacity: 0.6,
  },
  primaryAction: {
    minHeight: 66,
    borderRadius: 24,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(43, 31, 20, 0.96)",
    borderWidth: 2,
    borderColor: "rgba(242, 213, 138, 0.64)",
    shadowColor: mystic.gold,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 9 },
  },
  primaryActionDisabled: {
    opacity: 0.74,
  },
  actionSigil: {
    alignItems: "center",
    backgroundColor: "rgba(217, 170, 77, 0.2)",
    borderColor: "rgba(255, 232, 166, 0.7)",
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  actionSigilText: {
    color: mystic.goldSoft,
    fontFamily: "Songti SC",
    fontSize: 22,
    fontWeight: "900",
  },
  primaryText: {
    color: mystic.goldSoft,
    fontSize: 17,
    fontWeight: "900",
  },
  primarySub: {
    color: "rgba(255,248,230,0.78)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  confidenceBanner: {
    borderRadius: 16,
    padding: 13,
    backgroundColor: "rgba(74, 163, 145, 0.13)",
    borderWidth: 1,
    borderColor: "rgba(74, 163, 145, 0.28)",
  },
  confidenceLow: {
    backgroundColor: "rgba(190, 60, 45, 0.16)",
    borderColor: "rgba(190, 60, 45, 0.34)",
  },
  confidenceText: {
    color: "rgba(255,247,223,0.78)",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
  },
  pillarGrid: {
    flexDirection: "row",
    gap: 8,
  },
  pillar: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(7, 9, 11, 0.78)",
    borderWidth: 1,
    borderColor: mystic.line,
  },
  pillarMuted: {
    opacity: 0.7,
  },
  pillarLabel: {
    color: mystic.faint,
    fontSize: 11,
    fontWeight: "800",
  },
  pillarValue: {
    color: mystic.goldSoft,
    fontFamily: mysticFonts.serif,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 5,
  },
  elementPanel: {
    borderRadius: 20,
    padding: 15,
    gap: 12,
    backgroundColor: mystic.panel,
    borderWidth: 1,
    borderColor: mystic.line,
  },
  elementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  elementName: {
    width: 24,
    color: mystic.goldSoft,
    fontSize: 14,
    fontWeight: "900",
  },
  elementTrack: {
    flex: 1,
    height: 8,
    borderRadius: 99,
    overflow: "hidden",
    backgroundColor: "rgba(255, 244, 214, 0.12)",
  },
  elementFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: mystic.gold,
  },
  elementLevel: {
    width: 42,
    color: mystic.muted,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
  },
  readingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  readingTitle: {
    color: mystic.ink,
    fontSize: 20,
    fontWeight: "900",
  },
  sourceLabel: {
    color: mystic.gold,
    fontSize: 12,
    fontWeight: "900",
  },
  themeCards: {
    gap: 10,
  },
  themeCard: {
    borderRadius: 18,
    padding: 15,
    backgroundColor: mystic.panel,
    borderWidth: 1,
    borderColor: mystic.line,
  },
  themeTitle: {
    color: mystic.goldSoft,
    fontSize: 13,
    fontWeight: "900",
  },
  themeBody: {
    color: "rgba(255,247,223,0.82)",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    marginTop: 6,
  },
  note: {
    color: mystic.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  errorText: {
    color: "#a51f1a",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
  },
  footerNote: {
    color: mystic.faint,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
});
