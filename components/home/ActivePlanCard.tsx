import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import COLORS from "@/constants/colors";
import { getSubscription } from "@/src/api/api";

function getThaliName(entry: any) {
  const item = Array.isArray(entry?.items) ? entry.items[0] : null;
  return String(
    item?.thali_name ?? entry?.thali_name ?? "",
  ).trim();
}

export default function ActivePlanCard({
  subscription,
  currency,
}: {
  subscription: any;
  currency?: string;
}) {
  const router = useRouter();
  const [thaliName, setThaliName] = useState("");

  const sub = Array.isArray(subscription) ? subscription[0] : subscription;

  useEffect(() => {
    let cancelled = false;
    if (!sub || sub.status !== "Active") return;

    (async () => {
      try {
        const userId = await AsyncStorage.getItem("user_id");
        if (!userId) return;
        const res = await getSubscription(userId);
        const active = Array.isArray(res?.data?.active) ? res.data.active : [];
        const orderId = String(sub?.order_id ?? "");
        const match =
          (orderId &&
            active.find(
              (entry: any) => String(entry?.order_id ?? "") === orderId,
            )) ||
          active[0];
        const name = getThaliName(match);
        if (!cancelled && name) setThaliName(name);
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [sub?.order_id, sub?.status]);

  if (!sub || sub.status !== "Active") return null;

  return (
    <View style={styles.card}>
      <View style={styles.footer}>
        <View style={styles.delivery}>
          <View style={styles.iconWrap}>
            <MaterialIcons
              name="local-shipping"
              size={20}
              color={COLORS.secondary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label} numberOfLines={1}>
              Next Delivery{thaliName ? ` · ${thaliName}` : ""}
            </Text>
            {sub.delivery ? (
              <Text style={styles.time}>{sub.delivery}</Text>
            ) : null}
            {sub.time ? <Text style={styles.subtitle}>{sub.time}</Text> : null}
          </View>
        </View>

        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.push("/subscription" as any)}
        >
          <Text style={styles.btnText}>Manage</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
  },
  footer: { flexDirection: "row", alignItems: "center", gap: 12 },
  delivery: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.5,
    color: COLORS.white,
    fontWeight: "700",
  },
  time: { fontSize: 16, fontWeight: "700", color: COLORS.white, marginTop: 2 },
  subtitle: { fontSize: 12, color: COLORS.white },
  btn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnText: { fontSize: 12, fontWeight: "700" },
});
