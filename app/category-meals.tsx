import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

import MealDetailModal from "@/components/home/MealDetailModal";
import { ProductCard } from "@/components/store/Item";
import COLORS from "@/constants/colors";
import { addToCart, getCategoryMeals } from "@/src/api/api";
import type { HomepageMeal } from "@/src/store/homepageMeals";
import {
  getMealDurationDays,
  getMealPackagePricing,
  hasMealPrice,
} from "@/src/utils/format";

async function getCartNo() {
  const stored = await AsyncStorage.getItem("cart_no");
  if (stored) return stored;
  const newNo =
    Date.now().toString() + Math.random().toString(36).slice(2, 6);
  await AsyncStorage.setItem("cart_no", newNo);
  return newNo;
}

function toProductCardItem(meal: HomepageMeal) {
  return {
    ...meal,
    id: String(meal?.id ?? meal?.uid ?? ""),
    title: meal?.name ?? "",
    desc: meal?.description ?? "",
    image: meal?.img ?? undefined,
    price: hasMealPrice(meal?.price) ? Number(meal?.price) : meal?.price,
    duration: getMealDurationDays(meal) ?? "",
    mrp: meal?.mrp,
    rating: meal?.rating,
    food_type: meal?.food_type,
    badge: meal?.badge,
    nutrition:
      meal?.calories || meal?.protein
        ? { calories: meal?.calories, protein: meal?.protein }
        : meal?.nutrition,
  };
}

export default function CategoryMealsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 0);
  const params = useLocalSearchParams<{
    parentId?: string;
    id?: string;
    name?: string;
  }>();
  const parentId = Array.isArray(params.parentId)
    ? params.parentId[0]
    : params.parentId;
  const categoryId = Array.isArray(params.id) ? params.id[0] : params.id;
  const categoryName = Array.isArray(params.name) ? params.name[0] : params.name;

  const [meals, setMeals] = useState<HomepageMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<HomepageMeal | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartNo, setCartNo] = useState<string | null>(null);

  const loadMeals = useCallback(async () => {
    if (!params?.id) {
      setMeals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const userId = (await AsyncStorage.getItem("user_id")) || "";
      const res = await getCategoryMeals(params?.id, userId);

      setMeals(res || []);
    } catch {
      setError(true);
      setMeals([]);
    } finally {
      setLoading(false);
    }
  }, [parentId, categoryId]);

  useEffect(() => {
    loadMeals();
  }, [loadMeals]);

  useEffect(() => {
    getCartNo().then(setCartNo);
  }, []);

  const openMealDetail = (meal?: HomepageMeal | null) => {
    if (!meal) return;
    setSelectedMeal(meal);
    setDetailVisible(true);
  };

  const findMeal = (id: string) =>
    meals.find((m) => String(m?.id ?? m?.uid ?? "") === id);

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
    const storeId = String(meal?.user?.id ?? "");
    if (!storeId) return;

    const mealType = resolveMealType(meal);
    const qty = (cart[id] || 0) + 1;
    setCart((p) => ({ ...p, [id]: qty }));
    try {
      const no = cartNo || (await getCartNo());
      if (!cartNo) setCartNo(no);
      await addToCart(storeId, id, qty, no, mealType);
    } catch {
      setCart((p) => ({ ...p, [id]: qty - 1 }));
    }
  };

  const handleRemove = async (id: string) => {
    const qty = cart[id];
    if (!id || !qty) return;
    const meal = findMeal(id);
    const storeId = String(meal?.user?.id ?? "");
    if (!storeId) return;

    const mealType = resolveMealType(meal);
    const nextQty = qty - 1;
    setCart((p) => {
      const n = { ...p };
      nextQty === 0 ? delete n[id] : (n[id] = nextQty);
      return n;
    });
    try {
      const no = cartNo || (await getCartNo());
      if (!cartNo) setCartNo(no);
      await addToCart(storeId, id, nextQty, no, mealType);
    } catch {
      setCart((p) => ({ ...p, [id]: qty }));
    }
  };

  const totalItems = useMemo(
    () => Object.values(cart).reduce((a, b) => a + (b || 0), 0),
    [cart],
  );

  const cartSummary = useMemo(() => {
    const items = Object.entries(cart)
      .filter(([, qty]) => (qty || 0) > 0)
      .map(([id, qty]) => {
        const meal = meals.find((m) => String(m?.id ?? m?.uid ?? "") === id);
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
  }, [cart, meals]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)" as any)
          }
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {categoryName || "Meals"}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialIcons name="wifi-off" size={48} color="#ddd" />
          <Text style={styles.errorText}>Failed to load meals</Text>
          <Pressable style={styles.retryBtn} onPress={loadMeals}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={meals}
          keyExtractor={(item, index) =>
            String(item?.id ?? item?.uid ?? index)
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="restaurant" size={56} color="#ddd" />
              <Text style={styles.emptyText}>
                No meals found in this category
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (!item) return null;

            const cardItem = toProductCardItem(item);
            const id = cardItem?.id ?? "";

            return (
              <ProductCard
                item={cardItem}
                qty={cart?.[id] || 0}
                onAdd={handleAdd}
                onRemove={handleRemove}
                onSeeMore={() => openMealDetail(item)}
              />
            );
          }}
        />
      )}

      {totalItems > 0 && (
        <View
          style={[
            styles.cartBar,
            { paddingBottom: 12 + bottomInset },
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

      <MealDetailModal
        visible={detailVisible}
        item={selectedMeal}
        onClose={() => {
          setDetailVisible(false);
          setSelectedMeal(null);
        }}
      />
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    gap: 12,
  },
  errorText: { fontSize: 15, color: "#aaa", fontWeight: "500" },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: COLORS.secondary,
    flexGrow: 1,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#aaa",
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  cartBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: COLORS.secondary,
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
