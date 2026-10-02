import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Linking,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";

// import { getStore } from '@/src/api/api';
import COLORS from "@/constants/colors";
import { useLanguage } from "@/src/i18n/context";
import { getStore } from "@/src/api/api";

const PRIMARY = COLORS.primary;

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_FULL: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

function StarRating({ rating }: { rating: number }) {
  const stars = Math.round(Number(rating));
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialIcons
          key={i}
          name={i <= stars ? "star" : "star-border"}
          size={20}
          color="#f0c419"
        />
      ))}
      <Text style={styles.ratingNum}>{Number(rating).toFixed(1)}</Text>
    </View>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.infoRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.infoIcon}>
        <MaterialIcons name={icon as any} size={20} color={PRIMARY} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, onPress && { color: PRIMARY }]}>
          {value}
        </Text>
      </View>
      {onPress && <MaterialIcons name="chevron-right" size={20} color="#ccc" />}
    </TouchableOpacity>
  );
}

function WorkingDays({ workingDays }: { workingDays: string }) {
  if (!workingDays) return null;
  const activeDays = workingDays.split(",").map((d) => d.trim());
  return (
    <View style={styles.daysWrap}>
      {DAYS_SHORT.map((day) => {
        const active = activeDays.includes(day);
        return (
          <View
            key={day}
            style={[styles.dayChip, active && styles.dayChipActive]}
          >
            <Text
              style={[styles.dayChipText, active && styles.dayChipTextActive]}
            >
              {day}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function StoreInfoScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();

  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getStore(storeId as string);
      setStore(res?.store ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [storeId]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("storeInfo")}</Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : error || !store ? (
        <View style={styles.center}>
          <MaterialIcons name="wifi-off" size={48} color="#ddd" />
          <Text style={styles.errorText}>{t("failedLoadStoreInfo")}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>{t("retry")}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.heroWrap}>
            {store.img ? (
              <Image
                source={{ uri: store.img }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.heroImage, styles.heroPlaceholder]}>
                <Ionicons name="restaurant" size={48} color="#ccc" />
              </View>
            )}
          </View>

          {/* Name & Rating */}
          <View style={styles.nameBlock}>
            <Text style={styles.storeName}>{store.name}</Text>
            {store.owner_name ? (
              <Text style={styles.ownerName}>by {store.owner_name}</Text>
            ) : null}
            <View style={styles.ratingRow}>
              <StarRating rating={store.rating} />
              <View style={styles.dot} />
              <Text style={styles.avgCost}>
                {store.currency || "₹"}
                {store.avg_cost} {t("avgCost")}
              </Text>
            </View>
            {store.food_type ? (
              <View style={styles.foodTypeBadge}>
                <Ionicons name="leaf-outline" size={13} color={PRIMARY} />
                <Text style={styles.foodTypeText}>{store.food_type}</Text>
              </View>
            ) : null}
          </View>

          {/* Contact */}
          <InfoCard>
            <Text style={styles.cardTitle}>{t("contact")}</Text>
            {store.phone ? (
              <InfoRow
                icon="phone"
                label={t("phone")}
                value={store.phone}
                onPress={() => Linking.openURL(`tel:${store.phone}`)}
              />
            ) : null}
            {store.whatsapp_no ? (
              <InfoRow
                icon="chat"
                label={t("whatsapp")}
                value={store.whatsapp_no}
                onPress={() =>
                  Linking.openURL(`https://wa.me/${store.whatsapp_no}`)
                }
              />
            ) : null}
            {store.address ? (
              <InfoRow
                icon="location-on"
                label={t("address")}
                value={store.address}
              />
            ) : null}
          </InfoCard>

          {/* Categories */}
          {store.categories?.length > 0 && (
            <InfoCard>
              <Text style={styles.cardTitle}>{t("menuCategories")}</Text>
              <View style={styles.categoryWrap}>
                {store.categories.map((c: any) => (
                  <View key={c.id} style={styles.categoryChip}>
                    <Text style={styles.categoryChipText}>{c.name}</Text>
                  </View>
                ))}
              </View>
            </InfoCard>
          )}

          {/* Working Days */}
          {store.working_days ? (
            <InfoCard>
              <Text style={styles.cardTitle}>{t("workingDays")}</Text>
              <WorkingDays workingDays={store.working_days} />
            </InfoCard>
          ) : null}

          {/* Reviews */}
          <InfoCard>
            <Text style={styles.cardTitle}>{t("ratingsReviews")}</Text>
            <View style={styles.ratingBig}>
              <Text style={styles.ratingBigNum}>
                {Number(store.rating).toFixed(1)}
              </Text>
              <StarRating rating={store.rating} />
            </View>
            <View style={styles.noReviews}>
              <MaterialIcons name="rate-review" size={40} color="#ddd" />
              <Text style={styles.noReviewsText}>{t("noReviews")}</Text>
              <Text style={styles.noReviewsSub}>{t("noReviewsSub")}</Text>
            </View>
          </InfoCard>
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

  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText: { fontSize: 15, color: "#aaa", fontWeight: "500" },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: PRIMARY,
    borderRadius: 20,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  scroll: { flex: 1, backgroundColor: COLORS.secondary },
  scrollContent: { paddingBottom: 40 },

  heroWrap: { backgroundColor: "#fff" },
  heroImage: { width: "100%", height: 220 },
  heroPlaceholder: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },

  nameBlock: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 10,
  },
  storeName: { fontSize: 24, fontWeight: "800", color: "#111" },
  ownerName: { fontSize: 13, color: "#888", marginTop: 2, marginBottom: 6 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    flexWrap: "wrap",
    gap: 8,
  },
  ratingNum: { fontSize: 16, fontWeight: "700", color: "#333", marginLeft: 6 },
  dot: { width: 4, height: 4, borderRadius: 4, backgroundColor: "#ccc" },
  avgCost: { fontSize: 13, color: "#555" },
  foodTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: PRIMARY + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  foodTypeText: { fontSize: 12, fontWeight: "600", color: PRIMARY },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PRIMARY + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoText: { flex: 1 },
  infoLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
    marginBottom: 2,
  },
  infoValue: { fontSize: 14, color: "#222", fontWeight: "500" },

  daysWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dayChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  dayChipText: { fontSize: 12, fontWeight: "700", color: "#999" },
  dayChipTextActive: { color: "#fff" },

  categoryWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: PRIMARY + "15",
  },
  categoryChipText: { fontSize: 12, fontWeight: "600", color: PRIMARY },

  ratingBig: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    marginBottom: 16,
  },
  ratingBigNum: { fontSize: 48, fontWeight: "800", color: "#111" },

  noReviews: { alignItems: "center", gap: 8, paddingVertical: 16 },
  noReviewsText: { fontSize: 15, fontWeight: "600", color: "#aaa" },
  noReviewsSub: { fontSize: 13, color: "#ccc" },
});
