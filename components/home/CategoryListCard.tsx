import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

import COLORS from "@/constants/colors";
import {
  getCategoryDiscountOffer,
  getCategoryFoodType,
  getCategoryImage,
  getFoodTypeColors,
  isNonVegFoodType,
  isVegFoodType,
} from "@/src/store/homepageMeals";
import {
  useFoodTypeFilterStore,
  type FoodTypeFilter,
} from "@/src/store/foodTypeFilter";
import { formatMealDescription } from "@/src/utils/format";

const STAR_COLOR = "#F5A623";

function getCategoryRating(category: any) {
  const direct = Number(category?.rating);
  if (Number.isFinite(direct) && direct > 0) {
    return {
      rating: direct,
      reviews: Number(category?.total_reviews) || 0,
    };
  }

  const meals = Array.isArray(category?.meals) ? category.meals : [];
  const rated = meals
    .map((meal: any) => Number(meal?.rating))
    .filter((value: number) => Number.isFinite(value) && value > 0);
  const reviews = meals.reduce(
    (sum: number, meal: any) => sum + (Number(meal?.total_reviews) || 0),
    0,
  );

  if (!rated.length) return { rating: 0, reviews };

  return {
    rating:
      rated.reduce((sum: number, value: number) => sum + value, 0) / rated.length,
    reviews,
  };
}

function getCategoryDescription(category: any) {
  const ownDescription = formatMealDescription(category?.description);
  if (ownDescription) return ownDescription;

  const firstMeal = Array.isArray(category?.meals) ? category.meals[0] : null;
  const mealDescription = formatMealDescription(firstMeal?.description);
  if (mealDescription) return mealDescription;

  const count = Array.isArray(category?.meals) ? category.meals.length : 0;
  return count > 0 ? `${count} meals` : "";
}

function CategoryStars({ rating }: { rating: number }) {
  const rounded = Math.round(Math.max(0, Math.min(5, rating)) * 2) / 2;

  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => {
        const name =
          rounded >= star
            ? "star"
            : rounded >= star - 0.5
              ? "star-half"
              : "star-outline";
        return <Ionicons key={star} name={name} size={13} color={STAR_COLOR} />;
      })}
    </View>
  );
}

export type { FoodTypeFilter };

export function matchesCategoryFoodFilter(
  category: any,
  filter: FoodTypeFilter,
) {
  if (filter === "all") return true;
  const type = getCategoryFoodType(category);
  if (filter === "veg") return isVegFoodType(type);
  return isNonVegFoodType(type);
}

export function VegNonVegToggle({
  value: valueProp,
  onChange,
  style,
}: {
  value?: FoodTypeFilter;
  onChange?: (value: FoodTypeFilter) => void;
  style?: object;
}) {
  const stored = useFoodTypeFilterStore((s) => s.filter);
  const setStored = useFoodTypeFilterStore((s) => s.setFilter);
  const value = valueProp ?? stored;

  const handleChange = (next: FoodTypeFilter) => {
    setStored(next);
    onChange?.(next);
  };

  return (
    <View style={[styles.filterRow, style]}>
      <Pressable
        style={[styles.filterChip, value === "veg" && styles.filterChipVeg]}
        onPress={() => handleChange(value === "veg" ? "all" : "veg")}
      >
        <View style={[styles.filterDot, { backgroundColor: "#16A34A" }]} />
        <Text
          style={[
            styles.filterChipText,
            value === "veg" && styles.filterChipTextVeg,
          ]}
        >
          Veg
        </Text>
      </Pressable>
      <Pressable
        style={[
          styles.filterChip,
          value === "nonveg" && styles.filterChipNonVeg,
        ]}
        onPress={() => handleChange(value === "nonveg" ? "all" : "nonveg")}
      >
        <View style={[styles.filterDot, { backgroundColor: "#DC2626" }]} />
        <Text
          style={[
            styles.filterChipText,
            value === "nonveg" && styles.filterChipTextNonVeg,
          ]}
        >
          Non-Veg
        </Text>
      </Pressable>
    </View>
  );
}

type Props = {
  category: any;
  onPress: (category: any) => void;
  onViewMenu?: (category: any) => void;
  onReadMore?: (category: any) => void;
  style?: object;
};

export default function CategoryListCard({
  category,
  onPress,
  onViewMenu,
  onReadMore,
  style,
}: Props) {
  const image = getCategoryImage(category);
  const { rating, reviews } = getCategoryRating(category);
  const description = getCategoryDescription(category);
  const discountOffer = getCategoryDiscountOffer(category);
  const foodType = getCategoryFoodType(category);
  const foodTypeColors = foodType ? getFoodTypeColors(foodType) : null;
  const isPopular =
    category?.is_popular === true ||
    category?.is_popular === 1 ||
    String(category?.is_popular).toLowerCase() === "true";
  const popularLabel =
    String(category?.badge ?? "").trim() || "Most Popular";

  const handlePress = () => {
    onPress(category);
  };

  const content = (
    <>
      <View style={styles.row}>
        <View style={styles.imageWrap}>
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.cardImage}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.cardImage, styles.imagePlaceholder]}>
              <MaterialIcons name="restaurant" size={28} color="#8b8b8b" />
            </View>
          )}
          {!!discountOffer && (
            <View style={styles.offerBadge}>
              <Ionicons name="pricetag" size={11} color="#fff" />
              <Text style={styles.offerBadgeText} numberOfLines={1}>
                {discountOffer}
              </Text>
            </View>
          )}
          {!!foodType && foodTypeColors && (
            <View
              style={[
                styles.foodTypeBadge,
                { backgroundColor: foodTypeColors.backgroundColor },
              ]}
            >
              <Text
                style={[styles.foodTypeBadgeText, { color: foodTypeColors.color }]}
                numberOfLines={1}
              >
                {foodType}
              </Text>
            </View>
          )}
        </View>
        {isPopular && (
          <View style={styles.popularBadge}>
            <Ionicons name="flame" size={11} color="#fff" />
            <Text style={styles.popularBadgeText} numberOfLines={1}>
              {popularLabel}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.cardBody,
            isPopular && styles.cardBodyWithBadge,
          ]}
        >
          <Text style={styles.cardTitle} numberOfLines={1}>
            {category?.name ?? ""}
          </Text>
          <View style={styles.ratingRow}>
            <CategoryStars rating={rating} />
            <Text style={styles.ratingText}>
              {rating > 0 ? rating.toFixed(1) : "New"}
              {reviews > 0 ? ` (${reviews})` : ""}
            </Text>
          </View>
          {!!description && (
            <View style={styles.descRow}>
              <Text style={styles.cardDesc} numberOfLines={1}>
                {description}
              </Text>
              {!!onReadMore && (
                <Pressable onPress={() => onReadMore(category)} hitSlop={8}>
                  <Text style={styles.readMore}>Read more</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
      {!!onViewMenu && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, styles.menuBtn]}
            onPress={() => onViewMenu(category)}
          >
            <Ionicons name="restaurant-outline" size={15} color={COLORS.primary} />
            <Text style={styles.menuBtnText} numberOfLines={1}>
              Menu
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.subscribeBtn]}
            onPress={handlePress}
          >
            <Ionicons name="calendar-outline" size={15} color="#fff" />
            <Text style={styles.subscribeBtnText} numberOfLines={1}>
              View Plans
            </Text>
          </Pressable>
        </View>
      )}
    </>
  );

  if (onViewMenu) {
    return <View style={[styles.card, style]}>{content}</View>;
  }

  return (
    <Pressable style={[styles.card, style]} onPress={handlePress}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  imageWrap: {
    width: 132,
    height: 132,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
  },
  cardBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  cardBodyWithBadge: {
    paddingTop: 28,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#222",
    marginBottom: 6,
    paddingRight: 8,
  },
  offerBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#16A34A",
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 12,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 14,
    maxWidth: 136,
  },
  offerBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  foodTypeBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    zIndex: 2,
    maxWidth: 100,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  foodTypeBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  popularBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EA580C",
    paddingVertical: 5,
    paddingLeft: 8,
    paddingRight: 10,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 14,
    maxWidth: 132,
  },
  popularBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  starRow: { flexDirection: "row", alignItems: "center", gap: 1 },
  ratingText: { fontSize: 12, color: "#6b6b6b", fontWeight: "600" },
  descRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardDesc: {
    flex: 1,
    fontSize: 12,
    color: "#7b7b7b",
    lineHeight: 16,
  },
  readMore: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    flexShrink: 0,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  actionBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  subscribeBtn: {
    flex: 1.25,
    backgroundColor: COLORS.primary,
  },
  subscribeBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 0,
  },
  menuBtn: {
    backgroundColor: "#F3EAFB",
  },
  menuBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  filterChipVeg: {
    backgroundColor: "#ECFDF5",
    borderColor: "#16A34A",
  },
  filterChipNonVeg: {
    backgroundColor: "#FEF2F2",
    borderColor: "#DC2626",
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.text,
  },
  filterChipTextVeg: {
    color: "#16A34A",
  },
  filterChipTextNonVeg: {
    color: "#DC2626",
  },
});
