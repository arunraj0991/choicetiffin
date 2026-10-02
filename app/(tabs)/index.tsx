import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { useFocusEffect } from "expo-router";
import { homepage, addToCart } from "@/src/api/api";
import COLORS from "@/constants/colors";
import { Loader } from "@/components/service";
import { useLanguage } from "@/src/i18n/context";
import { useHomepageMealsStore } from "@/src/store/homepageMeals";
import type { HomepageMeal } from "@/src/store/homepageMeals";
import { useCartStore } from "@/src/store/cart";

import Header from "@/components/home/Header";
import Headline from "@/components/home/Headline";
import SearchBar from "@/components/home/SearchBar";
import ImageSlider from "@/components/home/ImageSlider";
import CategoryChips from "@/components/home/CategoryChips";
import FeaturedCarousel from "@/components/home/FeaturedCarousel";
import RecommendedList from "@/components/home/RecommendedList";
import ActivePlanCard from "@/components/home/ActivePlanCard";
import BottomNav, { bottomNavContentPadding } from "@/components/home/BottomNav";
import TodaysMenu from "@/components/home/TodaysMenu";
import MealDetailModal from "@/components/home/MealDetailModal";

const PRIMARY = COLORS.primary;

export default function HomeScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const fetchMeals = useHomepageMealsStore((s) => s.fetchMeals);
  const meals = useHomepageMealsStore((s) => s.meals);
  const cartNo = useCartStore((s) => s.cartNo);
  const mealCartQty = useCartStore((s) => s.qtyMap);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const ensureCartNo = useCartStore((s) => s.ensureCartNo);
  const updateItemQty = useCartStore((s) => s.updateItemQty);
  const [apiData, setApiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [filteredStores, setFilteredStores] = useState<any[]>([]);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [selectedMeal, setSelectedMeal] = useState<HomepageMeal | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCartByNo = async (existingNo?: string | null) => {
    return fetchCart(existingNo);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchCartByNo(cartNo);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cartNo]),
  );

  useEffect(() => {
    if (apiData?.stores) filterStores(activeFilter, apiData.stores);
  }, [activeFilter, apiData]);

  const getLocation = async () => {
    const stored = await AsyncStorage.getItem("@selected_location");
    if (stored) {
      const loc = JSON.parse(stored);
      return { lat: loc?.latitude, lng: loc?.longitude };
    }
    return { lat: 28.6139, lng: 77.209 };
  };

  const filterStores = (type: string, stores: any[]) => {
    let result = [...(stores || [])];
    if (type === "trending") result = stores.filter((s) => s?.is_trend === 1);
    else if (type === "new-arrival")
      result = [...stores].sort((a, b) =>
        String(a?.id ?? "").localeCompare(String(b?.id ?? "")),
      );
    else if (type === "by-rating")
      result = [...stores].sort((a, b) => (b?.rating ?? 0) - (a?.rating ?? 0));
    else if (type === "cheapest")
      result = [...stores].sort(
        (a, b) => (parseInt(a?.avg_cost) || 0) - (parseInt(b?.avg_cost) || 0),
      );
    setFilteredStores(result);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { lat, lng } = await getLocation();
      const userId = await AsyncStorage.getItem("user_id");
      const [res] = await Promise.all([
        homepage(lat, lng, userId || ""),
        fetchMeals?.(), // cached after first success; no repeat call
      ]);
      setApiData(res?.data);
      console.log(res?.data)
      setSubscriptionData(res?.data?.subscription);
      const d = res?.data;

      if (d?.country?.length)
        await AsyncStorage.setItem("@countries", JSON.stringify(d.country));
      if (d?.term_link) await AsyncStorage.setItem("@term_link", d.term_link);
      if (d?.privacy_link)
        await AsyncStorage.setItem("@privacy_link", d.privacy_link);
      setError(null);
    } catch (e) {
      console.error("error in fetchData: Homepage =--->", e);
      setError(t("failedLoadHomepage"));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      const { lat, lng } = await getLocation();
      const userId = await AsyncStorage.getItem("user_id");
      const [res] = await Promise.all([
        homepage(lat, lng, userId || ""),
        fetchMeals?.(true), // only forced refresh on pull-to-refresh
      ]);
      setApiData(res?.data);
      setSubscriptionData(res?.data?.subscription);
      const d = res?.data;
      if (d?.country?.length)
        await AsyncStorage.setItem("@countries", JSON.stringify(d.country));
      if (d?.term_link) await AsyncStorage.setItem("@term_link", d.term_link);
      if (d?.privacy_link)
        await AsyncStorage.setItem("@privacy_link", d.privacy_link);
      await fetchCartByNo(cartNo);
      setError(null);
    } catch {
      setError(t("failedRefresh"));
    } finally {
      setRefreshing(false);
    }
  };

  const findMeal = (id: string) => {
    for (const section of meals || []) {
      const found = (section?.meals ?? []).find(
        (meal: HomepageMeal) => String(meal?.id ?? meal?.uid ?? "") === id,
      );
      if (found) return found;
    }
    return undefined;
  };

  const resolveMealType = (meal: any) => {
    if (meal?.first_cate_id) return meal.first_cate_id;
    if (Array.isArray(meal?.cates) && meal.cates.length) return meal.cates[0];
    if (Array.isArray(meal?.cate_id) && meal.cate_id.length)
      return meal.cate_id[0];
    return null;
  };

  const handleMealAdd = async (id: string) => {
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
      await fetchCartByNo(no);
    } catch {
      updateItemQty(id, qty - 1);
    }
  };

  const handleMealRemove = async (id: string) => {
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
      await fetchCartByNo(no);
    } catch {
      updateItemQty(id, qty);
    }
  };

  const openMealDetail = (meal?: HomepageMeal | null) => {
    if (!meal) return;
    setSelectedMeal(meal);
    setDetailVisible(true);
  };

  if (loading) return <Loader />;

  if (error || !apiData) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error || t("somethingWrong")}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
            <Text style={styles.retryText}>{t("retry")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const hasSubscription = Array.isArray(subscriptionData)
    ? subscriptionData.length > 0
    : subscriptionData && Object.keys(subscriptionData).length > 0;

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomNavContentPadding(insets.bottom) }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PRIMARY]}
            tintColor={PRIMARY}
          />
        }
      >
        <Header />
        <Headline />
        <SearchBar trendingStores={apiData?.trending} />
        <ImageSlider banners={apiData?.banners} />
        {hasSubscription && (
          <ActivePlanCard subscription={subscriptionData} currency="INR" />
        )}
        <CategoryChips categories={apiData?.cates} />
        <FeaturedCarousel trending={apiData?.trending} />
        <TodaysMenu
          cartQty={mealCartQty}
          onAdd={handleMealAdd}
          onRemove={handleMealRemove}
          onMealPress={openMealDetail}
        />
        {/* <RecommendedList
          stores={filteredStores}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        /> */}
      </ScrollView>
      <BottomNav />

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
  safe: { flex: 1, backgroundColor: COLORS.secondary },
  errorWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "600" },
});
