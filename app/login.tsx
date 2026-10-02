import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// import COLORS from '@/constants/colors';
import { login } from "@/src/api/api";
import { identifyOneSignalUser } from "@/src/utils/onesignal";
import { useLanguage } from "@/src/i18n/context";
import { useAuthStore } from "@/src/store/auth";
import { getPostLoginHref } from "@/src/store/cart";
import COLORS from "@/constants/colors";

const PRIMARY = COLORS.primary;

export default function Login() {
  const router = useRouter();
  const { t } = useLanguage();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = t("emailRequired");
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = t("validEmail");
    if (!password.trim()) newErrors.password = t("passwordRequired");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      // ── REQUEST ──────────────────────────────────────
      const requestPayload = {
        email: email.trim().toLowerCase(),
        password,
      };
      console.log("━━━━━━━━━━ [Login] REQUEST ━━━━━━━━━━");
      console.log("URL   :", "POST https://choicetiffinservices.com/api/login");
      console.log("Body  :", JSON.stringify(requestPayload, null, 2));

      const response = await login(
        requestPayload.email,
        requestPayload.password,
      );

      // ── RESPONSE ─────────────────────────────────────
      const data = response.data || response;
      console.log("━━━━━━━━━━ [Login] RESPONSE ━━━━━━━━━━");
      console.log("Full  :", JSON.stringify(response, null, 2));
      console.log("Data  :", JSON.stringify(data, null, 2));

      if (data.msg === "done") {
        const userId = data.user?.id ?? data.user_id;
        const userName = data.user?.name ?? data.name ?? "";
        const userEmail = data.user?.email ?? data.email ?? "";
        const userPhone = data.user?.phone ?? data.phone ?? "";
        const userRcode = data.user?.rcode ?? data.rcode ?? "";
        const userToken = data.token ?? data.user?.token ?? "";

        console.log("━━━━━━━━━━ [Login] PARSED ━━━━━━━━━━");
        console.log("userId :", userId);
        console.log("name   :", userName);
        console.log("email  :", userEmail);
        console.log("token  :", userToken);

        identifyOneSignalUser(userId);

        setUser({
          id: String(userId ?? ""),
          name: userName,
          email: userEmail,
          phone: userPhone,
          rcode: userRcode,
          token: userToken,
        });

        await AsyncStorage.multiSet([
          ["user_token", userToken],
          ["user_id", String(userId)],
          ["user_name", userName],
          ["user_email", userEmail],
          ["user_phone", userPhone],
          ["user_rcode", userRcode],
        ]);

        router.replace((await getPostLoginHref()) as any);
      } else {
        console.log("━━━━━━━━━━ [Login] FAILED ━━━━━━━━━━");
        console.log("msg   :", data.msg);
        console.log("error :", data.error);
        Alert.alert(t("error"), data.error || t("loginFailed"));
      }
    } catch (err: any) {
      console.log("━━━━━━━━━━ [Login] CATCH ERROR ━━━━━━━━━━");
      console.log("status  :", err?.response?.status);
      console.log("response:", JSON.stringify(err?.response?.data, null, 2));
      console.log("message :", err?.message);
      Alert.alert(
        t("error"),
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          t("networkError"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.imageWrapper}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Image
          source={require("@/assets/images/login.jpg")}
          style={styles.image}
        />
        <View style={styles.overlay} />
        <View style={styles.brand}>
          <View style={styles.brandTitleWrapper}>
            <Text style={styles.brandTitle}>Choice Tiffin Services</Text>
          </View>
          <Text style={styles.brandSubtitle}>{t("appTagline")}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>{t("welcomeBack")}</Text>
        <Text style={styles.subHeading}>{t("loginSubtitle")}</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("email")}</Text>
          <TextInput
            placeholder="user@example.com"
            placeholderTextColor="#94a3b8"
            style={[styles.input, errors.email && styles.inputError]}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors((p) => ({ ...p, email: null }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("password")}</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              style={[
                styles.passwordInput,
                errors.password && styles.inputError,
              ]}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password)
                  setErrors((p) => ({ ...p, password: null }));
              }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <MaterialIcons
                name={showPassword ? "visibility" : "visibility-off"}
                size={20}
                color="#94a3b8"
              />
            </TouchableOpacity>
          </View>
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.forgotWrapper}
          onPress={() => router.push("/forgot" as any)}
        >
          <Text style={styles.forgot}>{t("forgotPassword")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.loginText}>{t("logIn")}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>{t("noAccount")}</Text>
          <TouchableOpacity onPress={() => router.push("/signup" as any)}>
            <Text style={styles.signup}>{t("signUp")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  imageWrapper: { height: "38%", position: "relative" },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  image: { width: "100%", height: "100%" },
  image1: { width: "15%", height: "80%",marginRight: 3, },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  brand: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 30,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  brandTitleWrapper: { alignItems: "center" },
  brandIcon: { marginRight: 8 },
  brandTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  brandSubtitle: {
    color: "#e5e7eb",
    marginTop: 4,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: -24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  heading: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
  subHeading: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 6,
    marginBottom: 28,
  },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: "700", color: "#334155", marginBottom: 6 },
  input: {
    height: 50,
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#0f172a",
  },
  passwordContainer: { position: "relative" },
  passwordInput: {
    height: 50,
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingRight: 50,
    fontSize: 14,
    color: "#0f172a",
  },
  eyeIcon: { position: "absolute", right: 16, top: 15, padding: 5 },
  forgotWrapper: { alignItems: "flex-end", marginBottom: 24 },
  forgot: { fontSize: 12, color: PRIMARY, fontWeight: "600" },
  loginBtn: {
    height: 48,
    backgroundColor: PRIMARY,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  loginBtnDisabled: { backgroundColor: "#9ca3af" },
  loginText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  inputError: { borderColor: "#ef4444", borderWidth: 1.5 },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 4, marginLeft: 4 },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: { textAlign: "center", fontSize: 14, color: "#64748b" },
  signup: { color: PRIMARY, fontWeight: "700" },
});
