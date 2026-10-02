import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { getMenus } from "@/src/api/api";
import { useLanguage } from "@/src/i18n/context";
import { useFoodTypeFilterStore } from "@/src/store/foodTypeFilter";

const GREEN = "#4CAF50";
const TODAY_BG = "#E8F5E9";
const CATEGORIES = ["breakfast", "lunch", "dinner"] as const;
const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function toLabel(value?: string) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isVegType(type?: string) {
  const value = String(type ?? "").toLowerCase();
  return value.includes("veg") && !value.includes("non");
}

function getTodayDayKey() {
  return DAYS[new Date().getDay()];
}

export default function WeeklyMenuScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menus, setMenus] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof CATEGORIES)[number]>("breakfast");
  const foodFilter = useFoodTypeFilterStore((s) => s.filter);
  const setFoodFilter = useFoodTypeFilterStore((s) => s.setFilter);
  const vegMenu = foodFilter !== "nonveg";
  const todayKey = getTodayDayKey();

  const loadMenus = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await getMenus();
      setMenus(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setMenus([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMenus(true);
    }, [loadMenus]),
  );

  const dayMenus = useMemo(() => {
    const filtered = (Array.isArray(menus) ? menus : []).filter((item) => {
      const category = String(item?.category ?? "").toLowerCase();
      if (category !== selectedCategory) return false;
      return vegMenu ? isVegType(item?.type) : !isVegType(item?.type);
    });

    return DAYS.map((day) => {
      const items = filtered.filter(
        (item) => String(item?.day ?? "").toLowerCase() === day,
      );
      return {
        day,
        menu: items
          .map((item) => item?.menu)
          .filter(Boolean)
          .join(", "),
        isToday: day === todayKey,
      };
    });
  }, [menus, selectedCategory, vegMenu, todayKey]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMenus(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#1A237E" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("weeklyMenu")}</Text>
        <Pressable
          style={styles.headerBtn}
          onPress={onRefresh}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="refresh" size={24} color="#1A237E" />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {CATEGORIES.map((category) => {
          const active = selectedCategory === category;
          return (
            <Pressable
              key={category}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {toLabel(category)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleLabelWrap}>
          <View
            style={[
              styles.dot,
              { backgroundColor: vegMenu ? GREEN : COLORS.danger },
            ]}
          />
          <Text style={styles.toggleLabel}>
            {vegMenu ? t("vegMenu") : t("nonVegMenu")}
          </Text>
        </View>
        <Switch
          value={vegMenu}
          onValueChange={(value) => setFoodFilter(value ? "veg" : "nonveg")}
          trackColor={{ false: "#E5E7EB", true: GREEN }}
          thumbColor={COLORS.white}
          ios_backgroundColor="#E5E7EB"
        />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          <View style={styles.menuBox}>
            {dayMenus.map((item) => (
              <View
                key={item.day}
                style={[styles.dayCard, item.isToday && styles.dayCardToday]}
              >
                <View
                  style={[
                    styles.dayLabelWrap,
                    item.isToday && styles.dayLabelWrapToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      item.isToday && styles.dayLabelToday,
                    ]}
                  >
                    {toLabel(item.day)}
                  </Text>
                  {item.isToday ? (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayBadgeText}>{t("today")}</Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.menuText,
                    !item.menu && styles.menuTextEmpty,
                  ]}
                >
                  {item.menu || t("menuNotAvailable")}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.secondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#1A237E",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4B5563",
  },
  tabTextActive: {
    color: "#fff",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  toggleLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.gray,
    letterSpacing: 0.4,
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  menuBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 18,
  },
  dayCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 14,
    marginTop: 16,
    backgroundColor: "#fff",
  },
  dayCardToday: {
    borderColor: GREEN,
    backgroundColor: TODAY_BG,
  },
  dayLabelWrap: {
    position: "absolute",
    top: -11,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 6,
    gap: 6,
  },
  dayLabelWrapToday: {
    backgroundColor: TODAY_BG,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  dayLabelToday: {
    color: GREEN,
  },
  todayBadge: {
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  todayBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  menuText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  menuTextEmpty: {
    color: "#9CA3AF",
    fontStyle: "italic",
  },
});
