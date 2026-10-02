import React, { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { Loader } from "@/components/service";
import COLORS from "@/constants/colors";
import { getAccount } from "@/src/api/api";
import { useLanguage } from "@/src/i18n/context";
import { formatWalletAmount, parseWalletFromAccount } from "@/src/utils/format";

const PRIMARY = COLORS.primary;
function getReferralPayload(res: any) {
  return res?.data && typeof res.data === "object" ? res.data : res || {};
}
export default function WalletScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState("₹");

  const loadWallet = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      try {
        const userId = await AsyncStorage.getItem("user_id");
        if (!userId) {
          router.replace("/login" as any);
          return;
        }
        const res = await getAccount(userId);
        console.log(res)
        const wallet = parseWalletFromAccount(res);
        console.log(wallet)
        setAmount(wallet.amount);
        setCurrency(wallet.currency);
      } catch {
        Alert.alert(t("error"), t("failedLoadWallet"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router, t],
  );

  useFocusEffect(
    useCallback(() => {
      loadWallet(true);
    }, [loadWallet]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("myWalletTitle")}</Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <Loader />
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadWallet(false);
              }}
              colors={[PRIMARY]}
              tintColor={PRIMARY}
            />
          }
        >
          <View style={styles.balanceCard}>
            <View style={styles.balanceIcon}>
              <MaterialIcons
                name="account-balance-wallet"
                size={28}
                color="#fff"
              />
            </View>
            <Text style={styles.balanceLabel}>{t("totalBalance")}</Text>
            <Text style={styles.balanceAmount}>
              {currency}
              {formatWalletAmount(amount)}
            </Text>
            <View style={styles.secureBadge}>
              <MaterialIcons name="security" size={13} color="#fff" />
              <Text style={styles.secureText}>{t("secureWallet")}</Text>
            </View>
          </View>

          <Pressable
            style={styles.historyBtn}
            onPress={() => router.push("/payment-history" as any)}
          >
            <MaterialIcons name="history" size={22} color={PRIMARY} />
            <Text style={styles.historyText}>{t("paymentHistory")}</Text>
            <MaterialIcons name="chevron-right" size={22} color="#ccc" />
          </Pressable>
        </ScrollView>
      )}
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
  content: { padding: 16, paddingBottom: 40 },
  balanceCard: {
    backgroundColor: PRIMARY,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  balanceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 0.4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    marginTop: 6,
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  secureText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  historyBtn: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#130e1b",
  },
});
