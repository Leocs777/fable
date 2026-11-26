import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { l, useAppLanguage, type LocalizedCopy } from "@/lib/i18n";
import { useMysticTheme, useThemeMode } from "@/theme/mystic";

type ModuleKey = "wengua" | "bazi" | "fengshui";

type Props = {
  active: ModuleKey;
};

const MODULES: { key: ModuleKey; label: LocalizedCopy; description: LocalizedCopy; href: "/" | "/bazi" | "/fengshui" }[] = [
  {
    key: "wengua",
    label: { zh: "问卦", en: "Oracle" },
    description: {
      zh: "适合心里有一件具体事情时使用，例如选择、时机、关系或下一步行动。",
      en: "Ask one specific question about timing, choices, relationships, or your next step.",
    },
    href: "/",
  },
  {
    key: "bazi",
    label: { zh: "八字", en: "Birth Chart" },
    description: {
      zh: "根据出生日期与时辰生成四柱命盘，适合看长期性格、事业节奏、关系模式和年度趋势。",
      en: "A Ba Zi birth chart uses your birth date and time to read long-term patterns: personality, career rhythm, relationships, and yearly themes.",
    },
    href: "/bazi",
  },
  {
    key: "fengshui",
    label: { zh: "风水", en: "Feng Shui" },
    description: {
      zh: "根据房间类型、朝向和布局给出低成本空间调整建议，适合优化居住舒适度。",
      en: "Feng Shui gives practical room-layout suggestions from room type, direction, and key furniture placement.",
    },
    href: "/fengshui",
  },
];

export function ModuleSwitch({ active }: Props) {
  useAppLanguage();
  const router = useRouter();
  const theme = useMysticTheme();
  const light = useThemeMode() === "light";
  const activeModule = MODULES.find((item) => item.key === active) ?? MODULES[0];

  return (
    <View style={styles.moduleBlock}>
      <View style={[styles.moduleTabs, { backgroundColor: light ? "rgba(255, 251, 242, 0.74)" : "rgba(13, 16, 15, 0.74)", borderColor: theme.lineStrong }]}>
        {MODULES.map((item) => {
          const selected = item.key === active;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${l(item.label)}. ${l(item.description)}`}
              disabled={selected}
              onPress={() => router.push(item.href)}
              style={[
                styles.moduleTab,
                {
                  backgroundColor: light ? "rgba(255, 255, 255, 0.52)" : "rgba(255, 244, 214, 0.055)",
                  borderColor: theme.line,
                },
                selected && { backgroundColor: light ? "rgba(167, 111, 36, 0.13)" : "rgba(217, 170, 77, 0.2)", borderColor: theme.lineStrong },
              ]}
            >
              <ModuleIcon moduleKey={item.key} selected={selected} />
              <Text style={[styles.moduleTabText, { color: selected ? theme.goldSoft : theme.muted }]} numberOfLines={1}>{l(item.label)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.moduleExplain, { backgroundColor: light ? "rgba(255, 255, 255, 0.5)" : "rgba(255, 244, 214, 0.055)", borderColor: light ? "rgba(44, 125, 112, 0.2)" : "rgba(122, 212, 181, 0.18)" }]}>
        <Text style={[styles.moduleExplainTitle, { color: theme.goldSoft }]}>{l(activeModule.label)}</Text>
        <Text style={[styles.moduleExplainText, { color: theme.muted }]}>{l(activeModule.description)}</Text>
      </View>
    </View>
  );
}

function ModuleIcon({ moduleKey, selected }: { moduleKey: ModuleKey; selected: boolean }) {
  const theme = useMysticTheme();
  const light = useThemeMode() === "light";
  const shellStyle = [
    styles.moduleIcon,
    {
      backgroundColor: selected
        ? light ? "rgba(167, 111, 36, 0.18)" : "rgba(104, 67, 28, 0.86)"
        : light ? "rgba(255, 251, 242, 0.9)" : "rgba(40, 29, 18, 0.82)",
      borderColor: selected ? theme.lineStrong : theme.line,
    },
  ];

  if (moduleKey === "wengua") {
    return (
      <View style={shellStyle}>
        <View style={styles.coinIcon}>
          <View style={styles.coinHole} />
        </View>
      </View>
    );
  }
  if (moduleKey === "bazi") {
    return (
      <View style={shellStyle}>
        <View style={styles.pillarIcon}>
          {["甲", "子", "日", "时"].map((label) => (
            <Text key={label} style={[styles.pillarIconText, { color: light ? theme.goldSoft : "rgba(255, 236, 170, 0.92)" }]}>{label}</Text>
          ))}
        </View>
      </View>
    );
  }
  return (
    <View style={shellStyle}>
      <View style={styles.fengshuiIcon}>
        <View style={styles.fengshuiNeedle} />
        <View style={styles.fengshuiNeedleCross} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  moduleBlock: {
    gap: 8,
  },
  moduleTabs: {
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 6,
  },
  moduleTab: {
    alignItems: "center",
    borderRadius: 17,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 6,
  },
  moduleTabActive: {
  },
  moduleTabText: {
    fontSize: 14,
    fontWeight: "900",
  },
  moduleTabTextActive: {
  },
  moduleExplain: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  moduleExplainTitle: {
    fontSize: 12,
    fontWeight: "900",
  },
  moduleExplainText: {
    fontSize: 12,
    lineHeight: 17,
  },
  moduleIcon: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  moduleIconActive: {
  },
  coinIcon: {
    alignItems: "center",
    backgroundColor: "rgba(204, 144, 61, 0.9)",
    borderColor: "rgba(255, 235, 168, 0.75)",
    borderRadius: 999,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  coinHole: {
    backgroundColor: "rgba(42, 25, 12, 0.86)",
    borderRadius: 2,
    height: 7,
    width: 7,
  },
  pillarIcon: {
    flexDirection: "row",
    gap: 1,
  },
  pillarIconText: {
    fontFamily: "Songti SC",
    fontSize: 8,
    fontWeight: "900",
  },
  fengshuiIcon: {
    borderColor: "rgba(242, 213, 138, 0.72)",
    borderRadius: 999,
    borderWidth: 1,
    height: 21,
    position: "relative",
    width: 21,
  },
  fengshuiNeedle: {
    backgroundColor: "rgba(151, 244, 218, 0.86)",
    borderRadius: 999,
    height: 2,
    left: 4,
    position: "absolute",
    top: 9,
    transform: [{ rotate: "-38deg" }],
    width: 13,
  },
  fengshuiNeedleCross: {
    backgroundColor: "rgba(255, 231, 156, 0.8)",
    borderRadius: 999,
    height: 2,
    left: 4,
    position: "absolute",
    top: 9,
    transform: [{ rotate: "38deg" }],
    width: 13,
  },
});
