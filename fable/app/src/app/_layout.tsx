import { Tabs } from "expo-router";
import { StyleSheet, Text, View, type ColorValue } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";

import { l, useAppLanguage } from "@/lib/i18n";
import { mystic, useMysticTheme, useThemeMode } from "@/theme/mystic";

type TabGlyphKind = "wengua" | "bazi" | "fengshui";

export default function RootLayout() {
  const language = useAppLanguage();
  const theme = useMysticTheme();
  const light = useThemeMode() === "light";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={light ? "dark" : "light"} />
      <Tabs
        key={language}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.goldSoft,
          tabBarInactiveTintColor: theme.faint,
          tabBarStyle: {
            backgroundColor: light ? "#fff8eb" : "#0b0d0f",
            borderTopColor: theme.line,
            height: 74,
            paddingBottom: 10,
            paddingTop: 7,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "900",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: l({ zh: "问卦", en: "Oracle" }),
            tabBarIcon: ({ color, focused }) => <TabBarGlyph kind="wengua" color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="bazi"
          options={{
            title: l({ zh: "八字", en: "Birth Chart" }),
            tabBarIcon: ({ color, focused }) => <TabBarGlyph kind="bazi" color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="fengshui"
          options={{
            title: l({ zh: "风水", en: "Feng Shui" }),
            tabBarIcon: ({ color, focused }) => <TabBarGlyph kind="fengshui" color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="reading-result"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="daily-gua"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </GestureHandlerRootView>
  );
}

function TabBarGlyph({ kind, color, focused }: { kind: TabGlyphKind; color: ColorValue; focused: boolean }) {
  const shellStyle = [
    styles.glyphShell,
    {
      backgroundColor: focused ? "rgba(217, 170, 77, 0.18)" : "rgba(255, 244, 214, 0.045)",
      borderColor: focused ? "rgba(242, 213, 138, 0.74)" : "rgba(255, 244, 214, 0.18)",
    },
  ];

  if (kind === "wengua") {
    return (
      <View style={shellStyle}>
        <View style={[styles.coinGlyph, { borderColor: color }]}>
          <View style={[styles.coinHole, { backgroundColor: focused ? "#1d130b" : "rgba(255,244,214,0.28)" }]} />
        </View>
      </View>
    );
  }

  if (kind === "bazi") {
    return (
      <View style={shellStyle}>
        <View style={styles.baziGlyph}>
          {(l({ zh: "年,月,日,时", en: "Y,M,D,H" }).split(",")).map((label) => (
            <View key={label} style={[styles.baziPillar, { borderColor: color }]}>
              <Text style={[styles.baziGlyphText, { color }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={shellStyle}>
      <View style={[styles.compassGlyph, { borderColor: color }]}>
        <View style={[styles.compassNeedle, { backgroundColor: color }]} />
        <View style={[styles.compassNeedleCross, { backgroundColor: focused ? mystic.jade : "rgba(255,244,214,0.36)" }]} />
        <View style={[styles.compassCenter, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glyphShell: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    marginBottom: 2,
    width: 34,
  },
  coinGlyph: {
    alignItems: "center",
    backgroundColor: "rgba(184, 118, 43, 0.78)",
    borderRadius: 999,
    borderWidth: 2,
    height: 23,
    justifyContent: "center",
    width: 23,
  },
  coinHole: {
    borderRadius: 3,
    height: 8,
    width: 8,
  },
  baziGlyph: {
    flexDirection: "row",
    gap: 2,
  },
  baziPillar: {
    alignItems: "center",
    backgroundColor: "rgba(35, 27, 19, 0.78)",
    borderRadius: 4,
    borderWidth: 1,
    height: 23,
    justifyContent: "center",
    width: 7,
  },
  baziGlyphText: {
    fontFamily: "Songti SC",
    fontSize: 6,
    fontWeight: "900",
    lineHeight: 7,
  },
  compassGlyph: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1.5,
    height: 24,
    justifyContent: "center",
    position: "relative",
    width: 24,
  },
  compassNeedle: {
    borderRadius: 999,
    height: 2,
    position: "absolute",
    transform: [{ rotate: "-38deg" }],
    width: 17,
  },
  compassNeedleCross: {
    borderRadius: 999,
    height: 2,
    position: "absolute",
    transform: [{ rotate: "38deg" }],
    width: 15,
  },
  compassCenter: {
    borderRadius: 999,
    height: 5,
    width: 5,
  },
});
