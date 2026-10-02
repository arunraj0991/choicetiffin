import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import COLORS from "@/constants/colors";
import availableSlots from "@/components/cart/slots.json";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  selectedDays?: string[];
  selectedDates?: string[];
  selectedStartDate?: string | null;
  selectedSlots?: string[];
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function DeliveryScheduleCard({
  selectedDays = [],
  selectedDates = [],
  selectedStartDate,
  selectedSlots = [],
}: Props) {
  const slots = availableSlots.filter((slot) =>
    selectedSlots.includes(slot.id),
  );
  const days = WEEK_DAYS.filter((day) => selectedDays.includes(day));
  const dates = (selectedDates || []).filter(Boolean);
  const startLabel = formatDate(selectedStartDate);

  if (!days.length && !dates.length && !slots.length && !startLabel) {
    return null;
  }

  return (
    <>
      <Text style={styles.sectionTitle}>Delivery Schedule</Text>
      <View style={styles.card}>
        {days.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.label}>Delivery days</Text>
            <View style={styles.daysRow}>
              {days.map((day) => (
                <View key={day} style={styles.dayChip}>
                  <Text style={styles.dayText}>{day}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {(dates.length > 0 || startLabel) && (
          <View style={styles.block}>
            <View style={styles.labelRow}>
              <MaterialIcons
                name="calendar-today"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.label}>
                {dates.length > 1 ? "Delivery dates" : "Start date"}
              </Text>
            </View>
            {dates.length > 0 ? (
              <View style={styles.wrapRow}>
                {dates.map((date) => (
                  <View key={date} style={styles.dateChip}>
                    <Text style={styles.dateText}>{formatDate(date)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.value}>{startLabel}</Text>
            )}
          </View>
        )}

        {slots.length > 0 && (
          <View style={[styles.block, styles.blockLast]}>
            <Text style={styles.label}>Delivery slots</Text>
            <View style={styles.slotRow}>
              {slots.map((slot) => (
                <View key={slot.id} style={styles.slotCard}>
                  <View style={styles.slotHeader}>
                    <Ionicons
                      name={slot.icon as any}
                      size={16}
                      color={COLORS.primary}
                    />
                    <Text style={styles.slotTitle}>{slot.title}</Text>
                  </View>
                  <Text style={styles.slotTime}>{slot.time}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
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
    padding: 14,
    marginBottom: 8,
  },
  block: {
    marginBottom: 16,
  },
  blockLast: { marginBottom: 0 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.gray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  value: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayChip: {
    minWidth: 44,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  dayText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dateChip: {
    backgroundColor: "#f3eef9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dateText: { fontSize: 12, fontWeight: "600", color: COLORS.primary },
  slotRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotCard: {
    flexGrow: 1,
    minWidth: 96,
    borderWidth: 1,
    borderColor: "#ece8f3",
    backgroundColor: "#faf8fc",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  slotTitle: { fontSize: 12, fontWeight: "800", color: COLORS.primary },
  slotTime: { fontSize: 11, color: COLORS.gray, fontWeight: "600" },
});
