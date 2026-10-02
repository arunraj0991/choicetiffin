import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

import COLORS from "@/constants/colors";
import { changeAddress, getAccount, modifyAddress } from "@/src/api/api";
import { useLanguage } from "@/src/i18n/context";

type SavedAddress = {
  id?: string;
  address_id?: string;
  type?: string;
  house_no?: string;
  address?: string;
  landmark?: string;
};

type Props = {
  visible: boolean;
  orderId?: string | number;
  currentAddressId?: string | number | null;
  currentAddress?: string;
  onClose: () => void;
  onUpdated: (address: SavedAddress, message?: string) => void;
  isModify?: boolean;
};

function getAddressId(addr?: SavedAddress | null) {
  return String(addr?.id ?? addr?.address_id ?? "").trim();
}

function formatAddress(addr?: SavedAddress | null) {
  return [addr?.house_no, addr?.address, addr?.landmark]
    .filter(Boolean)
    .join(", ");
}

function iconForType(type?: string) {
  if (type === "Work") return "work";
  if (type === "Other") return "place";
  return "home";
}

export default function ChangeAddressModal({
  visible,
  orderId,
  currentAddressId,
  currentAddress,
  onClose,
  onUpdated,
  isModify = false,
}: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const userId = await AsyncStorage.getItem("user_id");
        if (!userId) return;
        const res = await getAccount(userId);
        if (!cancelled) {
          setAddresses(
            Array.isArray(res?.data?.address) ? res.data.address : [],
          );
        }
      } catch {
        if (!cancelled) setAddresses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const isSelected = (addr: SavedAddress) => {
    const id = getAddressId(addr);
    const currentId = String(currentAddressId ?? "").trim();
    if (id && currentId && id === currentId) return true;
    if (!currentId && currentAddress && addr.address) {
      return String(addr.address).trim() === String(currentAddress).trim();
    }
    return false;
  };

  const handleSelect = async (addr: SavedAddress) => {
    const addressId = getAddressId(addr);
    const oid = String(orderId ?? "").trim();
    if (!addressId || !oid) {
      Alert.alert(t("error"), t("failedUpdateAddress"));
      return;
    }
    if (isSelected(addr)) {
      onClose();
      return;
    }

    setSavingId(addressId);
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        Alert.alert(t("error"), t("pleaseLogin"));
        return;
      }

      let res;

      if (isModify) {
        res = await modifyAddress(oid, addressId);
      } else {
        res = await changeAddress(userId, oid, addressId);
      }
       console.log(res)
      if (res?.status === false || res?.error) {
        Alert.alert(t("error"), res?.error || res?.message || t("failedUpdateAddress"));
        return;
      }
      const message = String(
        res?.message ?? res?.data?.message ?? res?.msg ?? "",
      ).trim();
      await AsyncStorage.setItem("delivery_address", JSON.stringify(addr));
      onUpdated(addr, message);
      onClose();
    } catch {
      Alert.alert(t("error"), t("failedUpdateAddress"));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{t("selectAddress")}</Text>
          <TouchableOpacity
            style={styles.addNewBtn}
            onPress={() => {
              onClose();
              router.push("/add-address" as any);
            }}
          >
            <MaterialIcons name="add" size={18} color="#fff" />
            <Text style={styles.addNewText}>{t("addNew")}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="location-off" size={48} color="#ddd" />
            <Text style={styles.emptyText}>{t("noSavedAddresses")}</Text>
          </View>
        ) : (
          <FlatList
            data={addresses}
            keyExtractor={(item, i) => getAddressId(item) || String(i)}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => {
              const selected = isSelected(item);
              const saving = savingId === getAddressId(item);
              return (
                <TouchableOpacity
                  style={[styles.addrRow, selected && styles.addrRowSelected]}
                  activeOpacity={0.75}
                  onPress={() => handleSelect(item)}
                  disabled={!!savingId}
                >
                  <View
                    style={[styles.addrIcon, selected && styles.addrIconSelected]}
                  >
                    <MaterialIcons
                      name={iconForType(item.type)}
                      size={20}
                      color={selected ? "#fff" : COLORS.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addrType}>{item.type || "Home"}</Text>
                    <Text style={styles.addrFull} numberOfLines={2}>
                      {formatAddress(item)}
                    </Text>
                  </View>
                  {saving ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : selected ? (
                    <MaterialIcons
                      name="check-circle"
                      size={22}
                      color={COLORS.primary}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  loader: { paddingVertical: 40, alignItems: "center" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "700", color: "#aaa" },
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
  addrFull: { fontSize: 13, color: "#555", lineHeight: 18 },
});
