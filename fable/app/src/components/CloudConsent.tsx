import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { l } from "@/lib/i18n";
import { mystic } from "@/theme/mystic";

let acceptedInSession = false;

export function hasCloudConsent(): boolean {
  return acceptedInSession;
}

export function acceptCloudConsent(): void {
  acceptedInSession = true;
}

export function CloudConsentModal({
  visible,
  moduleName,
  detail,
  onAccept,
  onCancel,
}: {
  visible: boolean;
  moduleName: string;
  detail: string;
  onAccept: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.kicker}>{l({ zh: "隐私确认", en: "Privacy check" })}</Text>
          <Text style={styles.title}>
            {l({ zh: `${moduleName}将调用云端 AI 解读`, en: `${moduleName} will use cloud AI interpretation` })}
          </Text>
          <Text style={styles.body}>{detail}</Text>
          <View style={styles.points}>
            <Text style={styles.point}>{l({ zh: "· 仅发送生成解读必需的结构化信息。", en: "- Only the structured information needed for the reading is sent." })}</Text>
            <Text style={styles.point}>{l({ zh: "· 不上传通讯录、照片、定位或设备文件。", en: "- Contacts, photos, location, and device files are never uploaded." })}</Text>
            <Text style={styles.point}>{l({ zh: "· 结果为传统文化参考，不替代专业意见。", en: "- Results are cultural reference only, not professional advice." })}</Text>
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondary}>
              <Text style={styles.secondaryText}>{l({ zh: "先不生成", en: "Not now" })}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onAccept} style={styles.primary}>
              <Text style={styles.primaryText}>{l({ zh: "同意并继续", en: "Agree and continue" })}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(20, 14, 10, 0.48)",
  },
  card: {
    backgroundColor: "#121514",
    borderColor: mystic.lineStrong,
    borderWidth: 1,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  kicker: {
    color: mystic.gold,
    fontSize: 12,
    fontWeight: "900",
  },
  title: {
    color: mystic.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  body: {
    color: mystic.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  points: {
    borderColor: mystic.line,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 12,
    backgroundColor: "rgba(255, 244, 214, 0.08)",
  },
  point: {
    color: "rgba(255,247,223,0.82)",
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  secondary: {
    alignItems: "center",
    borderColor: mystic.line,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
  },
  secondaryText: {
    color: mystic.muted,
    fontSize: 14,
    fontWeight: "900",
  },
  primary: {
    alignItems: "center",
    backgroundColor: mystic.cinnabarDark,
    borderColor: mystic.gold,
    borderWidth: 1,
    borderRadius: 18,
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
  },
  primaryText: {
    color: "#fffaf0",
    fontSize: 14,
    fontWeight: "900",
  },
});
