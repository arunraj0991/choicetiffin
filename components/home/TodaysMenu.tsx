import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "@/constants/colors";
import MealPackagePrice from "@/components/home/MealPackagePrice";
import {
  VegNonVegToggle,
  type FoodTypeFilter,
} from "@/components/home/CategoryListCard";
import { useFoodTypeFilterStore } from "@/src/store/foodTypeFilter";
import {
  useHomepageMealsStore,
  type HomepageCategory,
  type HomepageMeal,
  type HomepageSection,
  getCategoryImage,
  getCategoryDiscountOffer,
  getCategoryFoodType,
  getFoodType,
  getFoodTypeColors,
  isCategorySection,
  isNonVegFoodType,
  isVegFoodType,
  shouldShowFoodTypeToggle,
} from "@/src/store/homepageMeals";
import {
  formatPlanDuration,
  formatMealDescription,
  getMealDurationDays,
  hasMealPrice,
} from "@/src/utils/format";

type Props = {
  cartQty?: { [id: string]: number };
  onAdd?: (id: string) => void;
  onRemove?: (id: string) => void;
  onMealPress?: (meal: HomepageMeal) => void;
};

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
        return <Ionicons key={star} name={name} size={12} color={STAR_COLOR} />;
      })}
    </View>
  );
}

export function HomepageCategoryCard({
  category,
  style,
}: {
  category: HomepageCategory;
  style?: object;
}) {
  const router = useRouter();
  const image = getCategoryImage(category);
  const discountOffer = getCategoryDiscountOffer(category);
  const foodType = getCategoryFoodType(category);
  const foodTypeColors = foodType ? getFoodTypeColors(foodType) : null;

  const openCategory = () => {
    const id = String(category?.id ?? "");
    if (!id) return;
    router.push({
      pathname: "/category-meals",
      params: {
        parentId: id,
        id,
        name: category?.name ?? "",
      },
    });
  };

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      activeOpacity={0.85}
      onPress={openCategory}
    >
      <View style={styles.imageContainer}>
        {image ? (
          <Image
            source={{ uri: image }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
        <View style={styles.categoryOverlay} />
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
        <Text style={styles.categoryTitle} numberOfLines={2}>
          {category?.name ?? ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function matchesFoodFilter(
  type: string,
  filter: FoodTypeFilter,
) {
  if (filter === "all") return true;
  if (filter === "veg") return isVegFoodType(type);
  return isNonVegFoodType(type);
}

export default function TodaysMenu({
  cartQty = {},
  onAdd,
  onRemove,
  onMealPress,
}: Props) {
  const router = useRouter();
  const meals = useHomepageMealsStore((s) => s.meals);
  const filterType = useHomepageMealsStore((s) => s.filterType);
  const foodFilter = useFoodTypeFilterStore((s) => s.filter);

  if (!meals?.length) return null;

  const renderMealCard = (item: HomepageMeal) => {
    const id = String(item?.id ?? item?.uid ?? "");
    const foodType = getFoodType(item);
    const foodTypeColors = foodType ? getFoodTypeColors(foodType) : null;
    const tag = foodType || item?.sectionName || "Fresh";
    const isFresh = /fresh|veg/i.test(String(tag));
    const planDuration = formatPlanDuration(
      getMealDurationDays(item),
      item?.price,
    );
    const description = formatMealDescription(item?.description);
    const hasPrice = hasMealPrice(item?.price);

    return (
      <View style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onMealPress?.(item)}
        >
          <View style={styles.imageContainer}>
            {item?.img ? (
              <Image
                source={{ uri: item.img }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]} />
            )}
            {!!foodType && foodTypeColors && (
              <View
                style={[
                  styles.foodTypeBadge,
                  { backgroundColor: foodTypeColors.backgroundColor },
                ]}
              >
                <Text
                  style={[
                    styles.foodTypeBadgeText,
                    { color: foodTypeColors.color },
                  ]}
                  numberOfLines={1}
                >
                  {foodType}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.foodTitle} numberOfLines={1}>
              {item?.name ?? ""}
            </Text>
            <MealStars rating={item?.rating} />
            {planDuration ? (
              <Text style={styles.planDuration} numberOfLines={1}>
                {planDuration}
              </Text>
            ) : (
              <Text style={styles.chefName} numberOfLines={1}>
                by {item?.sectionName || item?.food_type || "Homestyle"}
              </Text>
            )}
            {!!description && (
              <View style={styles.descRow}>
                <Text style={styles.description} numberOfLines={1}>
                  {description}
                </Text>
                <Text style={styles.readMore}>Read more</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.footer}>
          {hasPrice && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onMealPress?.(item)}
            >
              <MealPackagePrice item={item} compact hideUnitPrice />
            </TouchableOpacity>
          )}

          <View style={styles.actionsRow}>
            <View
              style={[
                styles.tagBadge,
                isFresh ? styles.tagFresh : styles.tagBestseller,
              ]}
            >
              <Text
                style={isFresh ? styles.tagTextFresh : styles.tagTextBestseller}
                numberOfLines={1}
              >
                {tag}
              </Text>
            </View>

            {id && cartQty?.[id] ? (
              <View style={styles.counterContainer}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => onRemove?.(id)}
                >
                  <Text style={styles.counterBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.counterText}>{cartQty[id]}</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => onAdd?.(id)}
                >
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => id && onAdd?.(id)}
              >
                <Ionicons name="add" size={16} color={COLORS.white} />
                <Text style={styles.addButtonText}>Subscribe</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: HomepageSection }) => {
    const categoryMode = isCategorySection(item);
    const showFoodToggle = shouldShowFoodTypeToggle(item, filterType);
    const rawList = categoryMode ? (item?.categories ?? []) : (item?.meals ?? []);
    const listData = showFoodToggle
      ? rawList.filter((entry) => {
          const type = categoryMode
            ? getCategoryFoodType(entry)
            : getFoodType(entry);
          return matchesFoodFilter(type, foodFilter);
        })
      : rawList;

    if (!showFoodToggle && categoryMode && !rawList.length) return null;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{item?.name ?? ""}</Text>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/todays-menu",
                params: {
                  id: String(item?.id ?? ""),
                  name: item?.name ?? "",
                  displayType: categoryMode ? "category" : "meal",
                },
              })
            }
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {showFoodToggle && (
          <VegNonVegToggle style={styles.filterRow} />
        )}

        {showFoodToggle && !listData.length ? (
          <Text style={styles.emptyFilter}>
            {foodFilter === "veg"
              ? "No veg items in this section"
              : foodFilter === "nonveg"
                ? "No non-veg items in this section"
                : "No items in this section"}
          </Text>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(entry, index) =>
              String(entry?.id ?? (entry as HomepageMeal)?.uid ?? index)
            }
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            renderItem={({ item: entry }) => {
              if (!entry) return null;
              if (categoryMode) {
                return <HomepageCategoryCard category={entry} />;
              }
              return renderMealCard(entry);
            }}
          />
        )}
      </View>
    );
  };

  return (
    <View>
      {(Array.isArray(meals) ? meals : []).map((item, index) => {
        const key = String(item?.id ?? item?.uid ?? index);
        const row = renderItem({ item });
        if (!row) return null;
        return <View key={key}>{row}</View>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  filterRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  emptyFilter: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    width: 220,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: 140,
    backgroundColor: COLORS.secondary,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    backgroundColor: COLORS.secondary,
  },
  categoryOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 48,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  offerBadge: {
    position: "absolute",
    top: 10,
    left: 0,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E11D48",
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 12,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    shadowColor: "#9F1239",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  offerBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  foodTypeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
    maxWidth: "58%",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  foodTypeBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  categoryTitle: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.white,
    zIndex: 1,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  infoContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  foodTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    marginBottom: 4,
  },
  chefName: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.muted,
  },
  planDuration: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 2,
  },
  descRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  description: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.muted,
  },
  readMore: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    flexShrink: 0,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexShrink: 1,
    maxWidth: "50%",
  },
  tagBestseller: {
    backgroundColor: "#f3e8ff",
  },
  tagTextBestseller: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  tagFresh: {
    backgroundColor: "#e6f4ea",
  },
  tagTextFresh: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "700",
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 14,
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3e8ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    flexShrink: 0,
  },
  counterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  counterBtnText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  counterText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
    minWidth: 20,
    textAlign: "center",
  },
});
