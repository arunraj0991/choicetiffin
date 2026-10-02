import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Pressable,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";

// import { getDelivery, skipDelivery } from '@/src/api/api';

import { Loader } from "@/components/service";
import RateUsSheet from "@/components/RateUsSheet";
import COLORS from "@/constants/colors";
import { useLanguage } from "@/src/i18n/context";
import {
  donateDelivery,
  getDelivery,
  rateRider,
  resolveImageUrl,
  saveDeliveryInstruction,
  skipDelivery,
} from "@/src/api/api";
import { getIndiaMinutesSinceMidnight } from "@/src/utils/mealBookingCutoff";

const PRIMARY = COLORS.primary;

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function toDateOnly(value?: string | Date) {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value || "")
    .split("T")[0]
    .split(" ")[0];
}

function parseModifyItems(raw: any) {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof raw === "object" ? raw : null;
}

function normalizeStatus(status?: string) {
  return String(status || "")
    .toLowerCase()
    .replace(/[\s-]/g, "_");
}

function isDateReached(deliveryDate: string, today: string) {
  return !!deliveryDate && deliveryDate <= today;
}

const DINNER_DONATE_CUTOFF_MINUTES = 15 * 60;

function isDinnerSlot(del: any, fallbackSlot?: string) {
  const slot = String(
    del?.d_time ?? del?.meal_type ?? del?.slot ?? fallbackSlot ?? "",
  ).toLowerCase();
  return slot.includes("dinner");
}

function getMealKind(
  del: any,
  fallbackSlot?: string,
): "lunch" | "dinner" | "" {
  const slot = String(
    del?.d_time ?? del?.meal_type ?? del?.slot ?? fallbackSlot ?? "",
  ).toLowerCase();
  if (slot.includes("dinner")) return "dinner";
  if (slot.includes("lunch")) return "lunch";
  return "";
}

function isInstructionEnabled(
  kind: "kitchen" | "delivery",
  mealKind: "lunch" | "dinner" | "",
  deliveryDate: string,
  today: string,
  now: Date = new Date(),
) {
  if (!deliveryDate || deliveryDate < today) return false;
  if (deliveryDate > today) return true;

  const minutes = getIndiaMinutesSinceMidnight(now);
  if (kind === "delivery") {
    if (mealKind === "lunch") return minutes < 10 * 60;
    if (mealKind === "dinner") return minutes < 19 * 60;
    return false;
  }
  if (mealKind === "lunch") return minutes < 8 * 60;
  if (mealKind === "dinner") return minutes < 15 * 60;
  return false;
}

function instructionCutoffHint(
  kind: "kitchen" | "delivery",
  mealKind: "lunch" | "dinner" | "",
) {
  if (kind === "delivery") {
    return mealKind === "dinner"
      ? "Delivery instructions close at 7:00 PM for dinner."
      : "Delivery instructions close at 10:00 AM for lunch.";
  }
  return mealKind === "dinner"
    ? "Kitchen instructions close at 3:00 PM for dinner."
    : "Kitchen instructions close at 8:00 AM for lunch.";
}

function getRiderReview(del: any) {
  const review = del?.review;
  if (!review || typeof review !== "object") {
    return { stars: 0, text: "", exists: !!del?.is_rated };
  }
  const stars = Number(review.stars ?? review.rating ?? 0);
  const text = String(review.review_text ?? review.review ?? "").trim();
  return {
    stars: Number.isFinite(stars) && stars > 0 ? stars : 0,
    text,
    exists: !!(del?.is_rated || stars > 0 || text),
  };
}

function getRiderId(del: any) {
  const raw =
    del?.rider_id ??
    del?.rider?.id ??
    del?.delivery_boy_id ??
    del?.boy_id ??
    null;
  const id = String(raw ?? "").trim();
  return id || null;
}

function getTodaySkipDonateFlags(
  del: any,
  fallbackSlot?: string,
  now: Date = new Date(),
) {
  const isDinner = isDinnerSlot(del, fallbackSlot);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const dinnerStillSkip = isDinner && minutes < DINNER_DONATE_CUTOFF_MINUTES;
  return {
    canSkip: dinnerStillSkip,
    canDonate: !dinnerStillSkip,
  };
}

function isConfirmedDelivered(
  status: string,
  deliveryDate: string,
  today: string,
) {
  return (
    normalizeStatus(status) === "delivered" &&
    isDateReached(deliveryDate, today)
  );
}

function parseInstructionMap(data: any): {
  kitchen: string;
  delivery: string;
} {
  const raw =
    data?.delivery_instruction ??
    data?.special_instruction ??
    data?.specialInstruction ??
    data?.instruction ??
    data?.note ??
    null;

  if (!raw) return { kitchen: "", delivery: "" };

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") {
          return {
            kitchen: String(parsed.kitchen ?? "").trim(),
            delivery: String(parsed.delivery ?? "").trim(),
          };
        }
      } catch {
        // treat as plain delivery note
      }
    }
    return { kitchen: "", delivery: trimmed };
  }

  if (typeof raw === "object") {
    return {
      kitchen: String(raw.kitchen ?? "").trim(),
      delivery: String(raw.delivery ?? "").trim(),
    };
  }

  return { kitchen: "", delivery: "" };
}

export default function DeliveryScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { order_id } = useLocalSearchParams<{ order_id: string }>();

  const [loading, setLoading] = useState(true);
  const [deliveryData, setDeliveryData] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState("");
  const hasLoadedRef = useRef(false);

  const loadDeliveries = useCallback(
    async (showLoader = false) => {
      if (!order_id) return;
      if (showLoader) setLoading(true);
      try {
        const data = await getDelivery(order_id);
        setDeliveryData(data.data);
        if (data.data?.items?.length > 0) {
          setActiveCategory((prev) => prev || data.data.items[0].name);
        }
      } catch {
        Alert.alert(t("error"), t("failedLoadDelivery"));
      } finally {
        setLoading(false);
      }
    },
    [order_id, t],
  );

  useFocusEffect(
    useCallback(() => {
      loadDeliveries(!hasLoadedRef.current);
      hasLoadedRef.current = true;
    }, [loadDeliveries]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("deliverySchedule")}</Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <Loader />
      ) : (
        <>
          <CategoryTabs
            items={deliveryData?.items}
            active={activeCategory}
            onActiveChange={setActiveCategory}
            deliveryData={deliveryData}
          />
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <DeliveryDates
              deliveryData={deliveryData}
              activeCategory={activeCategory}
              onUpdate={setDeliveryData}
            />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Special delivery instruction                                        */
/* ------------------------------------------------------------------ */

function SpecialInstructionCard({
  deliveryId,
  initialKitchen = "",
  initialDelivery = "",
  mealKind = "",
  deliveryDate = "",
  today = "",
  showRateRider = false,
  onRateRider,
}: {
  deliveryId?: string | number;
  initialKitchen?: string;
  initialDelivery?: string;
  mealKind?: "lunch" | "dinner" | "";
  deliveryDate?: string;
  today?: string;
  showRateRider?: boolean;
  onRateRider?: () => void;
}) {
  const { t } = useLanguage();
  const [now, setNow] = useState(() => new Date());
  const [type, setType] = useState<"kitchen" | "delivery">(
    initialKitchen && !initialDelivery ? "kitchen" : "delivery",
  );
  const [values, setValues] = useState({
    kitchen: initialKitchen,
    delivery: initialDelivery,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const canDelivery = isInstructionEnabled(
    "delivery",
    mealKind,
    deliveryDate,
    today,
    now,
  );
  const canKitchen = isInstructionEnabled(
    "kitchen",
    mealKind,
    deliveryDate,
    today,
    now,
  );
  const canEdit = type === "kitchen" ? canKitchen : canDelivery;

  useEffect(() => {
    setValues({
      kitchen: initialKitchen,
      delivery: initialDelivery,
    });
    setType(initialKitchen && !initialDelivery ? "kitchen" : "delivery");
  }, [initialKitchen, initialDelivery, deliveryId]);

  useEffect(() => {
    if (type === "delivery" && !canDelivery && canKitchen) {
      setType("kitchen");
    } else if (type === "kitchen" && !canKitchen && canDelivery) {
      setType("delivery");
    }
  }, [canDelivery, canKitchen, type]);

  const instruction = values[type];

  const handleSave = async () => {
    if (!canEdit) return;
    const trimmed = instruction.trim();
    if (!trimmed) {
      Alert.alert("", t("specialInstructionRequired"));
      return;
    }
    if (!deliveryId) {
      Alert.alert(t("error"), t("specialInstructionSaveFailed"));
      return;
    }

    setSaving(true);
    try {
      const res = await saveDeliveryInstruction(deliveryId, trimmed, type);
      const updated = parseInstructionMap(res?.data ?? res);
      setValues((prev) => ({
        kitchen:
          updated.kitchen || (type === "kitchen" ? trimmed : prev.kitchen),
        delivery:
          updated.delivery || (type === "delivery" ? trimmed : prev.delivery),
      }));
      Alert.alert(t("success"), t("specialInstructionSaved"));
    } catch {
      Alert.alert(t("error"), t("specialInstructionSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.instructionCard}>
      <Text style={styles.instructionLabel}>
        {t("addSpecialDeliveryInstruction")}
      </Text>
      <View style={styles.instructionTypeRow}>
        {(["delivery", "kitchen"] as const).map((option) => {
          const isActive = type === option;
          const enabled = option === "delivery" ? canDelivery : canKitchen;
          return (
            <Pressable
              key={option}
              style={[
                styles.instructionTypeBtn,
                isActive && styles.instructionTypeBtnActive,
                !enabled && styles.instructionTypeBtnDisabled,
              ]}
              onPress={() => {
                if (!enabled) return;
                setType(option);
              }}
            >
              <Text
                style={[
                  styles.instructionTypeText,
                  isActive && styles.instructionTypeTextActive,
                  !enabled && styles.instructionTypeTextDisabled,
                ]}
              >
                {option === "delivery"
                  ? t("instructionTypeDelivery")
                  : t("instructionTypeKitchen")}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!canEdit && (
        <Text style={styles.instructionHint}>
          {instructionCutoffHint(type, mealKind)}
        </Text>
      )}
      <TextInput
        style={[
          styles.instructionInput,
          !canEdit && styles.instructionInputDisabled,
        ]}
        value={instruction}
        onChangeText={(text) =>
          setValues((prev) => ({ ...prev, [type]: text }))
        }
        placeholder={
          type === "kitchen"
            ? t("kitchenInstructionPlaceholder")
            : t("specialInstructionPlaceholder")
        }
        placeholderTextColor="#9CA3AF"
        multiline
        textAlignVertical="top"
        editable={canEdit}
      />
      <View style={styles.instructionActions}>
        {showRateRider && (
          <TouchableOpacity
            style={styles.rateRiderBtn}
            onPress={onRateRider}
            activeOpacity={0.85}
          >
            <MaterialIcons name="star-outline" size={14} color={PRIMARY} />
            <Text style={styles.rateRiderText}>{t("rateRider")}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.instructionSaveBtn,
            (!canEdit || saving) && styles.instructionSaveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={!canEdit || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.instructionSaveText}>{t("save")}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DeliveryImages({
  instructionImage,
  donationImage,
  status,
  deliveryInstruction,
}: {
  instructionImage?: string | null;
  donationImage?: string | null;
  status: string;
  deliveryInstruction?: string | null;
}) {
  const { t } = useLanguage();
  const [preview, setPreview] = useState<{ uri: string; title: string } | null>(
    null,
  );
  const instructionUri = resolveImageUrl(instructionImage);
  const donationUri = resolveImageUrl(donationImage);
  const isDonated = status === "donated" || status === "donate";
  const isDelivered = status === "delivered";
  const hasInstruction = !!String(deliveryInstruction || "").trim();
  const showInstructionImage = hasInstruction && !!instructionUri;
  const showInstructionPending =
    hasInstruction && isDelivered && !instructionUri;
  const showDonationPending = isDonated && !donationUri;

  if (
    !showInstructionImage &&
    !donationUri &&
    !showInstructionPending &&
    !showDonationPending
  ) {
    return null;
  }

  return (
    <View style={styles.photosCard}>
      {showInstructionImage ? (
        <View style={styles.photoBlock}>
          <Text style={styles.photoLabel}>{t("deliveryInstructionImage")}</Text>
          <Pressable
            onPress={() =>
              setPreview({
                uri: instructionUri!,
                title: t("deliveryInstructionImage"),
              })
            }
          >
            <Image
              source={{ uri: instructionUri }}
              style={styles.photo}
              resizeMode="cover"
            />
          </Pressable>
        </View>
      ) : showInstructionPending ? (
        <View style={styles.photoPending}>
          <MaterialIcons name="photo-camera" size={22} color="#9CA3AF" />
          <Text style={styles.photoPendingText}>
            {t("pendingImageFromRider")}
          </Text>
        </View>
      ) : null}
      {donationUri ? (
        <View style={styles.photoBlock}>
          <Text style={styles.photoLabel}>{t("donationImage")}</Text>
          <Pressable
            onPress={() =>
              setPreview({
                uri: donationUri,
                title: t("donationImage"),
              })
            }
          >
            <Image
              source={{ uri: donationUri }}
              style={styles.photo}
              resizeMode="cover"
            />
          </Pressable>
        </View>
      ) : showDonationPending ? (
        <View style={styles.photoPending}>
          <MaterialIcons name="favorite-border" size={22} color="#9CA3AF" />
          <Text style={styles.photoPendingText}>
            {t("pendingDonationFromRider")}
          </Text>
        </View>
      ) : null}

      <Modal
        visible={!!preview}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}
      >
        <SafeAreaView style={styles.previewOverlay} edges={["top", "bottom"]}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {preview?.title}
            </Text>
            <Pressable
              onPress={() => setPreview(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={t("close")}
            >
              <MaterialIcons name="close" size={26} color="#fff" />
            </Pressable>
          </View>
          <Pressable
            style={styles.previewBody}
            onPress={() => setPreview(null)}
          >
            {preview?.uri ? (
              <Image
                source={{ uri: preview.uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : null}
          </Pressable>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Category Tabs + Summary Card                                        */
/* ------------------------------------------------------------------ */

function CategoryTabs({
  items,
  active,
  onActiveChange,
  deliveryData,
}: {
  items: any[];
  active: string;
  onActiveChange: (v: string) => void;
  deliveryData: any;
}) {
  const { t } = useLanguage();
  const categories = items?.map((i) => i.name) || [];
  const selected = items?.find((i) => i.name === active);

  const selectedDetails = deliveryData?.delivery?.find(
    (d: any) => d.name === active,
  );
  const allDeliveries = selectedDetails?.delivery || [];
  const today = toDateOnly(new Date());
  const completedCount = allDeliveries.filter((d: any) => {
    const status = normalizeStatus(d.delivery_status);
    const deliveryDate = toDateOnly(d.delivery_date);
    return (
      isConfirmedDelivered(status, deliveryDate, today) ||
      status === "donate" ||
      status === "donated"
    );
  }).length;
  
  const totalCount = allDeliveries.filter((d: any) => {
    const status = normalizeStatus(d.delivery_status);
    return status !== "skipped" && status !== "skip";
  }).length;
  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <View style={{ backgroundColor: "#fff" }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, active === cat && styles.chipActive]}
            onPress={() => onActiveChange(cat)}
          >
            <Text
              style={[styles.chipText, active === cat && styles.chipTextActive]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selected && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryMuted}>{t("subscriptionPeriod")}</Text>
              <Text style={styles.summaryPeriod}>
                {formatDate(selected.start_date)} →{" "}
                {formatDate(selected.end_date)}
              </Text>
              {selected.meal_type && (
                <Text style={styles.summaryMealType}>{selected.meal_type}</Text>
              )}
            </View>
            <MaterialIcons name="calendar-today" size={26} color="#fff" />
          </View>

          {totalCount > 0 && (
            <View style={{ marginTop: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  marginBottom: 8,
                }}
              >
                <View>
                  <Text
                    style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}
                  >
                    Completed
                  </Text>
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}
                  >
                    {completedCount}{" "}
                    <Text
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.5)",
                        fontWeight: "600",
                      }}
                    >
                      / {totalCount} Tiffins
                    </Text>
                  </Text>
                </View>
                <Text
                  style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}
                >
                  {Math.round(progressPercent)}%
                </Text>
              </View>
              <View
                style={{
                  height: 8,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${progressPercent}%`,
                    backgroundColor: "#4ADE80",
                    borderRadius: 8,
                  }}
                />
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Delivery Dates List                                                  */
/* ------------------------------------------------------------------ */

function DeliveryDates({
  deliveryData,
  activeCategory,
  onUpdate,
}: {
  deliveryData: any;
  activeCategory: string;
  onUpdate: (d: any) => void;
}) {
  const { t } = useLanguage();
  const [showPast, setShowPast] = useState(true);
  const [skipping, setSkipping] = useState<string | null>(null);
  const [donating, setDonating] = useState<string | null>(null);
  const [ratingDelivery, setRatingDelivery] = useState<any>(null);

  const today = toDateOnly(new Date());
  const selected = deliveryData?.delivery?.find(
    (d: any) => d.name === activeCategory,
  );
  let deliveries: any[] = selected?.delivery || [];
  if (!showPast) {
    deliveries = deliveries.filter(
      (d: any) =>
        d.delivery_status === "scheduled" || d.delivery_status === "modified",
    );
  }

  const handleSkip = (del: any) => {
    Alert.alert(t("skipDelivery"), t("skipDeliveryMsg"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("yesSkip"),
        style: "destructive",
        onPress: async () => {
          setSkipping(del.id);
          try {
            const res = await skipDelivery(del.order_id, del.id);
            Alert.alert(t("success"), t("skipSuccess"));
            if (res.data) onUpdate(res.data);
          } catch {
            Alert.alert(t("error"), t("skipFailed"));
          } finally {
            setSkipping(null);
          }
        },
      },
    ]);
  };

  const handleDonate = (del: any) => {
    Alert.alert(t("donateDelivery"), t("donateDeliveryMsg"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("yesDonate"),
        onPress: async () => {
          setDonating(del.id);
          try {
            const res = await donateDelivery(del.id);
            Alert.alert(t("success"), t("donateSuccess"));
            if (res.data?.delivery || res.data?.items) {
              onUpdate(res.data);
            } else if (del.order_id) {
              const refreshed = await getDelivery(String(del.order_id));
              if (refreshed.data) onUpdate(refreshed.data);
            }
          } catch {
            Alert.alert(t("error"), t("donateFailed"));
          } finally {
            setDonating(null);
          }
        },
      },
    ]);
  };

  const handleRateRider = async (stars: number, reviewText: string) => {
    const del = ratingDelivery;
    const riderId = getRiderId(del);
    const deliveryId = del?.id;
    if (!riderId || deliveryId == null || deliveryId === "") {
      throw new Error("missing rider or delivery");
    }

    await rateRider({
      rider_id: riderId,
      delivery_id: deliveryId,
      stars,
      review_text: reviewText,
    });
    Alert.alert(t("success"), t("ratingSubmitted"));
  };

  const selectedRiderReview = getRiderReview(ratingDelivery);

  if (deliveries.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <MaterialIcons name="local-shipping" size={52} color="#ddd" />
        <Text style={styles.emptyText}>{t("noDeliveriesFound")}</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.datesContainer}>
        <View style={styles.datesHeader}>
          <Text style={styles.datesTitle}>{t("deliveries")}</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>
              {showPast ? t("hidePast") : t("showPast")}
            </Text>
            <Switch
              value={showPast}
              onValueChange={setShowPast}
              trackColor={{ false: "#ccc", true: PRIMARY + "80" }}
              thumbColor={showPast ? PRIMARY : "#f4f3f4"}
            />
          </View>
        </View>

        {deliveries.map((del: any, idx: number) => {
          const status = normalizeStatus(del.delivery_status);
          const deliveryDate = toDateOnly(del.delivery_date);
          const isToday = deliveryDate === today;
          const modifyItems = parseModifyItems(del.modify_items);
          const hasModified = !!modifyItems;
          const instructionMap = parseInstructionMap(del);
          let iconName: string, iconColor: string, subText: string;
          let canSkip = false;
          let canDonate = false;
          let canRateRider = false;

          switch (status) {
            case "delivered":
              iconName = "check-circle";
              iconColor = "#16A34A";
              subText = `${del.meal_type} ${t("deliveredOn")} ${formatDate(del.status_date || del.delivery_date)}`;
              canRateRider = true;
              break;
            case "skipped":
            case "skip":
              iconName = "remove-circle-outline";
              iconColor = "#EF4444";
              subText = `${t("skippedOn")} ${formatDate(del.status_date || del.delivery_date)}`;
              break;
            case "donated":
            case "donate":
              iconName = "favorite";
              iconColor = PRIMARY;
              subText = `${t("donatedOn")} ${formatDate(del.status_date || del.delivery_date)}`;
              break;
            case "pickup":
            case "picked":
            case "picked_up":
            case "pick_up":
              iconName = "local-shipping";
              iconColor = PRIMARY;
              subText = t("pickup");
              break;
            case "modified":
              iconName = "edit";
              iconColor = PRIMARY;
              subText = del.meal_type
                ? `${t("modified")} · ${del.meal_type}`
                : t("modified");
              if (isToday) {
                ({ canSkip, canDonate } = getTodaySkipDonateFlags(
                  del,
                  selected?.meal_type,
                ));
              } else if (deliveryDate > today) {
                canSkip = true;
              }
              break;
            default:
              iconName = "event";
              iconColor = PRIMARY;
              subText = del.meal_type || del.d_time || t("scheduled");
              if (isToday) {
                ({ canSkip, canDonate } = getTodaySkipDonateFlags(
                  del,
                  selected?.meal_type,
                ));
              } else if (deliveryDate > today) {
                canSkip = true;
              }
          }

          const isActing = skipping === del.id || donating === del.id;

          return (
            <View key={idx} style={styles.dateCard}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <MaterialIcons
                  name={iconName as any}
                  size={28}
                  color={iconColor}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.dateText}>
                    {formatDate(del.delivery_date)}
                  </Text>
                  <Text style={styles.dateSub}>{subText}</Text>
                </View>
                {isActing ? (
                  <ActivityIndicator size="small" color={PRIMARY} />
                ) : (
                  <View style={styles.actionRow}>
                    {canDonate && (
                      <TouchableOpacity
                        style={styles.donateBtn}
                        onPress={() => handleDonate(del)}
                      >
                        <Text style={styles.donateText}>{t("donate")}</Text>
                      </TouchableOpacity>
                    )}
                    {canSkip && (
                      <TouchableOpacity
                        style={styles.skipBtn}
                        onPress={() => handleSkip(del)}
                      >
                        <Text style={styles.skipText}>{t("skip")}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
              <DeliveryStepper
                deliveryDate={deliveryDate}
                status={status}
                today={today}
                hasModified={hasModified}
              />
              <SpecialInstructionCard
                deliveryId={del.id}
                initialKitchen={instructionMap.kitchen}
                initialDelivery={instructionMap.delivery}
                mealKind={getMealKind(del, selected?.meal_type)}
                deliveryDate={deliveryDate}
                today={today}
                showRateRider={canRateRider}
                onRateRider={() => {
                  if (!getRiderId(del) || del?.id == null) {
                    Alert.alert(t("error"), t("ratingFailed"));
                    return;
                  }
                  setRatingDelivery(del);
                }}
              />
              <DeliveryImages
                instructionImage={del.delivery_instruction_image}
                donationImage={del.donation_image}
                status={status}
                deliveryInstruction={
                  instructionMap.kitchen || instructionMap.delivery
                }
              />
              {hasModified && <ModifiedMealDetails items={modifyItems} />}
            </View>
          );
        })}
      </View>
      <RateUsSheet
        visible={!!ratingDelivery}
        title={t("rateRider")}
        subtitle={t("rateRiderSubtitle")}
        initialRating={selectedRiderReview.stars}
        initialReview={selectedRiderReview.text}
        readOnly={selectedRiderReview.exists}
        onClose={() => setRatingDelivery(null)}
        onSubmit={handleRateRider}
      />
    </>
  );
}

function DeliveryStepper({
  deliveryDate,
  status,
  today,
  hasModified = false,
}: {
  deliveryDate: string;
  status: string;
  today: string;
  hasModified?: boolean;
}) {
  const { t } = useLanguage();
  const isSkipped = status === "skipped" || status === "skip";
  const isDonated = status === "donated" || status === "donate";
  const isPickup =
    status === "pickup" ||
    status === "picked" ||
    status === "picked_up" ||
    status === "pick_up";
  const isDelivered = isConfirmedDelivered(status, deliveryDate, today);

  const scheduleDone = isDateReached(deliveryDate, today);
  const pickupState: "done" | "failed" | "pending" =
    isSkipped || isDonated
      ? "failed"
      : isPickup || isDelivered
        ? "done"
        : "pending";

  const lastLabel = isSkipped
    ? t("skip")
    : isDonated
      ? t("donate")
      : t("delivered");
  const lastDone = isDelivered || isSkipped || isDonated;
  const lastColor = isSkipped ? "#EF4444" : isDonated ? PRIMARY : "#16A34A";

  const steps: {
    key: string;
    label: string;
    state: "done" | "failed" | "pending";
    color: string;
  }[] = [];

  if (hasModified) {
    steps.push({
      key: "modified",
      label: t("modified"),
      state: "done",
      color: PRIMARY,
    });
  }

  steps.push(
    {
      key: "schedule",
      label: t("scheduled"),
      state: scheduleDone ? "done" : "pending",
      color: "#16A34A",
    },
    {
      key: "pickup",
      label: t("pickup"),
      state: pickupState,
      color: pickupState === "failed" ? "#EF4444" : "#16A34A",
    },
    {
      key: "last",
      label: lastLabel,
      state: lastDone ? "done" : "pending",
      color: lastColor,
    },
  );

  const isActive = (state: string) => state === "done" || state === "failed";

  return (
    <View style={styles.stepper}>
      {steps.map((step, index) => {
        const prev = steps[index - 1];
        const leftActive = !!prev && isActive(prev.state);
        const leftColor = prev?.color;
        const rightActive = isActive(step.state) && index < steps.length - 1;
        const rightColor = step.color;

        return (
          <View key={step.key} style={styles.stepCol}>
            <View style={styles.stepCircleRow}>
              <View
                style={[
                  styles.stepLine,
                  index === 0 && styles.stepLineHidden,
                  leftActive && { backgroundColor: leftColor },
                ]}
              />
              <View
                style={[
                  styles.stepCircle,
                  step.state === "done" && {
                    borderColor: step.color,
                    backgroundColor: step.color,
                  },
                  step.state === "failed" && {
                    borderColor: step.color,
                    backgroundColor: step.color,
                  },
                ]}
              >
                {step.state === "done" && (
                  <MaterialIcons
                    name={step.key === "modified" ? "edit" : "check"}
                    size={12}
                    color="#fff"
                  />
                )}
                {step.state === "failed" && (
                  <MaterialIcons name="close" size={14} color="#fff" />
                )}
              </View>
              <View
                style={[
                  styles.stepLine,
                  index === steps.length - 1 && styles.stepLineHidden,
                  rightActive && { backgroundColor: rightColor },
                ]}
              />
            </View>
            <Text
              style={[
                styles.stepLabel,
                step.state === "done" && { color: step.color },
                step.state === "failed" && { color: step.color },
              ]}
              numberOfLines={1}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ModifiedMealDetails({ items }: { items: any }) {
  const { t } = useLanguage();
  const addons = Array.isArray(items?.addon) ? items.addon : [];
  const slots = Array.isArray(items?.slot)
    ? items.slot.filter(Boolean).join(", ")
    : String(items?.slot || "");
  const qty = Number(items?.qty);

  return (
    <View style={styles.modifyCard}>
      <View style={styles.modifyHeader}>
        <MaterialIcons name="edit" size={16} color={PRIMARY} />
        <Text style={styles.modifyTitle}>{t("modifiedMeal")}</Text>
      </View>
      {!!items?.meal_name && (
        <Text style={styles.modifyMealName}>{items.meal_name}</Text>
      )}
      <View style={styles.modifyMetaRow}>
        {Number.isFinite(qty) && qty > 0 && (
          <View style={styles.modifyChip}>
            <Text style={styles.modifyChipText}>
              {t("qtyLabel")} {qty}
            </Text>
          </View>
        )}
        {!!slots && (
          <View style={styles.modifyChip}>
            <Text style={styles.modifyChipText}>{slots}</Text>
          </View>
        )}
      </View>
      {addons.length > 0 && (
        <View style={styles.modifyAddons}>
          <Text style={styles.modifyAddonsLabel}>{t("addOns")}</Text>
          {addons.map((addon: any, index: number) => (
            <Text
              key={`${addon?.name}-${index}`}
              style={styles.modifyAddonItem}
            >
              {addon?.name}
              {addon?.qty ? ` × ${addon.qty}` : ""}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#130e1b",
  },
  body: { flex: 1, backgroundColor: COLORS.secondary },

  tabRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
  },
  chipActive: { backgroundColor: PRIMARY },
  chipText: { fontSize: 14, fontWeight: "600", color: "#555" },
  chipTextActive: { color: "#fff" },

  summaryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 24,
    backgroundColor: PRIMARY,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryMuted: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  summaryPeriod: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  summaryMealType: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },

  datesContainer: { padding: 16, paddingBottom: 40 },
  instructionCard: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  instructionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#130e1b",
    marginBottom: 8,
  },
  instructionTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  instructionTypeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  instructionTypeBtnActive: {
    borderColor: PRIMARY,
    backgroundColor: "#f3e8ff",
  },
  instructionTypeBtnDisabled: {
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
    opacity: 0.7,
  },
  instructionTypeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
  },
  instructionTypeTextActive: {
    color: PRIMARY,
  },
  instructionTypeTextDisabled: {
    color: "#9ca3af",
  },
  instructionHint: {
    fontSize: 12,
    color: "#888",
    marginBottom: 8,
    lineHeight: 17,
  },
  instructionInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.secondary,
  },
  instructionInputDisabled: {
    backgroundColor: "#f3f4f6",
    color: "#9ca3af",
  },
  instructionActions: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  instructionSaveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 20,
  },
  instructionSaveBtnDisabled: {
    opacity: 0.45,
  },
  instructionSaveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  photosCard: {
    marginTop: 14,
    gap: 12,
  },
  photoBlock: {
    gap: 8,
  },
  photoLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#130e1b",
  },
  photo: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  previewTitle: {
    flex: 1,
    marginRight: 12,
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  previewBody: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  photoPending: {
    minHeight: 88,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  photoPendingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textAlign: "center",
  },
  datesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  datesTitle: { fontSize: 18, fontWeight: "700", color: "#130e1b" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  toggleLabel: { fontSize: 13, fontWeight: "600", color: "#555" },

  dateCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  dateText: { fontSize: 15, fontWeight: "700", color: "#130e1b" },
  dateSub: { fontSize: 13, color: "#777", marginTop: 3 },
  modifyCard: {
    marginTop: 12,
    backgroundColor: "#f3e8ff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  modifyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  modifyTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: PRIMARY,
    textTransform: "uppercase",
  },
  modifyMealName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  modifyMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modifyChip: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modifyChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },
  modifyAddons: {
    marginTop: 10,
  },
  modifyAddonsLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  modifyAddonItem: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
    lineHeight: 18,
  },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
  },
  skipText: { fontWeight: "700", color: "#555", fontSize: 13 },
  donateBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: PRIMARY,
  },
  donateText: { fontWeight: "700", color: "#fff", fontSize: 13 },
  rateRiderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rateRiderText: { fontWeight: "700", color: PRIMARY, fontSize: 13 },
  stepper: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  stepCol: { flex: 1, alignItems: "center" },
  stepCircleRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#e5e5e5",
  },
  stepLineHidden: { backgroundColor: "transparent" },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#d4d4d4",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    color: "#9a9a9a",
    textAlign: "center",
  },

  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: "#aaa", fontWeight: "500" },
});
