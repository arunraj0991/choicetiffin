import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import DeliveryPreferences from "@/components/cart/DeliveryPreferences";
import DeliveryAddressCard from "@/components/checkout/DeliveryAddressCard";
import availableSlots from "@/components/cart/slots.json";
import MealDetailModal from "@/components/home/MealDetailModal";
import { Loader } from "@/components/service";
import { ProductCard } from "@/components/store/Item";
import COLORS from "@/constants/colors";
import { useRazorpayPayment } from "@/hooks/useRazorpayPayment";
import {
  getAccount,
  getAddons,
  modifyMeal,
  modifySubscriptionDates,
  saveModifyMeal,
} from "@/src/api/api";
import { useLanguage } from "@/src/i18n/context";
import { useAuthStore } from "@/src/store/auth";
import type { HomepageMeal } from "@/src/store/homepageMeals";
import { formatPrice, getMealDurationDays, hasMealPrice } from "@/src/utils/format";
import {
  filterDeliverySlots,
  getAllowedSlotIdsFromCategories,
} from "@/src/utils/deliverySlots";
import {
  getBookingCutoffError,
  getDisabledSlotsForDates,
  includeTodayDate,
  isDateBookable,
  toLocalYmd,
} from "@/src/utils/mealBookingCutoff";

const PRIMARY = COLORS.primary;

function extractDeliveryDates(payload: any): string[] {
  const groups = Array.isArray(payload?.delivery)
    ? payload.delivery
    : Array.isArray(payload?.data?.delivery)
      ? payload.data.delivery
      : [];
  const dates = new Set<string>();

  groups.forEach((group: any) => {
    (Array.isArray(group?.delivery) ? group.delivery : []).forEach(
      (item: any) => {
        const date = String(item?.delivery_date || "")
          .split("T")[0]
          .split(" ")[0];
        if (date) dates.add(date);
      },
    );
  });

  return Array.from(dates).sort();
}

function toProductCardItem(meal: HomepageMeal) {
  return {
    ...meal,
    id: String(meal?.id ?? meal?.uid ?? ""),
    title: meal?.name ?? "",
    desc: meal?.description ?? "",
    image: meal?.img ?? undefined,
    price: hasMealPrice(meal?.price) ? Number(meal?.price) : meal?.price,
    duration: getMealDurationDays(meal) ?? "",
    mrp: meal?.mrp,
    rating: meal?.rating,
    food_type: meal?.food_type,
  };
}

export default function ModifyMealScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const authUser = useAuthStore((s) => s.user);
  const { payWithRazorpay } = useRazorpayPayment();
  const { meal_id, order_id, item_id } = useLocalSearchParams<{
    store_id?: string;
    meal_id?: string;
    order_id?: string;
    item_id?: string;
  }>();

  const rawItemId = item_id ?? meal_id;
  const itemId = Array.isArray(rawItemId) ? rawItemId[0] : rawItemId;

  const [loading, setLoading] = useState(true);
  const [meal, setMeal] = useState<HomepageMeal | null>(null);
  const [addons, setAddons] = useState<any[]>([]);
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});
  const [mealQty, setMealQty] = useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<HomepageMeal | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<any>(null);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);

  const today = useMemo(() => toLocalYmd(), []);
  const orderId = Array.isArray(order_id) ? order_id[0] : order_id;
  const datesWithToday = useMemo(
    () => includeTodayDate(availableDates),
    [availableDates],
  );
  const selectableDates = useMemo(
    () => datesWithToday.filter((date) => isDateBookable(date)),
    [datesWithToday],
  );
  const disabledDates = useMemo(
    () => datesWithToday.filter((date) => !isDateBookable(date)),
    [datesWithToday],
  );
  const selectableDateSet = useMemo(
    () => new Set(selectableDates),
    [selectableDates],
  );
  const disabledSlots = getDisabledSlotsForDates(
    selectedDate ? [selectedDate] : [],
  );
  const addonBaseTotal = useMemo(
    () =>
      (Array.isArray(addons) ? addons : []).reduce((sum, addon) => {
        const id = String(addon?.id ?? "");
        const qty = addonQty[id] || 0;
        const price = Number(addon?.raw_price ?? addon?.price ?? 0);
        return sum + (Number.isFinite(price) ? price : 0) * qty;
      }, 0),
    [addons, addonQty],
  );
  const slotMultiplier = Math.max(selectedSlots.length, 1);
  const addonTotal = addonBaseTotal * slotMultiplier;

  const deliverySlots = useMemo(() => {
    const allowedIds = getAllowedSlotIdsFromCategories([
      meal?.cate_id ?? meal?.category,
    ]);
    return filterDeliverySlots(availableSlots, allowedIds);
  }, [meal?.cate_id, meal?.category]);

  useEffect(() => {
    const allowedIds = deliverySlots.map((slot) => slot.id);
    const cutoffDisabled = new Set(
      getDisabledSlotsForDates(selectedDate ? [selectedDate] : []),
    );
    setSelectedSlots((prev) => {
      const next = (prev || []).filter(
        (id) => allowedIds.includes(id) && !cutoffDisabled.has(id),
      );
      if (next.length) return next;
      const fallback = allowedIds.find((id) => !cutoffDisabled.has(id));
      return fallback ? [fallback] : [];
    });
  }, [deliverySlots, selectedDate]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [addonsRes, mealRes, datesRes] = await Promise.all([
          getAddons().catch(() => ({ data: [] })),
          itemId
            ? modifyMeal(String(itemId)).catch(() => null)
            : Promise.resolve(null),
          orderId
            ? modifySubscriptionDates(String(orderId)).catch(() => null)
            : Promise.resolve(null),
        ]);
        setAddons(Array.isArray(addonsRes?.data) ? addonsRes.data : []);
        const loadedMeal = mealRes?.data ?? null;
        setMeal(loadedMeal);

        const userId = String(authUser?.id ?? "") || (await AsyncStorage.getItem("user_id"));
        if (userId) {
          try {
            const accountRes = await getAccount(userId);
            const addresses = Array.isArray(accountRes?.data?.address)
              ? accountRes.data.address
              : [];
            setSavedAddresses(addresses);
            const stored = await AsyncStorage.getItem("delivery_address");
            const storedAddr = stored ? JSON.parse(stored) : null;
            const storedId = storedAddr?.id || storedAddr?.address_id;
            const matched = storedId
              ? addresses.find(
                  (addr: any) =>
                    String(addr?.id ?? addr?.address_id ?? "") ===
                    String(storedId),
                )
              : null;
            setDeliveryAddress(matched || storedAddr || addresses[0] || null);
          } catch {
            const stored = await AsyncStorage.getItem("delivery_address");
            setDeliveryAddress(stored ? JSON.parse(stored) : null);
          }
        }
        const mealKey = String(
          loadedMeal?.id ?? loadedMeal?.uid ?? itemId ?? "",
        );
        setMealQty(mealKey ? { [mealKey]: 1 } : {});
        const dates = extractDeliveryDates(datesRes);
        setAvailableDates(dates);
        setSelectedDate((prev) =>
          prev && isDateBookable(prev) ? prev : null,
        );
      } catch {
        Alert.alert(t("error"), t("failedLoadModifyMeal"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [itemId, orderId, t, authUser?.id]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const stored = await AsyncStorage.getItem("delivery_address");
        const storedAddr = stored ? JSON.parse(stored) : null;
        if (storedAddr) setDeliveryAddress(storedAddr);

        const userId =
          String(authUser?.id ?? "") || (await AsyncStorage.getItem("user_id"));
        if (!userId) return;
        try {
          const accountRes = await getAccount(userId);
          const addresses = Array.isArray(accountRes?.data?.address)
            ? accountRes.data.address
            : [];
          setSavedAddresses(addresses);
          if (storedAddr) {
            const storedId = storedAddr?.id || storedAddr?.address_id;
            const matched = addresses.find(
              (addr: any) =>
                String(addr?.id ?? addr?.address_id ?? "") === String(storedId),
            );
            if (matched) setDeliveryAddress(matched);
          } else if (!deliveryAddress && addresses[0]) {
            setDeliveryAddress(addresses[0]);
          }
        } catch {}
      })();
    }, [authUser?.id]),
  );

  const handleAddMeal = (id: string) => {
    setMealQty((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    setError("");
  };

  const handleRemoveMeal = (id: string) => {
    setMealQty((prev) => {
      const next = (prev[id] || 0) - 1;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const handleAddAddon = (id: string) => {
    setAddonQty((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const handleRemoveAddon = (id: string) => {
    setAddonQty((prev) => {
      const next = (prev[id] || 0) - 1;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const handleModify = async () => {
    const hasMeal = Object.values(mealQty).some((qty) => qty > 0);
    if (!hasMeal) {
      setError(t("pleaseSelectMeal"));
      return;
    }
    if (!selectedDate || !selectableDateSet.has(selectedDate)) {
      setError(
        selectableDates.length ? t("pleaseSelectDate") : t("noModifyDates"),
      );
      return;
    }
    if (!selectedSlots.length) {
      setError(t("pleaseSelectSlot"));
      return;
    }
    const cutoffError = getBookingCutoffError({
      dateYmds: [selectedDate],
      slots: selectedSlots,
    });
    if (cutoffError) {
      setError(t(cutoffError));
      return;
    }
    const addressId = String(
      deliveryAddress?.address_id ?? deliveryAddress?.id ?? "",
    );
    if (!addressId) {
      setError(t("pleaseSelectAddress"));
      return;
    }
    if (!orderId) {
      setError(t("failedLoadModifyMeal"));
      return;
    }

    const qty = Object.values(mealQty).reduce((sum, value) => sum + value, 0);
    const addon = Object.entries(addonQty)
      .filter(([, addonCount]) => addonCount > 0)
      .map(([id, addonCount]) => {
        const match = addons.find((item) => String(item?.id ?? "") === id);
        return {
          name: String(match?.name ?? ""),
          qty: addonCount,
        };
      })
      .filter((item) => item.name);

    const payload = {
      order_id: String(orderId),
      meal_name: String(meal?.name ?? ""),
      qty,
      addon,
      modify_date: [selectedDate],
      slot: selectedSlots,
      address_id: addressId,
    };

    setError("");
    setSubmitting(true);
    try {
      if (addonTotal > 0) {
        const userId = String(authUser?.id ?? "");
        if (!userId) {
          Alert.alert(t("loginRequired"), t("pleaseLoginToContinue"));
          return;
        }

        const accountRes = await getAccount(userId);
        const accountUser = accountRes?.data?.user || {};
        const razorpayKey = accountRes?.data?.keys?.razorpay_key;
        if (!razorpayKey) {
          Alert.alert(t("error"), t("noPaymentConfig"));
          return;
        }

        const paid = await payWithRazorpay({
          amount: addonTotal,
          user: {
            id: userId,
            name: accountUser.name || authUser?.name,
            email: accountUser.email || authUser?.email,
            phone: accountUser.phone || authUser?.phone,
          },
          razorpayKey,
        });
        if (!paid) return;
      }

      await saveModifyMeal(payload);
      Alert.alert(t("success"), t("modifyMealSuccess"), [
        { text: t("ok"), onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert(t("error"), t("failedLoadModifyMeal"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  const cardItem = meal ? toProductCardItem(meal) : null;
  const mealKey = cardItem?.id ?? "";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("modifyMeal")}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 140 + Math.max(insets.bottom, 0) },
        ]}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("selectMealToModify")}</Text>
          {cardItem ? (
            <ProductCard
              item={cardItem}
              qty={mealQty[mealKey] || 0}
              onAdd={handleAddMeal}
              onRemove={handleRemoveMeal}
              onSeeMore={() => {
                if (!meal) return;
                setSelectedMeal(meal);
                setDetailVisible(true);
              }}
            />
          ) : (
            <Text style={styles.emptyText}>{t("failedLoadModifyMeal")}</Text>
          )}
        </View>

        {addons?.length > 0 && (
          <View style={styles.addonsSection}>
            <Text style={styles.addonsTitle}>{t("addOns")}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {addons.map((addon) => {
                if (!addon) return null;
                const id = String(addon?.id ?? "");
                const price = Number(addon?.raw_price ?? addon?.price ?? 0);
                return (
                  <View key={id || addon?.name} style={styles.addonCard}>
                    {addon?.img ? (
                      <Image
                        source={{ uri: addon.img }}
                        style={styles.addonImage}
                      />
                    ) : (
                      <View
                        style={[styles.addonImage, styles.addonImagePlaceholder]}
                      />
                    )}
                    <View style={styles.addonInfo}>
                      <Text style={styles.addonName} numberOfLines={1}>
                        {addon?.name ?? ""}
                      </Text>
                      <View style={styles.addonFooter}>
                        <Text style={styles.addonPrice}>
                          ₹{Number.isFinite(price) ? price : 0}
                        </Text>
                        {id && addonQty[id] ? (
                          <View style={styles.addonCounter}>
                            <Pressable
                              style={styles.addonCounterBtn}
                              onPress={() => handleRemoveAddon(id)}
                            >
                              <Text style={styles.addonCounterText}>-</Text>
                            </Pressable>
                            <Text style={styles.addonQtyText}>
                              {addonQty[id]}
                            </Text>
                            <Pressable
                              style={styles.addonCounterBtn}
                              onPress={() => handleAddAddon(id)}
                            >
                              <Text style={styles.addonCounterText}>+</Text>
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable
                            style={styles.addonAddBtn}
                            onPress={() => id && handleAddAddon(id)}
                          >
                            <Text style={styles.addonAddText}>ADD</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.addressSection}>
          <DeliveryAddressCard
            deliveryAddress={deliveryAddress}
            savedAddresses={savedAddresses}
            onAddressChange={setDeliveryAddress}
            onAddressRemoved={(addresses) => {
              setSavedAddresses(addresses);
              const selectedId =
                deliveryAddress?.id || deliveryAddress?.address_id;
              const stillThere = addresses.some(
                (addr: any) =>
                  String(addr?.id ?? addr?.address_id ?? "") ===
                  String(selectedId ?? ""),
              );
              if (!stillThere) {
                setDeliveryAddress(addresses[0] || null);
              }
            }}
          />
        </View>

        <DeliveryPreferences
          hideWeekDays
          hideInfoCards
          hideSpecialInstructions
          dateLabel={t("modifyDate")}
          datePills={datesWithToday}
          disabledDatePills={disabledDates}
          selectedDateValue={selectedDate}
          onSelectDate={(date) => {
            if (!isDateBookable(date)) {
              if (date === today) setError(t("todaySlotsUnavailable"));
              return;
            }
            setSelectedDate(date);
            setError("");
          }}
          emptyDatesText={t("noModifyDates")}
          selectedSlots={selectedSlots}
          disabledSlots={disabledSlots}
          disabledSlotLabel={t("slotUnavailable")}
          onToggleSlot={(slotId) => {
            if (disabledSlots.includes(slotId)) return;
            setSelectedSlots((prev) =>
              prev.includes(slotId)
                ? prev.filter((s) => s !== slotId)
                : [...prev, slotId],
            );
            setError("");
          }}
          slots={deliverySlots}
        />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: 16 + Math.max(insets.bottom, 0) },
        ]}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error" size={20} color="#ff4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {addonTotal > 0 ? (
          <View style={styles.addonPayRow}>
            <Text style={styles.addonPayLabel}>{t("addonTotal")}</Text>
            <Text style={styles.addonPayValue}>₹{formatPrice(addonTotal)}</Text>
          </View>
        ) : null}
        <Pressable
          style={[styles.modifyBtn, submitting && { opacity: 0.7 }]}
          onPress={handleModify}
          disabled={submitting}
        >
          <Text style={styles.modifyBtnText}>
            {submitting
              ? t("loading")
              : addonTotal > 0
                ? `${t("payAndModify")} ₹${formatPrice(addonTotal)}`
                : t("modifyMeal")}
          </Text>
        </Pressable>
      </View>

      <MealDetailModal
        visible={detailVisible}
        item={selectedMeal}
        onClose={() => {
          setDetailVisible(false);
          setSelectedMeal(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
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
  },
  content: { padding: 16, paddingBottom: 140 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  emptyText: { fontSize: 13, color: "#888", marginTop: 8 },
  addressSection: {
    marginBottom: 16,
  },
  addonsSection: {
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  addonsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  addonCard: {
    width: 140,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  addonImage: {
    width: "100%",
    height: 80,
    backgroundColor: "#f5f5f5",
  },
  addonImagePlaceholder: { backgroundColor: "#f5f5f5" },
  addonInfo: { padding: 10 },
  addonName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  addonFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addonPrice: { fontSize: 13, fontWeight: "800", color: PRIMARY },
  addonAddBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addonAddText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  addonCounter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3e8ff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  addonCounterBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  addonCounterText: { color: PRIMARY, fontSize: 14, fontWeight: "800" },
  addonQtyText: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: "800",
    minWidth: 14,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffebee",
    padding: 8,
    marginBottom: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#ff4444",
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#ff4444",
    fontWeight: "500",
  },
  addonPayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addonPayLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  addonPayValue: {
    fontSize: 16,
    fontWeight: "800",
    color: PRIMARY,
  },
  modifyBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modifyBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
