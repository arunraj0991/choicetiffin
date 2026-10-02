import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";

// import { search } from '@/src/api/api';
import COLORS from "@/constants/colors";
import MealDetailModal from "@/components/home/MealDetailModal";
import MealPackagePrice from "@/components/home/MealPackagePrice";
import { useLanguage } from "@/src/i18n/context";
import { addToCart, search } from "@/src/api/api";
import type { HomepageMeal } from "@/src/store/homepageMeals";
import { useCartStore } from "@/src/store/cart";
import {
  formatMealDescription,
  formatPlanDuration,
  getMealDurationDays,
  getMealPackagePricing,
  hasMealPrice,
} from "@/src/utils/format";

const PRIMARY = COLORS.primary;

export default function Search() {
  const router = useRouter();
  const { t } = useLanguage();
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cartNo = useCartStore((s) => s.cartNo);
  const mealCartQty = useCartStore((s) => s.qtyMap);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const ensureCartNo = useCartStore((s) => s.ensureCartNo);
  const updateItemQty = useCartStore((s) => s.updateItemQty);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<HomepageMeal[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<HomepageMeal | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => {
      clearTimeout(timer);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    try {
      setIsSearching(true);
      const res = await search(query.trim());
      setSearchResults(
        Array.isArray(res?.data?.meals) ? res.data.meals : [],
      );
      setHasSearched(true);
    } catch {
      setSearchResults([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchTerm(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => performSearch(text), 300);
    },
    [performSearch],
  );

  const openMealDetail = (meal?: HomepageMeal | null) => {
    if (!meal) return;
    setSelectedMeal(meal);
    setDetailVisible(true);
  };

  useFocusEffect(
    useCallback(() => {
      fetchCart(cartNo);
    }, [cartNo, fetchCart]),
  );

  const findMeal = (id: string) =>
    searchResults.find((meal) => String(meal?.id ?? meal?.uid ?? "") === id);

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
    const storeId = String(meal?.user?.id ?? "");
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

  const cartSummary = useMemo(() => {
    const items = searchResults
      .map((meal) => {
        const id = String(meal?.id ?? meal?.uid ?? "");
        const qty = mealCartQty[id] || 0;
        if (!id || qty <= 0) return null;
        const pricing = getMealPackagePricing(meal, qty);
        const name = String(meal?.name ?? "").trim() || "Meal";
        return {
          name: qty > 1 ? `${name} ×${qty}` : name,
          total: pricing?.packagePrice ?? 0,
          qty,
        };
      })
      .filter(Boolean) as { name: string; total: number; qty: number }[];

    return {
      names: items.map((item) => item.name).join(", "),
      total: items.reduce((sum, item) => sum + item.total, 0),
      count: items.reduce((sum, item) => sum + item.qty, 0),
    };
  }, [mealCartQty, searchResults]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.searchWrapper}>
          <MaterialIcons
            name="search"
            size={22}
            color={PRIMARY}
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            placeholder={t("searchPlaceholder")}
            style={styles.input}
            autoFocus
            value={searchTerm}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            onSubmitEditing={() => performSearch(searchTerm)}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchTerm("");
                setSearchResults([]);
                setHasSearched(false);
              }}
            >
              <MaterialIcons name="close" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          cartSummary.count > 0 ? { paddingBottom: 100 } : undefined
        }
      >
        {isSearching && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={PRIMARY} />
            <Text style={styles.loadingText}>{t("searching")}</Text>
          </View>
        )}

        {/* Search results */}
        {hasSearched && searchTerm ? (
          <>
            <Text style={styles.sectionTitle}>
              {t("searchResults")}{" "}
              {searchResults.length > 0 && `(${searchResults.length})`}
            </Text>

            {searchResults.length > 0 ? (
              <View style={styles.resultsList}>
                {searchResults.map((meal, i) => {
                  const id = String(meal?.id ?? meal?.uid ?? "");
                  const qty = id ? mealCartQty[id] || 0 : 0;
                  const description = formatMealDescription(meal?.description);
                  const planDuration = formatPlanDuration(
                    getMealDurationDays(meal),
                    meal?.price,
                  );
                  const slots = Array.isArray(meal?.cate_id)
                    ? meal.cate_id.filter(Boolean).join(" • ")
                    : String(meal?.cate_id || "");
                  const storeName = meal?.user?.name || "";

                  return (
                    <TouchableOpacity
                      key={id || String(i)}
                      style={styles.resultCard}
                      activeOpacity={0.8}
                      onPress={() => openMealDetail(meal)}
                    >
                      <View style={styles.resultImgBox}>
                        {meal?.img ? (
                          <Image
                            source={{ uri: meal.img }}
                            style={styles.resultImg}
                          />
                        ) : (
                          <View style={styles.imgPlaceholder}>
                            <MaterialIcons
                              name="restaurant"
                              size={24}
                              color="#8b8b8b"
                            />
                          </View>
                        )}
                      </View>
                      <View style={styles.resultBody}>
                        <View style={styles.resultHeader}>
                          <Text style={styles.resultTitle} numberOfLines={1}>
                            {meal?.name ?? ""}
                          </Text>
                          {!!meal?.food_type && (
                            <View style={styles.tag}>
                              <Text style={styles.tagText}>
                                {meal.food_type}
                              </Text>
                            </View>
                          )}
                        </View>
                        {!!storeName && (
                          <Text style={styles.resultAddress} numberOfLines={1}>
                            {storeName}
                          </Text>
                        )}
                        {planDuration ? (
                          <Text style={styles.resultPlan} numberOfLines={1}>
                            {planDuration}
                          </Text>
                        ) : null}
                        {!!description && (
                          <Text style={styles.resultCats} numberOfLines={2}>
                            {description}
                          </Text>
                        )}
                        {!!slots && (
                          <Text style={styles.resultSlots} numberOfLines={1}>
                            {slots}
                          </Text>
                        )}
                        <View style={styles.resultFooter}>
                          {hasMealPrice(meal?.price) && (
                            <View style={{ flex: 1 }}>
                              <MealPackagePrice
                                item={meal}
                                compact
                                hideUnitPrice
                              />
                            </View>
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
                              onPress={() => id && handleAdd(id)}
                            >
                              <MaterialIcons name="add" size={16} color="#fff" />
                              <Text style={styles.addButtonText}>Subscribe</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noResults}>
                <MaterialIcons name="search-off" size={48} color="#8b8b8b" />
                <Text style={styles.noResultsText}>No meals found</Text>
                <Text style={styles.noResultsSub}>{t("noStoresFoundSub")}</Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
      {cartSummary.count > 0 && (
        <TouchableOpacity
          style={styles.cartBtn}
          onPress={() => router.push(`/cart?cartNo=${cartNo}` as any)}
        >
          <View style={styles.cartLeft}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartSummary.count}</Text>
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
  container: { flex: 1, backgroundColor: COLORS.secondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.secondary,
    elevation: 3,
  },
  backBtn: { padding: 8, marginRight: 12 },
  searchWrapper: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 10, fontSize: 15, color: COLORS.text },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingText: { marginLeft: 10, fontSize: 14, color: "#666" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 18,
    marginLeft: 16,
    marginBottom: 5,
  },

  resultsList: { paddingHorizontal: 16, marginBottom: 8 },
  resultCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    alignItems: "flex-start",
    elevation: 2,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  resultImgBox: { marginRight: 12 },
  resultImg: { width: 90, height: 90, borderRadius: 12, resizeMode: "cover" },
  imgPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  resultBody: { flex: 1 },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  resultTitle: {
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
  resultAddress: { fontSize: 12, color: "#8b8b8b", marginBottom: 2 },
  resultPlan: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
    marginBottom: 2,
  },
  resultCats: {
    color: "#7b7b7b",
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 16,
  },
  resultSlots: {
    color: "#6b6b6b",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
  },
  resultFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3e8ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY,
    flexShrink: 0,
  },
  counterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  counterBtnText: {
    color: PRIMARY,
    fontSize: 16,
    fontWeight: "700",
  },
  counterText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: "700",
    minWidth: 16,
    textAlign: "center",
  },
  cartBtn: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: PRIMARY,
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
  metaRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaText: { marginLeft: 4, fontSize: 12, color: "#6b6b6b" },

  noResults: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
  },
  noResultsSub: {
    fontSize: 14,
    color: "#8b8b8b",
    marginTop: 4,
    textAlign: "center",
  },
});
