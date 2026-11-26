import { StyleSheet, View } from "react-native";

import { useMysticTheme, useThemeMode } from "@/theme/mystic";

export function MysticBackdrop() {
  const theme = useMysticTheme();
  const light = useThemeMode() === "light";

  return (
    <View pointerEvents="none" style={[styles.backdrop, { backgroundColor: theme.bg }]}>
      <View style={[styles.redMist, { backgroundColor: light ? "rgba(164, 71, 54, 0.09)" : "rgba(126, 32, 24, 0.16)" }]} />
      <View style={[styles.jadeMist, { backgroundColor: light ? "rgba(44, 125, 112, 0.13)" : "rgba(20, 63, 54, 0.32)" }]} />
      <View style={[styles.luopanOuter, { borderColor: light ? "rgba(132, 92, 45, 0.14)" : "rgba(217, 170, 77, 0.18)" }]} />
      <View style={[styles.luopanInner, { borderColor: light ? "rgba(132, 92, 45, 0.22)" : "rgba(217, 170, 77, 0.28)" }]} />
      <View style={[styles.star, styles.starOne, { backgroundColor: light ? "rgba(167, 111, 36, 0.44)" : "rgba(242, 213, 138, 0.76)" }]} />
      <View style={[styles.star, styles.starTwo, { backgroundColor: light ? "rgba(44, 125, 112, 0.42)" : "rgba(242, 213, 138, 0.76)" }]} />
      <View style={[styles.star, styles.starThree, { backgroundColor: light ? "rgba(167, 111, 36, 0.4)" : "rgba(242, 213, 138, 0.76)" }]} />
      <View style={[styles.star, styles.starFour, { backgroundColor: light ? "rgba(44, 125, 112, 0.38)" : "rgba(242, 213, 138, 0.76)" }]} />
      <View style={[styles.threadOne, { backgroundColor: light ? "rgba(132, 92, 45, 0.11)" : "rgba(217, 170, 77, 0.16)" }]} />
      <View style={[styles.threadTwo, { backgroundColor: light ? "rgba(44, 125, 112, 0.11)" : "rgba(74, 163, 145, 0.16)" }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  redMist: {
    position: "absolute",
    left: -160,
    top: -140,
    height: 360,
    width: 340,
    borderRadius: 110,
    transform: [{ rotate: "-18deg" }, { scaleX: 1.45 }],
  },
  jadeMist: {
    position: "absolute",
    right: -80,
    top: 160,
    height: 300,
    width: 260,
    borderRadius: 150,
    transform: [{ rotate: "-18deg" }],
  },
  luopanOuter: {
    position: "absolute",
    right: -96,
    top: 28,
    height: 250,
    width: 250,
    borderRadius: 125,
    borderWidth: 1,
  },
  luopanInner: {
    position: "absolute",
    right: -46,
    top: 78,
    height: 150,
    width: 150,
    borderRadius: 75,
    borderWidth: 1,
  },
  star: {
    position: "absolute",
    height: 3,
    width: 3,
    borderRadius: 2,
  },
  starOne: {
    left: "16%",
    top: 112,
  },
  starTwo: {
    left: "39%",
    top: 66,
  },
  starThree: {
    right: "18%",
    top: 312,
  },
  starFour: {
    left: "26%",
    top: 518,
  },
  threadOne: {
    position: "absolute",
    left: -30,
    top: 232,
    height: 1,
    width: 210,
    transform: [{ rotate: "-22deg" }],
  },
  threadTwo: {
    position: "absolute",
    right: -18,
    top: 456,
    height: 1,
    width: 180,
    transform: [{ rotate: "31deg" }],
  },
});
