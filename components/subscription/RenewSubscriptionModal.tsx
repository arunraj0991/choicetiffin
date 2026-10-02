import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SummaryRow from "@/components/cart/SummaryRow";
import COLORS from "@/constants/colors";
import { useRazorpayPayment } from "@/hooks/useRazorpayPayment";
import {
  getAccount,
  getSubscription,
  renewSubscriptionOrder,
  resolveImageUrl,
} from "@/src/api/api";
import { useLanguage } from "@/src/i18n/context";

const PRIMARY = COLORS.primary;

function firstItem(subscription: any) {
  const items = Array.isArray(subscription?.items) ? subscription.items : [];
  return items[0] || {};
}

function hasValue(value: unknown) {
  if (value == null) return false;
  const text = String(value).trim();
  if (!text || text.toLowerCase() === "null") return false;
  return true;
}

function displayAmount(value: unknown, currency = "") {
  const text = String(value ?? "").trim();
  if (!text || text.toLowerCase() === "null") return `${currency}0`;
  if (/[a-zA-Z]/.test(text)) return text;
  return `${currency}${text}`;
}

function parseAmount(value: unknown) {
  const text = String(value ?? "")
    .trim()
    .replace(/^[^\d-]+/, "")
    .replace(/,/g, "");
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function collectTaxes(subscription: any) {
  const taxes: { name: string; value: string }[] = [];
  for (let i = 1; i <= 5; i += 1) {
    const suffix = i === 1 ? "" : String(i);
    const name = subscription?.[`tax_name${suffix}`];
    const value = subscription?.[`tax_value${suffix}`];
    if (hasValue(name) || parseAmount(value) > 0) {
      taxes.push({
        name: hasValue(name) ? String(name) : `Tax ${i}`,
        value: String(value ?? ""),
      });
    }
  }
  return taxes;
}

function todayYmd() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function collectAddons(addonQty: unknown) {
  if (Array.isArray(addonQty)) {
    return addonQty
      .map((item: any) => ({
        name: String(item?.name ?? item?.title ?? "").trim(),
        qty: Number(item?.qty ?? item?.quantity ?? 0),
      }))
      .filter((item) => item.name && item.qty > 0);
  }

  if (addonQty && typeof addonQty === "object") {
    return Object.values(addonQty as Record<string, any>)
      .map((item) => ({
        name: String(item?.name ?? item?.title ?? "").trim(),
        qty: Number(item?.qty ?? item?.quantity ?? 0),
      }))
      .filter((item) => item.name && item.qty > 0);
  }

  return [];
}

type Props = {
  visible: boolean;
  subscription: any;
  currency?: string;
  onClose: () => void;
  onSuccess?: (res?: any) => void;
};

export default function RenewSubscriptionModal({
  visible,
  subscription,
  currency = "Rs.",
  onClose,
  onSuccess,
}: Props) {
  const { t } = useLanguage();
  const { payWithRazorpay } = useRazorpayPayment();
  const [paying, setPaying] = useState(false);
  const [imgError, setImgError] = useState(false);

  const meal = firstItem(subscription);
  const mealImage = resolveImageUrl(
    meal?.img ?? meal?.image ?? subscription?.img,
    "meal",
  );

  useEffect(() => {
    setImgError(false);
  }, [mealImage, visible]);
  const addons = useMemo(
    () => collectAddons(subscription?.addonQty),
    [subscription?.addonQty],
  );
  const taxes = useMemo(() => collectTaxes(subscription), [subscription]);
  const couponCode = hasValue(subscription?.couponCode)
    ? String(subscription.couponCode)
    : "";
  const mealPrice = displayAmount(meal?.price, currency);
  const subTotal = displayAmount(subscription?.sub_total, currency);
  const addonTotal = displayAmount(subscription?.addonTotal, currency);
  const total = displayAmount(
    subscription?.total ?? subscription?.sub_total,
    currency,
  );

  const handlePay = async () => {
    const orderId = String(subscription?.order_id ?? "");
    if (!orderId) {
      Alert.alert(t("error"), t("failedLoadRenew"));
      return;
    }

    setPaying(true);
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        Alert.alert(t("loginRequired"), t("pleaseLoginToContinue"));
        return;
      }

      const amount = parseAmount(
        subscription?.total || subscription?.sub_total,
      );
      if (amount > 0) {
        const accountRes = await getAccount(userId);
        const user = accountRes?.data?.user || {};
        const razorpayKey = accountRes?.data?.keys?.razorpay_key;
        if (!razorpayKey) {
          Alert.alert(t("error"), t("noPaymentConfig"));
          return;
        }

        onClose();
        await new Promise((resolve) => setTimeout(resolve, 400));

        const paid = await payWithRazorpay({
          amount,
          user: {
            id: userId,
            name: user.name,
            email: user.email,
            phone: user.phone,
          },
          razorpayKey,
        });
        if (!paid) return;
      }

      const res = await renewSubscriptionOrder(orderId, todayYmd());
      if (res?.status === false) {
        Alert.alert(t("error"), res?.message || t("renewFailed"));
        return;
      }

      let payload = res;
      try {
        payload = await getSubscription(userId);
      } catch {}

      Alert.alert(t("success"), t("renewSuccess"));
      onSuccess?.(payload);
      onClose();
    } catch {
      Alert.alert(t("error"), t("renewFailed"));
    } finally {
      setPaying(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#333" />
          </Pressable>
          <Text style={styles.headerTitle}>{t("renewSubscription")}</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("currentMeal")}</Text>
            {imgError || !mealImage ? (
              <View style={styles.mealImagePlaceholder}>
                <MaterialIcons name="restaurant" size={40} color={PRIMARY} />
              </View>
            ) : (
              <Image
                source={{ uri: mealImage }}
                style={styles.mealImage}
                resizeMode="cover"
                onError={() => setImgError(true)}
              />
            )}
            <Text style={styles.mealName}>
              {meal?.name || subscription?.store || t("currentMeal")}
            </Text>
            {hasValue(meal?.description) ? (
              <Text style={styles.mealDesc}>{meal.description}</Text>
            ) : null}
            {hasValue(meal?.type) ? (
              <Text style={styles.meta}>
                {t("mealType")}: {meal.type}
              </Text>
            ) : hasValue(subscription?.delSlot) ? (
              <Text style={styles.meta}>
                {t("mealType")}: {subscription.delSlot}
              </Text>
            ) : null}
            {hasValue(meal?.start) || hasValue(meal?.end) ? (
              <Text style={styles.meta}>
                {t("from")} {meal?.start || "-"} {t("to")} {meal?.end || "-"}
              </Text>
            ) : null}
            {hasValue(subscription?.delivery_days) ? (
              <Text style={styles.meta}>
                {t("deliveryDays")}: {subscription.delivery_days}
              </Text>
            ) : null}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t("mealPrice")}</Text>
              <Text style={styles.priceValue}>{mealPrice}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("addOns")}</Text>
            {addons.length ? (
              addons.map((addon, index) => (
                <View key={`${addon.name}-${index}`} style={styles.addonRow}>
                  <Text style={styles.addonName}>{addon.name}</Text>
                  <Text style={styles.addonQty}>× {addon.qty}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>{t("noAddons")}</Text>
            )}
            <View style={styles.divider} />
            <SummaryRow label={t("addonTotal")} value={addonTotal} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("billDetails")}</Text>
            {couponCode ? (
              <SummaryRow label={t("couponCode")} value={couponCode} />
            ) : null}
            <SummaryRow label={t("subTotal")} value={subTotal} />
            {parseAmount(subscription?.addonTotal) > 0 ? (
              <SummaryRow label={t("addonTotal")} value={addonTotal} />
            ) : null}
            {taxes.map((tax) => (
              <SummaryRow
                key={tax.name}
                label={tax.name}
                value={displayAmount(tax.value, currency)}
              />
            ))}
            {parseAmount(subscription?.discount) > 0 ? (
              <SummaryRow
                label={t("discount")}
                value={`-${displayAmount(subscription?.discount, currency)}`}
                green
              />
            ) : null}
            <View style={styles.divider} />
            <SummaryRow label={t("totalAmount")} value={total} bold />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>{t("totalAmount")}</Text>
            <Text style={styles.footerTotal}>{total}</Text>
          </View>
          <Pressable
            style={[styles.payBtn, paying && { opacity: 0.7 }]}
            onPress={handlePay}
            disabled={paying}
          >
            {paying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.payText}>{t("pay")}</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.secondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerBtn: {
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
  content: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#888",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  mealName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#130e1b",
    marginTop: 12,
  },
  mealImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
  },
  mealImagePlaceholder: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  mealDesc: { fontSize: 13, color: "#666", marginTop: 6, lineHeight: 19 },
  meta: { fontSize: 13, color: "#888", marginTop: 8 },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  priceLabel: { fontSize: 14, fontWeight: "600", color: "#555" },
  priceValue: { fontSize: 16, fontWeight: "800", color: PRIMARY },
  addonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  addonName: { fontSize: 14, color: "#130e1b", flex: 1, paddingRight: 8 },
  addonQty: { fontSize: 14, fontWeight: "700", color: "#555" },
  emptyText: { fontSize: 13, color: "#999" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 10 },
  footer: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLabel: { fontSize: 12, color: "#777" },
  footerTotal: { fontSize: 20, fontWeight: "800", color: "#130e1b" },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    minWidth: 120,
    justifyContent: "center",
  },
  payText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
