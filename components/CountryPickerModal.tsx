import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from "@/constants/colors";
import { useLanguage } from "@/src/i18n/context";

export type Country = {
  code: string;
  name: string;
};

type Props = {
  visible: boolean;
  countries: Country[];
  selectedCountry?: Country | null;
  onSelect: (country: Country) => void;
  onClose: () => void;
  title?: string;
};

export default function CountryPickerModal({
  visible,
  countries = [],
  selectedCountry,
  onSelect,
  onClose,
  title,
}: Props) {
  const { t } = useLanguage();
  const list = Array.isArray(countries) ? countries : [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {title || `${t("selectCountry")} (${list.length})`}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.list}>
            {list.map((item, idx) => {
              const selected = selectedCountry?.code === item?.code;
              return (
                <TouchableOpacity
                  key={`${item?.code}-${idx}`}
                  style={[styles.item, selected && styles.itemActive]}
                  onPress={() => {
                    if (!item) return;
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text style={styles.name}>{item?.name ?? ""}</Text>
                  <Text style={styles.dial}>{item?.code ?? ""}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: { fontSize: 18, fontWeight: "600", color: "#111827" },
  list: { paddingBottom: 20 },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  itemActive: { backgroundColor: COLORS.primary + "12" },
  name: { fontSize: 16, color: "#111827", flex: 1 },
  dial: { fontSize: 15, color: COLORS.primary, fontWeight: "700" },
});
