import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import COLORS from "@/constants/colors";
import { useCartStore } from "@/src/store/cart";

const PRIMARY = COLORS.primary;
const BAR_HEIGHT = 64;
const BAR_BOTTOM_GAP = 0;
const FAB_OFFSET_FROM_BAR_BOTTOM = 26;

interface NavItemProps {
  icon: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
  iconFamily?: "ionicons" | "material";
}

function NavItem({
  icon,
  label,
  active = false,
  onPress,
  iconFamily = "ionicons",
}: NavItemProps) {
  const color = active ? PRIMARY : "#9b9b9b";
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
      {iconFamily === "material" ? (
        <MaterialIcons name={icon as any} size={24} color={color} />
      ) : (
        <Ionicons name={icon as any} size={24} color={color} />
      )}
      <Text style={[styles.label, active && { color: PRIMARY }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const itemCount = useCartStore((s) => s.itemCount);

  const bottomInset = Math.max(insets.bottom, 0);

  const isHome =
    pathname === "/" ||
    pathname === "/index" ||
    pathname === "/(tabs)" ||
    pathname === "/(tabs)/index" ||
    pathname === "/(tabs)/";
  const isPlan =
    pathname.includes("explore") || pathname.includes("subscription");

  return (
    <>
      <View style={[styles.container, { paddingBottom: bottomInset }]}>
        <NavItem
          icon="home"
          label="Home"
          active={isHome}
          onPress={() => router.push("/(tabs)" as any)}
        />

        <NavItem
          icon="search"
          label="Search"
          active={pathname === "/search"}
          onPress={() => router.push("/search")}
        />

        <View style={styles.fabSpacer} />

        <NavItem
          icon="receipt-long"
          label="My Plan"
          active={isPlan}
          onPress={async () => {
            const userId = await AsyncStorage.getItem("user_id");
            if (userId) router.push("/subscription" as any);
            else router.push("/login" as any);
          }}
          iconFamily="material"
        />

        <NavItem
          icon="person"
          label="Account"
          active={pathname === "/account"}
          onPress={() => router.push("/account" as any)}
        />
      </View>

      <View
        style={[
          styles.fabWrap,
          { bottom: bottomInset + FAB_OFFSET_FROM_BAR_BOTTOM },
        ]}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/cart" as any)}
        >
          <Ionicons name="bag" size={20} color="#fff" />
          {itemCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {itemCount > 99 ? "99+" : itemCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

/** Space screens should leave clear above BottomNav + system nav. */
export function bottomNavContentPadding(insetBottom = 0) {
  return BAR_HEIGHT + Math.max(insetBottom, 0) + BAR_BOTTOM_GAP + 24;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: BAR_HEIGHT,
    backgroundColor: "#fff",
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  fabSpacer: {
    width: 56,
    flexShrink: 0,
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    color: "#9b9b9b",
    fontWeight: "700",
  },
  fabWrap: {
    position: "absolute",
    left: "50%",
    transform: [{ translateX: -26 }],
    zIndex: 10,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
});
