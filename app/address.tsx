import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

// import { getAccount, removeAddress } from '@/src/api/api';
import { getAccount, removeAddress } from "@/src/api/api";
import COLORS from "@/constants/colors";
import { useLanguage } from "@/src/i18n/context";

const PRIMARY = COLORS.primary;

interface SavedAddress {
  id: string;
  user_id?: string;
  address: string;
  house_no?: string;
  landmark?: string;
  type?: string;
  lat?: number;
  lng?: number;
  address_id?: string;
}

export default function AddressScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      loadAddresses();
    }, []),
  );

  const loadAddresses = async () => {
    try {
      // 1. Show cached addresses instantly while API loads
      const stored = await AsyncStorage.getItem("user_addresses");
      if (stored) {
        const cached = JSON.parse(stored);
        if (cached?.length) {
          setSavedAddresses(cached);
          setLoading(false);
        }
      }

      // 2. Fetch latest from server so first-time / new-device users see their addresses
      const userId = await AsyncStorage.getItem("user_id");
      if (userId) {
        const res = await getAccount(userId);
        // Backend account() returns data.address (singular) as the addresses array
        const addresses: SavedAddress[] | null = res?.data?.address || null;

        if (addresses?.length) {
          setSavedAddresses(addresses);
          await AsyncStorage.setItem(
            "user_addresses",
            JSON.stringify(addresses),
          );
        }
      }
    } catch (e) {
      console.warn("Failed to load addresses:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = () => {
    router.push("/add-address" as any);
  };

  const handleSelectAddress = async (address: SavedAddress) => {
    await AsyncStorage.setItem("delivery_address", JSON.stringify(address));
    router.back();
  };

  const handleDeleteAddress = (addr: SavedAddress) => {
    Alert.alert(t("deleteAddress"), t("areYouSure"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            const res = await removeAddress(addr.id);
            const updated: SavedAddress[] = res?.data?.length
              ? res.data
              : savedAddresses.filter((a) => a.id !== addr.id);
            setSavedAddresses(updated);
            await AsyncStorage.setItem(
              "user_addresses",
              JSON.stringify(updated),
            );
          } catch {
            Alert.alert(t("error"), t("failedDeleteAddress"));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{t("deliveryAddressTitle")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : savedAddresses.length === 0 ? (
        /* Empty state */
        <View style={styles.centered}>
          <MaterialIcons name="location-off" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No saved addresses</Text>
          <Text style={styles.emptySubtitle}>
            Add a delivery address to get started.
          </Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddAddress}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {savedAddresses.map((addr, i) => (
            <TouchableOpacity
              key={addr.id || i}
              style={styles.card}
              activeOpacity={0.75}
              onPress={() => handleSelectAddress(addr)}
            >
              {/* Icon + type badge */}
              <View style={styles.iconWrap}>
                <MaterialIcons
                  name={
                    addr.type === "Work"
                      ? "work"
                      : addr.type === "Other"
                        ? "place"
                        : "home"
                  }
                  size={22}
                  color={PRIMARY}
                />
              </View>

              {/* Text */}
              <View style={styles.cardText}>
                <Text style={styles.addrType}>{addr.type || "Home"}</Text>
                <Text style={styles.addrMain} numberOfLines={2}>
                  {[addr.house_no, addr.address, addr.landmark]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </View>

              {/* Delete */}
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteAddress(addr)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={22}
                  color="#ff4444"
                />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.addBtnOutline}
            onPress={handleAddAddress}
            activeOpacity={0.75}
          >
            <MaterialIcons name="add" size={20} color={PRIMARY} />
            <Text style={styles.addBtnOutlineText}>Add Address</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f7f9" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#130e1b",
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },

  list: { padding: 16, gap: 12 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ebebeb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(68,14,150,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  cardText: { flex: 1, marginRight: 8 },
  addrType: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY,
    marginBottom: 3,
  },
  addrMain: { fontSize: 13, color: "#555", lineHeight: 18 },

  deleteBtn: { padding: 6 },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: PRIMARY,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 8,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  addBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#c9b8e6",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#fff",
  },
  addBtnOutlineText: { color: PRIMARY, fontWeight: "700", fontSize: 14 },
});
