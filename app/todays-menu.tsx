import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "@/constants/colors";
import CategoryListCard, {
  VegNonVegToggle,
  matchesCategoryFoodFilter,
} from "@/components/home/CategoryListCard";
import { useFoodTypeFilterStore } from "@/src/store/foodTypeFilter";
import CategoryDetailModal from "@/components/home/CategoryDetailModal";
import WeeklyMenuModal from "@/components/common/WeeklyMenuModal";
import MealDetailModal from "@/components/home/MealDetailModal";
import { addToCart, getHomePageMenuSeeAll } from "@/src/api/api";
import { type HomepageMeal } from "@/src/store/homepageMeals";
import { useCartStore } from "@/src/store/cart";
import MealPackagePrice from "@/components/home/MealPackagePrice";
import {
  formatPlanDuration,
  formatMealDescription,
  getMealDurationDays,
  getMealPackagePricing,
  hasMealPrice,
} from "@/src/utils/format";

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

export default function TodaysMenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    displayType?: string;
  }>();
  const menuId = Array.isArray(params.id) ? params.id[0] : params.id;
  const categoryName = Array.isArray(params.name) ? params.name[0] : params.name;
  const displayTypeParam = Array.isArray(params.displayType)
    ? params.displayType[0]
    : params.displayType;

  const [meals, setMeals] = useState<HomepageMeal[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const foodFilter = useFoodTypeFilterStore((s) => s.filter);
  const [loading, setLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState<HomepageMeal | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuTitle, setMenuTitle] = useState("Weekly Menu");
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [categoryDetailVisible, setCategoryDetailVisible] = useState(false);
  const cartNo = useCartStore((s) => s.cartNo);
  const mealCartQty = useCartStore((s) => s.qtyMap);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const ensureCartNo = useCartStore((s) => s.ensureCartNo);
  const updateItemQty = useCartStore((s) => s.updateItemQty);
  const isCategoryMenu =
    String(displayTypeParam || "").toLowerCase() === "category" ||
    (categories.length > 0 && meals.length === 0);

  const formattedDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  useEffect(() => {
    let cancelled = false;

    const loadContent = async () => {
      if (!menuId) {
        setMeals([]);
        setCategories([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const userId = (await AsyncStorage.getItem("user_id")) || "";
        const res = await getHomePageMenuSeeAll(menuId, userId);
        if (cancelled) return;

        const mealList = Array.isArray(res?.data) ? res.data : [];
        const categoryList = Array.isArray(res?.categories)
          ? res.categories
          : [];

        setMeals(mealList);
        setCategories(categoryList);
      } catch {
        if (!cancelled) {
          setMeals([]);
          setCategories([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadContent();
    return () => {
      cancelled = true;
    };
  }, [menuId]);

  useFocusEffect(
    React.useCallback(() => {
      fetchCart(cartNo);
    }, [cartNo, fetchCart]),
  );

  const findMeal = (id: string) =>
    meals.find((meal) => String(meal?.id ?? meal?.uid ?? "") === id);

  const resolveStoreId = (meal: any) =>
    String(
      meal?.user?.id ??
        meal?.store_id ??
        meal?.user_id ??
        meal?.store?.id ??
        "",
    );

  const resolveMealType = (meal: any) => {
    if (meal?.first_cate_id) return meal.first_cate_id;
    if (Array.isArray(meal?.cates) && meal.cates.length) return meal.cates[0];
    if (Array.isArray(meal?.cate_id) && meal.cate_id.length)
      return meal.cate_id[0];
    return null;
  };

  const handleAdd = async (id: string) => {
    if (!id) return;
    const meal = findMeal(id);
    const storeId = resolveStoreId(meal);
    if (!storeId) return;

    const mealType = resolveMealType(meal);
    const qty = (mealCartQty[id] || 0) + 1;
    updateItemQty(id, qty);
    try {
      const no = await ensureCartNo(cartNo);
      await addToCart(storeId, id, qty, no, mealType);
      await fetchCart(no);
    } catch {
      updateItemQty(id, qty - 1);
    }
  };

  const handleRemove = async (id: string) => {
    const qty = mealCartQty[id];
    if (!id || !qty) return;
    const meal = findMeal(id);
    const storeId = resolveStoreId(meal);
    if (!storeId) return;

    const mealType = resolveMealType(meal);
    const nextQty = qty - 1;
    updateItemQty(id, nextQty);
    try {
      const no = await ensureCartNo(cartNo);
      await addToCart(storeId, id, nextQty, no, mealType);
      await fetchCart(no);
    } catch {
      updateItemQty(id, qty);
    }
  };

  const totalItems = useMemo(
    () => Object.values(mealCartQty).reduce((sum, qty) => sum + (qty || 0), 0),
    [mealCartQty],
  );

  const cartSummary = useMemo(() => {
    const items = Object.entries(mealCartQty)
      .filter(([, qty]) => (qty || 0) > 0)
      .map(([id, qty]) => {
        const meal = findMeal(id);
        const pricing = getMealPackagePricing(meal, qty);
        const name = String(meal?.name ?? "").trim() || "Meal";
        return {
          name: qty > 1 ? `${name} ×${qty}` : name,
          total: pricing?.packagePrice ?? 0,
        };
      });

    return {
      names: items.map((item) => item.name).join(", "),
      total: items.reduce((sum, item) => sum + item.total, 0),
    };
  }, [mealCartQty, meals]);

  const openMealDetail = (meal?: HomepageMeal | null) => {
    if (!meal) return;
    setSelectedMeal(meal);
    setDetailVisible(true);
  };

  const openCategoryMeals = (category: any) => {
    const id = String(category?.id ?? "");
    if (!id) return;
    router.push({
      pathname: "/category-meals",
      params: {
        parentId: String(menuId ?? id),
        id,
        name: category?.name ?? "",
      },
    } as any);
  };

  const openCategoryMenu = (category: any) => {
    const name = String(category?.name ?? "").trim();
    setMenuTitle(name ? `${name} Menu` : "Weekly Menu");
    setMenuVisible(true);
  };

  const openCategoryDetail = (category: any) => {
    if (!category) return;
    setSelectedCategory(category);
    setCategoryDetailVisible(true);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {categoryName || "Today's Menu"}
        </Text>
        <View style={styles.dateBadge}>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : isCategoryMenu ? (
        <FlatList
          data={categories.filter((item) =>
            matchesCategoryFoodFilter(item, foodFilter),
          )}
          keyExtractor={(item, index) => String(item?.id ?? index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <VegNonVegToggle />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {foodFilter === "veg"
                ? "No veg categories available"
                : foodFilter === "nonveg"
                  ? "No non-veg categories available"
                  : "No categories available"}
            </Text>
          }
          renderItem={({ item }) => {
            if (!item) return null;
            return (
              <CategoryListCard
                category={item}
                onPress={openCategoryMeals}
                onViewMenu={openCategoryMenu}
                onReadMore={openCategoryDetail}
              />
            );
          }}
        />
      ) : (
        <FlatList
          data={meals}
          keyExtractor={(item, index) =>
            String(item?.id ?? item?.uid ?? index)
          }
          contentContainerStyle={[
            styles.listContent,
            totalItems > 0 && { paddingBottom: 120 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No meals available</Text>
          }
          renderItem={({ item }) => {
            if (!item) return null;

            const id = String(item?.id ?? item?.uid ?? "");
            const qty = id ? mealCartQty[id] || 0 : 0;
            const description = formatMealDescription(item?.description);
            const planDuration = formatPlanDuration(
              getMealDurationDays(item),
              item?.price,
            );
            const hasPrice = hasMealPrice(item?.price);

            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => openMealDetail(item)}
              >
                {item?.img ? (
                  <Image
                    source={{ uri: item.img }}
                    style={styles.image}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]} />
                )}
                <View style={styles.cardContent}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item?.name ?? ""}
                  </Text>
                  <MealStars rating={item?.rating} />
                  {planDuration ? (
                    <Text style={styles.planDuration} numberOfLines={1}>
                      {planDuration}
                    </Text>
                  ) : null}
                  {!!description && (
                    <View style={styles.descRow}>
                      <Text style={styles.description} numberOfLines={1}>
                        {description}
                      </Text>
                      <Text style={styles.readMore}>Read more</Text>
                    </View>
                  )}
                  {hasPrice && (
                    <MealPackagePrice item={item} compact hideUnitPrice />
                  )}

                  {qty > 0 ? (
                    <View style={styles.counterContainer}>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => handleRemove(id)}
                      >
                        <Text style={styles.counterBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.counterText}>{qty}</Text>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => handleAdd(id)}
                      >
                        <Text style={styles.counterBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addButton}
                      activeOpacity={0.8}
                      onPress={() => id && handleAdd(id)}
                    >
                      <Ionicons name="add" size={16} color={COLORS.white} />
                      <Text style={styles.addButtonText}>Subscribe</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {totalItems > 0 && (
        <View
          style={[
            styles.cartBar,
            { paddingBottom: 12 + insets.bottom },
          ]}
        >
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => router.push(`/cart?cartNo=${cartNo}` as any)}
          >
            <View style={styles.cartLeft}>
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalItems}</Text>
              </View>
              <View style={styles.cartMeta}>
                <Text style={styles.cartItemText} numberOfLines={1}>
                  {cartSummary.names}
                </Text>
                <Text style={styles.cartPriceText}>
                  ₹{cartSummary.total.toFixed(0)}
                </Text>
              </View>
            </View>
            <View style={styles.cartRight}>
              <Text style={styles.cartActionText}>View Cart</Text>
              <MaterialIcons name="arrow-right" size={22} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      <CategoryDetailModal
        visible={categoryDetailVisible}
        category={selectedCategory}
        onClose={() => {
          setCategoryDetailVisible(false);
          setSelectedCategory(null);
        }}
        onViewMenu={openCategoryMenu}
        onViewPlans={openCategoryMeals}
      />

      <WeeklyMenuModal
        visible={menuVisible}
        title={menuTitle}
        onClose={() => setMenuVisible(false)}
      />

      <MealDetailModal
        visible={detailVisible}
        item={selectedMeal}
        onClose={() => {
          setDetailVisible(false);
          setSelectedMeal(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginRight: 12,
  },
  dateBadge: {
    backgroundColor: "#e6f4ea",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "700",
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.muted,
    marginTop: 40,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: COLORS.secondary,
  },
  imagePlaceholder: {
    backgroundColor: COLORS.secondary,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
    position: "relative",
    paddingRight: 88,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    marginBottom: 4,
  },
  planDuration: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 4,
  },
  descRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
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
  addButton: {
    position: "absolute",
    bottom: -4,
    right: 0,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
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
    position: "absolute",
    bottom: -4,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3e8ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  counterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  counterBtnText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  counterText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
    minWidth: 16,
    textAlign: "center",
  },
  cartBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#FAFAFA",
  },
  cartBtn: {
    backgroundColor: COLORS.primary,
    height: 60,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cartLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  cartMeta: { flex: 1, minWidth: 0 },
  cartBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
  },
  cartBadgeText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  cartItemText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.9,
  },
  cartPriceText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  cartRight: { flexDirection: "row", alignItems: "center" },
  cartActionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginRight: 8,
  },
});
