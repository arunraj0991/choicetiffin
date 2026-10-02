import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";

// import { getMeal, addToCart } from '@/src/api/api';
import COLORS from "@/constants/colors";
import { Loader } from "@/components/service";

import StoreHeader from "@/components/store/StoreHeader";
import CategoryTabs from "@/components/store/CategoryTabs";
import StoreHero from "@/components/store/StoreHero";
import { FilterChips, ProductCard } from "@/components/store/Item";
import Detail from "@/components/store/Detail";
import { addToCart, getMeal } from "@/src/api/api";
import { getMealPackagePricing } from "@/src/utils/format";

const PRIMARY = COLORS.primary;

export default function StoreScreen() {
  const router = useRouter();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();

  const [isSearching, setIsSearching] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [storeData, setStoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [filters, setFilters] = useState<Record<string, boolean>>({});
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartNo, setCartNo] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [filtersY, setFiltersY] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchValue), 300);
    return () => clearTimeout(handler);
  }, [searchValue]);

  useEffect(() => {
    if (isSearching && debouncedSearch.trim()) {
      scrollRef.current?.scrollTo({ y: filtersY, animated: true });
    }
  }, [debouncedSearch, filtersY]);

  const getCartNo = async () => {
    const stored = await AsyncStorage.getItem("cart_no");
    if (stored) return stored;
    const newNo =
      Date.now().toString() + Math.random().toString(36).slice(2, 6);
    await AsyncStorage.setItem("cart_no", newNo);
    return newNo;
  };

  const fetchStoreData = async (showLoader = true) => {
    if (!storeId) return;
    try {
      if (showLoader) setLoading(true);
      const no = await getCartNo();
      setCartNo(no);
      const data = await getMeal(storeId, no);
      setStoreData(data);
      if (Array.isArray(data.cart)) {
        const map: Record<string, number> = {};
        data.cart.forEach((i: any) => {
          if (i.qty > 0) map[i.item_id] = i.qty;
        });
        setCart(map);
      }
      if (data.filters) {
        const f: Record<string, boolean> = {};
        data.filters.forEach((x: any) => (f[x.key] = false));
        setFilters(f);
      }
    } catch (e) {
      console.error("Store load error:", e);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, [storeId]);

  useFocusEffect(
    React.useCallback(() => {
      fetchStoreData(false);
    }, [storeId]),
  );

  const toggleFilter = (key: string) => {
    setFilters((prev) => {
      const next: Record<string, boolean> = {};
      Object.keys(prev).forEach((k) => (next[k] = false));
      if (!prev[key]) next[key] = true;
      return next;
    });
  };

  const resolveMealType = (meal: any) => {
    if (activeCategory !== "All") {
      const c = storeData.store?.categories?.find(
        (x: any) => x.name === activeCategory,
      );
      return c?.id || null;
    }
    if (meal?.cates?.length) {
      const c = storeData.store?.categories?.find(
        (x: any) => x.name === meal.cates[0],
      );
      return c?.id || null;
    }
    return null;
  };

  const handleAdd = async (id: string) => {
    const meal = storeData.meals.find((m: any) => m.id === id);
    const mealType = resolveMealType(meal);
    const qty = (cart[id] || 0) + 1;
    setCart((p) => ({ ...p, [id]: qty }));
    try {
      await addToCart(storeId!, id, qty, cartNo!, mealType);
    } catch {
      setCart((p) => ({ ...p, [id]: qty - 1 }));
    }
  };

  const handleRemove = async (id: string) => {
    const qty = cart[id];
    if (!qty) return;
    const meal = storeData.meals.find((m: any) => m.id === id);
    const mealType = resolveMealType(meal);
    const nextQty = qty - 1;
    setCart((p) => {
      const n = { ...p };
      nextQty === 0 ? delete n[id] : (n[id] = nextQty);
      return n;
    });
    try {
      await addToCart(storeId!, id, nextQty, cartNo!, mealType);
    } catch {
      setCart((p) => ({ ...p, [id]: qty }));
    }
  };

  const filteredMeals = useMemo(() => {
    if (!storeData?.meals) return [];
    let meals = storeData.meals;
    const getName = (m: any) => m.name || m.title || m.meal_name || "";
    if (isSearching && debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      meals = meals.filter((m: any) => getName(m).toLowerCase().includes(q));
    }
    return meals.filter((m: any) => {
      if (activeCategory !== "All" && !m.cates?.includes(activeCategory))
        return false;
      if (filters.veg && m.food_type !== "Veg") return false;
      if (filters.nonveg && m.food_type !== "NonVeg") return false;
      if (filters.vegan && m.food_type !== "Vegan") return false;
      return true;
    });
  }, [storeData, activeCategory, filters, isSearching, debouncedSearch]);

  const groups = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredMeals.forEach((m: any) => {
      if (activeCategory !== "All") {
        if (!map[activeCategory]) map[activeCategory] = [];
        map[activeCategory].push(m);
      } else {
        (m.cates || ["Other"]).forEach((c: string) => {
          if (!map[c]) map[c] = [];
          map[c].push(m);
        });
      }
    });
    return map;
  }, [filteredMeals, activeCategory]);

  const totalItems = useMemo(
    () => Object.values(cart).reduce((a, b) => a + b, 0),
    [cart],
  );

  const cartSummary = useMemo(() => {
    const meals = storeData?.meals || [];
    const items = Object.entries(cart)
      .filter(([, qty]) => (qty || 0) > 0)
      .map(([id, qty]) => {
        const meal = meals.find((x: any) => String(x?.id ?? "") === String(id));
        const pricing = getMealPackagePricing(meal, qty);
        const name =
          String(meal?.name ?? meal?.title ?? meal?.meal_name ?? "").trim() ||
          "Meal";
        return {
          name: qty > 1 ? `${name} ×${qty}` : name,
          total: pricing?.packagePrice ?? 0,
        };
      });

    return {
      names: items.map((item) => item.name).join(", "),
      total: items.reduce((sum, item) => sum + item.total, 0),
    };
  }, [cart, storeData]);

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" />

      <StoreHeader
        storeName={storeData.store?.name}
        onBack={() => router.back()}
        onSearch={() => {
          setIsSearching(true);
          setActiveCategory("All");
        }}
        onInfo={() => router.push(`/storeinfo?storeId=${storeId}` as any)}
        isSearching={isSearching}
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        onCancelSearch={() => {
          setIsSearching(false);
          setSearchValue("");
        }}
      />

      <ScrollView stickyHeaderIndices={[0]} ref={scrollRef}>
        <CategoryTabs
          active={activeCategory}
          categories={storeData.store?.categories || []}
          onSelect={setActiveCategory}
        />

        <StoreHero store={storeData.store} />

        <View
          style={styles.content}
          onLayout={(e) => setFiltersY(e.nativeEvent.layout.y)}
        >
          <FilterChips
            filters={filters}
            toggleFilter={toggleFilter}
            availableFilters={storeData.filters || []}
          />

          {Object.entries(groups).map(([title, items]) => {
            const cat = (storeData.store?.categories || []).find(
              (c: any) => c.name === title,
            );
            return (
              <View key={title}>
                <Text style={styles.sectionTitle}>{title}</Text>
                {cat?.d_time ? (
                  <Text style={styles.dTimeText}>{cat.d_time}</Text>
                ) : null}
                {(items as any[]).map((item: any) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    qty={cart[item.id] || 0}
                    onAdd={handleAdd}
                    onRemove={handleRemove}
                    onSeeMore={(i) => {
                      setSelectedItem(i);
                      setDetailVisible(true);
                    }}
                  />
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {totalItems > 0 && (
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
                {storeData.currency || "₹"}
                {cartSummary.total.toFixed(0)}
              </Text>
            </View>
          </View>
          <View style={styles.cartRight}>
            <Text style={styles.cartActionText}>View Cart</Text>
            <MaterialIcons name="arrow-right" size={22} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      <Detail
        visible={detailVisible}
        item={selectedItem}
        qty={cart[selectedItem?.id] || 0}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onClose={() => setDetailVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.secondary },
  content: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginTop: 20 },
  dTimeText: {
    color: "#888",
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 2,
    marginTop: 5,
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
  cartLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 12 },
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
