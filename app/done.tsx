import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useLanguage } from "@/src/i18n/context";
// import { useLanguage } from '@/src/i18n/context';

const PRIMARY = "#491494";

export default function Done() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.topSpace} />

      <View style={styles.center}>
        <View style={styles.illustrationWrapper}>
          <View style={styles.glow} />
          <View style={styles.imageCircle}>
            <MaterialIcons name="check" size={48} color="#22C55E" />
          </View>
        </View>

        <Text style={styles.title}>{t("resetLinkSent")}</Text>
        <Text style={styles.subtitle}>{t("resetLinkSentDesc")}</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/login" as any)}
        >
          <Text style={styles.buttonText}>{t("backToLogin")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F6F8" },
  topSpace: { height: 60 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  illustrationWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  glow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(73,20,148,0.15)",
    transform: [{ scale: 1.2 }],
  },
  imageCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#130E1B",
    textAlign: "center",
    marginBottom: 10,
    marginTop: 30,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(19,14,27,0.7)",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 32 },
  button: {
    height: 56,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
