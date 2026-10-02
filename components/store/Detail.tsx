import React from "react";
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from "@/constants/colors";
import MealPackagePrice from "@/components/home/MealPackagePrice";
import { formatPlanDuration, getMealDurationDays, hasMealPrice } from "@/src/utils/format";

const PRIMARY = COLORS.primary;

function NutritionRow({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: any;
  unit: string;
  color: string;
}) {
  if (!value) return null;
  return (
    <View style={styles.nutritionRow}>
      <View style={styles.nutritionLeft}>
        <View style={[styles.nutritionDot, { backgroundColor: color }]} />
        <Text style={styles.nutritionLabel}>{label}</Text>
      </View>
      <Text style={styles.nutritionValue}>
        {value}
        {unit === "kcal" ? " kcal" : unit}
      </Text>
    </View>
  );
}

interface Props {
  visible: boolean;
  item: any;
  qty: number;
  onClose: () => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function Detail({
  visible,
  item,
  qty,
  onClose,
  onAdd,
  onRemove,
}: Props) {
  if (!item) return null;

  const hasPrice = hasMealPrice(item?.price);
  const planDuration = formatPlanDuration(
    getMealDurationDays(item),
    item?.price,
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: item.image }} style={styles.image} />
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <MaterialIcons name="close" size={26} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <Text style={styles.title}>{item.title}</Text>
              {hasPrice && (
                <View style={{ marginVertical: 6 }}>
                  <MealPackagePrice item={item} hideUnitPrice />
                </View>
              )}
              {!!planDuration && (
                <Text style={styles.planDuration}>{planDuration}</Text>
              )}
              {item.desc ? <Text style={styles.desc}>{item.desc}</Text> : null}

              {item.nutrition && (
                <View style={styles.nutritionSection}>
                  <View style={styles.nutritionHeader}>
                    <MaterialIcons
                      name="assessment"
                      size={18}
                      color={PRIMARY}
                    />
                    <Text style={styles.nutritionTitle}>Nutrition Facts</Text>
                  </View>
                  <View style={styles.nutritionTable}>
                    <NutritionRow
                      label="Calories"
                      value={item.nutrition.calories}
                      unit="kcal"
                      color="#FF6B6B"
                    />
                    <NutritionRow
                      label="Protein"
                      value={item.nutrition.protein}
                      unit="g"
                      color="#4ECDC4"
                    />
                    <NutritionRow
                      label="Carbs"
                      value={item.nutrition.carbs}
                      unit="g"
                      color="#45B7D1"
                    />
                    <NutritionRow
                      label="Fat"
                      value={item.nutrition.fat}
                      unit="g"
                      color="#FFA726"
                    />
                    <NutritionRow
                      label="Fiber"
                      value={item.nutrition.fiber}
                      unit="g"
                      color="#66BB6A"
                    />
                    <NutritionRow
                      label="Sugar"
                      value={item.nutrition.sugar}
                      unit="g"
                      color="#EC407A"
                    />
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {item.soldOut ? (
              <View style={styles.soldOutBtn}>
                <Text style={styles.soldOutText}>SOLD OUT</Text>
              </View>
            ) : qty > 0 ? (
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => onRemove(item.id)}
                >
                  <MaterialIcons name="remove" size={22} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{qty}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => onAdd(item.id)}
                >
                  <MaterialIcons name="add" size={22} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => {
                  onAdd(item.id);
                  onClose();
                }}
              >
                <MaterialIcons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Subscribe</Text>
              </TouchableOpacity>
            )}
          </View>
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
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  imageContainer: { position: "relative" },
  image: { width: "100%", height: 220 },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: "800", color: "#111" },
  planDuration: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY,
    marginBottom: 4,
  },
  desc: { fontSize: 14, color: "#6b7280", marginTop: 6, lineHeight: 20 },
  nutritionSection: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
  },
  nutritionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginLeft: 8,
  },
  nutritionTable: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    overflow: "hidden",
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  nutritionLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  nutritionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  nutritionLabel: { fontSize: 15, fontWeight: "600", color: "#111", flex: 1 },
  nutritionValue: { fontSize: 15, fontWeight: "700", color: "#6b7280" },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  qtyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qtyBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: { fontSize: 18, fontWeight: "800" },
  addBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  soldOutBtn: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  soldOutText: { fontWeight: "800", color: "#6b7280" },
});
