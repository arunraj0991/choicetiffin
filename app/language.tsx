import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

// import COLORS from '@/constants/colors';
import { useLanguage } from "@/src/i18n/context";
import { Lang } from "@/src/i18n/translations";
import COLORS from "@/constants/colors";

const LANGUAGES: { code: Lang; native: string; english: string }[] = [
  { code: "en", native: "English", english: "English" },
  { code: "es", native: "Español", english: "Spanish" },
  { code: "fr", native: "Français", english: "French" },
  { code: "ar", native: "العربية", english: "Arabic" },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [selected, setSelected] = useState<Lang>(language);

  const handleSave = async () => {
    const wasArabic = language === "ar";
    const willBeArabic = selected === "ar";

    await setLanguage(selected);

    if (wasArabic !== willBeArabic) {
      Alert.alert(t("restartRequired"), t("rtlRestartMsg"), [
        { text: t("ok"), onPress: () => router.back() },
      ]);
    } else {
      Alert.alert(t("languageSaved"), t("languageSavedMsg"), [
        { text: t("ok"), onPress: () => router.back() },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("selectLanguage")}</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.topContent}>
          <Text style={styles.title}>{t("languageSubtitle")}</Text>
        </View>

        <FlatList
          data={LANGUAGES}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isSelected = item.code === selected;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.langCard, isSelected && styles.selectedCard]}
                onPress={() => setSelected(item.code)}
              >
                <View style={styles.langInfo}>
                  <Text style={styles.langTitle}>{item.native}</Text>
                  <Text style={styles.langSubtitle}>{item.english}</Text>
                </View>
                <View
                  style={[styles.radio, isSelected && styles.radioSelected]}
                >
                  {isSelected && (
                    <MaterialIcons name="check" size={14} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{t("saveChanges")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#130e1b",
  },
  body: { flex: 1, backgroundColor: COLORS.secondary },
  topContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: COLORS.secondary,
  },
  title: { fontSize: 16, color: "#6B7280", marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  langCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedCard: { borderColor: COLORS.primary },
  langInfo: { flex: 1 },
  langTitle: { fontSize: 17, fontWeight: "700", color: "#111417" },
  langSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: COLORS.secondary,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  saveBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
