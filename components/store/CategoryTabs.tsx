import COLORS from "@/constants/colors";
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";

const PRIMARY = COLORS.primary;

export default function CategoryTabs({
  active,
  onSelect,
  categories = [],
}: {
  active: string;
  onSelect: (name: string) => void;
  categories: any[];
}) {
  const all = [{ id: "all", name: "All" }, ...categories];

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {all.map((cat) => {
          const isActive = cat.name === active;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onSelect(cat.name)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.secondary,
    borderBottomWidth: 1,
    borderBottomColor: "#e7e7e7",
    paddingVertical: 12,
    paddingLeft: 12,
    zIndex: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  row: { paddingRight: 14 },
  tab: {
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 10,
    elevation: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: { backgroundColor: PRIMARY },
  tabText: { fontWeight: "600", color: "#111" },
  tabTextActive: { color: "#fff", fontWeight: "800" },
});
