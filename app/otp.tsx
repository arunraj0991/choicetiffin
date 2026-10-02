import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";

// import { resendCode, verifyOtp } from '@/src/api/api';
import { useLanguage } from "@/src/i18n/context";
import { resendCode, verifyOtp } from "@/src/api/api";
import { identifyOneSignalUser } from "@/src/utils/onesignal";
import { getPostLoginHref } from "@/src/store/cart";

const PRIMARY = "#4A1594";
const BG_LIGHT = "#f7f6f8";

export default function Otp() {
  const router = useRouter();
  const { t } = useLanguage();
  const { userId, codeSent, phone, email } = useLocalSearchParams<{
    userId: string;
    codeSent: string;
    phone: string;
    email: string;
  }>();

  const inputs = useRef<Array<TextInput | null>>([]);
  const [otpValues, setOtpValues] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0 && !canResend) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer, canResend]);

  const handleChange = (text: string, index: number) => {
    const next = [...otpValues];
    next[index] = text;
    setOtpValues(next);
    if (text && index < 3) inputs.current[index + 1]?.focus();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleResendCode = async () => {
    if (!canResend || resending) return;
    setResending(true);
    try {
      const response = await resendCode(userId!);
      if (response.data?.user) {
        setTimer(30);
        setCanResend(false);
        Alert.alert(t("success"), t("codeSentSuccess"));
      } else {
        Alert.alert(t("error"), t("resendFailed"));
      }
    } catch {
      Alert.alert(t("error"), t("networkError"));
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValues.every((v) => v.length === 1)) {
      Alert.alert(t("error"), t("enterCompleteCode"));
      return;
    }
    setVerifying(true);
    try {
      const response = await verifyOtp(
        userId!,
        otpValues[0],
        otpValues[1],
        otpValues[2],
        otpValues[3],
      );
      const data = response.data;
      if (data?.msg === "done") {
        identifyOneSignalUser(data.user.id);
        await AsyncStorage.multiSet([
          ["user_token", data.token],
          ["user_id", data.user.id.toString()],
          ["user_name", data.user.name],
          ["user_email", data.user.email],
          ["user_phone", data.user.phone],
          ["user_rcode", data.user.rcode || ""],
        ]);
        Alert.alert(t("success"), t("accountCreatedSuccess"), [
          {
            text: t("ok"),
            onPress: async () => {
              router.replace((await getPostLoginHref()) as any);
            },
          },
        ]);
      } else if (data?.msg === "error") {
        Alert.alert(t("error"), data.error || t("invalidCode"));
      } else {
        Alert.alert(t("error"), t("verifyFailed"));
      }
    } catch {
      Alert.alert(t("error"), t("networkError"));
    } finally {
      setVerifying(false);
    }
  };

  const codeSentNum = Number(codeSent);
  const isEmail = codeSentNum === 4;
  const icon = isEmail ? "📧" : "📱";
  const contact = isEmail ? email : phone;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>

        <View style={styles.iconWrapper}>
          <View style={styles.iconBg}>
            <Text style={styles.lockIcon}>{icon}</Text>
          </View>
        </View>

        <Text style={styles.title}>
          {isEmail ? t("verifyEmail") : t("verifyMobile")}
        </Text>
        <Text style={styles.subtitle}>
          {t("otpSentTo") + "\n"}
          <Text style={styles.contact}>{contact}</Text>
        </Text>

        <View style={styles.otpRow}>
          {[0, 1, 2, 3].map((_, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputs.current[index] = ref;
              }}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={1}
              value={otpValues[index]}
              onChangeText={(text) => handleChange(text, index)}
              autoFocus={index === 0}
            />
          ))}
        </View>

        {!canResend ? (
          <Text style={styles.timer}>
            {t("resendCodeIn")}{" "}
            <Text style={styles.timerBold}>{formatTime(timer)}</Text>
          </Text>
        ) : (
          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendCode}
            disabled={resending}
          >
            {resending ? (
              <ActivityIndicator size="small" color={PRIMARY} />
            ) : (
              <Text style={styles.resendText}>{t("resendCode")}</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.verifyBtn, verifying && styles.verifyBtnDisabled]}
          onPress={handleVerifyOtp}
          disabled={verifying}
        >
          {verifying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.verifyText}>{t("verify")}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG_LIGHT },
  container: { flex: 1, paddingHorizontal: 50, backgroundColor: BG_LIGHT },
  backBtn: {
    height: 40,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapper: { alignItems: "center", marginTop: 40, marginBottom: 30 },
  iconBg: {
    height: 80,
    width: 80,
    borderRadius: 40,
    backgroundColor: "rgba(74,21,147,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  lockIcon: { fontSize: 36 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    color: "#130e1b",
    marginBottom: 10,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 16,
    color: "#6b7280",
    lineHeight: 24,
  },
  contact: { color: PRIMARY, fontWeight: "600", fontSize: 13 },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
    marginBottom: 30,
  },
  otpInput: {
    height: 54,
    width: 46,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
  },
  timer: { textAlign: "center", fontSize: 14, color: "#6b7280" },
  timerBold: { color: PRIMARY, fontWeight: "700" },
  resendButton: {
    alignSelf: "center",
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  resendText: { color: PRIMARY, fontSize: 14, fontWeight: "600" },
  verifyBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    elevation: 5,
    marginTop: 40,
  },
  verifyBtnDisabled: { backgroundColor: "#9ca3af" },
  verifyText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
