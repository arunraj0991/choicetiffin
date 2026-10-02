import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from "@/constants/colors";
import { formatPrice } from "@/src/utils/format";

type Addon = {
  id?: string | number;
  name?: string;
  img?: string | null;
  qty?: number;
  price?: string | number;
  raw_price?: string | number;
};

type Props = {
  addons?: Addon[];
  currency?: string;
};

export default function AddOnsSummary({ addons = [], currency = "" }: Props) {
  if (!addons.length) return null;

  return (
    <>
      <Text style={styles.sectionTitle}>Add-ons</Text>
      <View style={styles.card}>
        {addons.map((addon, index) => {
          const qty = Number(addon?.qty ?? 0);
          const unit = Number(addon?.raw_price ?? addon?.price ?? 0);
          const lineTotal = unit * qty;
          const key = String(addon?.id ?? addon?.name ?? index);

          return (
            <View
              key={key}
              style={[styles.row, index === addons.length - 1 && styles.rowLast]}
            >
              {addon?.img ? (
                <Image source={{ uri: addon.img }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.imageFallback]}>
                  <MaterialIcons name="restaurant" size={18} color="#bbb" />
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {addon?.name ?? "Add-on"}
                </Text>
                <Text style={styles.meta}>
                  {currency}
                  {formatPrice(unit)} × {qty}
                </Text>
              </View>
              <Text style={styles.price}>
                {currency}
                {formatPrice(lineTotal)}
              </Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 20,
    color: COLORS.text,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  rowLast: { borderBottomWidth: 0 },
  image: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: "#f3f4f6",
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  meta: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  price: { fontSize: 14, fontWeight: "700", color: COLORS.text },
});
