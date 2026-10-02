import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useLanguage } from "@/src/i18n/context";

const PRIMARY = "#491494";

export default function Thanks() {
  const router = useRouter();
  const { t } = useLanguage();
  const { orderId, totalAmount } = useLocalSearchParams<{
    orderId: string;
    totalAmount: string;
  }>();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      {/* Decorative glows */}
      <View style={styles.topGlow} />
      <View style={styles.rightGlow} />

      <View style={styles.content}>
        <View style={styles.imageWrapper}>
          <Image
            source={require("@/assets/images/thanks.png")}
            style={styles.image}
          />
          <View style={styles.checkIcon}>
            <MaterialIcons name="check" size={26} color="#fff" />
          </View>
        </View>

        <Text style={styles.title}>{t("thankYou")}</Text>
        <Text style={styles.subtitle}>
          {t("orderPlaced").replace(".", "")}{" "}
          <Text style={styles.orderId}>#{orderId || "ORD-0000"}</Text>.
        </Text>

        {totalAmount ? (
          <Text style={styles.amount}>
            {t("amountPaid")} {totalAmount}
          </Text>
        ) : null}
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/(tabs)/explore" as any)}
        >
          <MaterialIcons name="local-shipping" size={20} color="#fff" />
          <Text style={styles.primaryText}>{t("manageSubscriptions2")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.secondaryText}>{t("backToHome")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f6f8" },
  topGlow: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(73,20,148,0.08)",
  },
  rightGlow: {
    position: "absolute",
    top: 100,
    right: -80,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(73,20,148,0.06)",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  imageWrapper: { position: "relative", marginBottom: 32 },
  image: { width: 200, height: 200, resizeMode: "contain" },
  checkIcon: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4caf50",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#130e1b",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    lineHeight: 24,
  },
  orderId: { color: PRIMARY, fontWeight: "700" },
  amount: { marginTop: 12, fontSize: 18, fontWeight: "700", color: PRIMARY },
  bottom: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },
  secondaryText: { color: PRIMARY, fontWeight: "700", fontSize: 16 },
});
