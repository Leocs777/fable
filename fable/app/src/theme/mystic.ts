import { useEffect, useState } from "react";

export type AppThemeMode = "dark" | "light";

type MysticPalette = {
  bg: string;
  bgDeep: string;
  panel: string;
  panelSoft: string;
  panelWarm: string;
  ink: string;
  muted: string;
  faint: string;
  line: string;
  lineStrong: string;
  gold: string;
  goldSoft: string;
  cinnabar: string;
  cinnabarDark: string;
  jade: string;
  teal: string;
  nightJade: string;
  dangerPanel: string;
};

export const darkMystic: MysticPalette = {
  bg: "#0f1417",
  bgDeep: "#07090b",
  panel: "rgba(29, 31, 28, 0.82)",
  panelSoft: "rgba(255, 244, 214, 0.08)",
  panelWarm: "rgba(91, 48, 30, 0.32)",
  ink: "#fff7df",
  muted: "rgba(255, 247, 223, 0.66)",
  faint: "rgba(255, 247, 223, 0.42)",
  line: "rgba(220, 178, 91, 0.22)",
  lineStrong: "rgba(220, 178, 91, 0.46)",
  gold: "#d9aa4d",
  goldSoft: "#f2d58a",
  cinnabar: "#be3c2d",
  cinnabarDark: "#7f2018",
  jade: "#4aa391",
  teal: "#2fbbb4",
  nightJade: "#14352f",
  dangerPanel: "rgba(126, 32, 24, 0.24)",
};

export const lightMystic: MysticPalette = {
  bg: "#f6efe3",
  bgDeep: "#ede0cd",
  panel: "rgba(255, 251, 242, 0.9)",
  panelSoft: "rgba(97, 68, 35, 0.07)",
  panelWarm: "rgba(154, 87, 49, 0.12)",
  ink: "#2d251b",
  muted: "rgba(45, 37, 27, 0.68)",
  faint: "rgba(45, 37, 27, 0.44)",
  line: "rgba(132, 92, 45, 0.2)",
  lineStrong: "rgba(132, 92, 45, 0.38)",
  gold: "#a76f24",
  goldSoft: "#6f4d20",
  cinnabar: "#a44736",
  cinnabarDark: "#7c2d24",
  jade: "#2c7d70",
  teal: "#187c7a",
  nightJade: "#dcebe4",
  dangerPanel: "rgba(164, 71, 54, 0.12)",
};

export const mystic = darkMystic;

export const mysticFonts = {
  serif: "Songti SC",
  sans: "PingFang SC",
};

let themeMode: AppThemeMode = "dark";
const themeListeners = new Set<() => void>();

export function currentThemeMode(): AppThemeMode {
  return themeMode;
}

export function currentMysticTheme(): MysticPalette {
  return themeMode === "light" ? lightMystic : darkMystic;
}

export function setThemeMode(nextMode: AppThemeMode): void {
  if (themeMode === nextMode) return;
  themeMode = nextMode;
  themeListeners.forEach((listener) => listener());
}

export function toggleThemeMode(): AppThemeMode {
  const nextMode: AppThemeMode = themeMode === "light" ? "dark" : "light";
  setThemeMode(nextMode);
  return nextMode;
}

export function useThemeMode(): AppThemeMode {
  const [mode, setMode] = useState<AppThemeMode>(() => currentThemeMode());

  useEffect(() => {
    const listener = () => setMode(currentThemeMode());
    themeListeners.add(listener);
    return () => {
      themeListeners.delete(listener);
    };
  }, []);

  return mode;
}

export function useMysticTheme(): MysticPalette {
  const mode = useThemeMode();
  return mode === "light" ? lightMystic : darkMystic;
}
