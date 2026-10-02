import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Switch,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from "@/constants/colors";
import { getMenus } from "@/src/api/api";
import { useFoodTypeFilterStore } from "@/src/store/foodTypeFilter";

const GREEN = "#4CAF50";
const TODAY_BG = "#E8F5E9";
const CATEGORIES = ["lunch", "dinner"] as const;
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

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
};

export default function WeeklyMenuModal({
  visible,
  onClose,
  title = "Weekly Menu",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [menus, setMenus] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof CATEGORIES)[number]>("lunch");
  const foodFilter = useFoodTypeFilterStore((s) => s.filter);
  const setFoodFilter = useFoodTypeFilterStore((s) => s.setFilter);
  const vegMenu = foodFilter !== "nonveg";
  const todayKey = getTodayDayKey();

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    setLoading(true);
    getMenus()
      .then((res) => {
        if (!cancelled) {
          setMenus(Array.isArray(res?.data) ? res.data : []);
        }
      })
      .catch(() => {
        if (!cancelled) setMenus([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible]);

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
            </Pressable>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.headerSpacer} />
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
                  <Text
                    style={[styles.tabText, active && styles.tabTextActive]}
                  >
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
                {vegMenu ? "VEG MENU" : "NON-VEG MENU"}
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
              <ActivityIndicator color={GREEN} />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
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
                          <Text style={styles.todayBadgeText}>TODAY</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.menuText,
                        !item.menu && styles.menuTextEmpty,
                      ]}
                    >
                      {item.menu || "Menu not available"}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: "#F3F4F6",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "92%",
    paddingBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: GREEN,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.gray,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    paddingVertical: 40,
    alignItems: "center",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  menuBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  dayCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 14,
    marginTop: 16,
    backgroundColor: COLORS.white,
  },
  dayCardToday: {
    borderColor: GREEN,
    backgroundColor: TODAY_BG,
  },
  dayLabelWrap: {
    position: "absolute",
    top: -10,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
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
