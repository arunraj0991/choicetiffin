import React from "react";
import { View, Text, ImageBackground, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from "@/constants/colors";

const PRIMARY = COLORS.primary;

export function InfoRow({ store }: { store: any }) {
  const { rating, avg_cost, currency, sub } = store || {};
  const stars = Math.round(Number(rating));

  return (
    <View style={styles.infoRow}>
      {rating && (
        <View style={styles.infoItem}>
          {[...Array(5)].map((_, i) => (
            <MaterialIcons
              key={i}
              name={i < stars ? "star" : "star-border"}
              size={16}
              color={PRIMARY}
              style={{ marginRight: 2 }}
            />
          ))}
          <Text style={styles.infoText}>{Number(rating).toFixed(1)}</Text>
        </View>
      )}
      {avg_cost && (
        <>
          {rating && <View style={styles.dot} />}
          <View style={styles.infoItem}>
            <Text style={styles.infoText}>
              {currency || "₹"}
              {avg_cost} avg cost
            </Text>
          </View>
        </>
      )}
      {sub && (
        <>
          {(avg_cost || rating) && <View style={styles.dot} />}
          <View style={styles.infoItem}>
            <MaterialIcons name="verified" size={18} color={PRIMARY} />
            <Text style={styles.infoActiveText}>Subscribed</Text>
          </View>
        </>
      )}
    </View>
  );
}

export default function StoreHero({ store }: { store: any }) {
  if (!store) return null;
  return (
    <>
      <View style={styles.heroWrap}>
        <ImageBackground source={{ uri: store.img }} style={styles.heroImage}>
          <View style={styles.overlay} />
          <View style={styles.heroContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {store.name}
              </Text>
              <Text style={styles.heroSub} numberOfLines={2}>
                {store.address}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </View>
      <InfoRow store={store} />
    </>
  );
}

const styles = StyleSheet.create({
  heroWrap: { paddingHorizontal: 16, paddingTop: 8 },
  heroImage: {
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  heroContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: 14,
  },
  heroTitle: { color: "#fff", fontSize: 28, fontWeight: "800" },
  heroSub: { color: "#e6e6e6", marginTop: 4, fontSize: 12 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.secondary,
    borderBottomWidth: 1,
    borderBottomColor: "#e7e7e7",
  },
  infoItem: { flexDirection: "row", alignItems: "center" },
  infoText: { marginLeft: 6, color: "#2b2b2b", fontSize: 11 },
  infoActiveText: { marginLeft: 6, color: PRIMARY, fontWeight: "700" },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: "#ccc",
    marginHorizontal: 10,
  },
});
