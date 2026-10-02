import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { Loader } from "@/components/service";
import { useLanguage } from "@/src/i18n/context";
import { welcome } from "@/src/api/api";

const PRIMARY = COLORS.primary;

export default function Welcome() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [welcomeData, setWelcomeData] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchWelcomeData();
  }, []);

  const fetchWelcomeData = async () => {
    try {
      setLoading(true);
      const res = await welcome();
      setWelcomeData(res?.data || null);
      setError(false);
    } catch (e) {
      console.error("Welcome API error:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const saveDataAndNavigate = async () => {
    try {
      if (welcomeData?.intro_img) {
        await AsyncStorage.setItem("intro_img", welcomeData.intro_img);
      }
      if (welcomeData?.store_type) {
        await AsyncStorage.setItem(
          "store_type",
          JSON.stringify(welcomeData.store_type),
        );
      }
    } catch (e) {
      console.error("AsyncStorage error:", e);
    } finally {
      router.push("/intro");
    }
  };

  if (loading) {
    return <Loader text="Loading..." />;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <StatusBar style="dark" />
        <MaterialIcons name="error-outline" size={40} color={COLORS.danger} />
        <Text style={styles.errorText}>{t("failedLoadData")}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchWelcomeData}>
          <Text style={styles.retryText}>{t("retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />

      <ImageBackground source={{ uri: welcomeData?.bg_img }} style={styles.bg}>
        <View style={styles.overlay} />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <MaterialIcons name="lunch-dining" size={20} color="#fff" />
            </View>
            <Text style={styles.logoText}>{welcomeData?.app_name}</Text>
          </View>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={saveDataAndNavigate}
          >
            <Text style={styles.skipText}>{t("skip")}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }} />

        {/* Bottom Card */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.card}>
            <View style={styles.indicators}>
              <View style={styles.indicatorActive} />
              <View style={styles.indicator} />
              <View style={styles.indicator} />
            </View>

            <Text style={styles.title}>
              {welcomeData?.first_heading}{" "}
              <Text style={{ color: PRIMARY }}>
                {welcomeData?.second_heading}
              </Text>
            </Text>

            <Text style={styles.subtitle}>{welcomeData?.welcome_desc}</Text>

            <View style={styles.previewRow}>
              {[welcomeData?.img_1, welcomeData?.img_2, welcomeData?.img_3].map(
                (img, index) => (
                  <Image
                    key={index}
                    source={{ uri: img }}
                    style={[
                      styles.previewImg,
                      index === 1 && styles.previewMain,
                    ]}
                  />
                ),
              )}
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={saveDataAndNavigate}
            >
              <Text style={styles.primaryText}>{t("getStarted")}</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.footerText}>{welcomeData?.footer_text}</Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  errorText: { marginTop: 10, fontSize: 16, color: COLORS.danger },

  retryBtn: {
    marginTop: 15,
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },

  retryText: { color: "#fff", fontWeight: "600" },

  bg: { flex: 1 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  logoRow: { flexDirection: "row", alignItems: "center" },

  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  logoText: { color: "#fff", fontSize: 18, fontWeight: "700" },

  skipBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },

  skipText: { color: "#fff", fontWeight: "600" },

  bottom: { padding: 10 },

  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },

  indicators: { flexDirection: "row", marginBottom: 20 },

  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(74,21,148,0.3)",
    marginHorizontal: 4,
  },

  indicatorActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
    marginHorizontal: 4,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
    color: "#333",
  },

  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginBottom: 20,
  },

  previewRow: { flexDirection: "row", marginBottom: 20 },

  previewImg: {
    width: 60,
    height: 60,
    borderRadius: 15,
    marginHorizontal: 8,
  },

  previewMain: { width: 80, height: 80 },

  primaryBtn: {
    width: "100%",
    backgroundColor: PRIMARY,
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  footerText: {
    marginTop: 10,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
