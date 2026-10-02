import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { useLanguage } from "@/src/i18n/context";

const PRIMARY = COLORS.primary;
const STAR_COLOR = "#F5A623";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (rating: number, review: string) => void | Promise<void>;
  title?: string;
  subtitle?: string;
  initialRating?: number;
  initialReview?: string;
  readOnly?: boolean;
};

export default function RateUsSheet({
  visible,
  onClose,
  onSubmit,
  title,
  subtitle,
  initialRating = 0,
  initialReview = "",
  readOnly = false,
}: Props) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      const stars = Number(initialRating);
      setRating(Number.isFinite(stars) && stars > 0 ? Math.min(5, Math.round(stars)) : 0);
      setReview(String(initialReview ?? ""));
      setSubmitting(false);
    }
  }, [visible, initialRating, initialReview]);

  const handleSubmit = async () => {
    if (readOnly) {
      onClose();
      return;
    }
    if (rating < 1) {
      Alert.alert(t("error"), t("selectRating"));
      return;
    }
    if (!review.trim()) {
      Alert.alert(t("error"), t("reviewRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit?.(rating, review.trim());
      // Alert.alert(t("success"), t("ratingSubmitted"));
      onClose();
    } catch {
      Alert.alert(t("error"), t("ratingFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>{title || t("rateUs")}</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={t("close")}
              >
                <MaterialIcons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>
              {subtitle || t("rateUsSubtitle")}
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => {
                    if (!readOnly) setRating(value);
                  }}
                  disabled={readOnly}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel={`${value}`}
                >
                  <MaterialIcons
                    name={value <= rating ? "star" : "star-border"}
                    size={36}
                    color={STAR_COLOR}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.textArea, readOnly && styles.textAreaReadOnly]}
              placeholder={t("reviewPlaceholder")}
              placeholderTextColor="#999"
              value={review}
              onChangeText={setReview}
              multiline
              editable={!readOnly}
              textAlignVertical="top"
            />

            {!readOnly && (
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitText}>{t("submitRating")}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e5e7eb",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#130e1b",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  textArea: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#130e1b",
    backgroundColor: COLORS.secondary,
    marginBottom: 16,
  },
  textAreaReadOnly: {
    backgroundColor: "#f3f4f6",
    color: "#374151",
  },
  submitBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitDisabled: { opacity: 0.6 },
  submitText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
