import { useEffect, useState } from "react";
import { NativeModules, Platform } from "react-native";

export type AppLanguage = "zh" | "en";
export type LocalizedCopy = { zh: string; en: string };
export type CoreMethodKey = "liuyao" | "meihua" | "qimen" | "daliuren";

let cachedLanguage: AppLanguage | null = null;
let languageOverride: AppLanguage | null = null;
const languageListeners = new Set<() => void>();

export function appLanguage(): AppLanguage {
  if (languageOverride) return languageOverride;
  if (cachedLanguage) return cachedLanguage;
  cachedLanguage = detectLanguage();
  return cachedLanguage;
}

export function setAppLanguage(language: AppLanguage): void {
  languageOverride = language;
  cachedLanguage = language;
  languageListeners.forEach((listener) => listener());
}

export function toggleAppLanguage(): AppLanguage {
  const nextLanguage = appLanguage() === "zh" ? "en" : "zh";
  setAppLanguage(nextLanguage);
  return nextLanguage;
}

export function useAppLanguage(): AppLanguage {
  const [language, setLanguageState] = useState<AppLanguage>(() => appLanguage());

  useEffect(() => {
    const listener = () => setLanguageState(appLanguage());
    languageListeners.add(listener);
    return () => {
      languageListeners.delete(listener);
    };
  }, []);

  return language;
}

export function appLocale(): "zh-CN" | "en-US" {
  return appLanguage() === "zh" ? "zh-CN" : "en-US";
}

export function l(copy: LocalizedCopy): string {
  return copy[appLanguage()];
}

export function isChineseLanguage(): boolean {
  return appLanguage() === "zh";
}

function detectLanguage(): AppLanguage {
  const locale = deviceLocale().toLowerCase();
  return locale.startsWith("zh") ? "zh" : "en";
}

function deviceLocale(): string {
  if (Platform.OS === "ios") {
    const settings = NativeModules.SettingsManager?.settings;
    const appleLocale = settings?.AppleLocale ?? settings?.AppleLanguages?.[0];
    if (typeof appleLocale === "string") return appleLocale;
  }
  const localeIdentifier = NativeModules.I18nManager?.localeIdentifier;
  return typeof localeIdentifier === "string" ? localeIdentifier : "en-US";
}

export const commonCopy = {
  culturalReference: { zh: "文化参考", en: "Cultural reference" },
  privacyProtected: { zh: "隐私保护", en: "Privacy protected" },
  retry: { zh: "重新尝试", en: "Try again" },
  done: { zh: "完成", en: "Done" },
  back: { zh: "返回", en: "Back" },
  loading: { zh: "正在生成...", en: "Generating..." },
};

export function methodTitle(method: CoreMethodKey): string {
  const copy = {
    liuyao: { zh: "六爻", en: "Coin Oracle" },
    meihua: { zh: "梅花", en: "Plum Blossom Oracle" },
    qimen: { zh: "奇门", en: "Qi Men Compass" },
    daliuren: { zh: "六壬", en: "Three Transmissions" },
  } satisfies Record<CoreMethodKey, LocalizedCopy>;
  return l(copy[method]);
}

export function confidenceLabelText(confidence: "high" | "medium" | "low"): string {
  if (confidence === "high") return l({ zh: "高置信", en: "High confidence" });
  if (confidence === "medium") return l({ zh: "中置信", en: "Medium confidence" });
  return l({ zh: "低置信", en: "Low confidence" });
}
