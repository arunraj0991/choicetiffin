import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";

import availableSlots from "./slots.json";
import COLORS from "@/constants/colors";
import { getSubscriptionGuidelines } from "@/src/api/api";

const PRIMARY = COLORS.primary;

function formatGuidelineBlocks(description?: string) {
  const raw = String(description ?? "").trim();
  if (!raw) return [];

  const text = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

interface Props {
  selectedStartDate?: Date | null;
  onOpenDatePicker?: () => void;
  formatSelectedDate?: (date: Date) => string;
  selectedSlots: string[];
  onToggleSlot: (slotId: string) => void;
  selectedWeekDays?: string[];
  onToggleWeekDay?: (day: string) => void;
  slots?: typeof availableSlots;
  specialInstructions?: string[];
  onToggleSpecialInstruction?: (id: string) => void;
  hideWeekDays?: boolean;
  hideInfoCards?: boolean;
  hideSpecialInstructions?: boolean;
  dateLabel?: string;
  datePlaceholder?: string;
  datePills?: string[];
  disabledDatePills?: string[];
  selectedDateValue?: string | null;
  onSelectDate?: (date: string) => void;
  emptyDatesText?: string;
  disabledSlots?: string[];
  disabledSlotLabel?: string;
  slotHint?: string;
}

export default function DeliveryPreferences({
  selectedStartDate,
  onOpenDatePicker,
  formatSelectedDate,
  selectedSlots,
  onToggleSlot,
  selectedWeekDays = [],
  onToggleWeekDay = () => {},
  slots = availableSlots,
  specialInstructions = [],
  onToggleSpecialInstruction,
  hideWeekDays = false,
  hideInfoCards = false,
  hideSpecialInstructions = false,
  dateLabel = "Select Subscription Date",
  datePlaceholder = "Select Dates",
  datePills,
  disabledDatePills = [],
  selectedDateValue = null,
  onSelectDate,
  emptyDatesText,
  disabledSlots = [],
  disabledSlotLabel = "Unavailable",
  slotHint,
}: Props) {
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showDeliveryTooltip, setShowDeliveryTooltip] = useState(false);
  const [guidelines, setGuidelines] = useState<{
    title?: string;
    description?: string;
  } | null>(null);
  const [guidelinesLoading, setGuidelinesLoading] = useState(false);
  const [guidelinesError, setGuidelinesError] = useState(false);

  const openGuidelines = async () => {
    setShowGuidelines(true);
    if (guidelines || guidelinesLoading) return;

    setGuidelinesLoading(true);
    setGuidelinesError(false);
    try {
      const res = await getSubscriptionGuidelines();
      setGuidelines(res?.data ?? null);
    } catch {
      setGuidelinesError(true);
    } finally {
      setGuidelinesLoading(false);
    }
  };

  const guidelineBlocks = formatGuidelineBlocks(guidelines?.description);
  const guidelinesTitle =
    String(guidelines?.title ?? "").trim() ||
    "Know more about your subscription!";

  const instructions = [
    { id: "salty", label: "Less Salty", icon: "restaurant" },
    { id: "oily", label: "Less Oily", icon: "water-drop" },
    { id: "spicy", label: "Less Spicy", icon: "local-fire-department" },
  ];

  return (
    <View style={styles.container}>
      {!hideSpecialInstructions && (
        <>
          <Text style={styles.sectionTitle}>SPECIAL INSTRUCTIONS</Text>
          <View style={styles.instructionsRow}>
            {instructions.map((item) => {
              const isSelected = specialInstructions.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.instructionChip,
                    isSelected && styles.instructionChipActive,
                  ]}
                  onPress={() => onToggleSpecialInstruction?.(item.id)}
                >
                  <MaterialIcons
                    name={item.icon as any}
                    size={16}
                    color={isSelected ? PRIMARY : COLORS.gray}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.instructionText,
                      isSelected && { color: PRIMARY, fontWeight: "600" },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {/* Info Cards */}
      {!hideInfoCards && (
      <View style={styles.infoCardsRow}>
        <Pressable
          style={styles.infoCard}
          onPress={openGuidelines}
        >
          <MaterialIcons
            name="menu-book"
            size={20}
            color={COLORS.gray}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.infoCardText}>Subscription guidelines</Text>
          <MaterialIcons
            name="info-outline"
            size={16}
            color={COLORS.muted}
            style={styles.infoIcon}
          />
        </Pressable>
        <Pressable
          style={styles.infoCard}
          onPress={() => setShowDeliveryTooltip(true)}
        >
          <MaterialIcons
            name="money-off"
            size={20}
            color={COLORS.gray}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.infoCardText}>Do not pay delivery charges</Text>
          <MaterialIcons
            name="info-outline"
            size={16}
            color={COLORS.muted}
            style={styles.infoIcon}
          />
        </Pressable>
      </View>
      )}

      {/* Delivery Days */}
      {!hideWeekDays && (
      <>
      <Text style={styles.sectionTitle}>SELECT DELIVERY DAYS</Text>
      <View style={styles.daysRow}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
          const isSelected = selectedWeekDays.includes(day);
          return (
            <Pressable
              key={day}
              style={[styles.dayChip, isSelected && styles.dayChipActive]}
              onPress={() => onToggleWeekDay(day)}
            >
              <Text
                style={[styles.dayText, isSelected && styles.dayTextActive]}
              >
                {day}
              </Text>
            </Pressable>
          );
        })}
      </View>
      </>
      )}

      {/* Delivery Dates */}
      <Text style={styles.sectionTitle}>{dateLabel}</Text>
      {datePills ? (
        datePills.length ? (
          <View style={styles.datePillsRow}>
            {datePills.map((date) => {
              const isDisabled = disabledDatePills.includes(date);
              const isSelected = !isDisabled && selectedDateValue === date;
              return (
                <Pressable
                  key={date}
                  style={[
                    styles.datePill,
                    isSelected && styles.datePillActive,
                    isDisabled && styles.datePillDisabled,
                  ]}
                  onPress={() => onSelectDate?.(date)}
                >
                  <Text
                    style={[
                      styles.datePillText,
                      isSelected && styles.datePillTextActive,
                      isDisabled && styles.datePillTextDisabled,
                    ]}
                  >
                    {date}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyDatesText}>
            {emptyDatesText || datePlaceholder}
          </Text>
        )
      ) : (
        <Pressable style={styles.dateBox} onPress={onOpenDatePicker}>
          <Text
            style={[
              styles.dateText,
              !selectedStartDate && { color: COLORS.muted },
            ]}
          >
            {selectedStartDate
              ? formatSelectedDate?.(selectedStartDate) || datePlaceholder
              : datePlaceholder}
          </Text>
          <MaterialIcons name="calendar-today" size={20} color={COLORS.gray} />
        </Pressable>
      )}

      {/* Delivery Slot */}
      <Text style={styles.sectionTitle}>SELECT DELIVERY SLOT</Text>
      <View style={styles.slotRow}>
        {slots.map((slot) => {
          const isDisabled = disabledSlots.includes(slot.id);
          const isSelected = !isDisabled && selectedSlots.includes(slot.id);
          return (
            <Pressable
              key={slot.id}
              disabled={isDisabled}
              style={[
                styles.slotButton,
                isSelected && styles.slotButtonActive,
                isDisabled && styles.slotButtonDisabled,
              ]}
              onPress={() => {
                if (isDisabled) return;
                onToggleSlot(slot.id);
              }}
            >
              <View style={styles.slotHeader}>
                <Ionicons
                  name={slot.icon as any}
                  size={slot.icon === "moon" ? 16 : 18}
                  color={
                    isDisabled
                      ? COLORS.muted
                      : isSelected
                        ? PRIMARY
                        : COLORS.text
                  }
                />
                <Text
                  style={[
                    styles.slotTitle,
                    isSelected && { color: PRIMARY },
                    isDisabled && styles.slotTextDisabled,
                  ]}
                >
                  {slot.title}
                </Text>
              </View>
              <View
                style={[
                  styles.slotDivider,
                  isSelected && { backgroundColor: PRIMARY },
                ]}
              />
              <Text
                style={[
                  styles.slotTime,
                  isSelected && { color: PRIMARY },
                  isDisabled && styles.slotTextDisabled,
                ]}
              >
                {isDisabled ? disabledSlotLabel : slot.time}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {slotHint ? <Text style={styles.slotHint}>{slotHint}</Text> : null}

      {/* Guidelines Modal */}
      <Modal
        visible={showGuidelines}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGuidelines(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.guidelinesModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{guidelinesTitle}</Text>
              <Pressable
                onPress={() => setShowGuidelines(false)}
                style={{ padding: 4 }}
              >
                <MaterialIcons name="close" size={24} color={COLORS.text} />
              </Pressable>
            </View>
            {guidelinesLoading ? (
              <View style={styles.guidelinesState}>
                <ActivityIndicator color={PRIMARY} />
              </View>
            ) : guidelinesError ? (
              <View style={styles.guidelinesState}>
                <Text style={styles.guidelinesStateText}>
                  Failed to load subscription guidelines
                </Text>
                <Pressable style={styles.retryBtn} onPress={openGuidelines}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView style={styles.modalContent}>
                {guidelineBlocks.length ? (
                  guidelineBlocks.map((line, index) => (
                    <Text key={`${line}-${index}`} style={styles.guidelineBullet}>
                      {/^[-•]/.test(line) ? line : `• ${line}`}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.guidelinesStateText}>
                    No guidelines available
                  </Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Delivery Charges Tooltip Modal */}
      <Modal
        visible={showDeliveryTooltip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeliveryTooltip(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDeliveryTooltip(false)}>
          <View style={styles.tooltipOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.tooltipBox}>
                <Text style={styles.tooltipText}>
                  Please do not pay extra delivery charges, as the delivery has
                  already been paid for.
                </Text>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 12,
    textTransform: "uppercase",
  },

  /* Instructions */
  instructionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  instructionChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: "center",
  },
  instructionChipActive: {
    borderColor: PRIMARY,
    backgroundColor: "#f3e8ff",
  },
  instructionText: {
    fontSize: 12,
    color: COLORS.gray,
  },

  /* Info Cards */
  infoCardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
  },
  infoCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    backgroundColor: COLORS.secondary,
  },
  infoCardText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.text,
  },
  infoIcon: {
    marginLeft: 4,
  },

  /* Days Row */
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  dayChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  dayText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.gray,
  },
  dayTextActive: {
    color: COLORS.white,
  },

  /* Date Box */
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  datePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  datePill: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: COLORS.white,
  },
  datePillActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  datePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.gray,
  },
  datePillTextActive: {
    color: COLORS.white,
  },
  datePillDisabled: {
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
    opacity: 0.7,
  },
  datePillTextDisabled: {
    color: "#9ca3af",
  },
  emptyDatesText: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 8,
  },

  /* Slot Row */
  slotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  slotButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: "center",
  },
  slotButtonActive: {
    borderColor: PRIMARY,
    backgroundColor: "#f3e8ff",
  },
  slotButtonDisabled: {
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
    opacity: 0.7,
  },
  slotTextDisabled: {
    color: "#9ca3af",
  },
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    justifyContent: "center",
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginLeft: 6,
  },
  slotDivider: {
    width: "100%",
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 8,
  },
  slotTime: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "600",
    textAlign: "center",
  },
  slotHint: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
    marginHorizontal: 4,
    lineHeight: 17,
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  guidelinesModal: {
    backgroundColor: COLORS.white,
    width: "90%",
    maxHeight: "80%",
    borderRadius: 16,
    overflow: "hidden",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  modalContent: {
    marginBottom: 10,
  },
  guidelineBullet: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 10,
  },
  guidelinesState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 12,
  },
  guidelinesStateText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },
  tooltipOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  tooltipBox: {
    backgroundColor: "#1f1f1f",
    padding: 16,
    borderRadius: 12,
    width: "75%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  tooltipText: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontWeight: "500",
  },
});
