import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Loader } from "@/components/service";
import RateUsSheet from "@/components/RateUsSheet";
import WeeklyMenuModal from "@/components/common/WeeklyMenuModal";
import ChangeAddressModal from "@/components/subscription/ChangeAddressModal";
import RenewSubscriptionModal from "@/components/subscription/RenewSubscriptionModal";
import TooltipMenu from "@/components/TooltipMenu";
import COLORS from "@/constants/colors";
import {
  getFoodTypeColors,
  isNonVegFoodType,
  isVegFoodType,
} from "@/src/store/homepageMeals";
import {
  getSubscription,
  rateUs,
  subscriptionCancel,
  subscriptionPause,
  subscriptionResume,
} from "@/src/api/api";
import { useLanguage } from "@/src/i18n/context";
import { isSubscriptionChangeAllowed } from "@/src/utils/mealBookingCutoff";

const PRIMARY = COLORS.primary;
type FilterKey = "active" | "paused" | "pending" | "cancelled" | "completed";

function getPrimaryItem(sub: any) {
  const items = Array.isArray(sub?.items) ? sub.items : [];
  return items[0] || null;
}

function getSubscriptionTitle(sub: any) {
  const item = getPrimaryItem(sub);
  console.log(item)
  const name = String(item?.thali_name ?? "").trim();
  if (name) return name;
  return String(sub?.store ?? "").trim();
}

function getShortOrderId(sub: any) {
  const raw = String(sub?.order_id ?? sub?.id ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  return (digits || raw).slice(-5);
}

function isSingleDaySubscription(sub: any) {
  const item = getPrimaryItem(sub);
  const raw =
    item?.duration ??
    item?.duration_days ??
    item?.durationdays ??
    sub?.duration ??
    sub?.duration_days ??
    sub?.durationdays;
  return Number(raw) === 1 || String(raw).trim() === "1";
}

function getSubscriptionFoodType(sub: any) {
  const items = Array.isArray(sub?.items) ? sub.items : [];
  const candidates = [
    ...items,
    sub,
    items[0]?.category,
    sub?.category,
    items[0]?.meal,
  ];
  for (const source of candidates) {
    const type = String(source?.category_food_type ?? "").trim();
    if (type && type.toLowerCase() !== "null") return type;
  }
  return "";
}

function FoodTypeTag({ sub }: { sub: any }) {
  const type = getSubscriptionFoodType(sub);
  if (!type) return null;
  const isNonVeg = isNonVegFoodType(type);
  const isVeg = isVegFoodType(type);
  const colors = isNonVeg
    ? { backgroundColor: "#FEE2E2", color: "#DC2626" }
    : isVeg
      ? { backgroundColor: "#DCFCE7", color: "#16A34A" }
      : getFoodTypeColors(type);
  const label = isNonVeg ? "Non-Veg" : isVeg ? "Veg" : type;

  return (
    <View
      style={[styles.foodTypeTag, { backgroundColor: colors.backgroundColor }]}
    >
      <View style={[styles.foodTypeDot, { backgroundColor: colors.color }]} />
      <Text style={[styles.foodTypeTagText, { color: colors.color }]}>
        {label}
      </Text>
    </View>
  );
}

const SUBSCRIPTION_BANNER = require("@/assets/images/Subscription.jpg");

function isPendingSubscription(item: any) {
  const status = String(
    item?.status ?? item?.subscription_status ?? item?.order_status ?? "",
  )
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  return (
    status === "pending" ||
    status === "pendingcancellation" ||
    status === "pendingcancel"
  );
}

function getPendingSubscriptions(payload: any) {
  if (Array.isArray(payload?.pending)) return payload.pending;
  if (Array.isArray(payload?.pending_cancel)) return payload.pending_cancel;
  return [
    ...(Array.isArray(payload?.cancel) ? payload.cancel : []),
    ...(Array.isArray(payload?.active) ? payload.active : []),
  ].filter(isPendingSubscription);
}

function getAdminNote(subscription: any) {
  return String(
    subscription?.admin_note ?? subscription?.adminNote ?? "",
  ).trim();
}

function ChangeAddressControl({
  enabled,
  onPress,
}: {
  enabled: boolean;
  onPress: () => void;
}) {
  const { t } = useLanguage();
  return (
    <View style={styles.changeWindow}>
     
      <TouchableOpacity
        style={[styles.changeChip, !enabled && styles.changeChipDisabled]}
        onPress={onPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityState={{ disabled: !enabled }}
      >
        <MaterialIcons
          name="edit-location-alt"
          size={14}
          color={enabled ? PRIMARY : "#aaa"}
        />
        <Text
          style={[
            styles.changeChipText,
            !enabled && styles.changeChipTextDisabled,
          ]}
        >
          {t("changeAddress")}
        </Text>
      </TouchableOpacity>
     
    </View>
  );
}

function AdminNote({ note }: { note?: string }) {
  const { t } = useLanguage();
  if (!note) return null;

  return (
    <View style={styles.adminNoteBox}>
      <MaterialIcons name="sticky-note-2" size={16} color={PRIMARY} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={styles.adminNoteLabel}>{t("adminReply")}</Text>
        <Text style={styles.adminNoteText}>{note}</Text>
      </View>
    </View>
  );
}

function getCancelledSubscriptions(payload: any) {
  const cancelled = Array.isArray(payload?.cancel) ? payload.cancel : [];
  if (Array.isArray(payload?.pending) || Array.isArray(payload?.pending_cancel)) {
    return cancelled;
  }
  return cancelled.filter((item: any) => !isPendingSubscription(item));
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("₹");
  const [data, setData] = useState<{
    active: any[];
    paused: any[];
    pending: any[];
    cancel: any[];
    complete: any[];
  }>({
    active: [],
    paused: [],
    pending: [],
    cancel: [],
    complete: [],
  });
  const [filter, setFilter] = useState<FilterKey>("active");
  const [menuVisible, setMenuVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        router.replace("/login" as any);
        return;
      }
      const res = await getSubscription(userId);
      if (res.data) {
        setData({
          active: res.data.active || [],
          paused: res.data.paused || [],
          pending: getPendingSubscriptions(res.data),
          cancel: getCancelledSubscriptions(res.data),
          complete: res.data.complete || [],
        });
        setCurrency(res.data.currency || "₹");
      }
    } catch {
      Alert.alert(t("error"), t("failedLoadSubscriptions"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleUpdate = (res: any) => {
    if (res.data) {
      setData({
        active: res.data.active || [],
        paused: res.data.paused || [],
        pending: getPendingSubscriptions(res.data),
        cancel: getCancelledSubscriptions(res.data),
        complete: res.data.complete || [],
      });
      setCurrency(res.data.currency || currency);
    }
  };

  if (loading) return <Loader />;

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "active", label: t("active") },
    { key: "paused", label: t("paused") },
    { key: "pending", label: t("pendingCancellation") },
    { key: "cancelled", label: t("cancelled") },
    { key: "completed", label: t("completed") },
  ];

  const listMap: Record<FilterKey, any[]> = {
    active: data.active,
    paused: data.paused,
    pending: data.pending,
    cancelled: data.cancel,
    completed: data.complete,
  };

  const currentList = listMap[filter];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)" as any)
          }
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("mySubscriptions")}</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Filter chips */}
      <View style={styles.filterWrap}>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, filter === f.key && styles.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.chipText,
                  filter === f.key && styles.chipTextActive,
                ]}
                numberOfLines={1}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        {currentList.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialIcons name="receipt-long" size={64} color="#ddd" />
            <Text style={styles.emptyText}>
              {t("noSubscriptions").replace("{filter}", filter)}
            </Text>
          </View>
        ) : filter === "active" ? (
          currentList.map((sub, i) => (
            <ActiveCard
              key={i}
              subscription={sub}
              currency={currency}
              onUpdate={handleUpdate}
              onViewMenu={() => setMenuVisible(true)}
            />
          ))
        ) : (
          currentList.map((sub, i) => (
            <PausedCard
              key={i}
              subscription={sub}
              currency={currency}
              statusText={
                filter === "paused"
                  ? t("paused")
                  : filter === "pending"
                    ? t("pendingCancellation")
                    : filter === "cancelled"
                      ? t("cancelled")
                      : t("completed")
              }
              icon={
                filter === "paused"
                  ? "pause-circle-filled"
                  : filter === "pending"
                    ? "hourglass-empty"
                    : filter === "cancelled"
                      ? "cancel"
                      : "check-circle"
              }
              iconColor={
                filter === "paused"
                  ? "#F59E0B"
                  : filter === "pending"
                    ? "#F97316"
                    : filter === "cancelled"
                      ? "#EF4444"
                      : PRIMARY
              }
              onUpdate={filter === "paused" ? handleUpdate : undefined}
              onViewMenu={() => setMenuVisible(true)}
            />
          ))
        )}
      </ScrollView>
      <WeeklyMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */

function ActiveCard({
  subscription: sub,
  currency,
  onUpdate,
  onViewMenu,
}: {
  subscription: any;
  currency: string;
  onUpdate: (r: any) => void;
  onViewMenu: () => void;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [pausing, setPausing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [rateVisible, setRateVisible] = useState(false);
  const [renewVisible, setRenewVisible] = useState(false);
  const [addressVisible, setAddressVisible] = useState(false);
  const [addressText, setAddressText] = useState(sub.address);
  const [addressType, setAddressType] = useState(sub.address_type);
  const title = getSubscriptionTitle(sub);
  const shortOrderId = getShortOrderId(sub);
  const [canChangeAddress, setCanChangeAddress] = useState(
    isSubscriptionChangeAllowed(),
  );

  React.useEffect(() => {
    setAddressText(sub.address);
    setAddressType(sub.address_type);
  }, [sub.address, sub.address_type]);

  React.useEffect(() => {
    const tick = () => setCanChangeAddress(isSubscriptionChangeAllowed());
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  const openChangeAddress = () => {
    const allowed = isSubscriptionChangeAllowed();
    setCanChangeAddress(allowed);
    if (!allowed) {
      Alert.alert(t("changeAddress"), t("changeAvailableHours"));
      return;
    }
    setAddressVisible(true);
  };

  const handleRenew = () => {
    setTimeout(() => setRenewVisible(true), 250);
  };

  const canModifyMeal = !isSingleDaySubscription(sub);

  const handleModifyMeal = () => {
    if (!canModifyMeal) return;
    router.push({
      pathname: "/modify-meal",
      params: {
        order_id: String(sub.order_id ?? ""),
        store_id: String(sub.store_id ?? sub.store?.id ?? ""),
        meal_id: String(getMealId() ?? ""),
      },
    } as any);
  };

  const getMealId = () => {
    const raw =
      sub.meal_id ?? sub.items?.[0]?.meal_id ?? sub.items?.[0]?.id ?? null;
    const mealId = Number(raw);
    return Number.isFinite(mealId) && mealId > 0 ? mealId : null;
  };

  const getStoreId = () => {
    const raw = sub.store_id ?? sub.store?.id ?? null;
    const storeId = String(raw ?? "").trim();
    return storeId || null;
  };

  const existingReview =
    (Array.isArray(sub.items) ? sub.items : []).find(
      (item: any) => item?.review?.stars || item?.review?.review_text,
    )?.review ?? null;
  const existingRating = Number(existingReview?.stars);
  const hasExistingReview = Boolean(existingReview);

  const handleRateSubmit = async (stars: number, reviewText: string) => {
    try {
      const mealId = getMealId();
      const storeId = getStoreId();
      if (!mealId) {
        throw new Error("missing meal_id");
      }
      if (!storeId) {
        throw new Error("missing store_id");
      }

      await rateUs(mealId, stars, reviewText, storeId);
      Alert.alert(t("success"), t("ratingSubmitted"));
    } catch (error) {
      console.error("error in rateUs", error);
      throw error;
    }
  };

  const handlePause = () => {
    Alert.alert(t("pauseSubscription"), t("pauseConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("pause"),
        onPress: async () => {
          setPausing(true);
          try {
            const userId = await AsyncStorage.getItem("user_id");
            if (!userId) return;
            const res = await subscriptionPause(userId, sub.order_id);
            Alert.alert(t("success"), t("pauseSuccess"));
            onUpdate(res);
          } catch {
            Alert.alert(t("error"), t("pauseFailed"));
          } finally {
            setPausing(false);
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert(t("cancelSubscription"), t("cancelWarning"), [
      { text: t("keepSubscription"), style: "cancel" },
      {
        text: t("yesCancelIt"),
        style: "destructive",
        onPress: async () => {
          setCancelling(true);
          try {
            const userId = await AsyncStorage.getItem("user_id");
            if (!userId) return;
            const res = await subscriptionCancel(userId, sub.order_id);
            Alert.alert(t("success"), t("cancelSuccess"));
            onUpdate(res);
          } catch {
            Alert.alert(t("error"), t("cancelFailed"));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.cardWrap}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>
            {t("active")} {t("subscriptionLabel")}
          </Text>
          {!!shortOrderId && (
            <Text style={styles.orderIdText}>#{shortOrderId}</Text>
          )}
        </View>
        <FoodTypeTag sub={sub} />
      </View>
      <View style={styles.card}>
        <ImageBackground
          source={SUBSCRIPTION_BANNER}
          style={styles.banner}
          imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
          resizeMode="cover"
          pointerEvents="none"
        />

        <TooltipMenu
          style={styles.moreBtnWrap}
          accessibilityLabel={t("moreOptions")}
          items={[
            {
              key: "renew",
              label: t("renew"),
              icon: "autorenew",
              onPress: handleRenew,
            },
            {
              key: "modifyMeal",
              label: t("modifyMeal"),
              icon: "edit",
              onPress: handleModifyMeal,
              disabled: !canModifyMeal,
            },
            {
              key: "changeAddress",
              label: t("changeAddress"),
              icon: "edit-location-alt",
              onPress: openChangeAddress,
              disabled: !canChangeAddress,
            },
          ]}
        />

        <View style={styles.cardBody}>
          <View style={styles.row}>
            <View style={styles.iconBox}>
              <MaterialIcons name="restaurant" size={24} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planName}>{title}</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <View style={styles.dot} />
                <Text style={styles.activeText}>{t("active")}</Text>
              </View>
            </View>
            <Text style={styles.price}>{sub.total}</Text>
          </View>

          <View style={styles.divider} />
  
          <View style={styles.addressRow}>
            <MaterialIcons name="location-on" size={16} color="#888" />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text style={styles.infoLabel}>
                {t("deliveryAddress")}{" "}
                {addressType ? (
                  <Text style={styles.badge}>{addressType}</Text>
                ) : null}
              </Text>
            
              <Text style={styles.infoValue} numberOfLines={2}>
                {addressText || t("noSavedAddresses")}
              </Text>
              <ChangeAddressControl
                enabled={canChangeAddress}
                onPress={openChangeAddress}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {(sub.items || []).map((item: any, idx: number) => (
            <View key={idx}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", flex: 1 }}>
                  <MaterialIcons
                    name="restaurant-menu"
                    size={16}
                    color="#888"
                  />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.infoLabel}>{item.name}</Text>
                    <Text style={styles.infoValue}>
                      {t("from")} {item.start} {t("to")} {item.end}
                    </Text>
                  </View>
                </View>
                <Text style={styles.infoLabel}>{item.type}</Text>
              </View>
              {idx < sub.items.length - 1 && <View style={styles.divider} />}
            </View>
          ))}

          <AdminNote note={getAdminNote(sub)} />

          <TouchableOpacity
            style={styles.scheduleBtn}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/delivery",
                params: { order_id: sub.order_id },
              } as any)
            }
          >
            <View style={styles.scheduleIconWrap}>
              <MaterialIcons name="local-shipping" size={20} color="#fff" />
            </View>
            <Text style={styles.scheduleBtnText}>
              {t("viewDeliverySchedule")}
            </Text>
            <View style={styles.scheduleChevron}>
              <MaterialIcons name="arrow-forward" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuBtn}
            activeOpacity={0.85}
            onPress={onViewMenu}
          >
            <View style={styles.menuIconWrap}>
              <MaterialIcons name="restaurant-menu" size={20} color={PRIMARY} />
            </View>
            <Text style={styles.menuBtnText}>{t("viewWeeklyMenu")}</Text>
            <View style={styles.menuChevron}>
              <MaterialIcons name="arrow-forward" size={16} color={PRIMARY} />
            </View>
          </TouchableOpacity>

          <View style={styles.footerActions}>
            <TouchableOpacity
              style={styles.rateUsBtn}
              onPress={() => setRateVisible(true)}
            >
              <MaterialIcons name="star-outline" size={16} color={PRIMARY} />
              <Text style={styles.rateUsText}>{t("rateUs")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePause} disabled={pausing}>
              <Text style={styles.linkGray}>
                {pausing ? t("pausing") : t("pause")}
              </Text>
            </TouchableOpacity>
            <Text style={styles.sep}>|</Text>
            <TouchableOpacity onPress={handleCancel} disabled={cancelling}>
              <Text style={[styles.linkGray, { color: "#EF4444" }]}>
                {cancelling ? t("cancelling") : t("cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <RateUsSheet
        visible={rateVisible}
        onClose={() => setRateVisible(false)}
        onSubmit={hasExistingReview ? undefined : handleRateSubmit}
        initialRating={
          Number.isFinite(existingRating) && existingRating > 0
            ? existingRating
            : 0
        }
        initialReview={String(existingReview?.review_text ?? "")}
        readOnly={hasExistingReview}
      />
      <RenewSubscriptionModal
        visible={renewVisible}
        subscription={sub}
        currency={currency}
        onClose={() => setRenewVisible(false)}
        onSuccess={onUpdate}
      />
      <ChangeAddressModal
        visible={addressVisible}
        orderId={sub.order_id}
        currentAddressId={sub.address_id ?? sub.addressid}
        currentAddress={addressText}
        onClose={() => setAddressVisible(false)}
        onUpdated={(addr, message) => {
          setAddressText(
            [addr.house_no, addr.address, addr.landmark]
              .filter(Boolean)
              .join(", ") || addr.address,
          );
          setAddressType(addr.type);
          Alert.alert(t("success"), message || t("addressUpdated"));
        }}
        isModify={true}
      />
    </View>
  );
}

function PausedCard({
  subscription: sub,
  currency,
  statusText,
  icon,
  iconColor,
  onUpdate,
  onViewMenu,
}: {
  subscription: any;
  currency: string;
  statusText: string;
  icon: string;
  iconColor: string;
  onUpdate?: (r: any) => void;
  onViewMenu: () => void;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [resuming, setResuming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [addressVisible, setAddressVisible] = useState(false);
  const [addressText, setAddressText] = useState(sub.address);
  const [addressType, setAddressType] = useState(sub.address_type);
  const title = getSubscriptionTitle(sub);
  const shortOrderId = getShortOrderId(sub);
  const [canChangeAddress, setCanChangeAddress] = useState(
    isSubscriptionChangeAllowed(),
  );

  React.useEffect(() => {
    setAddressText(sub.address);
    setAddressType(sub.address_type);
  }, [sub.address, sub.address_type]);

  React.useEffect(() => {
    const tick = () => setCanChangeAddress(isSubscriptionChangeAllowed());
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  const openChangeAddress = () => {
    const allowed = isSubscriptionChangeAllowed();
    setCanChangeAddress(allowed);
    if (!allowed) {
      Alert.alert(t("changeAddress"), t("changeAvailableHours"));
      return;
    }
    setAddressVisible(true);
  };

  const iconBg =
    statusText === t("paused")
      ? "#FEF3C7"
      : statusText === t("pendingCancellation")
        ? "#FFEDD5"
        : statusText === t("cancelled")
          ? "#FEE2E2"
          : "#E0F2FE";

  const handleResume = () => {
    Alert.alert(t("resumeSubscription"), t("resumeConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("resume"),
        onPress: async () => {
          setResuming(true);
          try {
            const userId = await AsyncStorage.getItem("user_id");
            if (!userId) return;
            const res = await subscriptionResume(userId, sub.order_id);
            Alert.alert(t("success"), t("resumeSuccess"));
            if (onUpdate) onUpdate(res);
          } catch {
            Alert.alert(t("error"), t("resumeFailed"));
          } finally {
            setResuming(false);
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert(t("cancelSubscription"), t("cancelWarning"), [
      { text: t("keepSubscription"), style: "cancel" },
      {
        text: t("yesCancelIt"),
        style: "destructive",
        onPress: async () => {
          setCancelling(true);
          try {
            const userId = await AsyncStorage.getItem("user_id");
            if (!userId) return;
            const res = await subscriptionCancel(userId, sub.order_id);
            Alert.alert(t("success"), t("cancelSuccess"));
            if (onUpdate) onUpdate(res);
          } catch {
            Alert.alert(t("error"), t("cancelFailed"));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.cardWrap}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionLabelRow}>
          <Text
            style={[
              styles.sectionLabel,
              { textTransform: "uppercase", letterSpacing: 1, fontSize: 12 },
            ]}
          >
            {statusText} {t("subscriptionLabel")}
          </Text>
          {!!shortOrderId && (
            <Text style={styles.orderIdText}>#{shortOrderId}</Text>
          )}
        </View>
        <FoodTypeTag sub={sub} />
      </View>
      <View style={styles.card}>
        <View style={styles.cardBody}>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
              <MaterialIcons name={icon as any} size={22} color={iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planName}>{title}</Text>
              <Text style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                {statusText}
              </Text>
              {sub.status_date && (
                <Text style={{ fontSize: 11, color: "#aaa" }}>
                  {statusText} {sub.status_date}
                </Text>
              )}
              {statusText === t("cancelled") && sub.refund && (
                <Text
                  style={{ fontSize: 12, color: "#16A34A", fontWeight: "600" }}
                >
                  {t("refund")} {sub.refund}
                </Text>
              )}
            </View>
            <Text style={styles.price}>{sub.total}</Text>
          </View>

          <AdminNote note={getAdminNote(sub)} />

          {statusText === t("paused") && (
            <>
              <View style={styles.divider} />
              
              <View style={styles.addressRow}>
                <MaterialIcons name="location-on" size={16} color="#888" />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.infoLabel}>
                    {t("deliveryAddress")}{" "}
                    {addressType ? (
                      <Text style={styles.badge}>{addressType}</Text>
                    ) : null}
                  </Text>
                  
                  <Text style={styles.infoValue} numberOfLines={2}>
                    {addressText || t("noSavedAddresses")}
                  </Text>
                  <ChangeAddressControl
                    enabled={canChangeAddress}
                    onPress={openChangeAddress}
                  />
                </View>
              </View>
            </>
          )}

          {statusText === t("paused") && (
            <TouchableOpacity
              style={styles.resumeBtn}
              onPress={handleResume}
              disabled={resuming}
            >
              <Text style={styles.resumeBtnText}>
                {resuming ? t("resuming") : t("resumeSubscription")}
              </Text>
            </TouchableOpacity>
          )}

          {(sub.items || []).length > 0 && (
            <View style={{ marginTop: 16 }}>
              {sub.items.map((item: any, idx: number) => (
                <View key={idx}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <View style={{ flexDirection: "row", flex: 1 }}>
                      <MaterialIcons
                        name="restaurant-menu"
                        size={16}
                        color="#888"
                      />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={styles.infoLabel}>{item.name}</Text>
                        <Text style={styles.infoValue}>
                          {t("from")} {item.start} {t("to")} {item.end}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.infoLabel}>{item.type}</Text>
                  </View>
                  {idx < sub.items.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.menuBtn}
            activeOpacity={0.85}
            onPress={onViewMenu}
          >
            <View style={styles.menuIconWrap}>
              <MaterialIcons name="restaurant-menu" size={20} color={PRIMARY} />
            </View>
            <Text style={styles.menuBtnText}>{t("viewWeeklyMenu")}</Text>
            <View style={styles.menuChevron}>
              <MaterialIcons name="arrow-forward" size={16} color={PRIMARY} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manageBtn}
            onPress={() =>
              router.push({
                pathname: "/delivery",
                params: { order_id: sub.order_id },
              } as any)
            }
          >
            <MaterialIcons name="local-shipping" size={18} color={PRIMARY} />
            <Text style={styles.manageBtnText}>{t("viewDeliveryHistory")}</Text>
            <MaterialIcons name="chevron-right" size={18} color={PRIMARY} />
          </TouchableOpacity>

          {statusText === t("paused") && (
            <View style={styles.footerActions}>
              <TouchableOpacity onPress={handleResume} disabled={resuming}>
                <Text style={styles.linkGray}>
                  {resuming ? t("resuming") : t("resume")}
                </Text>
              </TouchableOpacity>
              <Text style={styles.sep}>|</Text>
              <TouchableOpacity onPress={handleCancel} disabled={cancelling}>
                <Text style={[styles.linkGray, { color: "#EF4444" }]}>
                  {cancelling ? t("cancelling") : t("cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      {statusText === t("paused") && (
        <ChangeAddressModal
          visible={addressVisible}
          orderId={sub.order_id}
          currentAddressId={sub.address_id ?? sub.addressid}
          currentAddress={addressText}
          onClose={() => setAddressVisible(false)}
          onUpdated={(addr, message) => {
            setAddressText(
              [addr.house_no, addr.address, addr.landmark]
                .filter(Boolean)
                .join(", ") || addr.address,
            );
            setAddressType(addr.type);
            Alert.alert(t("success"), message || t("addressUpdated"));
          }}
        />
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

  filterWrap: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  foodTypeTag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  foodTypeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  foodTypeTagText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  chip: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: PRIMARY },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#555",
    textAlign: "center",
  },
  chipTextActive: { color: "#fff" },

  body: { flex: 1, backgroundColor: COLORS.secondary },
  content: { padding: 16, paddingBottom: 40 },

  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, color: "#aaa", fontWeight: "500" },

  cardWrap: { marginBottom: 24 },
  sectionHeader: {
    marginBottom: 10,
    gap: 6,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#555",
  },
  orderIdText: {
    fontSize: 13,
    fontWeight: "800",
    color: PRIMARY,
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    overflow: "hidden",
  },
  banner: { height: 90 },
  moreBtnWrap: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 20,
    elevation: 12,
  },
  cardBody: { padding: 16 },
  row: { flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EEE6F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  planName: { fontSize: 16, fontWeight: "700", color: "#130e1b" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
    marginRight: 6,
  },
  activeText: { fontSize: 12, fontWeight: "700", color: "#16A34A" },
  price: { fontSize: 17, fontWeight: "700", color: "#130e1b" },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 },
  infoLabel: { fontSize: 13, fontWeight: "600", color: "#130e1b" },
  infoValue: { fontSize: 12, color: "#888", marginTop: 4 },
  badge: { fontSize: 12, fontWeight: "700", color: PRIMARY },
  addressRow: { flexDirection: "row" },
  changeWindow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 2,
    gap: 8,
  },
  changeWindowTime: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
  },
  changeChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#F3EAFB",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  changeChipDisabled: {
    backgroundColor: "#f0f0f0",
  },
  changeChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },
  changeChipTextDisabled: {
    color: "#aaa",
  },
  adminNoteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F5F0FA",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  adminNoteLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
    marginBottom: 4,
  },
  adminNoteText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  rateUsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: "auto",
  },
  rateUsText: { fontSize: 12, fontWeight: "700", color: PRIMARY },
  linkGray: { fontSize: 12, fontWeight: "700", color: "#888" },
  sep: { color: "#ccc" },
  resumeBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
  },
  resumeBtnText: { fontSize: 14, fontWeight: "700", color: PRIMARY },
  scheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    gap: 12,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  scheduleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleBtnText: {
    flex: 1,
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  scheduleChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#F3EAFB",
    gap: 12,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtnText: {
    flex: 1,
    color: PRIMARY,
    fontWeight: "800",
    fontSize: 14,
  },
  menuChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    paddingHorizontal: 12,
    marginTop: 12,
  },
  manageBtnText: {
    flex: 1,
    marginLeft: 8,
    fontWeight: "600",
    color: "#130e1b",
    fontSize: 14,
  },
});
