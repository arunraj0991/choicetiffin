import React, { useMemo } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import COLORS from "@/constants/colors";
import {
  getCategoryDiscountOffer,
  getCategoryImage,
} from "@/src/store/homepageMeals";
import {
  formatMealDescription,
  parseMealDescriptionItems,
} from "@/src/utils/format";

type Props = {
  visible: boolean;
  category: any | null;
  onClose: () => void;
  onViewMenu?: (category: any) => void;
  onViewPlans?: (category: any) => void;
};

function getCombinedDescriptionItems(category: any) {
  const meals = Array.isArray(category?.meals) ? category.meals : [];
  const seen = new Set<string>();
  const items: { name: string; qty: string }[] = [];

  const sources = [
    parseMealDescriptionItems(category?.description),
    ...meals.map((meal: any) => parseMealDescriptionItems(meal?.description)),
  ];

  sources.forEach((list) => {
    list.forEach((item) => {
      const key = item.name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      items.push(item);
    });
  });

  return items;
}

export default function CategoryDetailModal({
  visible,
  category,
  onClose,
  onViewMenu,
  onViewPlans,
}: Props) {
  const image = getCategoryImage(category);
  const discountOffer = getCategoryDiscountOffer(category);
  const descriptionItems = useMemo(
    () => getCombinedDescriptionItems(category),
    [category],
  );
  const descriptionText =
    formatMealDescription(category?.description) ||
    (Array.isArray(category?.meals)
      ? category.meals
          .map((meal: any) => formatMealDescription(meal?.description))
          .filter(Boolean)
          .join(", ")
      : "");

  return (
    <Modal
      visible={visible && !!category}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={styles.content}>
              {!!discountOffer && (
                <View style={styles.promoBadge}>
                  <Ionicons name="pricetag" size={11} color="#fff" />
                  <Text style={styles.promoBadgeText} numberOfLines={1}>
                    {discountOffer}
                  </Text>
                </View>
              )}
              {!!category?.name && (
                <Text style={styles.title}>{category.name}</Text>
              )}

              {descriptionItems.length > 0 ? (
                <View style={styles.descItems}>
                  {descriptionItems.map((row, index) => (
                    <Text key={`${row.name}-${index}`} style={styles.description}>
                      {row.qty ? `${row.qty} ${row.name}` : row.name}
                    </Text>
                  ))}
                </View>
              ) : (
                !!descriptionText && (
                  <Text style={styles.description}>{descriptionText}</Text>
                )
              )}
            </View>

            {image ? (
              <Image source={{ uri: image }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]} />
            )}
          </View>

          {(onViewMenu || onViewPlans) && (
            <View style={styles.actions}>
              {!!onViewMenu && (
                <Pressable
                  style={[styles.actionBtn, styles.menuBtn]}
                  onPress={() => {
                    onClose();
                    onViewMenu(category);
                  }}
                >
                  <Ionicons
                    name="restaurant-outline"
                    size={14}
                    color={COLORS.primary}
                  />
                  <Text style={styles.menuBtnText} numberOfLines={1}>
                    Menu
                  </Text>
                </Pressable>
              )}
              {!!onViewPlans && (
                <Pressable
                  style={[styles.actionBtn, styles.subscribeBtn]}
                  onPress={() => {
                    onClose();
                    onViewPlans(category);
                  }}
                >
                  <Ionicons name="calendar-outline" size={14} color="#fff" />
                  <Text style={styles.subscribeBtnText} numberOfLines={1}>
                    View Plans
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  content: {
    flex: 1,
    paddingRight: 4,
    paddingTop: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
    paddingRight: 20,
  },
  promoBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#16A34A",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: "100%",
  },
  promoBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  descItems: {
    gap: 2,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.muted,
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
  },
  imagePlaceholder: {
    backgroundColor: COLORS.secondary,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
  },
  subscribeBtn: {
    backgroundColor: COLORS.primary,
  },
  subscribeBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  menuBtn: {
    backgroundColor: "#F3EAFB",
  },
  menuBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
  },
});
