import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { removeAddress } from "@/src/api/api";
import COLORS from "@/constants/colors";

interface Address {
  id?: string;
  address_id?: string;
  type?: string;
  house_no?: string;
  address: string;
  landmark?: string;
  lat?: number | string;
  lng?: number | string;
}

interface Props {
  deliveryAddress: Address | null;
  savedAddresses: Address[];
  onAddressChange: (address: Address) => void;
  onAddressRemoved: (addresses: Address[]) => void;
}

export default function DeliveryAddressCard({
  deliveryAddress,
  savedAddresses,
  onAddressChange,
  onAddressRemoved,
}: Props) {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>(savedAddresses || []);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Keep local list in sync when parent refreshes
  useEffect(() => {
    setAddresses(savedAddresses || []);
  }, [savedAddresses]);

  const handleSelect = async (addr: Address) => {
    await AsyncStorage.setItem("delivery_address", JSON.stringify(addr));
    onAddressChange(addr);
    setModalVisible(false);
  };

  const handleRemove = (addr: Address) => {
    Alert.alert(
      "Delete Address",
      "Are you sure you want to remove this address?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const id = (addr.id || addr.address_id) as string;
            setDeletingId(id);
            try {
              await removeAddress(id);
              const updated = addresses.filter(
                (a) => (a.id || a.address_id) !== id,
              );
              setAddresses(updated);
              onAddressRemoved(updated);

              // If the deleted address was the selected one, clear it
              const selId = deliveryAddress?.id || deliveryAddress?.address_id;
              if (selId === id) {
                await AsyncStorage.removeItem("delivery_address");
                onAddressChange(null as any);
              }
            } catch {
              Alert.alert(
                "Error",
                "Failed to delete address. Please try again.",
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const iconForType = (type?: string) => {
    if (type === "Work") return "work";
    if (type === "Other") return "place";
    return "home";
  };

  const isSelected = (addr: Address) => {
    const selId = deliveryAddress?.id || deliveryAddress?.address_id;
    const addrId = addr.id || addr.address_id;
    return selId && addrId && selId === addrId;
  };

  return (
    <>
      <Text style={styles.sectionTitle}>Delivery Address</Text>

      {deliveryAddress ? (
        <View style={styles.addressCard}>
          <View style={styles.addressIcon}>
            <MaterialIcons
              name={iconForType(deliveryAddress.type)}
              size={22}
              color={COLORS.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.addressTitle}>
              {deliveryAddress.type || "Home"}
            </Text>
            <Text style={styles.addressText} numberOfLines={2}>
              {[
                deliveryAddress.house_no,
                deliveryAddress.address,
                deliveryAddress.landmark,
              ]
                .filter(Boolean)
                .join(", ")}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Text style={styles.changeBtn}>Change</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addAddressBtn}
          onPress={() => setModalVisible(true)}
        >
          <MaterialIcons name="add" size={20} color={COLORS.primary} />
          <Text style={styles.addAddressText}>Select Delivery Address</Text>
        </TouchableOpacity>
      )}

      {/* ── Address selector modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        />

        <View style={styles.sheet}>
          {/* Modal header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Select Address</Text>
            <TouchableOpacity
              style={styles.addNewBtn}
              onPress={() => {
                setModalVisible(false);
                router.push("/add-address" as any);
              }}
            >
              <MaterialIcons name="add" size={18} color="#fff" />
              <Text style={styles.addNewText}>Add New</Text>
            </TouchableOpacity>
          </View>

          {addresses.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="location-off" size={48} color="#ddd" />
              <Text style={styles.emptyText}>No saved addresses</Text>
              <Text style={styles.emptySubText}>Tap "Add New" to add one.</Text>
            </View>
          ) : (
            <FlatList
              data={addresses}
              keyExtractor={(item, i) =>
                String(item.id || item.address_id || i)
              }
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => {
                const itemId = item.id || item.address_id;
                const deleting = deletingId === itemId;
                const selected = isSelected(item);

                return (
                  <TouchableOpacity
                    style={[styles.addrRow, selected && styles.addrRowSelected]}
                    activeOpacity={0.75}
                    onPress={() => handleSelect(item)}
                  >
                    {/* Type icon */}
                    <View
                      style={[
                        styles.addrIcon,
                        selected && styles.addrIconSelected,
                      ]}
                    >
                      <MaterialIcons
                        name={iconForType(item.type)}
                        size={20}
                        color={selected ? "#fff" : COLORS.primary}
                      />
                    </View>

                    {/* Text */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.addrType,
                          selected && styles.addrTypeSelected,
                        ]}
                      >
                        {item.type || "Home"}
                      </Text>
                      <Text style={styles.addrFull} numberOfLines={2}>
                        {[item.house_no, item.address, item.landmark]
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                    </View>

                    {/* Selected tick */}
                    {selected && (
                      <MaterialIcons
                        name="check-circle"
                        size={22}
                        color={COLORS.primary}
                        style={{ marginRight: 8 }}
                      />
                    )}

                    {/* Delete */}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleRemove(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <ActivityIndicator size="small" color="#ff4444" />
                      ) : (
                        <MaterialIcons
                          name="delete-outline"
                          size={20}
                          color="#ff4444"
                        />
                      )}
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 20,
  },

  addressCard: {
    flexDirection: "row",
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
  },
  addressIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ece8f3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addressTitle: { fontWeight: "700" },
  addressText: { fontSize: 13, color: "#666" },
  changeBtn: { color: COLORS.primary, fontWeight: "600", paddingLeft: 8 },

  addAddressBtn: {
    marginTop: 10,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#c9b8e6",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  addAddressText: { color: COLORS.primary, fontWeight: "600", marginLeft: 6 },

  /* Modal */
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: "75%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  addNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addNewText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  /* Address rows inside modal */
  addrRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ebebeb",
  },
  addrRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(74,21,148,0.05)",
  },
  addrIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(74,21,148,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addrIconSelected: { backgroundColor: COLORS.primary },
  addrType: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 2,
  },
  addrTypeSelected: { color: COLORS.primary },
  addrFull: { fontSize: 13, color: "#555", lineHeight: 18 },
  deleteBtn: { padding: 6 },

  /* Empty state */
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "700", color: "#aaa" },
  emptySubText: { fontSize: 13, color: "#bbb" },
});
