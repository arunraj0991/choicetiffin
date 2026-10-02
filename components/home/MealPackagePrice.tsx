import React from "react";
import { StyleSheet, Text, View } from "react-native";
import COLORS from "@/constants/colors";
import { useLanguage } from "@/src/i18n/context";
import { formatPrice, getMealPackagePricing } from "@/src/utils/format";

type Props = {
  item?: {
    price?: string | number | null;
    mrp?: string | number | null;
    duration?: string | number | null;
    duration_days?: string | number | null;
    durationdays?: string | number | null;
    time?: string | number | null;
  } | null;
  qty?: string | number | null;
  compact?: boolean;
  showDiscount?: boolean;
  hideUnitPrice?: boolean;
};

export default function MealPackagePrice({
  item,
  qty = 1,
  compact = false,
  showDiscount = false,
  hideUnitPrice = false,
}: Props) {
  const { t } = useLanguage();
  const pricing = getMealPackagePricing(item, qty);
  if (!pricing) return null;

  const discount =
    showDiscount && pricing.packageMrp
      ? Math.round(
          ((pricing.packageMrp - pricing.packagePrice) / pricing.packageMrp) *
            100,
        )
      : null;

  return (
    <View style={styles.wrap}>
      {!hideUnitPrice && (
        <Text style={[styles.unitPrice, compact && styles.unitPriceCompact]}>
          ₹{formatPrice(pricing.unitPrice)}{" "}
          <Text style={styles.perThali}>{t("perThali")}</Text>
        </Text>
      )}
      <View style={styles.packageRow}>
        <Text style={[styles.packagePrice, compact && styles.packagePriceCompact]}>
          ₹{formatPrice(pricing.packagePrice)}
        </Text>
        {pricing.packageMrp != null && (
          <Text style={styles.mrp}>₹{formatPrice(pricing.packageMrp)}</Text>
        )}
        {pricing.saveAmount != null && (
          <Text style={styles.save}>Save ₹{formatPrice(pricing.saveAmount)}</Text>
        )}
        {!!discount && <Text style={styles.discount}>{discount}% OFF</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 2,
    marginTop: 4,
  },
  unitPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  unitPriceCompact: {
    fontSize: 13,
  },
  perThali: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
  },
  packageRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  packagePriceCompact: {
    fontSize: 16,
  },
  mrp: {
    fontSize: 13,
    color: COLORS.muted,
    textDecorationLine: "line-through",
    textDecorationStyle: "solid",
    textDecorationColor: COLORS.muted,
  },
  save: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.success,
  },
  discount: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
});
