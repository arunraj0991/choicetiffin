import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import COLORS from "@/constants/colors";

const PRIMARY = COLORS.primary;

const filterChips = [
  { id: "all", title: "All", icon: "apps" as const },
  { id: "trending", title: "Trending", icon: "trending-up" as const },
  { id: "new-arrival", title: "New Arrival", icon: "time" as const },
  { id: "by-rating", title: "By Rating", icon: "star" as const },
  { id: "cheapest", title: "Cheapest", icon: "pricetag" as const },
];

function FilterChips({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: string;
  onFilterChange: (id: string) => void;
}) {
  return (
    <View style={styles.filterWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {filterChips.map((chip) => {
          const isActive = activeFilter === chip.id;
          return (
            <TouchableOpacity
              key={chip.id}
              style={[
                styles.filterChip,
                isActive ? styles.filterChipActive : styles.filterChipDefault,
              ]}
              onPress={() => onFilterChange(chip.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={chip.icon}
                size={14}
                color={isActive ? "#fff" : "#666"}
                style={{ marginRight: 6 }}
              />
              <Text
                style={
                  isActive ? styles.filterTextActive : styles.filterTextDefault
                }
              >
                {chip.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function StoreCard({ item }: { item: any }) {
  const router = useRouter();
  const categoriesText =
    item.categories?.map((c: any) => c.name).join(" • ") || "";

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/store/${item.id}` as any)}
    >
      <View style={styles.imageContainer}>
        {item.img ? (
          <Image source={{ uri: item.img }} style={styles.cardImage} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="restaurant" size={24} color="#8b8b8b" />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.name}
          </Text>
          {item.is_trend === 1 && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Trending</Text>
            </View>
          )}
        </View>
        <Text style={styles.address} numberOfLines={1}>
          {item.address}
        </Text>
        <Text style={styles.cuisine} numberOfLines={1}>
          {categoriesText}
        </Text>
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={14} color="#f0c419" />
            <Text style={styles.metaText}>{item.rating}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color="#8b8b8b" />
            <Text style={styles.metaText}>{item.distance?.toFixed(1)}km</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaText}>
              {item.currency}
              {item.avg_cost} avg
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RecommendedList({
  stores = [],
  activeFilter,
  onFilterChange,
  hideHeader = false,
}: {
  stores: any[];
  activeFilter: string;
  onFilterChange: (id: string) => void;
  hideHeader?: boolean;
}) {
  const router = useRouter();
  const [foodPreference, setFoodPreference] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("user_food_type").then((v) => {
      if (v) setFoodPreference(v);
    });
  }, []);

  return (
    <View style={styles.wrap}>
      {!hideHeader && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            {foodPreference ? (
              <TouchableOpacity
                onPress={() => router.push("/intro?fromHome=true" as any)}
              >
                <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {foodPreference ? (
            <Text style={styles.prefText}>
              Stores as per your food preference{" "}
              <Text style={styles.prefName}>{foodPreference}</Text>
            </Text>
          ) : null}
        </>
      )}

      <FilterChips
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />

      <FlatList
        data={stores}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={false}
        renderItem={({ item }) => <StoreCard item={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 10 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filterWrap: { marginTop: 12, marginBottom: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterChipDefault: { backgroundColor: "#fff", borderColor: "#E0E0E0" },
  filterTextActive: { fontSize: 12, fontWeight: "600", color: "#fff" },
  filterTextDefault: { fontSize: 12, fontWeight: "600", color: "#666" },

  wrap: { marginTop: 18, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#222" },
  changeLink: { color: PRIMARY, fontSize: 14, fontWeight: "600" },
  prefText: { color: "#666", marginBottom: 8, marginTop: 5, fontSize: 13 },
  prefName: { fontWeight: "800", color: PRIMARY },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  imageContainer: { marginRight: 12 },
  cardImage: { width: 90, height: 90, borderRadius: 12 },
  placeholder: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#222",
    flex: 1,
    marginRight: 8,
  },
  tag: {
    backgroundColor: PRIMARY + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: { color: PRIMARY, fontWeight: "700", fontSize: 11 },
  address: { fontSize: 12, color: "#8b8b8b", marginTop: 4, marginBottom: 2 },
  cuisine: { color: "#7b7b7b", fontSize: 12, marginTop: 6, lineHeight: 16 },
  meta: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", marginRight: 12 },
  metaText: { marginLeft: 6, fontSize: 12, color: "#6b6b6b" },
});
