import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageBackground,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from "@/constants/colors";
import MealPackagePrice from "@/components/home/MealPackagePrice";
import { formatMealDescription } from "@/src/utils/format";

const PRIMARY = COLORS.primary;

const DAYS_MAP: Record<string, string> = {
  Mon: "M",
  Tue: "T",
  Wed: "W",
  Thu: "T",
  Fri: "F",
  Sat: "S",
  Sun: "S",
};

interface Props {
  itemId: string;
  title: string;
  price: string;
  qty: number;
  total: string;
  image: string;
  time: number;
  duration?: string | number | null;
  duration_days?: string | number | null;
  durationdays?: string | number | null;
  mrp?: string | number | null;
  description?: string;
  availableDays: string[];
  selectedDays: string[];
  onToggleDay: (itemId: string, day: string) => void;
  onDelete: (itemId: string) => void;
  category?: string;
}

export default function CartItem({
  itemId,
  title,
  price,
  qty,
  total,
  image,
  time,
  duration,
  duration_days,
  durationdays,
  mrp,
  description,
  availableDays,
  selectedDays,
  onToggleDay,
  onDelete,
  category,
}: Props) {
  const menuDescription = formatMealDescription(description);

  return (
    <View style={styles.card}>
      <View style={styles.itemRow}>
        <ImageBackground
          source={{ uri: image }}
          style={styles.image}
          imageStyle={{ borderRadius: 12 }}
        />
        <View style={{ flex: 1 }}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>{title}</Text>
            {category ? (
              <Text style={styles.categoryText}>{category}</Text>
            ) : null}
            <Pressable onPress={() => onDelete(itemId)}>
              <MaterialIcons name="delete" size={22} color="#999" />
            </Pressable>
          </View>
          <MealPackagePrice
            item={{
              price,
              mrp,
              time,
              duration,
              duration_days,
              durationdays,
            }}
            qty={qty}
            compact
          />
          {qty > 1 ? (
            <Text style={styles.qtyText}>Qty {qty}</Text>
          ) : null}
          {!!menuDescription && (
            <Text style={styles.description}>{menuDescription}</Text>
          )}
        </View>
      </View>

      {/* <Text style={styles.deliverText}>Select your delivery days :</Text>
      <View style={styles.daysRow}>
        {availableDays.map((day, i) => {
          const isSelected = selectedDays.includes(day);
          return (
            <Pressable key={i} style={[styles.dayCircle, isSelected && styles.dayActive]} onPress={() => onToggleDay(itemId, day)}>
              <Text style={[styles.dayText, isSelected && { color: '#fff' }]}>{DAYS_MAP[day] || day.charAt(0)}</Text>
            </Pressable>
          );
        })}
      </View> */}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  itemRow: { flexDirection: "row", gap: 12 },
  image: { width: 80, height: 80 },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemTitle: { fontSize: 16, fontWeight: "700", flex: 1 },
  categoryText: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
    marginRight: 8,
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  qtyText: { color: "#777", fontWeight: "600", fontSize: 12, marginTop: 4 },
  description: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: "#777",
    fontWeight: "500",
  },
  deliverText: {
    marginTop: 12,
    fontSize: 12,
    color: "#777",
    fontWeight: "700",
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  dayActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  dayText: { fontWeight: "600", color: "#777" },
});
