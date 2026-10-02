import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Loader } from "@/components/service";
import COLORS from "@/constants/colors";
import { getPaymentHistory } from "@/src/api/api";
import { useLanguage } from "@/src/i18n/context";
import { formatPrice } from "@/src/utils/format";

const PRIMARY = COLORS.primary;

type PaymentItem = {
  id: number | string;
  user_id?: string;
  trans_id?: string;
  amount?: string | number;
  type?: string;
  notes?: string;
  created_at?: string;
};

function formatPaymentDate(value?: string) {
  if (!value) return "";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isDebit(type?: string) {
  return String(type || "").toLowerCase() === "debit";
}

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  const loadHistory = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      try {
        const userId = await AsyncStorage.getItem("user_id");
        if (!userId) {
          router.replace("/login" as any);
          return;
        }
        const res = await getPaymentHistory(userId);
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        setPayments(list);
      } catch {
        Alert.alert(t("error"), t("failedLoadPaymentHistory"));
        setPayments([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router, t],
  );

  useFocusEffect(
    useCallback(() => {
      loadHistory(true);
    }, [loadHistory]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("paymentHistory")}</Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <Loader />
      ) : payments.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="receipt-long" size={64} color="#ddd" />
          <Text style={styles.emptyText}>{t("noPaymentHistory")}</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item, index) => String(item?.id ?? index)}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[PRIMARY]}
              tintColor={PRIMARY}
            />
          }
          renderItem={({ item }) => {
            const debit = isDebit(item?.type);
            const amountColor = debit ? "#EF4444" : "#16A34A";
            const badgeBg = debit ? "#FEE2E2" : "#DCFCE7";
            const typeLabel = debit ? t("debit") : t("credit");
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.iconWrap, { backgroundColor: badgeBg }]}>
                    <MaterialIcons
                      name={debit ? "arrow-upward" : "arrow-downward"}
                      size={20}
                      color={amountColor}
                    />
                  </View>
                  <View style={styles.cardMain}>
                    <Text style={styles.notes} numberOfLines={2}>
                      {item?.notes || t("paymentHistory")}
                    </Text>
                    <Text style={styles.date}>
                      {formatPaymentDate(item?.created_at)}
                    </Text>
                  </View>
                  <View style={styles.amountCol}>
                    <Text style={[styles.amount, { color: amountColor }]}>
                      {debit ? "-" : "+"}₹{formatPrice(item?.amount)}
                    </Text>
                    <View style={[styles.typeBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.typeText, { color: amountColor }]}>
                        {typeLabel}
                      </Text>
                    </View>
                  </View>
                </View>
                {item?.trans_id ? (
                  <Text style={styles.txn}>
                    {t("transactionId")}: {item.trans_id}
                  </Text>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.secondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
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
    color: "#222",
  },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#888",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardMain: { flex: 1, paddingRight: 8 },
  notes: { fontSize: 15, fontWeight: "700", color: "#222" },
  date: { marginTop: 4, fontSize: 12, color: "#888" },
  amountCol: { alignItems: "flex-end" },
  amount: { fontSize: 16, fontWeight: "800" },
  typeBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  typeText: { fontSize: 11, fontWeight: "700" },
  txn: {
    marginTop: 10,
    fontSize: 12,
    color: "#999",
  },
});
