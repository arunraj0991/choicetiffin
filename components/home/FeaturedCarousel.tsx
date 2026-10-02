import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import COLORS from "@/constants/colors";

const { width } = Dimensions.get("window");
const PRIMARY = COLORS.primary;

function TrendingItem({ item }: { item: any }) {
  const router = useRouter();
  const categoriesText =
    item.categories?.map((c: any) => c.name).join(" • ") || "";

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/store/${item.id}` as any)}
      style={styles.cardWrap}
    >
      <View style={styles.card}>
        <View style={styles.imageContainer}>
          {item.img ? (
            <Image source={{ uri: item.img }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="restaurant" size={32} color="#8b8b8b" />
            </View>
          )}
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#fff" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.distanceWrap}>
              <Ionicons name="location-outline" size={12} color="#8b8b8b" />
              <Text style={styles.distanceText}>
                {item.distance?.toFixed(1)}km
              </Text>
            </View>
          </View>
          <Text style={styles.address} numberOfLines={1}>
            {item.address}
          </Text>
          <Text style={styles.categories} numberOfLines={1}>
            {categoriesText}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function FeaturedCarousel({ trending }: { trending: any[] }) {
  if (!trending || trending.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Trending Now</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={trending.slice(0, 5)}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <TrendingItem item={item} />}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 20 },
  header: {
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#222" },
  seeAll: { color: PRIMARY, fontWeight: "700" },
  listContent: { paddingLeft: 12, paddingRight: 18 },
  cardWrap: { width: width * 0.72 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    elevation: 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  imageContainer: { height: 120 },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholder: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: { color: "#fff", fontSize: 12, fontWeight: "600", marginLeft: 4 },
  content: { padding: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "800",
    color: "#222",
    flex: 1,
    marginRight: 8,
  },
  distanceWrap: { flexDirection: "row", alignItems: "center" },
  distanceText: {
    fontSize: 12,
    color: "#8b8b8b",
    fontWeight: "600",
    marginLeft: 4,
  },
  address: { fontSize: 12, color: "#8b8b8b", marginBottom: 6 },
  categories: { fontSize: 12, color: "#666" },
});
