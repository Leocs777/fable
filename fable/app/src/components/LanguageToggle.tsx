import { Pressable, StyleSheet, Text } from "react-native";

import { l, toggleAppLanguage, useAppLanguage } from "@/lib/i18n";
import { useMysticTheme, useThemeMode } from "@/theme/mystic";

export function LanguageToggle() {
  const language = useAppLanguage();
  const theme = useMysticTheme();
  const light = useThemeMode() === "light";
  const nextLabel = language === "zh" ? "EN" : "中";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={l({ zh: "切换语言", en: "Switch language" })}
      hitSlop={8}
      onPress={toggleAppLanguage}
      style={[
        styles.button,
        {
          backgroundColor: light ? "rgba(255,255,255,0.72)" : "rgba(255, 244, 214, 0.08)",
          borderColor: theme.lineStrong,
        },
      ]}
    >
      <Text style={[styles.activeLabel, { color: theme.ink }]}>{language === "zh" ? "中文" : "EN"}</Text>
      <Text style={[styles.nextLabel, { color: theme.muted }]}>{nextLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 244, 214, 0.08)",
    borderColor: "rgba(242, 213, 138, 0.34)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  activeLabel: {
    fontFamily: "PingFang SC",
    fontSize: 13,
    fontWeight: "900",
  },
  nextLabel: {
    fontFamily: "PingFang SC",
    fontSize: 11,
    fontWeight: "800",
  },
});
