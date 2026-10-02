import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// import COLORS from '@/constants/colors';
import { getUser, signup } from "@/src/api/api";
import { identifyOneSignalUser } from "@/src/utils/onesignal";
import { useLanguage } from "@/src/i18n/context";
import { useAuthStore } from "@/src/store/auth";
import { getPostLoginHref } from "@/src/store/cart";
import CountryPickerModal, {
  type Country,
} from "@/components/CountryPickerModal";
import COLORS from "@/constants/colors";

const PRIMARY = COLORS.primary;
const BG = COLORS.secondary;
const DEFAULT_DIAL_CODE = "+91";
const GOOGLE_MAPS_APIKEY = "AIzaSyADMQGvxws3rPSIn0cY0U50deogK-OTjw8";

const FALLBACK_COUNTRIES: Country[] = [
  { code: "+91", name: "India" },
  { code: "+1", name: "United States" },
];

function pickCountry(list: Country[], preferred = DEFAULT_DIAL_CODE): Country {
  return list.find((c) => c.code === preferred) || list[0];
}

export default function Signup() {
  const router = useRouter();
  const { t } = useLanguage();
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    pickCountry(FALLBACK_COUNTRIES),
  );
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countries, setCountries] = useState<Country[]>(FALLBACK_COUNTRIES);
  const [termLink, setTermLink] = useState("");
  const [privacyLink, setPrivacyLink] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [address, setAddress] = useState("");
  const [addressPredictions, setAddressPredictions] = useState<
    { description: string; place_id: string }[]
  >([]);
  const addressSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(["@countries", "@term_link", "@privacy_link"]).then(
      (pairs) => {
        const stored = Object.fromEntries(pairs.map(([k, v]) => [k, v]));

        if (stored["@term_link"]) setTermLink(stored["@term_link"]);
        if (stored["@privacy_link"]) setPrivacyLink(stored["@privacy_link"]);

        if (stored["@countries"]) {
          try {
            const raw: { name: string; code: string | number }[] = JSON.parse(
              stored["@countries"],
            );
            const mapped: Country[] = raw
              .filter((c) => c.name && c.code != null)
              .map((c) => {
                const dial = String(c.code).trim();
                return {
                  code: dial.startsWith("+") ? dial : `+${dial}`,
                  name: c.name,
                };
              });
            if (mapped.length) {
              setCountries(mapped);
              setSelectedCountry(pickCountry(mapped));
            }
          } catch { }
        }
      },
    );
  }, []);

  const searchAddress = (text: string) => {
    setAddress(text);
    if (errors.address) setErrors((p) => ({ ...p, address: null }));
    if (addressSearchTimer.current) clearTimeout(addressSearchTimer.current);
    if (!text.trim()) {
      setAddressPredictions([]);
      return;
    }
    addressSearchTimer.current = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text,
        )}&key=${GOOGLE_MAPS_APIKEY}&language=en&components=country:in`;
        const res = await fetch(url);
        const json = await res.json();
        const predictions = Array.isArray(json?.predictions)
          ? json.predictions.map((item: any) => ({
              description: String(item?.description ?? ""),
              place_id: String(item?.place_id ?? ""),
            }))
          : [];
        setAddressPredictions(predictions.filter((item) => item.description));
      } catch {
        setAddressPredictions([]);
      }
    }, 300);
  };

  const pickAddress = async (item: {
    description: string;
    place_id: string;
  }) => {
    setAddress(item.description);
    setAddressPredictions([]);
    if (errors.address) setErrors((p) => ({ ...p, address: null }));
    if (!item.place_id) return;
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        item.place_id,
      )}&key=${GOOGLE_MAPS_APIKEY}&fields=formatted_address`;
      const res = await fetch(url);
      const json = await res.json();
      const formatted = String(json?.result?.formatted_address ?? "").trim();
      if (formatted) setAddress(formatted);
    } catch {
      // Keep the autocomplete description.
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t("fullNameRequired");
    if (!email.trim()) newErrors.email = t("emailRequired");
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = t("validEmail");
    if (!phone.trim()) newErrors.phone = t("phoneRequired");
    else if (!/^\d{10,15}$/.test(phone.replace(/\s/g, "")))
      newErrors.phone = t("validPhone");
    if (!password.trim()) newErrors.password = t("passwordRequired");
    else if (password.length < 6) newErrors.password = t("atLeast6Chars");
    if (!agree) newErrors.terms = t("termsRequired");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const signupData: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        country: selectedCountry.code,
        password,
        ...(referralCode.trim() && { rcode: referralCode.trim() }),
      };

      console.log("[Signup] Sending data:", JSON.stringify(signupData));

      const response = await signup(signupData);

      console.log("[Signup] Raw response:", JSON.stringify(response));

      const data = response.data || response;

      console.log("[Signup] Parsed data:", JSON.stringify(data));

      if (data.msg === "done") {
        const codeSent = Number(data.codeSent);
        const userId = String(
          data.user?.id ?? data.user_id ?? data.userId ?? "",
        );

        if (codeSent === 3 || codeSent === 4) {
          identifyOneSignalUser(userId);
          router.push({
            pathname: "/otp" as any,
            params: {
              userId,
              codeSent: String(codeSent),
              phone: `${selectedCountry.code} ${phone}`,
              email,
            },
          });
        } else if (codeSent === 1) {
          const userToken = data.token ?? data.user?.token ?? "";
          identifyOneSignalUser(userId);

          if (userId && userToken) {
            await AsyncStorage.multiSet([
              ["user_token", userToken],
              ["user_id", String(userId)],
            ]);
          }

          let userName = data.user?.name ?? data.name ?? "";
          let userEmail = data.user?.email ?? data.email ?? "";
          let userPhone = data.user?.phone ?? data.phone ?? "";
          let userRcode = data.user?.rcode ?? data.rcode ?? "";

          if (userId) {
            try {
              const userRes = await getUser(String(userId));
              const user = userRes?.data ?? userRes;
              userName = user?.name ?? userName;
              userEmail = user?.email ?? userEmail;
              userPhone = user?.phone ?? userPhone;
              userRcode = user?.rcode ?? userRcode;
            } catch {}
          }

          await AsyncStorage.multiSet([
            ["user_token", userToken],
            ["user_id", String(userId ?? "")],
            ["user_name", userName],
            ["user_email", userEmail],
            ["user_phone", userPhone],
            ["user_rcode", userRcode],
          ]);

          setUser({
            id: String(userId ?? ""),
            name: userName,
            email: userEmail,
            phone: userPhone,
            rcode: userRcode,
            token: userToken,
          });
          router.replace((await getPostLoginHref()) as any);
        } else if (codeSent && codeSent !== 0) {
          identifyOneSignalUser(userId);

          router.push({
            pathname: "/otp" as any,
            params: {
              userId,
              codeSent: String(data.codeSent),
              phone: `${selectedCountry.code} ${phone}`,
              email,
            },
          });
        } else {
          Alert.alert(t("success"), t("accountCreated"), [
            { text: t("ok"), onPress: () => router.replace("/login" as any) },
          ]);
        }
      } else if (data.msg === "error") {
        console.log("[Signup] Server error:", data.error);
        Alert.alert(t("error"), data.error || t("signupFailed"));
      } else {
        console.log("[Signup] Unexpected response:", JSON.stringify(data));
        Alert.alert(t("error"), t("somethingWrong"));
      }
    } catch (err: any) {
      console.error(
        "[Signup] Catch error:",
        err?.response?.status,
        JSON.stringify(err?.response?.data),
        err?.message,
      );
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

  const openLink = (url: string, fallback: string) => {
    const target = url || fallback;
    if (target) Linking.openURL(target).catch(() => { });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{t("signUpTitle")}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <Text style={styles.heading}>{t("createAccount")}</Text>
        <Text style={styles.subHeading}>{t("joinPlatform")}</Text>

        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("fullName")}</Text>
          <TextInput
            placeholder="John Doe"
            placeholderTextColor="#9ca3af"
            style={[styles.input, errors.name && styles.inputError]}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors((p) => ({ ...p, name: null }));
            }}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("email")}</Text>
          <TextInput
            placeholder="john@example.com"
            placeholderTextColor="#9ca3af"
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

        {/* Phone */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("phoneNumber")}</Text>
          <View style={styles.phoneInputContainer}>
            <TouchableOpacity
              style={styles.dialPicker}
              onPress={() => setShowCountryPicker(true)}
            >
              <Text style={styles.dialText}>{selectedCountry.code}</Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={18}
                color="#9ca3af"
              />
            </TouchableOpacity>
            <TextInput
              placeholder="1234567890"
              placeholderTextColor="#9ca3af"
              style={[styles.phoneInput, errors.phone && styles.inputError]}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errors.phone) setErrors((p) => ({ ...p, phone: null }));
              }}
              keyboardType="phone-pad"
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>

        {/* Address */}
        {/* <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("address")}</Text>
          <TextInput
            placeholder="Search address"
            placeholderTextColor="#9ca3af"
            style={[styles.input, errors.address && styles.inputError]}
            value={address}
            onChangeText={searchAddress}
          />
          {addressPredictions.length > 0 && (
            <View style={styles.placesList}>
              {addressPredictions.map((item) => (
                <TouchableOpacity
                  key={item.place_id || item.description}
                  style={styles.placesRow}
                  onPress={() => pickAddress(item)}
                >
                  <Text style={styles.placesDescription}>{item.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {errors.address && (
            <Text style={styles.errorText}>{errors.address}</Text>
          )}
        </View> */}

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("password")}</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
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
                color="#9ca3af"
              />
            </TouchableOpacity>
          </View>
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}
        </View>

        {/* Referral */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("referralCode")}</Text>
          <TextInput
            placeholder="Enter referral code"
            placeholderTextColor="#9ca3af"
            style={styles.input}
            value={referralCode}
            onChangeText={setReferralCode}
          />
        </View>

        {/* Terms */}
        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => {
            setAgree(!agree);
            if (errors.terms) setErrors((p) => ({ ...p, terms: null }));
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, agree && styles.checkboxActive]}>
            {agree && <Text style={styles.check}>✓</Text>}
          </View>
          <Text style={styles.termsText}>
            I agree to the{" "}
            <Text
              style={styles.link}
              onPress={() =>
                openLink(termLink, "https://www.tiffinly.com/terms")
              }
            >
              Terms &amp; Conditions
            </Text>{" "}
            and{" "}
            <Text
              style={styles.link}
              onPress={() =>
                openLink(privacyLink, "https://www.tiffinly.com/privacy")
              }
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </TouchableOpacity>
        {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

        <TouchableOpacity
          style={[styles.signupBtn, loading && styles.signupBtnDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.signupText}>{t("signUpTitle")}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footer}>
          {t("alreadyAccount")}
          <Text
            style={styles.link}
            onPress={() => router.replace("/login" as any)}
          >
            {" "}
            {t("logIn")}
          </Text>
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>

      <CountryPickerModal
        visible={showCountryPicker}
        countries={countries}
        selectedCountry={selectedCountry}
        onSelect={setSelectedCountry}
        onClose={() => setShowCountryPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 8,
    backgroundColor: BG,
  },
  backBtn: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  subHeading: { fontSize: 16, color: "#6b7280", marginBottom: 28 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#1f2937", marginBottom: 6 },
  input: {
    height: 46,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  phoneInputContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  dialPicker: {
    height: 46,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dialText: { fontSize: 15, color: "#111827", fontWeight: "600" },
  phoneInput: {
    flex: 1,
    height: 46,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  passwordContainer: { position: "relative" },
  passwordInput: {
    height: 46,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingRight: 50,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  eyeIcon: { position: "absolute", right: 16, top: 13, padding: 5 },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#c7c7c7",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  check: { color: "#fff", fontSize: 14, fontWeight: "700" },
  termsText: { flex: 1, fontSize: 13, color: "#6b7280", lineHeight: 18 },
  link: { color: PRIMARY, fontWeight: "600" },
  signupBtn: {
    height: 48,
    backgroundColor: PRIMARY,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    elevation: 4,
  },
  signupBtnDisabled: { backgroundColor: "#9ca3af" },
  signupText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  inputError: { borderColor: "#ef4444", borderWidth: 1.5 },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 4, marginLeft: 4 },
  placesList: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    marginTop: 4,
    elevation: 8,
    zIndex: 30,
  },
  placesRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  placesDescription: { fontSize: 13, color: "#111827" },
  footer: {
    textAlign: "center",
    marginTop: 28,
    fontSize: 15,
    color: "#6b7280",
  },
});
