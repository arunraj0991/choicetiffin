import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import CategoryListCard, {
  VegNonVegToggle,
  matchesCategoryFoodFilter,
} from "@/components/home/CategoryListCard";
import { useFoodTypeFilterStore } from "@/src/store/foodTypeFilter";
import CategoryDetailModal from "@/components/home/CategoryDetailModal";
import COLORS from "@/constants/colors";
import { getAllCategories } from "@/src/api/api";
import WeeklyMenuModal from "@/components/common/WeeklyMenuModal";

const PRIMARY = COLORS.primary;

export default function CategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const categoryId = Array.isArray(params.id) ? params.id[0] : params.id;
  const categoryName = Array.isArray(params.name) ? params.name[0] : params.name;

  const [categories, setCategories] = useState<any[]>([]);
  const foodFilter = useFoodTypeFilterStore((s) => s.filter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuTitle, setMenuTitle] = useState("Weekly Menu");
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [categoryDetailVisible, setCategoryDetailVisible] = useState(false);

  const loadCategories = useCallback(async () => {
    if (!categoryId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const res = await getAllCategories(categoryId);
      console.log('res?.data?.categories', JSON.stringify(res?.data?.categories))
      setCategories(
        Array.isArray(res?.data?.categories) ? res.data.categories : [],
      );
    } catch {
      setError(true);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openCategoryMeals = (category: any) => {
    const id = String(category?.id ?? "");

    if (!id || !categoryId) return;
    router.push({
      pathname: "/category-meals",
      params: {
        parentId: String(categoryId),
        id,
        name: String(category?.name ?? ""),
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
          {categoryName || "Category"}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialIcons name="wifi-off" size={48} color="#ddd" />
          <Text style={styles.errorText}>Failed to load categories</Text>
          <Pressable style={styles.retryBtn} onPress={loadCategories}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
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
            <View style={styles.empty}>
              <MaterialIcons name="restaurant" size={56} color="#ddd" />
              <Text style={styles.emptyText}>
                {foodFilter === "veg"
                  ? "No veg categories found"
                  : foodFilter === "nonveg"
                    ? "No non-veg categories found"
                    : "No categories found"}
              </Text>
            </View>
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
    backgroundColor: PRIMARY,
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
});
