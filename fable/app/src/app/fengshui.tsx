import { useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ModuleSwitch } from "@/components/ModuleSwitch";
import { CloudConsentModal, acceptCloudConsent, hasCloudConsent } from "@/components/CloudConsent";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MysticBackdrop } from "@/components/MysticBackdrop";
import { ThemeToggle } from "@/components/ThemeToggle";
import { interpretFengshui, type FengshuiReading } from "@/lib/api";
import { l, useAppLanguage, type LocalizedCopy } from "@/lib/i18n";
import { mystic, mysticFonts, useMysticTheme } from "@/theme/mystic";

type WorkStatus = "idle" | "loading" | "done" | "fallback";

const ROOM_TYPES = ["卧室", "书房", "客厅", "厨房"] as const;
const DIRECTIONS = ["东", "东南", "南", "西南", "西", "西北", "北", "东北"] as const;
const LAYOUT_CHOICES = ["门在左侧", "窗在右侧", "床靠北墙", "桌面朝东"] as const;

type RoomType = (typeof ROOM_TYPES)[number];
type Direction = (typeof DIRECTIONS)[number];
type LayoutChoice = (typeof LAYOUT_CHOICES)[number];

const ROOM_COPY: Record<RoomType, LocalizedCopy> = {
  卧室: { zh: "卧室", en: "Bedroom" },
  书房: { zh: "书房", en: "Study" },
  客厅: { zh: "客厅", en: "Living room" },
  厨房: { zh: "厨房", en: "Kitchen" },
};
const DIRECTION_COPY: Record<Direction, LocalizedCopy> = {
  东: { zh: "东", en: "East" },
  东南: { zh: "东南", en: "Southeast" },
  南: { zh: "南", en: "South" },
  西南: { zh: "西南", en: "Southwest" },
  西: { zh: "西", en: "West" },
  西北: { zh: "西北", en: "Northwest" },
  北: { zh: "北", en: "North" },
  东北: { zh: "东北", en: "Northeast" },
};
const LAYOUT_COPY: Record<LayoutChoice, LocalizedCopy> = {
  门在左侧: { zh: "门在左侧", en: "Door on left" },
  窗在右侧: { zh: "窗在右侧", en: "Window on right" },
  床靠北墙: { zh: "床靠北墙", en: "Bed on north wall" },
  桌面朝东: { zh: "桌面朝东", en: "Desk faces east" },
};

export default function FengshuiScreen() {
  useAppLanguage();
  const theme = useMysticTheme();
  const insets = useSafeAreaInsets();
  const requestIdRef = useRef(0);
  const [roomType, setRoomType] = useState<RoomType>("卧室");
  const [direction, setDirection] = useState<Direction>("东");
  const [layout, setLayout] = useState<LayoutChoice[]>(["门在左侧", "窗在右侧", "床靠北墙", "桌面朝东"]);
  const [status, setStatus] = useState<WorkStatus>("idle");
  const [reading, setReading] = useState<FengshuiReading | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cloudConsentVisible, setCloudConsentVisible] = useState(false);

  const busy = status === "loading";
  const suggestions = reading?.suggestions.length ? reading.suggestions : fengshuiFallback(roomType, direction);
  const notePrefix = status === "done" ? l({ zh: "AI 解读", en: "AI reading" }) : status === "fallback" ? l({ zh: "示例建议", en: "Sample tips" }) : l({ zh: "Lite 预览", en: "Lite preview" });
  const note = reading?.note || fallbackNote();

  const toggleLayout = (choice: LayoutChoice) => {
    if (busy) return;
    setLayout((items) => (items.includes(choice) ? items.filter((item) => item !== choice) : [...items, choice]));
  };

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
    setStatus("loading");
    setReading(null);
    setErr(null);

    try {
      const nextReading = await interpretFengshui({ roomType, direction, layout });
      if (requestId !== requestIdRef.current) return;
      if (nextReading.suggestions.length === 0) throw new Error("empty suggestions");
      setReading(nextReading);
      setStatus("done");
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setReading({ suggestions: fengshuiFallback(roomType, direction), note: fallbackNote() });
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
            <Text style={[styles.kicker, { color: theme.gold }]}>{l({ zh: "风水 Lite", en: "Feng Shui Lite" })}</Text>
            <Text style={[styles.title, { color: theme.goldSoft }]}>{l({ zh: "居家风水", en: "Home Feng Shui" })}</Text>
          </View>
          <View style={styles.topActions}>
            <ThemeToggle />
            <LanguageToggle />
          </View>
        </View>
        <Text style={[styles.subtitle, { color: theme.muted }]}>{l({ zh: "手动输入房间、朝向和关键布局，输出可执行的低成本整改清单。", en: "Enter room type, direction, and layout markers to get a practical low-cost adjustment list." })}</Text>
      </View>

      <ModuleSwitch active="fengshui" />

      <View style={[styles.panel, { backgroundColor: theme.panel, borderColor: theme.line }]}>
        <ChipGroup title={l({ zh: "房间类型", en: "Room type" })}>
          {ROOM_TYPES.map((item) => (
            <ChoiceChip key={item} label={l(ROOM_COPY[item])} active={item === roomType} disabled={busy} onPress={() => setRoomType(item)} />
          ))}
        </ChipGroup>

        <ChipGroup title={l({ zh: "主要朝向", en: "Main direction" })}>
          {DIRECTIONS.map((item) => (
            <ChoiceChip key={item} label={l(DIRECTION_COPY[item])} active={item === direction} disabled={busy} onPress={() => setDirection(item)} compact />
          ))}
        </ChipGroup>

        <ChipGroup title={l({ zh: "房间布局", en: "Room layout" })}>
          {LAYOUT_CHOICES.map((item) => (
            <ChoiceChip key={item} label={l(LAYOUT_COPY[item])} active={layout.includes(item)} disabled={busy} onPress={() => toggleLayout(item)} />
          ))}
        </ChipGroup>

        <Pressable accessibilityRole="button" disabled={busy} onPress={run} style={[styles.primaryAction, busy && styles.primaryActionDisabled]}>
          {busy ? <ActivityIndicator color="#fff8e6" /> : null}
          {!busy ? (
            <View style={styles.actionCompass}>
              <View style={styles.actionCompassNeedle} />
              <View style={styles.actionCompassNeedleCross} />
            </View>
          ) : null}
          <View>
            <Text style={styles.primaryText}>{busy ? l({ zh: "正在生成建议...", en: "Generating tips..." }) : l({ zh: "生成建议", en: "Generate tips" })}</Text>
            <Text style={styles.primarySub}>{busy ? l({ zh: "Worker 正在生成 6 条整改建议", en: "Worker is generating six practical tips" }) : l({ zh: `输出 ${roomType} 可执行整改清单`, en: `Create an actionable list for ${l(ROOM_COPY[roomType])}` })}</Text>
          </View>
        </Pressable>
      </View>

      <RoomMap roomType={roomType} direction={direction} layout={layout} />

      <View style={styles.confidenceBanner}>
        <Text style={styles.confidenceText}>{notePrefix} · {note}</Text>
      </View>

      <View style={styles.checklist}>
        {suggestions.slice(0, 6).map((suggestion, index) => (
          <View key={`${index}-${suggestion}`} style={styles.suggestionRow}>
            <Text style={styles.suggestionIndex}>{index + 1}</Text>
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </View>
        ))}
      </View>

      {err ? <Text style={styles.errorText}>{l({ zh: `云端解读暂时失败：${err}。当前展示示例建议。`, en: `Cloud reading failed for now: ${err}. Showing sample tips.` })}</Text> : null}
      <Text style={styles.footerNote}>{l({ zh: "风水 Lite 只基于手工输入，不使用摄像头或上传户型图。建议为文化与居住舒适参考，不替代专业设计、建筑安全或消防意见。", en: "Feng Shui Lite uses manual input only. It does not use the camera or upload floor plans. Tips are cultural and comfort references, not professional design, building safety, or fire-safety advice." })}</Text>
      <CloudConsentModal
        visible={cloudConsentVisible}
        moduleName={l({ zh: "风水 Lite", en: "Feng Shui Lite" })}
        detail={l({ zh: "仅发送房间类型、朝向与手动选择的布局标签，用于生成整改建议；不会调用摄像头或上传户型图。", en: "Only room type, direction, and selected layout labels are sent to generate tips. The camera is not used and no floor plan is uploaded." })}
        onCancel={() => setCloudConsentVisible(false)}
        onAccept={acceptConsentAndRun}
      />
    </ScrollView>
  );
}

function ChipGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.chipWrap}>{children}</View>
    </View>
  );
}

function ChoiceChip({
  label,
  active,
  disabled,
  compact = false,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  compact?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.choiceChip, compact && styles.choiceChipCompact, active && styles.choiceChipActive, disabled && styles.disabled]}
    >
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

function RoomMap({ roomType, direction, layout }: { roomType: RoomType; direction: Direction; layout: LayoutChoice[] }) {
  return (
    <View style={styles.mapCard}>
      <View style={styles.roomMap}>
        <Text style={styles.mapCompass}>{l({ zh: `朝向：${direction} · ${roomType}`, en: `Direction: ${l(DIRECTION_COPY[direction])} · ${l(ROOM_COPY[roomType])}` })}</Text>
        {layout.includes("门在左侧") ? <MapTag label={l({ zh: "门", en: "Door" })} style={styles.mapDoor} /> : null}
        {layout.includes("窗在右侧") ? <MapTag label={l({ zh: "窗", en: "Window" })} style={styles.mapWindow} /> : null}
        {layout.includes("床靠北墙") ? <MapTag label={l({ zh: "床", en: "Bed" })} style={styles.mapBed} /> : null}
        {layout.includes("桌面朝东") ? <MapTag label={l({ zh: "桌", en: "Desk" })} style={styles.mapDesk} /> : null}
        <View style={styles.mapCenterLine} />
      </View>
    </View>
  );
}

function MapTag({ label, style }: { label: string; style: object }) {
  return (
    <View style={[styles.mapTag, style]}>
      <Text style={styles.mapTagText}>{label}</Text>
    </View>
  );
}

function fengshuiFallback(type: RoomType, direction: Direction): string[] {
  const roomSpecific: Record<RoomType, string> = {
    卧室: "床头保持靠实墙，床边至少留出一侧顺畅通道，先稳睡眠区。",
    书房: "书桌避免背门而坐，优先让座位后方有墙或高柜形成支撑。",
    客厅: "沙发宜靠实墙，主通道保持开阔，避免一进门直接被杂物阻断。",
    厨房: "水火区域保持清楚分区，台面减少堆叠，优先处理潮湿和油烟。",
  };
  const directionSpecific: Record<Direction, string> = {
    东: "朝东空间适合保持清晨采光，入口处不要堆放高物。",
    东南: "东南向可用绿植或木质收纳增强清爽感，但不要挡窗。",
    南: "南向光强，建议用柔和窗帘调光，避免过亮影响休息。",
    西南: "西南向宜稳定、低饱和配色，减少厚重杂物。",
    西: "西晒位置注意隔热，傍晚强光处不宜放长时间办公位。",
    西北: "西北角保持整洁有序，适合放稳定收纳，不宜堆临时物。",
    北: "北向偏冷，建议补暖光和柔软材质，提升舒适度。",
    东北: "东北角适合保持安静和低杂物，避免变成杂物集中区。",
  };
  return [
    l({ zh: roomSpecific[type], en: roomFallbackEn(type) }),
    l({ zh: directionSpecific[direction], en: directionFallbackEn(direction) }),
    l({ zh: "门口到核心家具之间留出连续动线，减少进出时的阻滞感。", en: "Keep a continuous path from the doorway to core furniture to reduce friction." }),
    l({ zh: "窗边先保留采光和通风，不用高柜或杂物压住主光源。", en: "Keep light and airflow clear near windows; avoid tall cabinets or clutter blocking the main light source." }),
    l({ zh: "暗角用一盏暖色辅助光处理，比增加装饰物更有效。", en: "Use one warm auxiliary light in dark corners; it helps more than extra decoration." }),
    l({ zh: "床、桌、沙发等高频位置旁边保留一个可随手收纳的低矮容器。", en: "Place a low easy-reach storage container near high-use spots like the bed, desk, or sofa." }),
  ];
}

function fallbackNote(): string {
  return l({ zh: "以下为风水 Lite 手工输入建议，适合先做低成本调整。", en: "These are Feng Shui Lite suggestions from manual input, suitable for low-cost adjustments first." });
}

function roomFallbackEn(type: RoomType): string {
  const copy: Record<RoomType, string> = {
    卧室: "Keep the bedhead against a solid wall and leave at least one clear side path to stabilize the sleep zone.",
    书房: "Avoid sitting with your back directly to the door; prefer a wall or tall cabinet behind the seat.",
    客厅: "Let the sofa rest against a solid wall and keep the main path open, especially near the entrance.",
    厨房: "Keep water and heat zones clearly separated, reduce countertop stacking, and handle dampness or grease first.",
  };
  return copy[type];
}

function directionFallbackEn(direction: Direction): string {
  const copy: Record<Direction, string> = {
    东: "East-facing spaces benefit from morning light; avoid tall piles near the entry.",
    东南: "For southeast rooms, use plants or wood storage for freshness without blocking windows.",
    南: "South-facing rooms can be bright; soften light with curtains so rest zones do not feel harsh.",
    西南: "Southwest rooms favor stable, low-saturation colors and less heavy clutter.",
    西: "For western sun exposure, manage heat and avoid placing long work sessions in strong late light.",
    西北: "Keep the northwest corner orderly; stable storage works better than temporary piles.",
    北: "North-facing rooms can feel cool; add warm light and softer materials for comfort.",
    东北: "Keep the northeast corner quiet and uncluttered rather than letting it become a storage zone.",
  };
  return copy[direction];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
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
  },
  subtitle: {
    color: mystic.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  panel: {
    borderRadius: 22,
    padding: 16,
    gap: 14,
    backgroundColor: mystic.panel,
    borderWidth: 1,
    borderColor: mystic.line,
  },
  group: {
    gap: 8,
  },
  groupTitle: {
    color: mystic.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceChip: {
    minHeight: 42,
    minWidth: 92,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255, 244, 214, 0.08)",
    borderWidth: 1,
    borderColor: mystic.line,
  },
  choiceChipCompact: {
    minWidth: 68,
  },
  choiceChipActive: {
    backgroundColor: "rgba(217, 170, 77, 0.18)",
    borderColor: mystic.lineStrong,
  },
  choiceText: {
    color: mystic.muted,
    fontSize: 13,
    fontWeight: "900",
  },
  choiceTextActive: {
    color: mystic.goldSoft,
  },
  disabled: {
    opacity: 0.62,
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
  actionCompass: {
    borderColor: "rgba(255, 232, 166, 0.7)",
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    position: "relative",
    width: 42,
  },
  actionCompassNeedle: {
    backgroundColor: "rgba(151, 244, 218, 0.9)",
    borderRadius: 999,
    height: 3,
    left: 9,
    position: "absolute",
    top: 19,
    transform: [{ rotate: "-38deg" }],
    width: 24,
  },
  actionCompassNeedleCross: {
    backgroundColor: "rgba(255, 232, 166, 0.9)",
    borderRadius: 999,
    height: 3,
    left: 9,
    position: "absolute",
    top: 19,
    transform: [{ rotate: "38deg" }],
    width: 24,
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
  mapCard: {
    borderRadius: 24,
    padding: 14,
    backgroundColor: "rgba(7, 9, 11, 0.82)",
    borderWidth: 1,
    borderColor: mystic.lineStrong,
  },
  roomMap: {
    height: 220,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: mystic.gold,
    backgroundColor: "#121713",
    position: "relative",
    overflow: "hidden",
  },
  mapCompass: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    color: mystic.goldSoft,
    fontSize: 13,
    fontWeight: "900",
    zIndex: 3,
  },
  mapCenterLine: {
    position: "absolute",
    left: "18%",
    right: "18%",
    top: "48%",
    height: 1,
    backgroundColor: "rgba(217, 170, 77, 0.24)",
  },
  mapTag: {
    position: "absolute",
    minWidth: 48,
    minHeight: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(242, 213, 138, 0.9)",
    borderWidth: 1,
    borderColor: mystic.gold,
  },
  mapTagText: {
    color: "#2b2118",
    fontSize: 15,
    fontWeight: "900",
  },
  mapDoor: {
    left: 10,
    bottom: 72,
  },
  mapWindow: {
    right: 10,
    top: 72,
  },
  mapBed: {
    left: 82,
    top: 44,
    width: 118,
    height: 54,
  },
  mapDesk: {
    right: 54,
    bottom: 36,
    width: 78,
    height: 44,
  },
  confidenceBanner: {
    borderRadius: 16,
    padding: 13,
    backgroundColor: "rgba(74, 163, 145, 0.13)",
    borderWidth: 1,
    borderColor: "rgba(74, 163, 145, 0.28)",
  },
  confidenceText: {
    color: "rgba(255,247,223,0.78)",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
  },
  checklist: {
    gap: 10,
  },
  suggestionRow: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: mystic.panel,
    borderWidth: 1,
    borderColor: mystic.line,
  },
  suggestionIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: "center",
    lineHeight: 28,
    overflow: "hidden",
    color: "#fff8e6",
    backgroundColor: mystic.gold,
    fontSize: 14,
    fontWeight: "900",
  },
  suggestionText: {
    flex: 1,
    color: "rgba(255,247,223,0.84)",
    fontSize: 14,
    lineHeight: 21,
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
