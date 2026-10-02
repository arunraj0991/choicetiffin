import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Calendar, DateData } from "react-native-calendars";
import { StatusBar } from "expo-status-bar";

// import { getCart, deleteCart } from '@/src/api/api';

import COLORS from "@/constants/colors";
import { Loader } from "@/components/service";

import CartItem from "@/components/cart/CartItem";
import DeliveryPreferences from "@/components/cart/DeliveryPreferences";
import availableSlots from "@/components/cart/slots.json";
import SubscriptionStartDate from "@/components/cart/SubscriptionStartDate";
import DiscountCoupon from "@/components/cart/DiscountCoupon";
import SummaryRow from "@/components/cart/SummaryRow";
import WeeklyMenu from "@/components/cart/WeeklyMenu";
import { deleteCart, getAccount, getAddons, getCart } from "@/src/api/api";
import { useAuthStore } from "@/src/store/auth";
import { useCartStore } from "@/src/store/cart";
import {
  filterDeliverySlots,
  getAllowedSlotIdsFromCategories,
  getSlotMultiplier,
} from "@/src/utils/deliverySlots";
import {
  getTomorrowSlotNotice,
  getSubscriptionStartDateYmd,
  toIndiaYmd,
} from "@/src/utils/mealBookingCutoff";
import {
  getMealPackageDays,
  getMealPackagePricing,
  parseWalletFromAccount,
} from "@/src/utils/format";
import { useLanguage } from "@/src/i18n/context";
import { useFoodTypeFilterStore } from "@/src/store/foodTypeFilter";

const PRIMARY = COLORS.primary;
const DATE_MARK = {
  selected: true,
  selectedColor: "#4CAF50",
  customStyles: {
    container: { backgroundColor: "#4CAF50", borderRadius: 8 },
    text: { color: "white", fontWeight: "bold" },
  },
};

function isOnetimeValue(value: unknown) {
  return (
    value === 1 ||
    value === true ||
    String(value).trim() === "1" ||
    String(value).toLowerCase() === "true"
  );
}

function isOnetimeCartItem(item: any) {
  return (
    isOnetimeValue(item?.onetime) ||
    isOnetimeValue(item?.one_time) ||
    isOnetimeValue(item?.category?.onetime)
  );
}

export default function Cart() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const foodFilter = useFoodTypeFilterStore((s) => s.filter);
  const { cartNo: cartNoParam } = useLocalSearchParams<{ cartNo: string }>();
  const user = useAuthStore((s) => s.user);

  const [cartData, setCartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<Record<string, string[]>>(
    {},
  );
  const [daySelectionError, setDaySelectionError] = useState("");
  const [selectedDates, setSelectedDates] = useState<Record<string, any>>({});
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([
    "Lunch",
    "Dinner",
  ]);
  const [selectedWeekDays, setSelectedWeekDays] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState<string[]>([]);
  const [addonQty, setAddonQty] = useState<{ [id: string]: number }>({});
  const [addons, setAddons] = useState<any[]>([]);
  const [resolvedCartNo, setResolvedCartNo] = useState("");
  const [showCutoffModal, setShowCutoffModal] = useState(false);
  const [cutoffNotice, setCutoffNotice] = useState<
    "lunchTomorrow" | "dinnerTomorrow" | "slotsTomorrow" | ""
  >("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

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

  useEffect(() => {
    const fetchCartData = async () => {
      try {
        setLoading(true);
        const cartNo =
          cartNoParam || (await AsyncStorage.getItem("cart_no")) || "";
        setResolvedCartNo(cartNo);
        if (!cartNo) {
          setError("No cart found");
          setCartData(null);
          return;
        }

        const userId =
          user?.id || (await AsyncStorage.getItem("user_id")) || "";
        const [response, addonsRes, accountRes] = await Promise.all([
          getCart(cartNo),
          getAddons(foodFilter === "nonveg" ? "nonveg" : "veg").catch(
            () => ({ data: [] }),
          ),
          userId
            ? getAccount(userId).catch(() => null)
            : Promise.resolve(null),
        ]);
        setCartData(response?.data);
        useCartStore.getState().setCartFromResponse(response, cartNo);
        setAddons(Array.isArray(addonsRes?.data) ? addonsRes.data : []);
        const wallet = parseWalletFromAccount(accountRes);
        setWalletBalance(
          Number.isFinite(wallet.amount) && wallet.amount > 0
            ? wallet.amount
            : 0,
        );
        setError(null);

        const initialDays: Record<string, string[]> = {};
        (response?.data?.cart ?? []).forEach((item: any) => {
          if (item?.id) initialDays[item.id] = [];
        });
        setSelectedDays(initialDays);
      } catch {
        setError("Failed to load cart");
      } finally {
        setLoading(false);
      }
    };
    fetchCartData();
  }, [cartNoParam, user?.id, foodFilter]);

  const deliverySlots = useMemo(() => {
    const allowedIds = getAllowedSlotIdsFromCategories(
      (Array.isArray(cartData?.cart) ? cartData.cart : []).map(
        (item: any) => item?.category,
      ),
    );
    return filterDeliverySlots(availableSlots, allowedIds);
  }, [cartData?.cart]);

  const isOnetimeCategory = useMemo(() => {
    const items = Array.isArray(cartData?.cart) ? cartData.cart : [];
    return (
      isOnetimeValue(cartData?.onetime) || items.some(isOnetimeCartItem)
    );
  }, [cartData]);

  const cartDurationDays = useMemo(() => {
    const items = Array.isArray(cartData?.cart) ? cartData.cart : [];
    if (!items.length) return 1;
    return Math.max(...items.map((item: any) => getMealPackageDays(item)), 1);
  }, [cartData?.cart]);
  const isSingleDayDuration = cartDurationDays === 1;

  const selectedDateKeys = useMemo(
    () => Object.keys(selectedDates).sort(),
    [selectedDates],
  );
  const earliestSelectedDate = selectedDateKeys[0] || null;
  const hasSelectedSlot = selectedSlots.length > 0;
  const minBookableDate = hasSelectedSlot
    ? getSubscriptionStartDateYmd(selectedSlots)
    : "";
  const todayYmd = toIndiaYmd();
  const isTodayRelevant =
    selectedDateKeys.length === 0 || selectedDateKeys.includes(todayYmd);

  useEffect(() => {
    if (!hasSelectedSlot) {
      setSelectedDates({});
      return;
    }
    setSelectedDates({ [minBookableDate]: DATE_MARK });
  }, [hasSelectedSlot, minBookableDate]);

  const showTomorrowSlotNotice = (slotIds: string[]) => {
    if (!isTodayRelevant) return;
    const notice = getTomorrowSlotNotice(slotIds);
    if (!notice) return;
    setCutoffNotice(notice);
    setShowCutoffModal(true);
  };

  useEffect(() => {
    const allowedIds = deliverySlots.map((slot) => slot.id);
    setSelectedSlots((prev) => {
      const next = (prev || []).filter((id) => allowedIds.includes(id));
      if (isSingleDayDuration) {
        if (next.length) return next.slice(0, 1);
        return allowedIds[0] ? [allowedIds[0]] : [];
      }
      const lunchDinner = ["Lunch", "Dinner"].filter((id) =>
        allowedIds.includes(id),
      );
      if (lunchDinner.length === 2) {
        const extras = next.filter((id) => !lunchDinner.includes(id));
        return [...lunchDinner, ...extras];
      }
      if (next.length) return next;
      return allowedIds[0] ? [allowedIds[0]] : [];
    });
  }, [deliverySlots, isSingleDayDuration]);

  const toggleDay = (itemId: string, day: string) => {
    setSelectedDays((prev) => {
      const itemDays = prev[itemId] || [];
      const newDays = itemDays.includes(day)
        ? itemDays.filter((d) => d !== day)
        : [...itemDays, day];
      setSelectedDates({});
      setDaySelectionError("");
      return { ...prev, [itemId]: newDays };
    });
  };

  const validateDaySelection = () => {
    if (!hasSelectedSlot) {
      setDaySelectionError("Please select a delivery slot");
      return false;
    }
    if (!selectedWeekDays || !selectedWeekDays.length) {
      setDaySelectionError("Please select at least one delivery day");
      return false;
    }
    const selectedStartDate = earliestSelectedDate
      ? new Date(earliestSelectedDate)
      : null;
    if (!selectedStartDate) {
      setDaySelectionError("Please select a subscription start date");
      return false;
    }
    return true;
  };

  const getAllSelectedDays = () => {
    const allDays = new Set<string>();
    Object.values(selectedDays).forEach((days) =>
      days.forEach((d) => allDays.add(d)),
    );
    return Array.from(allDays);
  };

  const getAvailableDates = (): Date[] => {
    const allSelectedDays = getAllSelectedDays();
    const today = new Date();
    const dates: Date[] = [];
    const current = new Date(today);
    current.setDate(today.getDate() + 1);

    if (!allSelectedDays.length) {
      // If no days are selected, just return next 30 days for now
      for (let i = 0; i < 30; i++) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      return dates;
    }

    const dayNameMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const selectedDayNumbers = allSelectedDays
      .map((d) => dayNameMap[d])
      .filter((n) => n !== undefined);

    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);

    while (current <= nextMonth) {
      if (selectedDayNumbers.includes(current.getDay()))
        dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const formatDate = (date: Date) => {
    const formatted = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    return `${formatted} = ${dayName}`;
  };

  const formatSelectedDatesDisplay = () => {
    const dates = Object.keys(selectedDates).sort();
    if (dates.length === 0) return "Select Dates";
    if (dates.length === 1) return dates[0];
    return `${dates.length} Dates Selected`;
  };

  const onDayPress = (day: DateData) => {
    const dateString = day.dateString;
    if (dateString < minBookableDate) return;
    if (isSingleDayDuration) {
      setSelectedDates({ [dateString]: DATE_MARK });
      if (dateString === todayYmd) {
        showTomorrowSlotNotice(selectedSlots);
      }
      setDaySelectionError("");
      return;
    }
    const newDates = { ...selectedDates };
    if (newDates[dateString]) {
      delete newDates[dateString];
    } else {
      if (Object.keys(newDates).length >= 7) return; // Prevent selecting more than 7 days
      newDates[dateString] = DATE_MARK;
      if (dateString === todayYmd) {
        showTomorrowSlotNotice(selectedSlots);
      }
    }
    setSelectedDates(newDates);
    setDaySelectionError("");
  };

  const getSlotCount = () => getSlotMultiplier(selectedSlots);

  const getBaseTotal = () => {
    const items = Array.isArray(cartData?.cart) ? cartData.cart : [];
    const multiplier = getSlotCount();
    if (!items.length) return (parseFloat(cartData?.total || 0) || 0) * multiplier;
    return (
      items.reduce((sum: number, item: any) => {
        const pricing = getMealPackagePricing(item, item?.qty);
        return sum + (pricing?.packagePrice ?? 0);
      }, 0) * multiplier
    );
  };

  const getDeliveryCharges = () => parseFloat(cartData?.d_charges || 0);

  const getTaxLineAmount = (tax: any) =>
    (parseFloat(tax?.amount || 0) || 0) *
    cartDurationDays *
    getSlotCount();

  const getTax = () => {
    const taxes = Array.isArray(cartData?.taxes) ? cartData.taxes : [];
    if (taxes.length) {
      return taxes.reduce(
        (sum: number, tax: any) => sum + getTaxLineAmount(tax),
        0,
      );
    }
    return (
      (parseFloat(cartData?.tax_total || 0) || 0) *
      cartDurationDays *
      getSlotCount()
    );
  };

  const calculateDiscountAmount = (coupon: any, subtotal: number) => {
    if (!coupon || subtotal < (coupon.minAmount || 0)) return 0;
    const apiAmount = Number(
      coupon.apiDiscount ?? coupon.discount_amount ?? coupon.amount,
    );
    if (Number.isFinite(apiAmount) && apiAmount > 0) {
      return Math.min(apiAmount, subtotal);
    }
    return coupon.type === "percentage"
      ? Math.min((subtotal * coupon.discount) / 100, subtotal * 0.5)
      : Math.min(coupon.discount, subtotal);
  };

  const getDiscountAmount = (coupon?: any) =>
    calculateDiscountAmount(coupon || appliedCoupon, getBaseTotal());

  const getAddonTotal = () =>
    (Array.isArray(addons) ? addons : []).reduce((sum, addon) => {
      const id = String(addon?.id ?? "");
      const qty = addonQty?.[id] || 0;
      const price = Number(addon?.raw_price ?? addon?.price ?? 0);
      return sum + (Number.isFinite(price) ? price : 0) * qty;
    }, 0);

  const getPayableBeforeWallet = () => {
    const discounted = getBaseTotal() - getDiscountAmount();
    return Math.max(
      0,
      discounted + getDeliveryCharges() + getTax() + getAddonTotal(),
    );
  };

  const getWalletRedeem = () => {
    if (!useWallet || !(walletBalance > 0)) return 0;
    return Math.min(walletBalance, getPayableBeforeWallet());
  };

  const getFinalTotal = () =>
    Math.max(0, getPayableBeforeWallet() - getWalletRedeem());

  const checkUserAuthentication = async () => {
    try {
      const userToken = await AsyncStorage.getItem("user_token");
      const userId = await AsyncStorage.getItem("user_id");
      return !!(
        userToken &&
        userId &&
        userToken !== "null" &&
        userId !== "null"
      );
    } catch {
      return false;
    }
  };

  const saveCartDataTemporarily = async () => {
    const cartNo = cartNoParam || (await AsyncStorage.getItem("cart_no"));
    const cartDataWithDays = {
      ...cartData,
      cart: cartData.cart.map((item: any) => ({
        ...item,
        selectedDays: selectedWeekDays,
      })),
    };
    const selectedStartDate = earliestSelectedDate
      ? new Date(earliestSelectedDate)
      : null;
    const tempData = {
      cartData: cartDataWithDays,
      selectedDays: cartData.cart.reduce((acc: any, item: any) => {
        acc[item.id] = selectedWeekDays;
        return acc;
      }, {}),

      selectedStartDate: selectedStartDate?.toISOString() || null,
      cartNo,
      appliedCoupon,
      discountAmount: getDiscountAmount(),
      subtotal: getBaseTotal(),
      addonTotal: getAddonTotal(),
      addons: (Array.isArray(addons) ? addons : [])
        .filter((addon) => (addonQty?.[String(addon?.id ?? "")] || 0) > 0)
        .map((addon) => ({
          ...addon,
          qty: addonQty[String(addon?.id ?? "")] || 0,
        })),
      finalTotal: getFinalTotal(),
      walletBalance,
      walletRedeem: getWalletRedeem(),
      useWallet,
      currency: cartData?.currency || "",
      store_lat: cartData?.store_lat,
      store_lng: cartData?.store_lng,
      max_km: cartData?.max_km,
      store_id: cartData?.store_id,
      selectedSlots,
      selectedDates: selectedDateKeys,
      delivery_days: selectedWeekDays,
      spInst: specialInstructions,
      timestamp: new Date().toISOString(),
    };
    await AsyncStorage.setItem("temp_checkout_data", JSON.stringify(tempData));
    await AsyncStorage.setItem("cartData", JSON.stringify(cartDataWithDays));
    if (cartNo) await AsyncStorage.setItem("cart_no", cartNo);
  };

  const handleCheckout = async () => {
    if (!validateDaySelection()) return;
    try {
      await saveCartDataTemporarily();
    } catch (e) {
      console.error("Failed to save cart data:", e);
    }

    const isLoggedIn = await checkUserAuthentication();
    if (isLoggedIn) {
      router.push("/checkout");
    } else {
      router.push("/login");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const userId = user?.id || (await AsyncStorage.getItem("user_id")) || "";
      if (!itemId || !userId) return;
      const response = await deleteCart(itemId, userId);
      setCartData(response?.data);
      useCartStore.getState().setCartFromResponse(response);
      const updatedDays: Record<string, string[]> = {};
      (response?.data?.cart ?? []).forEach((item: any) => {
        if (item?.id) updatedDays[item.id] = selectedDays[item.id] || [];
      });
      setSelectedDays(updatedDays);
    } catch (e) {
      console.error("Error deleting cart item:", e);
    }
  };

  if (loading) return <Loader />;

  if (!cartData?.cart?.length) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </Pressable>
          <Text style={styles.headerTitle}>My Cart</Text>
          <View style={{ width: 48 }} />
        </View>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="shopping-cart" size={80} color="#ccc" />
          <Text style={styles.emptyText}>{error || "Your cart is empty"}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>My Cart</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 160 + Math.max(insets.bottom, 0) },
        ]}
      >
        {cartData.cart.map((item: any) => (
          <CartItem
            key={item.id}
            itemId={item.id}
            title={item.name}
            price={item.price}
            qty={item.qty}
            total={item.total}
            image={item.img}
            description={item.description}
            time={item.time}
            duration={item.duration}
            duration_days={item.duration_days}
            durationdays={item.durationdays}
            mrp={item.mrp}
            availableDays={cartData.days || []}
            selectedDays={selectedDays[item.id] || []}
            onToggleDay={toggleDay}
            onDelete={handleDeleteItem}
            category={item.category}
          />
        ))}

        {/* ADD-ONS SECTION */}
        {addons?.length > 0 && (
          <View style={styles.addonsSection}>
            <Text style={styles.addonsTitle}>ADD-ONS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {addons.map((addon) => {
                if (!addon) return null;
                const id = String(addon?.id ?? "");
                const price = Number(addon?.raw_price ?? 0);

                return (
                  <View key={id || addon?.name} style={styles.addonCard}>
                    {addon?.img ? (
                      <Image
                        source={{ uri: addon.img }}
                        style={styles.addonImage}
                      />
                    ) : (
                      <View
                        style={[
                          styles.addonImage,
                          styles.addonImagePlaceholder,
                        ]}
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

        {!isOnetimeCategory && <WeeklyMenu />}

        <DeliveryPreferences
          selectedStartDate={
            earliestSelectedDate ? new Date(earliestSelectedDate) : null
          }
          onOpenDatePicker={() => {
            if (!hasSelectedSlot) return;
            setShowDatePicker(true);
          }}
          formatSelectedDate={() => formatSelectedDatesDisplay()}
          dateLabel={t("selectSubscriptionDate")}
          selectedSlots={selectedSlots}
          disabledSlots={[]}
          onToggleSlot={(slotId) => {
            if (isSingleDayDuration) {
              if (selectedSlots.includes(slotId)) return;
              showTomorrowSlotNotice([slotId]);
              setSelectedSlots([slotId]);
              return;
            }
            if (selectedSlots.includes(slotId)) {
              setSelectedSlots((prev) => prev.filter((s) => s !== slotId));
              return;
            }
            showTomorrowSlotNotice([slotId]);
            setSelectedSlots((prev) => [...prev, slotId]);
          }}
          slotHint={undefined}
          selectedWeekDays={selectedWeekDays}
          onToggleWeekDay={(day) => {
            setSelectedWeekDays((prev) =>
              prev.includes(day)
                ? prev.filter((d) => d !== day)
                : [...prev, day],
            );
            setDaySelectionError("");
          }}
          specialInstructions={specialInstructions}
          onToggleSpecialInstruction={(id) => {
            setSpecialInstructions((prev) =>
              prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id],
            );
          }}
          slots={deliverySlots}
        />

        <Modal
          animationType="slide"
          transparent
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>
                  {isSingleDayDuration
                    ? "Select Delivery Date"
                    : "Select Delivery Dates"}
                </Text>
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </Pressable>
              </View>

              <Calendar
                markingType={"custom"}
                markedDates={selectedDates}
                onDayPress={onDayPress}
                minDate={minBookableDate}
                disableAllTouchEventsForDisabledDays
                theme={{
                  arrowColor: PRIMARY,
                  todayTextColor: PRIMARY,
                  selectedDayBackgroundColor: "#4CAF50",
                  selectedDayTextColor: "#ffffff",
                }}
                style={styles.calendarStyle}
              />

              <View style={styles.calendarFooter}>
                <Pressable
                  style={styles.applyDatesBtn}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.applyDatesText}>APPLY</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={showCutoffModal}
          onRequestClose={() => setShowCutoffModal(false)}
        >
          <View style={styles.datePickerOverlay}>
            <View style={styles.cutoffModal}>
              <View style={styles.cutoffIconWrap}>
                <MaterialIcons name="schedule" size={26} color={PRIMARY} />
              </View>
              <Text style={styles.cutoffTitle}>
                {t(
                  cutoffNotice
                    ? `${cutoffNotice}Title`
                    : "tomorrowSlotTitle",
                )}
              </Text>
              <Text style={styles.cutoffMessage}>
                {t(cutoffNotice || "slotsTomorrow")}
              </Text>
              <Pressable
                style={styles.cutoffBtn}
                onPress={() => setShowCutoffModal(false)}
              >
                <Text style={styles.cutoffBtnText}>{t("gotIt")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <DiscountCoupon
          cartData={cartData}
          appliedCoupon={appliedCoupon}
          setAppliedCoupon={setAppliedCoupon}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          getDiscountAmount={getDiscountAmount}
          cartNo={resolvedCartNo}
          userId={String(user?.id ?? "")}
        />

        <View style={styles.summary}>
          <SummaryRow
            label="Subtotal"
            value={`${cartData.currency || ""}${getBaseTotal()}`}
          />
          {appliedCoupon && getDiscountAmount() > 0 && (
            <SummaryRow
              label="Discount"
              value={`-${cartData.currency || ""}${getDiscountAmount()}`}
              green
            />
          )}
          {cartData.taxes?.map((tax: any, i: number) => (
            <SummaryRow
              key={i}
              label={tax.name}
              value={`${cartData.currency || ""}${getTaxLineAmount(tax)}`}
            />
          ))}
          {parseFloat(cartData.d_charges) > 0 && (
            <SummaryRow
              label="Delivery Fee"
              value={`${cartData.currency}${cartData.d_charges}`}
            />
          )}
          {getAddonTotal() > 0 && (
            <SummaryRow
              label="Add-ons"
              value={`${cartData.currency || "₹"}${getAddonTotal()}`}
            />
          )}
          {walletBalance > 0 && (
            <Pressable
              style={styles.walletRow}
              onPress={() => setUseWallet((prev) => !prev)}
            >
              <MaterialIcons
                name={useWallet ? "check-box" : "check-box-outline-blank"}
                size={22}
                color={useWallet ? PRIMARY : "#888"}
              />
              <Text style={styles.walletLabel}>
                Include wallet redeem ({cartData.currency || ""}
                {walletBalance})
              </Text>
            </Pressable>
          )}
          {useWallet && getWalletRedeem() > 0 && (
            <SummaryRow
              label="Wallet Redeem"
              value={`-${cartData.currency || ""}${getWalletRedeem()}`}
              green
            />
          )}
          <View style={styles.divider} />
          <SummaryRow
            label="Total"
            value={`${cartData.currency || ""}${getFinalTotal()}`}
            bold
          />
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: 16 + Math.max(insets.bottom, 0) },
        ]}
      >
        {daySelectionError ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error" size={20} color="#ff4444" />
            <Text style={styles.errorText}>{daySelectionError}</Text>
          </View>
        ) : null}
        <View style={styles.footerContent}>
          <View>
            <Text style={styles.footerLabel}>Total Amount</Text>
            <Text style={styles.footerTotal}>
              {cartData.currency || ""}
              {getFinalTotal()}
            </Text>
          </View>
          <Pressable style={styles.checkoutBtn} onPress={handleCheckout}>
            <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            <MaterialIcons name="arrow-forward" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>
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
  content: { padding: 16, paddingBottom: 160 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
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
  summary: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  walletLabel: {
    flex: 1,
    color: "#555",
    fontSize: 14,
    fontWeight: "500",
  },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 8 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
  },
  footerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLabel: { fontSize: 12, color: "#777" },
  footerTotal: { fontSize: 22, fontWeight: "700" },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  checkoutText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  datePickerModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    margin: 20,
    maxHeight: "70%",
    width: "90%",
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  datePickerTitle: { fontSize: 18, fontWeight: "700", color: "#000" },
  calendarStyle: { borderRadius: 16, paddingBottom: 10 },
  calendarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    alignItems: "flex-end",
  },
  applyDatesBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  applyDatesText: { color: "#4CAF50", fontWeight: "700", fontSize: 16 },
  cutoffModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    margin: 24,
    padding: 22,
    width: "86%",
  },
  cutoffIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cutoffTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
    marginBottom: 10,
  },
  cutoffMessage: {
    fontSize: 14,
    lineHeight: 22,
    color: "#555",
    marginBottom: 20,
  },
  cutoffBtn: {
    alignSelf: "stretch",
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  cutoffBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  /* Add-ons Styles */
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
  addonImagePlaceholder: {
    backgroundColor: "#f5f5f5",
  },
  addonInfo: {
    padding: 10,
  },
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
  addonPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: PRIMARY,
  },
  addonAddBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addonAddText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  addonCounter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3e8ff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  addonCounterBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  addonCounterText: {
    color: PRIMARY,
    fontSize: 14,
    fontWeight: "800",
  },
  addonQtyText: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: "800",
    minWidth: 14,
    textAlign: "center",
  },
});
