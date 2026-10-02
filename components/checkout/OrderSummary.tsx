import COLORS from "@/constants/colors";
import MealPackagePrice from "@/components/home/MealPackagePrice";
import { hasMealPrice } from "@/src/utils/format";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

function CartItemRow({
  title,
  image,
  item,
  qty,
  selectedDays,
  category,
}: {
  title: string;
  image?: string | null;
  item: any;
  qty: number;
  selectedDays: string[];
  category?: string;
}) {
  return (
    <View style={styles.itemRow}>
      {image ? (
        <Image source={{ uri: image }} style={styles.itemImage} />
      ) : (
        <View style={[styles.itemImage, styles.itemImageFallback]}>
          <MaterialIcons name="fastfood" size={18} color="#bbb" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={styles.itemTop}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {title}
          </Text>
        </View>
        {hasMealPrice(item?.price) ? (
          <View style={{ marginTop: 4 }}>
            <MealPackagePrice item={item} qty={qty} compact />
          </View>
        ) : null}
        <View style={styles.metaRow}>
          {category ? (
            <View style={styles.categoryChip}>
              <Text style={styles.itemCategory}>{category}</Text>
            </View>
          ) : null}
          <Text style={styles.itemSub}>Qty {qty}</Text>
        </View>
        {selectedDays?.length > 0 && (
          <View style={styles.daysRow}>
            {selectedDays.map((day, i) => (
              <View key={`${day}-${i}`} style={styles.dayChip}>
                <Text style={styles.dayText}>{day}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

interface Props {
  cartData: any;
  selectedDaysByItem?: Record<string, string[]>;
  currency?: string;
}

export default function OrderSummary({
  cartData,
  selectedDaysByItem = {},
  currency = "",
}: Props) {
  if (!cartData || !Array.isArray(cartData.cart)) return null;

  return (
    <>
      <Text style={styles.sectionTitle}>Order Summary</Text>
      <View style={styles.card}>
        {cartData.cart.map((item: any, i: number) => {
          const qty = Number(item.qty || 1);
          const days =
            item.selectedDays ||
            selectedDaysByItem[item.id] ||
            selectedDaysByItem[String(item.id)] ||
            [];

          return (
            <CartItemRow
              key={item.id ?? i}
              title={item.name}
              image={item.img}
              item={item}
              qty={qty}
              selectedDays={days}
              category={
                Array.isArray(item.category)
                  ? item.category.join(", ")
                  : item.category
              }
            />
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
  card: { borderRadius: 12, marginBottom: 8 },
  itemRow: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
  },
  itemImage: { width: 52, height: 52, borderRadius: 10, marginRight: 12 },
  itemImageFallback: {
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  itemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  itemTitle: { fontWeight: "700", fontSize: 14, flex: 1, color: COLORS.text },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  categoryChip: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  itemCategory: {
    fontSize: 10,
    color: "#666",
    fontWeight: "600",
  },
  itemSub: { fontSize: 12, color: "#666" },
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 },
  dayChip: {
    backgroundColor: "#ece8f3",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dayText: { fontSize: 11, color: COLORS.primary, fontWeight: "600" },
});
