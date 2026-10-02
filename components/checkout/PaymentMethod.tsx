import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from "@/constants/colors";

interface PaymentOptionProps {
  value: string;
  title: string;
  subtitle: string;
  selected: string;
  onSelect: (v: string) => void;
}

function PaymentOption({
  value,
  title,
  subtitle,
  selected,
  onSelect,
}: PaymentOptionProps) {
  return (
    <TouchableOpacity style={styles.paymentRow} onPress={() => onSelect(value)}>
      <MaterialIcons name="payments" size={22} color="#555" />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.paymentTitle}>{title}</Text>
        <Text style={styles.paymentSub}>{subtitle}</Text>
      </View>
      <View style={[styles.radio, selected === value && styles.radioActive]} />
    </TouchableOpacity>
  );
}

interface Props {
  paymentMethod: string;
  setPaymentMethod: (v: string) => void;
  keys: any;
}

export default function PaymentMethod({
  paymentMethod,
  setPaymentMethod,
  keys,
}: Props) {
  return (
    <>
      <Text style={styles.sectionTitle}>Payment Method</Text>

      <PaymentOption
        value="upi"
        title="UPI"
        subtitle="Google Pay, PhonePe, Paytm"
        selected={paymentMethod}
        onSelect={setPaymentMethod}
      />

      {keys?.stripe_key ? (
        <PaymentOption
          value="card"
          title="Credit / Debit Card"
          subtitle="Visa, MasterCard, RuPay"
          selected={paymentMethod}
          onSelect={setPaymentMethod}
        />
      ) : null}
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
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  paymentTitle: { fontWeight: "600" },
  paymentSub: { fontSize: 12, color: "#666" },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#ccc",
  },
  radioActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
});
