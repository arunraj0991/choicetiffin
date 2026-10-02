import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Pressable,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";

// import { getUser, updateUser, updatePassword } from '@/src/api/api';
import { Loader } from "@/components/service";
import COLORS from "@/constants/colors";
import { useLanguage } from "@/src/i18n/context";
import { getUser, updatePassword, updateUser } from "@/src/api/api";
import CountryPickerModal, {
  type Country,
} from "@/components/CountryPickerModal";

const PRIMARY = COLORS.primary;

const COUNTRY_CODES: Country[] = [
  { code: "+1", name: "United States" },
  { code: "+91", name: "India" },
  { code: "+44", name: "United Kingdom" },
  { code: "+61", name: "Australia" },
];

export default function SettingScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"basic" | "password">("basic");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showImg, setShowImg] = useState("");
  const [localImg, setLocalImg] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [countryName, setCountryName] = useState("IN");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const userId = await AsyncStorage.getItem("user_id");
        if (!userId) {
          router.replace("/login" as any);
          return;
        }
        const data = await getUser(userId);
        const user = data.data;
        setName(user.name || "");
        setEmail(user.email || "");
        setPhone(user.phone || "");
        setShowImg(user.img || "");
        const found = COUNTRY_CODES.find((c) => c.code === user.country);
        if (found) {
          setCountryCode(found.code);
          setCountryName(found.name);
        }
      } catch {
        Alert.alert(t("error"), t("failedLoadUser"));
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      // Step 1: Check existing permission without prompting
      const { status: existingStatus } =
        await ImagePicker.getMediaLibraryPermissionsAsync();

      let finalStatus = existingStatus;

      // Step 2: Only request if not already determined
      if (existingStatus !== "granted") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        finalStatus = status;
      }

      // Step 3: If still not granted, show settings prompt
      if (finalStatus !== "granted") {
        Alert.alert(t("permissionRequired"), t("photoPermissionMsg"), [
          { text: t("cancel"), style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]);
        return;
      }

      // Step 4: Launch picker with stable MediaTypeOptions API
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setLocalImg(result.assets[0].uri);
      }
    } catch (e: any) {
      console.error("[pickImage] error:", e?.message ?? e);
      Alert.alert(
        t("error"),
        "Could not open photo library. Please try again.",
      );
    }
  };

  const validateBasic = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t("fullNameRequired");
    if (!email.trim()) errs.email = t("emailRequired");
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = t("validEmail");
    if (!phone.trim()) errs.phone = t("phoneRequired");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validatePassword = () => {
    const errs: Record<string, string> = {};
    if (!password.trim()) errs.password = t("passwordRequired");
    else if (password.length < 6) errs.password = t("atLeast6Chars");
    if (!confirmPassword.trim())
      errs.confirmPassword = t("confirmPasswordRequired");
    else if (password !== confirmPassword)
      errs.confirmPassword = t("passwordsNoMatch");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveBasic = async () => {
    if (!validateBasic()) return;
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        Alert.alert(t("error"), t("pleaseLogin"));
        return;
      }
      await updateUser({
        user_id: userId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        country: countryCode,
      });
      await AsyncStorage.setItem("user_name", name.trim());
      Alert.alert(t("success"), t("profileUpdated"));
    } catch {
      Alert.alert(t("error"), t("failedUpdateProfile"));
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassword = async () => {
    if (!validatePassword()) return;
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        Alert.alert(t("error"), t("pleaseLogin"));
        return;
      }
      await updatePassword(userId, password.trim());
      Alert.alert(t("success"), t("passwordUpdated"));
      setPassword("");
      setConfirmPassword("");
    } catch {
      Alert.alert(t("error"), t("failedUpdatePassword"));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <Loader />;

  const displayImg = localImg || showImg;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("accountSettings")}</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.body}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {displayImg ? (
              <Image source={{ uri: displayImg }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialIcons name="person" size={40} color={PRIMARY} />
              </View>
            )}
            <TouchableOpacity style={styles.editBadge} onPress={pickImage}>
              <MaterialIcons name="camera-alt" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={pickImage}>
            <Text style={styles.changePhotoText}>{t("changePhoto")}</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsWrap}>
          <View style={styles.tabs}>
            {(["basic", "password"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => {
                  setActiveTab(tab);
                  setErrors({});
                }}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab === "basic" ? t("basicInfo") : t("passwordSection")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Info Tab */}
          {activeTab === "basic" && (
            <>
              <Field label={t("fullNameLabel")} error={errors.name}>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  value={name}
                  onChangeText={setName}
                  placeholder={t("yourFullName")}
                  placeholderTextColor="#999"
                />
              </Field>

              <Field label={t("emailAddress2")} error={errors.email}>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t("yourEmail")}
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </Field>

              <Field label={t("phoneNumberLabel")} error={errors.phone}>
                <View style={styles.phoneRow}>
                  <TouchableOpacity
                    style={styles.countryBtn}
                    onPress={() => setShowCountryPicker(true)}
                  >
                    <Text style={styles.countryText}>{countryCode}</Text>
                    <MaterialIcons
                      name="arrow-drop-down"
                      size={20}
                      color="#555"
                    />
                  </TouchableOpacity>
                  <TextInput
                    style={[
                      styles.phoneInput,
                      errors.phone && styles.inputError,
                    ]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder={t("phoneNumberPlaceholder")}
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                  />
                </View>
              </Field>

              <TouchableOpacity
                style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                onPress={handleSaveBasic}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{t("saveChanges")}</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Password Tab */}
          {activeTab === "password" && (
            <>
              <Field label={t("newPassword")} error={errors.password}>
                <View
                  style={[styles.passRow, errors.password && styles.inputError]}
                >
                  <TextInput
                    style={styles.passInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t("enterNewPassword")}
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword((p) => !p)}
                  >
                    <MaterialIcons
                      name={showPassword ? "visibility" : "visibility-off"}
                      size={20}
                      color="#999"
                    />
                  </TouchableOpacity>
                </View>
              </Field>

              <Field
                label={t("confirmPassword")}
                error={errors.confirmPassword}
              >
                <View
                  style={[
                    styles.passRow,
                    errors.confirmPassword && styles.inputError,
                  ]}
                >
                  <TextInput
                    style={styles.passInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={t("confirmNewPassword")}
                    placeholderTextColor="#999"
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowConfirmPassword((p) => !p)}
                  >
                    <MaterialIcons
                      name={
                        showConfirmPassword ? "visibility" : "visibility-off"
                      }
                      size={20}
                      color="#999"
                    />
                  </TouchableOpacity>
                </View>
              </Field>

              <TouchableOpacity
                style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                onPress={handleSavePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{t("updatePassword")}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>

      <CountryPickerModal
        visible={showCountryPicker}
        countries={COUNTRY_CODES}
        selectedCountry={{ code: countryCode, name: countryName }}
        onSelect={(country) => {
          setCountryCode(country.code);
          setCountryName(country.name);
        }}
        onClose={() => setShowCountryPicker(false)}
      />
    </SafeAreaView>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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

  avatarSection: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#fff",
  },
  avatarWrap: { position: "relative", marginBottom: 8 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    backgroundColor: "#EEE6F6",
    justifyContent: "center",
    alignItems: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  changePhotoText: { fontSize: 13, fontWeight: "600", color: PRIMARY },

  tabsWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 4,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8 },
  activeTab: { backgroundColor: PRIMARY },
  tabText: { fontWeight: "600", color: "#777" },
  activeTabText: { color: "#fff" },

  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
    color: "#130e1b",
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  inputError: { borderColor: "#EF4444" },
  errorText: { color: "#EF4444", fontSize: 12, marginTop: 4, marginLeft: 4 },

  phoneRow: { flexDirection: "row", gap: 10 },
  countryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    gap: 4,
  },
  countryText: { fontWeight: "600", color: "#130e1b", fontSize: 14 },
  phoneInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
    color: "#130e1b",
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },

  passRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  passInput: {
    flex: 1,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
    color: "#130e1b",
  },
  eyeBtn: { paddingHorizontal: 14 },

  saveBtn: {
    marginTop: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
