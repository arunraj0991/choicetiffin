import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
  Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";

// import { getAccount, deleteAccount, logout } from '@/src/api/api';
import { Loader } from "@/components/service";
import BottomNav, { bottomNavContentPadding } from "@/components/home/BottomNav";
import COLORS from "@/constants/colors";
import { useLanguage } from "@/src/i18n/context";
import { deleteAccount, getAccount, getSettings, logout } from "@/src/api/api";
import { useAuthStore } from "@/src/store/auth";
import { logoutOneSignalUser } from "@/src/utils/onesignal";
import { formatWalletAmount, parseWalletFromAccount } from "@/src/utils/format";

const PRIMARY = COLORS.primary;

export default function AccountScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const clearUser = useAuthStore((s) => s.clearUser);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [walletAmount, setWalletAmount] = useState(0);
  const [walletCurrency, setWalletCurrency] = useState("₹");

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const userId = await AsyncStorage.getItem("user_id");
    if (!userId) {
      router.replace("/login" as any);
      return;
    }
    try {
      const [res, settingsRes] = await Promise.all([
        getAccount(userId),
        getSettings().catch(() => null),
      ]);
      if (res.data) {
        setUserData(res.data.user);
        setSubscriptionData(res.data.subscription);
        if (res.data.user?.img)
          await AsyncStorage.setItem("user_img", res.data.user.img);
      }
      const wallet = parseWalletFromAccount(res);
      setWalletAmount(wallet.amount);
      setWalletCurrency(wallet.currency);
      const whatsapp = String(settingsRes?.data?.whatsapp ?? "").replace(
        /\D/g,
        "",
      );
      setWhatsappNumber(whatsapp);
    } catch {}
    if (showLoader) setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchData(false);
    }, []),
  );

  const handleLogout = () => {
    Alert.alert(t("confirmLogout"), t("logoutConfirmMsg"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("logout"), onPress: performLogout },
    ]);
  };

  const performLogout = async () => {
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (userId) await logout(userId);
      logoutOneSignalUser();
      await AsyncStorage.multiRemove([
        "user_token",
        "user_id",
        "user_name",
        "user_email",
        "user_phone",
        "user_rcode",
        "user_img",
      ]);
      clearUser();
      router.replace("/(tabs)" as any);
    } catch {
      Alert.alert(t("error"), t("somethingWrong"));
    }
  };

  const handleDeleteAccount = async () => {
    if (!password.trim()) {
      Alert.alert(t("error"), t("enterPassword"));
      return;
    }
    setDeleting(true);
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        Alert.alert(t("error"), t("pleaseLogin"));
        return;
      }
      const res = await deleteAccount(userId, password);
      if (res?.msg === "done") {
        logoutOneSignalUser();
        await AsyncStorage.multiRemove([
          "user_id",
          "user_token",
          "user_name",
          "user_email",
          "user_phone",
          "user_rcode",
          "user_img",
        ]);
        clearUser();
        Alert.alert(t("accountDeleted"), t("sorryToSeeYouGo"), [
          { text: t("ok"), onPress: () => router.replace("/(tabs)" as any) },
        ]);
      } else {
        Alert.alert(t("error"), res?.error || t("failedDeleteAccount"));
      }
    } catch {
      Alert.alert(t("error"), t("somethingWrong"));
    } finally {
      setDeleting(false);
      setPassword("");
      setDeleteModalVisible(false);
    }
  };

  const openWhatsAppSupport = async () => {
    if (!whatsappNumber) {
      Alert.alert(t("error"), t("whatsappUnavailable"));
      return;
    }
    const url = `https://wa.me/${whatsappNumber}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t("error"), t("somethingWrong"));
    }
  };

  if (loading) return <Loader />;

  const sub = Array.isArray(subscriptionData)
    ? subscriptionData[0]
    : subscriptionData;
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={styles.headerBar}>
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
        <Text style={styles.headerTitle}>{t("account")}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomNavContentPadding(insets.bottom) },
        ]}
      >
        {/* Profile Header */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => router.push("/setting" as any)}
          >
            {userData?.img ? (
              <Image source={{ uri: userData.img }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialIcons name="person" size={48} color={PRIMARY} />
              </View>
            )}
            <View style={styles.editBadge}>
              <MaterialIcons name="edit" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{userData?.name || "User"}</Text>
          <Text style={styles.email}>{userData?.email || ""}</Text>
          {userData?.rcode && (
            <View style={styles.badge}>
              <MaterialIcons name="card-giftcard" size={14} color={PRIMARY} />
              <Text style={styles.badgeText}>{userData.rcode}</Text>
            </View>
          )}
        </View>

        {sub?.status === "Active" && (
          <View style={styles.planCard}>
            <View style={styles.planRow}>
              <View style={styles.planIconWrap}>
                <MaterialIcons name="local-shipping" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.planLabel}>
                  {t("nextDelivery")}
                  {sub.store ? ` · ${sub.store}` : ""}
                </Text>
                {sub.delivery ? (
                  <Text style={styles.planTime}>{sub.delivery}</Text>
                ) : null}
                {sub.time ? (
                  <Text style={styles.planSub}>{sub.time}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => router.push("/subscription" as any)}
              >
                <Text style={styles.manageBtnText}>{t("manage")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.optionsBox}>
          <OptionRow
            icon="account-balance-wallet"
            title={t("myWallet")}
            subtitle={`${t("balance")} ${walletCurrency}${formatWalletAmount(walletAmount)}`}
            onPress={() => router.push("/wallet" as any)}
          />
          <OptionRow
            icon="settings"
            title={t("accountSettings")}
            onPress={() => router.push("/setting" as any)}
          />
          <OptionRow
            icon="add-card"
            title={t("manageSubscriptions")}
            onPress={() => router.push("/subscription" as any)}
          />
         
          <OptionRow
            icon="location-on"
            title={t("manageAddress")}
            onPress={() => router.push("/address" as any)}
          />
          <OptionRow
            icon="loyalty"
            title={t("referralCodeMenu")}
            subtitle={t("referAndEarn")}
            onPress={() => router.push("/refer" as any)}
          />
          <OptionRow
            icon="language"
            title={t("changeLanguage")}
            onPress={() => router.push("/language" as any)}
          />
          <OptionRow
            icon="confirmation-number"
            title={t("complaintTicket")}
            onPress={() => router.push("/complaints" as any)}
          />
          <OptionRow
            icon="receipt-long"
            title={t("paymentHistory")}
            onPress={() => router.push("/payment-history" as any)}
          />
          <OptionRow
            icon="chat"
            title={t("whatsappSupport")}
            onPress={openWhatsAppSupport}
          />
          <OptionRow
            icon="help-outline"
            title={t("helpSupport")}
            onPress={() => router.push("/contact" as any)}
            isLast
          />
        </View>

        <View style={styles.dangerBox}>
          <TouchableOpacity style={styles.dangerRow} onPress={handleLogout}>
            <View style={styles.dangerIconWrap}>
              <MaterialIcons name="logout" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.dangerRowText}>{t("logout")}</Text>
            <MaterialIcons name="chevron-right" size={22} color="#ccc" />
          </TouchableOpacity>
          <View style={styles.dangerDivider} />
          <TouchableOpacity
            style={styles.dangerRow}
            onPress={() => setDeleteModalVisible(true)}
          >
            <View style={[styles.dangerIconWrap, styles.dangerIconRed]}>
              <MaterialIcons name="delete-forever" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.dangerRowText, { color: "#EF4444" }]}>
              {t("deleteAccount")}
            </Text>
            <MaterialIcons name="chevron-right" size={22} color="#ccc" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNav />

      <Modal
        animationType="slide"
        transparent
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("deleteAccountTitle")}</Text>
            <Text style={styles.modalDesc}>{t("deleteAccountMsg")}</Text>
            <TextInput
              style={styles.passInput}
              placeholder={t("enterPassword")}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setPassword("");
                }}
              >
                <Text style={styles.cancelBtnText}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.deleteBtnText}>{t("delete")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function OptionRow({
  icon,
  title,
  subtitle,
  onPress,
  isLast,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.optionRow, isLast && { borderBottomWidth: 0 }]}
      onPress={onPress}
    >
      <MaterialIcons name={icon as any} size={22} color={PRIMARY} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        {subtitle && <Text style={styles.optionSub}>{subtitle}</Text>}
      </View>
      <MaterialIcons name="chevron-right" size={22} color="#ccc" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  headerBar: {
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
  scroll: { paddingBottom: 100 },
  profileCard: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  avatarWrap: { position: "relative", marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    backgroundColor: "#f0eaf8",
    justifyContent: "center",
    alignItems: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  name: { fontSize: 22, fontWeight: "700", color: "#130e1b" },
  email: { fontSize: 14, color: "#777", marginTop: 4 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEE6F6",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 10,
  },
  badgeText: { marginLeft: 6, fontSize: 12, fontWeight: "600", color: PRIMARY },
  planCard: {
    backgroundColor: PRIMARY,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    padding: 16,
  },
  planRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  planIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  planLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  planTime: { fontSize: 16, fontWeight: "700", color: "#fff", marginTop: 2 },
  planSub: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  manageBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  manageBtnText: { fontSize: 13, fontWeight: "700", color: PRIMARY },
  optionsBox: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 4,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f3f3",
  },
  optionTitle: { fontSize: 15, fontWeight: "500", color: "#130e1b" },
  optionSub: { fontSize: 12, color: "#888", marginTop: 2 },
  dangerBox: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  dangerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  dangerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  dangerIconRed: { backgroundColor: "#FEE2E2" },
  dangerRowText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#130e1b" },
  dangerDivider: {
    height: 1,
    backgroundColor: "#f3f3f3",
    marginHorizontal: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    width: "100%",
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#130e1b",
    marginBottom: 12,
  },
  modalDesc: { fontSize: 14, color: "#666", lineHeight: 20, marginBottom: 20 },
  passInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 20,
  },
  modalBtns: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelBtnText: { color: "#666", fontWeight: "600", fontSize: 15 },
  deleteBtn: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
