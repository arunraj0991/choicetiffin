import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "@/constants/colors";
import { applyCouponAPI, getOffers } from "@/src/api/api";

const GREEN = "#4CAF50";

interface Coupon {
  id: string;
  code: string;
  description: string;
  type: "fixed" | "percentage";
  discount: number;
  minAmount: number;
  apiDiscount?: number;
}

interface Props {
  cartData: any;
  appliedCoupon: Coupon | null;
  setAppliedCoupon: (c: Coupon | null) => void;
  couponCode: string;
  setCouponCode: (s: string) => void;
  getDiscountAmount: (coupon: Coupon) => number;
  cartNo?: string;
  userId?: string;
}

function getSidebarLabel(coupon: Coupon) {
  if (coupon?.type === "percentage") return `${coupon.discount}% OFF`;
  return `Flat ${coupon?.discount ?? 0} Rs off`;
}

function mapOffer(offer: any): Coupon {
  const typeRaw = offer?.type ?? offer?.discount_type;
  const isFixed =
    typeRaw === 1 ||
    typeRaw === "1" ||
    String(typeRaw).toLowerCase() === "fixed" ||
    String(typeRaw).toLowerCase() === "flat";

  return {
    id: String(offer?.id ?? offer?.code ?? offer?.coupon_code ?? ""),
    code: String(offer?.code ?? offer?.coupon_code ?? ""),
    description: String(
      offer?.desc ?? offer?.description ?? offer?.title ?? "",
    ),
    type: isFixed ? "fixed" : "percentage",
    discount: Number(offer?.value ?? offer?.discount ?? offer?.amount) || 0,
    minAmount:
      Number(offer?.minAmount ?? offer?.min_amount ?? offer?.min_order) || 0,
  };
}

function extractOffers(payload: any): Coupon[] {
  const list = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.offers)
      ? payload.offers
      : Array.isArray(payload)
        ? payload
        : [];
  return list.map(mapOffer).filter((item: Coupon) => item.code);
}

function isApplyFailed(res: any) {
  if (!res) return true;
  if (res.status === false || res.status === 0 || res.success === false) {
    return true;
  }
  if (res.error) return true;
  const discount = Number(res?.data?.discount ?? res?.discount);
  if (Number.isFinite(discount) && discount > 0) return false;
  return !!res.message || !Number.isFinite(discount) || discount <= 0;
}

function getApplyDiscount(res: any) {
  const raw =
    res?.data?.discount ??
    res?.data?.discount_amount ??
    res?.data?.amount ??
    res?.discount ??
    res?.discount_amount ??
    res?.amount;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

export default function DiscountCoupon({
  cartData,
  appliedCoupon,
  setAppliedCoupon,
  couponCode,
  setCouponCode,
  getDiscountAmount,
  cartNo = "",
  userId = "",
}: Props) {
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [voucherCode, setVoucherCode] = useState("");
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadOffers = async () => {
      const uid =
        userId || (await AsyncStorage.getItem("user_id")) || "";
      if (!uid) {
        setAvailableCoupons([]);
        return;
      }

      setLoadingOffers(true);
      try {
        const res = await getOffers(uid);
        if (!cancelled) setAvailableCoupons(extractOffers(res));
      } catch {
        if (!cancelled) setAvailableCoupons([]);
      } finally {
        if (!cancelled) setLoadingOffers(false);
      }
    };

    loadOffers();
    return () => {
      cancelled = true;
    };
  }, [userId, cartData?.store_id]);

  const resolveIds = async () => {
    const uid = userId || (await AsyncStorage.getItem("user_id")) || "";
    const no = cartNo || (await AsyncStorage.getItem("cart_no")) || "";
    return { uid, no };
  };

  const applyCouponOnServer = async (code: string, coupon?: Coupon | null) => {
    const trimmed = code.trim();
    if (!trimmed) {
      Alert.alert("", "Please enter a coupon code");
      return;
    }

    const { uid, no } = await resolveIds();
    if (!uid || !no) {
      Alert.alert("", "Please login and add items to cart first");
      return;
    }

    setApplying(true);
    try {
      const res = await applyCouponAPI(trimmed, no, uid);
      if (isApplyFailed(res)) {
        Alert.alert("", res?.message || res?.error || "Invalid coupon code");
        return;
      }

      const apiDiscount = getApplyDiscount(res);
      const fromList =
        coupon ||
        availableCoupons.find(
          (c) => c?.code?.toUpperCase() === trimmed.toUpperCase(),
        );
      const applied: Coupon = {
        id: fromList?.id || trimmed,
        code: fromList?.code || trimmed.toUpperCase(),
        description:
          fromList?.description ||
          res?.message ||
          res?.data?.message ||
          "Coupon applied",
        type: fromList?.type || "fixed",
        discount: fromList?.discount || apiDiscount || 0,
        minAmount: fromList?.minAmount || 0,
        apiDiscount,
      };

      setAppliedCoupon(applied);
      setCouponCode(applied.code);
      setCouponModalVisible(false);
    } catch (e: any) {
      Alert.alert(
        "",
        e?.response?.data?.message || e?.message || "Failed to apply coupon",
      );
    } finally {
      setApplying(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  return (
    <View style={styles.couponSection}>
      <Text style={styles.sectionTitle}>Discount Coupon</Text>

      {appliedCoupon ? (
        <View style={styles.appliedCouponContainer}>
          <View style={styles.appliedCouponInfo}>
            <MaterialIcons name="local-offer" size={20} color={GREEN} />
            <View style={styles.appliedCouponText}>
              <Text style={styles.appliedCouponCode}>{appliedCoupon.code}</Text>
              <Text style={styles.appliedCouponDesc}>
                {appliedCoupon.description}
              </Text>
            </View>
            <Text style={styles.appliedCouponDiscount}>
              -₹{getDiscountAmount(appliedCoupon)}
            </Text>
          </View>
          <TouchableOpacity onPress={removeCoupon} style={styles.removeCouponBtn}>
            <MaterialIcons name="close" size={18} color="#ff4444" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.couponInputRow}>
          <TextInput
            style={styles.couponInput}
            placeholder="Enter coupon code"
            value={couponCode}
            onChangeText={setCouponCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={styles.applyCouponBtn}
            onPress={() => applyCouponOnServer(couponCode)}
            disabled={applying}
          >
            {applying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.applyCouponBtnText}>Apply</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.exploreRow}
        onPress={() => {
          setVoucherCode(couponCode);
          setCouponModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.exploreText}>Explore more coupons for you</Text>
        <MaterialIcons name="chevron-right" size={22} color={COLORS.text} />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent
        visible={couponModalVisible}
        onRequestClose={() => setCouponModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply Coupons</Text>
              <TouchableOpacity
                onPress={() => setCouponModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialIcons name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.voucherRow}>
              <TextInput
                style={styles.voucherInput}
                placeholder="Enter voucher code here"
                placeholderTextColor="#9CA3AF"
                value={voucherCode}
                onChangeText={setVoucherCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.voucherApplyBtn}
                onPress={() => applyCouponOnServer(voucherCode)}
                disabled={applying}
              >
                {applying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.voucherApplyText}>APPLY</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalList}
            >
              {loadingOffers ? (
                <ActivityIndicator
                  color={COLORS.primary}
                  style={{ marginTop: 24 }}
                />
              ) : availableCoupons.length === 0 ? (
                <Text style={styles.emptyText}>No coupons available</Text>
              ) : (
                availableCoupons.map((item) => {
                  const expanded = !!expandedIds[item.id];
                  const description = item?.description ?? "";
                  const shortDesc =
                    description.length > 70 && !expanded
                      ? `${description.slice(0, 70)}...`
                      : description;

                  return (
                    <View key={item.id} style={styles.offerCard}>
                      <View style={styles.offerSidebar}>
                        <Text style={styles.offerSidebarText} numberOfLines={2}>
                          {getSidebarLabel(item)}
                        </Text>
                      </View>
                      <View style={styles.offerBody}>
                        <View style={styles.offerTop}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.offerCode}>{item.code}</Text>
                            <Text style={styles.offerSubtitle}>
                              {item.type === "percentage"
                                ? `${item.discount}% Off`
                                : `Flat ₹${item.discount} Off`}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => applyCouponOnServer(item.code, item)}
                            disabled={applying}
                          >
                            <Text style={styles.offerApply}>APPLY</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.offerDash} />
                        <Text style={styles.offerDesc}>{shortDesc}</Text>
                        {description.length > 70 && (
                          <TouchableOpacity
                            onPress={() =>
                              setExpandedIds((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }))
                            }
                          >
                            <Text style={styles.moreText}>
                              {expanded ? "- LESS" : "+ MORE"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  couponSection: {
    backgroundColor: "#fff",
    marginHorizontal: 2,
    marginVertical: 8,
    paddingTop: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  appliedCouponContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: GREEN,
    marginHorizontal: 16,
  },
  appliedCouponInfo: { flex: 1, flexDirection: "row", alignItems: "center" },
  appliedCouponText: { flex: 1, marginLeft: 8 },
  appliedCouponCode: { fontSize: 14, fontWeight: "bold", color: "#2E7D32" },
  appliedCouponDesc: { fontSize: 12, color: "#666", marginTop: 2 },
  appliedCouponDiscount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2E7D32",
    marginRight: 8,
  },
  removeCouponBtn: { padding: 4 },
  couponInputRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16 },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  applyCouponBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
  },
  applyCouponBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  exploreRow: {
    marginTop: 16,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderTopColor: "#D1D5DB",
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  exploreText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#F3F4F6",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#222" },
  modalCloseBtn: { padding: 4 },
  voucherRow: {
    flexDirection: "row",
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  voucherInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  voucherApplyBtn: {
    backgroundColor: GREEN,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  voucherApplyText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  modalList: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.muted,
    marginTop: 24,
  },
  offerCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 14,
  },
  offerSidebar: {
    width: 42,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  offerSidebarText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    width: 90,
    textAlign: "center",
    transform: [{ rotate: "-90deg" }],
  },
  offerBody: {
    flex: 1,
    padding: 14,
  },
  offerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  offerCode: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  offerSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: GREEN,
    marginTop: 2,
  },
  offerApply: {
    color: GREEN,
    fontWeight: "800",
    fontSize: 13,
  },
  offerDash: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderTopColor: "#E5E7EB",
    marginVertical: 10,
  },
  offerDesc: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  moreText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
  },
});
