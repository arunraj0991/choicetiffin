import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StripeProvider } from "@stripe/stripe-react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// import { Loader } from '@/components/service';

import COLORS from "@/constants/colors";
import { useRazorpayPayment } from "@/hooks/useRazorpayPayment";
import { useStripePayment } from "@/hooks/useStripePayment";
import { getAccount, placeOrder } from "@/src/api/api";
import { useLanguage } from "@/src/i18n/context";
import { useCartStore } from "@/src/store/cart";

import BillDetails from "@/components/checkout/BillDetails";
import DeliveryAddressCard from "@/components/checkout/DeliveryAddressCard";
import DeliveryScheduleCard from "@/components/checkout/DeliveryScheduleCard";
import AddOnsSummary from "@/components/checkout/AddOnsSummary";
import OrderSummary from "@/components/checkout/OrderSummary";
import PaymentMethod from "@/components/checkout/PaymentMethod";
import { Loader } from "@/components/service";
import { formatPrice, getMealPackageDays } from "@/src/utils/format";
import { getSlotMultiplier } from "@/src/utils/deliverySlots";

const PRIMARY = COLORS.primary;

function getSelectedWeekDays(checkoutData: any, cartData: any): string[] {
  const fromItem = (cartData?.cart || []).find(
    (item: any) =>
      Array.isArray(item?.selectedDays) && item.selectedDays.length,
  )?.selectedDays;
  if (fromItem?.length) return fromItem;

  const map = checkoutData?.selectedDays || {};
  const first = Object.values(map).find(
    (days) => Array.isArray(days) && days.length,
  ) as string[] | undefined;
  return first || [];
}

function formatOrderDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function buildAddonQty(addons: any[] = []) {
  const map: Record<string, { name: string; qty: number }> = {};
  (Array.isArray(addons) ? addons : []).forEach((addon) => {
    const id = String(addon?.id ?? "");
    const qty = Number(addon?.qty ?? 0);
    if (!id || qty <= 0) return;
    map[id] = { name: String(addon?.name ?? ""), qty };
  });
  return map;
}

function getCartDurationDays(cartData: any) {
  const items = Array.isArray(cartData?.cart) ? cartData.cart : [];
  if (!items.length) return 1;
  return Math.max(...items.map((item: any) => getMealPackageDays(item)), 1);
}

function getCheckoutTotals(cartData: any, checkoutData: any) {
  const currency = checkoutData?.currency || cartData?.currency || "";
  const slotMultiplier = getSlotMultiplier(checkoutData?.selectedSlots);
  const subtotal = Number(
    checkoutData?.subtotal ?? parseFloat(cartData?.total || 0),
  );
  const discountAmount = Number(checkoutData?.discountAmount || 0);
  const addonTotal = Number(checkoutData?.addonTotal || 0);
  const deliveryFee = parseFloat(cartData?.d_charges || 0);
  const durationDays = getCartDurationDays(cartData);
  const taxes = (cartData?.taxes || []).map((tax: any) => ({
    ...tax,
    amount:
      (parseFloat(tax.amount || 0) || 0) * durationDays * slotMultiplier,
  }));
  const taxTotal = taxes.length
    ? taxes.reduce((sum: number, tax: any) => sum + Number(tax.amount || 0), 0)
    : (parseFloat(cartData?.tax_total || 0) || 0) *
      durationDays *
      slotMultiplier;
  const payableBeforeWallet = Math.max(
    0,
    subtotal - discountAmount + deliveryFee + taxTotal + addonTotal,
  );
  const walletRedeem = Math.min(
    Math.max(0, Number(checkoutData?.walletRedeem || 0)),
    payableBeforeWallet,
  );
  const finalTotal = Number(
    checkoutData?.finalTotal ?? Math.max(0, payableBeforeWallet - walletRedeem),
  );

  return {
    currency,
    subtotal,
    discountAmount,
    addonTotal,
    deliveryFee,
    taxes,
    taxTotal,
    walletRedeem,
    finalTotal,
  };
}

/* ------------------------------------------------------------------ */
/* Inner component — must be inside StripeProvider to call useStripe  */
/* ------------------------------------------------------------------ */
function CheckoutContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { payWithStripe } = useStripePayment();
  const { payWithRazorpay } = useRazorpayPayment();

  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [cartData, setCartData] = useState<any>(null);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<any>(null);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState(false);
  const [userData, setUserData] = useState<any>({});
  const [keys, setKeys] = useState<any>({});

  /* ---------- Load ---------- */

  const loadData = async () => {
    setLoading(true);
    const userId = await AsyncStorage.getItem("user_id");
    if (!userId) {
      Alert.alert(t("loginRequired"), t("pleaseLoginToContinue"));
      router.replace("/login" as any);
      return;
    }

    try {
      const accountRes = await getAccount(userId);
      setUserData(accountRes.data?.user || {});
      setKeys(accountRes.data?.keys || {});
      setSavedAddresses(accountRes.data?.address || []);
    } catch {}

    const saved = await AsyncStorage.getItem("cartData");
    const parsed = saved ? JSON.parse(saved) : null;
    const tempStr = await AsyncStorage.getItem("temp_checkout_data");
    const temp = tempStr ? JSON.parse(tempStr) : null;
    const cart = temp?.cartData || parsed;
    setCartData(cart);
    setCheckoutData(temp);

    const store = {
      store_id: temp?.store_id || cart?.store_id,
    };
    setStoreData(store);

    const addrStr = await AsyncStorage.getItem("delivery_address");
    const addr = addrStr ? JSON.parse(addrStr) : null;
    setDeliveryAddress(addr);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Refresh delivery address and saved addresses when returning from add-address
      (async () => {
        const s = await AsyncStorage.getItem("delivery_address");
        const addr = s ? JSON.parse(s) : null;
        setDeliveryAddress(addr);

        const userId = await AsyncStorage.getItem("user_id");
        if (userId) {
          try {
            const accountRes = await getAccount(userId);
            setSavedAddresses(accountRes.data?.address || []);
          } catch {}
        }
      })();
    }, []),
  );

  /* ---------- Place Order ---------- */

  const getTempData = async () => {
    const s = await AsyncStorage.getItem("temp_checkout_data");
    return s ? JSON.parse(s) : {};
  };

  const handlePlaceOrder = async () => {
    if (!deliveryAddress) {
      Alert.alert(t("missingAddress"), t("pleaseSelectAddress"));
      return;
    }
    if (placingOrder) return;

    setPlacingOrder(true);
    setOrderError(false);

    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        Alert.alert(t("loginRequired"), t("pleaseLoginToContinue"));
        return;
      }

      const temp = await getTempData();

      const {
        finalTotal = 0,
        subtotal = 0,
        discountAmount = 0,
        selectedStartDate,
        selectedDays = {},
        selectedDates = [],
        selectedSlots = [],
        addons = [],
        addonTotal = 0,
        appliedCoupon,
        spInst = [],
        delivery_days = [],
      } = temp;

      const startDate =
        formatOrderDate(selectedStartDate) ||
        formatOrderDate(selectedDates?.[0]) ||
        null;

      if (finalTotal > 0) {
        if (paymentMethod === "card") {
          const ok = await payWithStripe({
            amount: finalTotal,
            userId,
          });
          if (!ok) return;
        } else if (paymentMethod === "upi") {
          const ok = await payWithRazorpay({
            amount: finalTotal,
            user: {
              id: userId,
              name: userData.name,
              email: userData.email,
              phone: userData.phone,
            },
            razorpayKey: keys.razorpay_key,
          });
          if (!ok) return;
        }
      }

      const item_id: any[] = [];
      const meal_type: any[] = [];
      const price: any[] = [];
      const qty: any[] = [];
      const days: any[] = [];

      cartData.cart.forEach((item: any) => {
        item_id.push(item.id);
        meal_type.push(item.meal_type || item.type || "lunch");
        price.push(
          parseFloat(item.cal_price || item.price || item.count_price || 0),
        );
        qty.push(parseInt(item.qty || 1, 10));
        days.push((item.selectedDays || selectedDays[item.id] || []).join(","));
      });

      const totals = getCheckoutTotals(cartData, temp);
      const couponCode =
        appliedCoupon?.code || appliedCoupon?.coupon_code || "";
      const delSlot = Array.isArray(selectedSlots)
        ? selectedSlots.join(",")
        : selectedSlots || "";
      const parsedDeliveryDays = Array.isArray(delivery_days)
        ? delivery_days
        : String(delivery_days || "")
            .split(",")
            .map((day) => day.trim())
            .filter(Boolean);
      const deliveryDays =
        parsedDeliveryDays.length > 0
          ? parsedDeliveryDays
          : getSelectedWeekDays(temp, cartData);

      const orderData: any = {
        store_id: cartData.store_id || storeData?.store_id,
        user_id: userId,
        address_id: deliveryAddress.address_id || deliveryAddress.id,
        sub_total: subtotal || 0,
        d_fee: totals.deliveryFee || 0,
        tax: totals.taxTotal || 0,
        discount: discountAmount || 0,
        total_amount: finalTotal || cartData.sub_total,
        payment_method: paymentMethod,
        start_date: startDate,
        select_sub_date: startDate,
        item_id,
        meal_type,
        price,
        qty,
        days,
        addonQty: buildAddonQty(addons),
        addonTotal: Number(addonTotal || 0),
        spInst,
        couponCode,
        delSlot,
        delivery_days: deliveryDays.join(","),
        meal_id: cartData.cart?.[0]?.item_id,
        wallet: totals.walletRedeem || 0,
        wallet_amount: totals.walletRedeem || 0,
      };

      if (totals.taxes?.length) {
        totals.taxes.forEach((tax: any, i: number) => {
          if (i === 0) {
            orderData.tax_name = tax.name;
            orderData.tax_value = Number(tax.amount || 0);
          } else {
            orderData[`tax_name${i + 1}`] = tax.name;
            orderData[`tax_value${i + 1}`] = Number(tax.amount || 0);
          }
        });
      }

      const response = await placeOrder(orderData);
      const payload = response?.data ?? response;
      if (response?.data?.status === false && response?.data?.message) {
        Alert.alert(response?.data?.message);
        return;
        // throw new Error(response?.error || payload?.error || t("pleaseRetry"));
      }

      const orderId = String(
        payload?.id ??
          payload?.order_id ??
          response?.order_id ??
          response?.id ??
          "",
      );

      useCartStore.getState().clearCart();
      await AsyncStorage.multiRemove([
        "cartData",
        "cart_no",
        "temp_checkout_data",
      ]);

      router.replace({
        pathname: "/thanks" as any,
        params: {
          orderId,
          totalAmount: String(finalTotal),
        },
      });
    } catch (err) {
      setOrderError(true);
      console.error("err =--->", err);
      Alert.alert(t("orderFailed"), t("pleaseRetry"));
    } finally {
      setPlacingOrder(false);
    }
  };

  /* ---------- UI ---------- */

  if (loading) return <Loader />;

  if (!cartData) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </Pressable>
          <Text style={styles.headerTitle}>{t("checkout")}</Text>
          <View style={{ width: 48 }} />
        </View>
        <View style={styles.centerState}>
          <MaterialIcons name="error" size={48} color="#ff4444" />
          <Text style={styles.stateText}>{t("noCartData")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("checkout")}</Text>
        <View style={{ width: 48 }} />
      </View>

      <CheckoutBody
        cartData={cartData}
        checkoutData={checkoutData}
        deliveryAddress={deliveryAddress}
        savedAddresses={savedAddresses}
        onAddressChange={setDeliveryAddress}
        onAddressRemoved={setSavedAddresses}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        keys={keys}
        bottomInset={insets.bottom}
      />

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: 16 + Math.max(insets.bottom, 0) },
        ]}
      >
        <TotalDisplay cartData={cartData} checkoutData={checkoutData} />
        <TouchableOpacity
          style={[
            styles.placeOrderBtn,
            (placingOrder || orderError) && styles.placeOrderBtnDisabled,
          ]}
          onPress={
            orderError
              ? () => {
                  setOrderError(false);
                  handlePlaceOrder();
                }
              : handlePlaceOrder
          }
          disabled={placingOrder}
        >
          {placingOrder ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.placeOrderText}>
                {orderError ? t("tryAgain") : t("placeOrder")}
              </Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* Separate scroll body to avoid re-renders */
function CheckoutBody({
  cartData,
  checkoutData,
  deliveryAddress,
  savedAddresses,
  onAddressChange,
  onAddressRemoved,
  paymentMethod,
  setPaymentMethod,
  keys,
  bottomInset = 0,
}: any) {
  const totals = getCheckoutTotals(cartData, checkoutData);
  const selectedWeekDays = getSelectedWeekDays(checkoutData, cartData);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: 120 + Math.max(bottomInset, 0) },
      ]}
    >
      <DeliveryAddressCard
        deliveryAddress={deliveryAddress}
        savedAddresses={savedAddresses}
        onAddressChange={onAddressChange}
        onAddressRemoved={onAddressRemoved}
      />
      <OrderSummary
        cartData={cartData}
        selectedDaysByItem={checkoutData?.selectedDays}
        currency={totals.currency}
      />
      <AddOnsSummary addons={checkoutData?.addons} currency={totals.currency} />
      <DeliveryScheduleCard
        selectedDays={selectedWeekDays}
        selectedDates={checkoutData?.selectedDates}
        selectedStartDate={checkoutData?.selectedStartDate}
        selectedSlots={checkoutData?.selectedSlots}
      />
      <BillDetails
        subtotal={totals.subtotal}
        deliveryFee={totals.deliveryFee}
        taxes={totals.taxes}
        appliedCoupon={checkoutData?.appliedCoupon}
        discountAmount={totals.discountAmount}
        addonTotal={totals.addonTotal}
        walletRedeem={totals.walletRedeem}
        totalAmount={totals.finalTotal}
        currency={totals.currency}
      />
      <PaymentMethod
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        keys={keys}
      />
    </ScrollView>
  );
}

function TotalDisplay({ cartData, checkoutData }: any) {
  const { t } = useLanguage();
  const { finalTotal, currency } = getCheckoutTotals(cartData, checkoutData);

  return (
    <View>
      <Text style={styles.totalLabel}>{t("totalToPay")}</Text>
      <Text style={styles.totalAmount}>
        {currency}
        {formatPrice(finalTotal)}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Wrapper that provides StripeProvider with the publishable key      */
/* ------------------------------------------------------------------ */
export default function CheckoutScreen() {
  const router = useRouter();
  const [stripeKey, setStripeKey] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("user_id").then(async (userId) => {
      if (!userId) {
        router.replace("/login" as any);
        return;
      }
      try {
        const res = await getAccount(userId);
        setStripeKey(res.data?.keys?.stripe_key || "");
      } catch {
        setStripeKey("");
      }
    });
  }, []);

  if (stripeKey === null) return <Loader />;

  return (
    <StripeProvider publishableKey={stripeKey}>
      <CheckoutContent />
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f6f8" },
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
  content: { padding: 16, paddingBottom: 120 },
  centerState: { flex: 1, justifyContent: "center", alignItems: "center" },
  stateText: {
    marginTop: 16,
    fontSize: 16,
    color: "#ff4444",
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  totalLabel: { fontSize: 12, color: "#666" },
  totalAmount: { fontSize: 20, fontWeight: "700" },
  placeOrderBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  placeOrderBtnDisabled: { backgroundColor: "#ccc" },
  placeOrderText: { color: "#fff", fontWeight: "700", marginRight: 6 },
});
