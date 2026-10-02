import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

// import { forgotPassword } from '@/src/api/api';
import COLORS from "@/constants/colors";
import { useLanguage } from "@/src/i18n/context";
import { forgotPassword } from "@/src/api/api";

const PRIMARY = COLORS.primary;

export default function Forgot() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = t("emailRequired");
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = t("validEmail");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReset = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const response = await forgotPassword(email.trim().toLowerCase());
      const data = response.data || response;
      if (data.msg === "done") {
        router.push("/done" as any);
      } else {
        Alert.alert(t("error"), data.error || t("resetLinkFailed"));
      }
    } catch {
      Alert.alert(t("error"), t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <View style={styles.logoWrapper}>
          <View style={styles.logoBox}>
            <MaterialIcons name="lock" size={48} color={PRIMARY} />
          </View>
        </View>

        <Text style={styles.title}>{t("forgotTitle")}</Text>
        <Text style={styles.subtitle}>{t("forgotSubtitle")}</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("emailAddress")}</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="example@email.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors((p) => ({ ...p, email: null }));
            }}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t("sendResetLink")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F6F8" },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  header: { paddingVertical: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrapper: { alignItems: "center", marginVertical: 30 },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: "rgba(73,20,148,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 30,
  },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8, color: "#111827" },
  input: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111827",
  },
  inputError: { borderColor: "#ef4444", borderWidth: 1.5 },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 4, marginLeft: 4 },
  button: {
    height: 48,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: { backgroundColor: "#9ca3af" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
