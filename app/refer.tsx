import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Clipboard } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

// import { getAccount } from '@/src/api/api';
import { Loader } from "@/components/service";
import COLORS from "@/constants/colors";
import { useLanguage } from "@/src/i18n/context";
import { getAccount } from "@/src/api/api";
import { useAuthStore } from "@/src/store/auth";

const PRIMARY = COLORS.primary;

function pickText(...values: any[]) {
  for (const value of values) {
    if (value == null || value === false) continue;
    const text = String(value).trim();
    if (text && text !== "undefined" && text !== "null") return text;
  }
  return "";
}

function getReferralPayload(res: any) {
  return res?.data && typeof res.data === "object" ? res.data : res || {};
}

export default function ReferScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const authUser = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [currency, setCurrency] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const userId = await AsyncStorage.getItem("user_id");
        if (!userId) {
          router.replace("/login" as any);
          return;
        }
        const storedRcode = await AsyncStorage.getItem("user_rcode");
        const res = await getAccount(userId);
        const payload = getReferralPayload(res);
        console.log(payload)
        const accountUser = payload?.user || {};
        const rcode = pickText(
          accountUser.rcode,
          accountUser.referral_code,
          accountUser.refer_code,
          accountUser.referralCode,
          payload?.rcode,
          payload?.referral_code,
          storedRcode,
          authUser?.rcode,
        );
        setUser({
          ...accountUser,
          rcode,
          who_refer: pickText(accountUser.who_refer, payload?.who_refer),
          who_use: pickText(accountUser.who_use, payload?.who_use),
        });
        setCurrency(pickText(payload?.currency, res?.currency));
        if (rcode) await AsyncStorage.setItem("user_rcode", rcode);
      } catch {
        const storedRcode = await AsyncStorage.getItem("user_rcode");
        if (storedRcode || authUser?.rcode) {
          setUser({
            rcode: pickText(storedRcode, authUser?.rcode),
          });
        } else {
          Alert.alert(t("error"), t("failedLoadReferral"));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCopy = async () => {
    if (!user?.rcode) {
      Alert.alert(t("error"), t("noReferralCode"));
      return;
    }
    try {
      Clipboard.setString(user.rcode);
      Alert.alert(t("codeCopied"), t("codeCopiedMsg"));
    } catch {
      Alert.alert(t("error"), t("failedCopy"));
    }
  };

  const handleShare = async () => {
    if (!user?.rcode) {
      Alert.alert(t("error"), t("noReferralCode"));
      return;
    }
    try {
      await Share.share({
        message: `Use my referral code: ${user.rcode} to get ${currency}${user.who_use || ""} off your first subscription! Download the app now.`,
      });
    } catch {
      Alert.alert(t("error"), t("failedShare"));
    }
  };

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("referEarn")}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <MaterialIcons name="card-giftcard" size={64} color="#fff" />
          <View style={styles.rewardBadge}>
            <MaterialIcons name="monetization-on" size={16} color="#F59E0B" />
            <Text style={styles.rewardText}>
              {currency}
              {user?.who_refer || ""} Credit
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{t("inviteFriends")}</Text>
        <Text style={styles.subtitle}>
          {t("referSubtitle")}{" "}
          <Text style={styles.highlight}>
            {currency}
            {user?.who_use || ""}
          </Text>{" "}
          {t("referSubtitle2")}{" "}
          <Text style={styles.highlight}>
            {currency}
            {user?.who_refer || ""}
          </Text>{" "}
          {t("referSubtitle3")}
        </Text>

        {/* Referral Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t("yourReferralCode")}</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText} selectable>
              {pickText(user?.rcode) || t("noReferralCode")}
            </Text>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
              <MaterialIcons name="content-copy" size={20} color={PRIMARY} />
              <Text style={styles.copyText}>{t("copy")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <MaterialIcons name="ios-share" size={20} color="#fff" />
              <Text style={styles.shareText}>{t("shareCode")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* How it works */}
        <Text style={styles.sectionTitle}>{t("howItWorks")}</Text>
        <View style={styles.stepsCard}>
          <Step
            icon="send"
            title={t("sendInvitation")}
            desc={t("sendInvitationDesc")}
          />
          <View style={styles.stepDivider} />
          <Step
            icon="person-add"
            title={t("theySubscribe")}
            desc={t("theySubscribeDesc")}
          />
          <View style={styles.stepDivider} />
          <Step
            icon="celebration"
            title={t("youGetRewarded")}
            desc={t("youGetRewardedDesc")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Step({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepIcon}>
        <MaterialIcons name={icon as any} size={22} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

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
  content: { padding: 16, paddingBottom: 40 },

  heroBanner: {
    height: 160,
    backgroundColor: PRIMARY,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    position: "relative",
  },
  rewardBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  rewardText: { fontWeight: "700", color: "#130e1b" },

  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 20,
    color: "#130e1b",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  highlight: { color: PRIMARY, fontWeight: "700" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginBottom: 10,
  },
  codeBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    minHeight: 52,
    justifyContent: "center",
    backgroundColor: PRIMARY + "10",
  },
  codeText: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: PRIMARY,
    letterSpacing: 1,
  },
  buttonRow: { flexDirection: "row", gap: 12 },
  copyBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: PRIMARY + "15",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 6,
  },
  copyText: { color: PRIMARY, fontWeight: "700" },
  shareBtn: {
    flex: 2,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 6,
  },
  shareText: { color: "#fff", fontWeight: "700" },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 32,
    marginBottom: 12,
    color: "#130e1b",
  },
  stepsCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16 },
  step: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY + "18",
    justifyContent: "center",
    alignItems: "center",
  },
  stepTitle: { fontWeight: "700", fontSize: 15, color: "#130e1b" },
  stepDesc: { fontSize: 13, color: "#666", marginTop: 2 },
  stepDivider: {
    height: 16,
    width: 2,
    backgroundColor: "#e0e0e0",
    marginLeft: 19,
    marginVertical: 6,
  },
});
