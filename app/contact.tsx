import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

// import { getAccount, contact } from "@/src/api/api";
import { Loader } from "@/components/service";
import COLORS from "@/constants/colors";
import { useLanguage } from "@/src/i18n/context";
import { contact, getAccount } from "@/src/api/api";

const PRIMARY = COLORS.primary;

export default function ContactScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [pageLoading, setPageLoading] = useState(true);
  const [faq, setFaq] = useState<any[]>([]);
  const [social, setSocial] = useState<any>({});
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", msg: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const userId = await AsyncStorage.getItem("user_id");
        if (userId) {
          const res = await getAccount(userId);
          setFaq(res.data?.faq || []);
          setSocial(res.data?.social || {});
          setFormData((prev) => ({
            ...prev,
            name: res.data?.user?.name || "",
            email: res.data?.user?.email || "",
          }));
        }
      } catch {
      } finally {
        setPageLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = t("nameRequired2");
    if (!formData.email.trim()) errs.email = t("emailRequired2");
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      errs.email = t("emailInvalid");
    if (!formData.msg.trim()) errs.msg = t("messageRequired");
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const response = await contact({
        name: formData.name.trim(),
        email: formData.email.trim(),
        msg: formData.msg.trim(),
      });
      if (response.msg === "done") {
        Alert.alert(t("thankYouMessage"), t("contactSuccess"));
        setFormData((prev) => ({ ...prev, msg: "" }));
        setErrors({});
      } else {
        Alert.alert(t("error"), response.message || t("failedSendMessage"));
      }
    } catch {
      Alert.alert(t("error"), t("failedSendMessage"));
    } finally {
      setSubmitting(false);
    }
  };

  const socialItems = [
    { key: "w", icon: "chat", label: "WhatsApp", url: social?.w },
    { key: "fb", icon: "public", label: "Facebook", url: social?.fb },
    {
      key: "insta",
      icon: "photo-camera",
      label: "Instagram",
      url: social?.insta,
    },
    { key: "x", icon: "share", label: "X (Twitter)", url: social?.x },
  ].filter((item) => item.url);

  if (pageLoading) return <Loader />;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("helpAndSupport")}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>{t("howCanWeHelp")}</Text>

        {/* FAQ */}
        {faq.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t("frequentlyAsked")}</Text>
            {faq.map((item: any, index: number) => (
              <View key={index} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() =>
                    setExpandedIndex(expandedIndex === index ? null : index)
                  }
                >
                  <Text style={styles.faqText}>{item.question}</Text>
                  <View
                    style={{
                      transform: [
                        { rotate: expandedIndex === index ? "90deg" : "0deg" },
                      ],
                    }}
                  >
                    <MaterialIcons
                      name="chevron-right"
                      size={24}
                      color="#999"
                    />
                  </View>
                </TouchableOpacity>
                {expandedIndex === index && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{item.answer}</Text>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* Contact Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("stillNeedHelp")}</Text>
          <Text style={styles.cardSubTitle}>{t("contactSubtitle")}</Text>

          <TextInput
            placeholder={t("yourName")}
            placeholderTextColor="#999"
            style={[styles.input, errors.name && styles.inputError]}
            value={formData.name}
            onChangeText={(v) => setFormData((p) => ({ ...p, name: v }))}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <TextInput
            placeholder={t("yourEmail")}
            placeholderTextColor="#999"
            style={[styles.input, errors.email && styles.inputError]}
            value={formData.email}
            onChangeText={(v) => setFormData((p) => ({ ...p, email: v }))}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <TextInput
            placeholder={t("yourMessage")}
            placeholderTextColor="#999"
            style={[
              styles.input,
              styles.textArea,
              errors.msg && styles.inputError,
            ]}
            value={formData.msg}
            onChangeText={(v) => setFormData((p) => ({ ...p, msg: v }))}
            multiline
          />
          {errors.msg && <Text style={styles.errorText}>{errors.msg}</Text>}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>{t("sendMessage")}</Text>
                <MaterialIcons name="send" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Social Links */}
        {socialItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t("connectWithUs")}</Text>
            <View style={styles.socialRow}>
              {socialItems.slice(0, 2).map((item) => (
                <SocialButton
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  onPress={() => Linking.openURL(item.url!)}
                />
              ))}
            </View>
            {socialItems.length > 2 && (
              <View style={styles.socialRow}>
                {socialItems.slice(2, 4).map((item) => (
                  <SocialButton
                    key={item.key}
                    icon={item.icon}
                    label={item.label}
                    onPress={() => Linking.openURL(item.url!)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SocialButton({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.socialBtn} onPress={onPress}>
      <MaterialIcons name={icon as any} size={22} color={COLORS.primary} />
      <Text style={styles.socialText}>{label}</Text>
    </TouchableOpacity>
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

  heading: { fontSize: 28, fontWeight: "800", color: "#111", marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111",
    marginTop: 20,
  },

  faqItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  faqText: { fontSize: 15, fontWeight: "500", color: "#333", flex: 1 },
  faqAnswer: { paddingHorizontal: 16, paddingBottom: 16 },
  faqAnswerText: { fontSize: 14, color: "#666", lineHeight: 20 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    color: "#130e1b",
  },
  cardSubTitle: { fontSize: 13, color: "#777", marginBottom: 16 },
  input: {
    backgroundColor: "#F2F2F2",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
    color: "#000",
  },
  inputError: { borderColor: "#EF4444", borderWidth: 1 },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  submitBtn: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  socialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 30,
    marginHorizontal: 6,
  },
  socialText: { fontSize: 14, fontWeight: "600", color: "#333" },
});
