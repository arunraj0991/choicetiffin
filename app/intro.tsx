import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/components/service";
import { useLanguage } from "@/src/i18n/context";
import { useAuthStore } from "@/src/store/auth";
import CountryPickerModal, {
  type Country,
} from "@/components/CountryPickerModal";
import { homepage, savePendingUser } from "@/src/api/api";
import COLORS from "@/constants/colors";

const DEFAULT_DIAL_CODE = "+91";

const FALLBACK_COUNTRIES: Country[] = [
  { code: "+91", name: "India" },
  { code: "+61", name: "Australia" },
  { code: "+1", name: "United States" },
];

function pickCountry(list: Country[], preferred = DEFAULT_DIAL_CODE): Country {
  return list.find((c) => c.code === preferred) || list[0];
}

function mapCountries(raw: any[]): Country[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c) => c?.name && c?.code != null)
    .map((c) => {
      const dial = String(c.code).trim();
      return {
        code: dial.startsWith("+") ? dial : `+${dial}`,
        name: c.name,
      };
    });
}

async function getLocation() {
  const stored = await AsyncStorage.getItem("@selected_location");
  if (stored) {
    const loc = JSON.parse(stored);
    return { lat: loc?.latitude ?? 28.6139, lng: loc?.longitude ?? 77.209 };
  }
  return { lat: 28.6139, lng: 77.209 };
}

export default function Intro() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ fromHome?: string }>();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [storeTypes, setStoreTypes] = useState<string[]>([]);
  const [diet, setDiet] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [introImg, setIntroImg] = useState("");
  const [countries, setCountries] = useState<Country[]>(FALLBACK_COUNTRIES);
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    pickCountry(FALLBACK_COUNTRIES),
  );
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const [
        introImage,
        storeType,
        savedName,
        savedFoodType,
        savedPhone,
        storedCountries,
      ] = await Promise.all([
        AsyncStorage.getItem("intro_img"),
        AsyncStorage.getItem("store_type"),
        AsyncStorage.getItem("user_name"),
        AsyncStorage.getItem("user_food_type"),
        AsyncStorage.getItem("user_phone"),
        AsyncStorage.getItem("@countries"),
      ]);

      if (introImage) setIntroImg(introImage);
      if (savedName) setName(savedName);
      if (user?.name) setName(user.name);
      if (savedPhone) setPhone(savedPhone.replace(/\D/g, ""));
      if (user?.phone) setPhone(String(user.phone).replace(/\D/g, ""));

      if (storeType) {
        const parsedTypes = JSON.parse(storeType);
        setStoreTypes(parsedTypes);
        setDiet(
          savedFoodType && parsedTypes.includes(savedFoodType)
            ? savedFoodType
            : parsedTypes[0],
        );
      }

      if (storedCountries) {
        try {
          const mapped = mapCountries(JSON.parse(storedCountries));
          if (mapped.length) {
            setCountries(mapped);
            setSelectedCountry(pickCountry(mapped));
          }
        } catch {}
      }

      const { lat, lng } = await getLocation();
      const userId = user?.id || (await AsyncStorage.getItem("user_id")) || "";
      const res = await homepage(lat, lng, userId);
      const d = res?.data;

      if (d?.country?.length) {
        await AsyncStorage.setItem("@countries", JSON.stringify(d.country));
        const mapped = mapCountries(d.country);
        if (mapped.length) {
          setCountries(mapped);
          setSelectedCountry(pickCountry(mapped));
        }
      }
      if (d?.term_link) await AsyncStorage.setItem("@term_link", d.term_link);
      if (d?.privacy_link)
        await AsyncStorage.setItem("@privacy_link", d.privacy_link);
    } catch (e) {
      console.log("Intro load error:", e);
    }
  };

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert(t("nameRequired"), t("pleaseEnterName"));
      return;
    }
    if (!phone.trim()) {
      setPhoneError(t("phoneRequired"));
      return;
    }
    if (!/^\d{10,15}$/.test(phone.replace(/\s/g, ""))) {
      setPhoneError(t("validPhone"));
      return;
    }

    setSubmitting(true);
    try {
      const phoneValue = phone.replace(/\s/g, "");
      const response = await savePendingUser({
        name: name.trim(),
        number: phoneValue,
        food_type: diet || "",
      });

      if (response?.msg === "error") {
        Alert.alert(t("error"), response?.error || t("failedSaveData"));
        return;
      }

      await AsyncStorage.setItem("user_name", name.trim());
      await AsyncStorage.setItem("user_food_type", diet || "");
      await AsyncStorage.setItem("user_phone", phoneValue);
      await AsyncStorage.setItem("user_country", selectedCountry.code);
      if (user) {
        setUser({
          ...user,
          name: name.trim() || user.name,
          phone: phoneValue,
        });
      }
      router.push(params.fromHome ? "/(tabs)" : "/location");
    } catch (e: any) {
      Alert.alert(
        t("error"),
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          t("failedSaveData"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <BackButton />
        {/* <TouchableOpacity onPress={() => router.push("/location")}>
          <Text style={styles.skip}>{t("skip")}</Text>
        </TouchableOpacity> */}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.imageWrapper}>
          <Image    source={require("@/assets/images/login1.png")}style={styles.heroImage} />
          <View style={styles.overlay} />
        </View>

        <View style={styles.center}>
          <Text style={styles.title}>{t("gettingToKnowYou")}</Text>
          <Text style={styles.subtitle}>{t("introSubtitle")}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t("whatCallYou")}</Text>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="person" size={22} color={COLORS.primary} />
            <TextInput
              style={styles.input}
              placeholder={t("enterYourName")}
              placeholderTextColor={COLORS.gray}
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        <View style={styles.section}>
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
                color={COLORS.gray}
              />
            </TouchableOpacity>
            <View
              style={[
                styles.phoneInputWrapper,
                phoneError ? styles.inputError : null,
              ]}
            >
              <MaterialIcons name="phone" size={20} color={COLORS.primary} />
              <TextInput
                style={styles.input}
                placeholder="1234567890"
                placeholderTextColor={COLORS.gray}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (phoneError) setPhoneError(null);
                }}
                keyboardType="phone-pad"
              />
            </View>
          </View>
          {phoneError ? (
            <Text style={styles.errorText}>{phoneError}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.label2}>{t("selectFoodPrefs")}</Text>
          <View style={styles.chips}>
            {storeTypes.map((type, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.chip, diet === type && styles.chipActive]}
                onPress={() => setDiet(type)}
              >
                <Text
                  style={[
                    styles.chipText,
                    diet === type && styles.chipTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.continueBtn, submitting && { opacity: 0.7 }]}
          onPress={handleContinue}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.continueText}>{t("continue")}</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>

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
  container: { flex: 1, backgroundColor: COLORS.secondary },

  header: {
    padding: 20,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  skip: { fontSize: 14, fontWeight: "600", color: COLORS.gray },

  scroll: { padding: 20, paddingBottom: 120 },

  imageWrapper: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },

  heroImage: { width: "100%", height: "100%" },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  center: { marginBottom: 25 },

  title: { fontSize: 28, fontWeight: "700", color: COLORS.text },

  subtitle: { fontSize: 15, color: COLORS.gray, marginTop: 8 },

  section: { marginBottom: 25 },

  label: { fontSize: 16, fontWeight: "600", marginBottom: 10 },

  label2: { fontSize: 18, fontWeight: "700", marginBottom: 12 },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 55,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },

  input: { flex: 1, fontSize: 16, color: COLORS.text },

  phoneInputContainer: { flexDirection: "row", alignItems: "center", gap: 8 },

  dialPicker: {
    height: 55,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  dialText: { fontSize: 15, color: COLORS.text, fontWeight: "600" },

  phoneInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 55,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },

  inputError: { borderColor: "#ef4444", borderWidth: 1.5 },

  errorText: { color: "#ef4444", fontSize: 12, marginTop: 6, marginLeft: 4 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },

  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  chipText: { fontSize: 14, color: COLORS.gray },

  chipTextActive: { color: "#fff", fontWeight: "600" },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    paddingTop: 12,
    backgroundColor: COLORS.secondary,
  },

  continueBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  continueText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
