import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import COLORS from "@/constants/colors";
import MealPackagePrice from "@/components/home/MealPackagePrice";
import { formatPlanDuration, formatMealDescription, getMealDurationDays, hasMealPrice } from "@/src/utils/format";

const PRIMARY = COLORS.primary;
const STAR_COLOR = "#F5A623";

function MealStars({ rating }: { rating?: string | number | null }) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  const rounded = Math.round(value * 2) / 2;

  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => {
        const name =
          rounded >= star
            ? "star"
            : rounded >= star - 0.5
              ? "star-half"
              : "star-outline";
        return (
          <Ionicons key={star} name={name} size={12} color={STAR_COLOR} />
        );
      })}
    </View>
  );
}

export function FilterChips({
  filters,
  toggleFilter,
  availableFilters = [],
}: {
  filters: Record<string, boolean>;
  toggleFilter: (key: string) => void;
  availableFilters: any[];
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {availableFilters.map((filter) => {
        const isActive = filters[filter.key];
        const dotColor =
          filter.key === "nonveg"
            ? "#dc2626"
            : filter.key === "veg" || filter.key === "vegan"
              ? "#16a34a"
              : null;

        return (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              isActive && {
                backgroundColor: dotColor || PRIMARY,
                borderColor: "transparent",
              },
            ]}
            onPress={() => toggleFilter(filter.key)}
            activeOpacity={0.7}
          >
            {dotColor && !isActive && (
              <View style={[styles.foodDot, { backgroundColor: dotColor }]} />
            )}
            {isActive && dotColor && (
              <MaterialIcons
                name="check"
                size={12}
                color="#fff"
                style={{ marginRight: 6 }}
              />
            )}
            <Text
              style={[styles.filterText, isActive && styles.filterTextActive]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export function ProductCard({
  item,
  qty,
  onAdd,
  onRemove,
  onSeeMore,
}: {
  item: any;
  qty: number;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onSeeMore: (item: any) => void;
}) {
  const description = formatMealDescription(item?.desc ?? item?.description);
  const planDuration = formatPlanDuration(
    getMealDurationDays(item),
    item?.price,
  );
  const hasPrice = hasMealPrice(item?.price);
  const badge = String(item?.badge ?? "").trim();
  const showBadge = !!badge && badge.toLowerCase() !== "null" && badge.toLowerCase() !== "none";

  return (
    <View style={styles.cardWrapper}>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardLeft}
          onPress={() => onSeeMore(item)}
          activeOpacity={0.85}
        >
          {showBadge && (
            <View style={styles.promoBadge}>
              <Ionicons name="flame" size={11} color="#fff" />
              <Text style={styles.promoBadgeText} numberOfLines={1}>
                {badge}
              </Text>
            </View>
          )}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <MealStars rating={item?.rating} />
          {planDuration ? (
            <Text style={styles.planDuration} numberOfLines={1}>
              {planDuration}
            </Text>
          ) : null}
          {hasPrice && (
            <View style={{ marginVertical: 6 }}>
              <MealPackagePrice item={item} compact hideUnitPrice />
            </View>
          )}
          {!!description && (
            <View style={styles.descRow}>
              <Text style={styles.cardDesc} numberOfLines={1}>
                {description}
              </Text>
              <Text style={styles.readMore}>Read more</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.cardRight}>
          <TouchableOpacity
            style={styles.imageWrap}
            onPress={() => onSeeMore(item)}
            activeOpacity={0.85}
          >
            <Image source={{ uri: item.image }} style={styles.cardImage} />
            {item.food_type && (
              <View style={styles.vegBadge}>
                <Text style={styles.vegBadgeText}>{item.food_type}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.qtyBox}>
            {item.soldOut ? (
              <View style={styles.soldOutBtn}>
                <Text style={styles.soldOutText}>SOLD OUT</Text>
              </View>
            ) : qty > 0 ? (
              <>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => onRemove(item.id)}
                >
                  <MaterialIcons name="remove" size={18} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{qty}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => onAdd(item.id)}
                >
                  <MaterialIcons name="add" size={18} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => onAdd(item.id)}
              >
                <MaterialIcons name="add" size={16} color={PRIMARY} />
                <Text style={styles.addBtnText}>Subscribe</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      <View style={styles.separator} />
    </View>
  );
}

const styles = StyleSheet.create({
  filterChip: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterText: { fontSize: 12, fontWeight: "600", color: "#111" },
  filterTextActive: { color: "#fff", fontWeight: "700" },
  foodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },

  cardWrapper: { marginTop: 14 },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardLeft: { flex: 1, paddingRight: 10 },
  promoBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EA580C",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 6,
    maxWidth: "100%",
  },
  promoBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111" },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    marginTop: 4,
  },
  planDuration: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
    marginTop: 4,
  },
  descRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardDesc: { color: "#6b7280", fontSize: 13, flex: 1 },
  readMore: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
    flexShrink: 0,
  },

  cardRight: { width: 110, alignItems: "center" },
  imageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardImage: { width: "100%", height: "100%" },
  vegBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vegBadgeText: { fontSize: 10, fontWeight: "800", color: "#16a34a" },

  qtyBox: {
    marginTop: 10,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: { fontWeight: "800", fontSize: 14 },
  addBtn: {
    width: "100%",
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addBtnText: { color: PRIMARY, fontWeight: "700", fontSize: 12 },
  soldOutBtn: {
    width: "100%",
    backgroundColor: "#f3f4f6",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  soldOutText: { color: "#6b7280", fontWeight: "800", fontSize: 12 },
  separator: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginTop: 14,
    marginHorizontal: -14,
  },
});
