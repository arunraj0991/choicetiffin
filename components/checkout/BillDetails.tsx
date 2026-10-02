import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatPrice } from "@/src/utils/format";

function BillRow({
  label,
  value,
  bold,
  discount,
}: {
  label: string;
  value: string;
  bold?: boolean;
  discount?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text
        style={[styles.label, discount && styles.green, bold && styles.bold]}
      >
        {label}
      </Text>
      <Text
        style={[styles.value, discount && styles.green, bold && styles.bold]}
      >
        {value}
      </Text>
    </View>
  );
}

interface Props {
  subtotal: number;
  deliveryFee: string | number;
  taxes?: { name: string; amount: string | number }[];
  appliedCoupon?: any;
  discountAmount?: number;
  addonTotal?: number;
  walletRedeem?: number;
  totalAmount: number;
  currency: string;
}

function money(currency: string, amount: string | number) {
  return `${currency || ""}${formatPrice(amount)}`;
}

export default function BillDetails({
  subtotal,
  deliveryFee,
  taxes,
  appliedCoupon,
  discountAmount,
  addonTotal = 0,
  walletRedeem = 0,
  totalAmount,
  currency,
}: Props) {
  const couponCode = appliedCoupon?.code || appliedCoupon?.coupon_code;

  return (
    <>
      <Text style={styles.sectionTitle}>Bill Details</Text>
      <View style={styles.card}>
        <BillRow label="Subtotal" value={money(currency, subtotal || 0)} />

        {addonTotal > 0 && (
          <BillRow label="Add-ons" value={money(currency, addonTotal)} />
        )}

        {appliedCoupon && (discountAmount || 0) > 0 && (
          <BillRow
            label={couponCode ? `Discount (${couponCode})` : "Discount"}
            value={`-${money(currency, discountAmount || 0)}`}
            discount
          />
        )}

        {taxes?.map((tax, i) => (
          <BillRow
            key={`${tax.name}-${i}`}
            label={tax.name}
            value={money(currency, tax.amount)}
          />
        ))}

        {parseFloat(String(deliveryFee)) > 0 && (
          <BillRow
            label="Delivery Fee"
            value={money(currency, deliveryFee)}
          />
        )}

        {walletRedeem > 0 && (
          <BillRow
            label="Wallet Redeem"
            value={`-${money(currency, walletRedeem)}`}
            discount
          />
        )}

        <View style={styles.divider} />
        <BillRow
          label="Total to Pay"
          value={money(currency, totalAmount)}
          bold
        />
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
    color: "#1A1A1A",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  label: { color: "#666" },
  value: { color: "#666" },
  bold: { fontWeight: "700", color: "#000" },
  green: { color: "green" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 8 },
});
