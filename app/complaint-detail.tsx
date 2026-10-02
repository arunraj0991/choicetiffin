import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { getComplaints, resolveImageUrl } from "@/src/api/api";
import { useLanguage } from "@/src/i18n/context";

const PRIMARY = COLORS.primary;

function complaintStatusColor(status?: string) {
  const value = String(status || "").toLowerCase();
  if (value === "resolved" || value === "closed" || value === "done") {
    return "#16A34A";
  }
  if (value === "rejected") return "#EF4444";
  if (value === "progress" || value === "in_progress") return "#F59E0B";
  return PRIMARY;
}

function complaintStatusLabel(status?: string) {
  const value = String(status || "").trim();
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

function formatDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value || "";
}

export default function ComplaintDetailScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{
    id?: string;
    subject?: string;
    complaint?: string;
    image?: string;
    reply?: string;
    status?: string;
    created_at?: string;
  }>();

  const [item, setItem] = useState({
    id: firstParam(params.id),
    subject: firstParam(params.subject),
    complaint: firstParam(params.complaint),
    image: firstParam(params.image),
    reply: firstParam(params.reply),
    status: firstParam(params.status),
    created_at: firstParam(params.created_at),
  });

  useFocusEffect(
    useCallback(() => {
      const id = firstParam(params.id);
      if (!id) return;
      (async () => {
        try {
          const res = await getComplaints(1);
          const payload = res?.data ?? res;
          const list = Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];
          const match = list.find(
            (entry: any) => String(entry?.id ?? "") === String(id),
          );
          if (match) {
            setItem({
              id: String(match.id ?? id),
              subject: String(match.subject ?? ""),
              complaint: String(match.complaint ?? ""),
              image: String(match.image ?? ""),
              reply: String(match.reply ?? ""),
              status: String(match.status ?? ""),
              created_at: String(match.created_at ?? ""),
            });
          }
        } catch {}
      })();
    }, [params.id]),
  );

  const imageUri = resolveImageUrl(item.image, "complaints");
  const statusColor = complaintStatusColor(item.status);
  const reply = String(item.reply || "").trim();

  const handleEdit = () => {
    router.push({
      pathname: "/add-complaint",
      params: {
        complaint_id: item.id,
        subject: item.subject,
        complaint: item.complaint,
        image: item.image,
      },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("complaintTicket")}</Text>
        <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
          <MaterialIcons name="edit" size={16} color={PRIMARY} />
          <Text style={styles.editBtnText}>{t("edit")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.subject}>{item.subject}</Text>
            {item.status ? (
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: `${statusColor}18` },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {complaintStatusLabel(item.status)}
                </Text>
              </View>
            ) : null}
          </View>
          {item.created_at ? (
            <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
          ) : null}
          <Text style={styles.description}>{item.complaint}</Text>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.replyHeader}>
            <MaterialIcons name="support-agent" size={20} color={PRIMARY} />
            <Text style={styles.replyTitle}>{t("adminReply")}</Text>
          </View>
          {reply ? (
            <Text style={styles.replyText}>{reply}</Text>
          ) : (
            <Text style={styles.replyEmpty}>{t("noAdminReply")}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  headerBtn: {
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
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    height: 48,
  },
  editBtnText: { fontSize: 14, fontWeight: "700", color: PRIMARY },
  body: { flex: 1, backgroundColor: COLORS.secondary },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  subject: { flex: 1, fontSize: 18, fontWeight: "800", color: "#130e1b" },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  date: { fontSize: 12, color: "#999", marginTop: 8 },
  description: {
    fontSize: 14,
    color: "#444",
    lineHeight: 21,
    marginTop: 12,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginTop: 14,
    backgroundColor: "#f5f5f5",
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  replyTitle: { fontSize: 15, fontWeight: "800", color: "#130e1b" },
  replyText: { fontSize: 14, color: "#333", lineHeight: 21 },
  replyEmpty: { fontSize: 13, color: "#999", fontStyle: "italic" },
});
