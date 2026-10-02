import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Loader } from "@/components/service";
import COLORS from "@/constants/colors";
import { getComplaints, resolveImageUrl } from "@/src/api/api";
import { useLanguage } from "@/src/i18n/context";

const PRIMARY = COLORS.primary;

function formatComplaintDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

export default function ComplaintsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const loadComplaints = useCallback(
    async (nextPage = 1, replace = true) => {
      try {
        const res = await getComplaints(nextPage);
        const payload = res?.data ?? res;
        const list = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];
        setComplaints((prev) => (replace ? list : [...prev, ...list]));
        setPage(Number(payload?.current_page || nextPage));
        setLastPage(Number(payload?.last_page || 1));
      } catch {
        if (replace) {
          Alert.alert(t("error"), t("failedLoadComplaints"));
          setComplaints([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      loadComplaints(1, true);
    }, [loadComplaints]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadComplaints(1, true);
  };

  const onEndReached = () => {
    if (loadingMore || loading || page >= lastPage) return;
    setLoadingMore(true);
    loadComplaints(page + 1, false);
  };

  const openDetail = (item: any) => {
    router.push({
      pathname: "/complaint-detail",
      params: {
        id: String(item?.id ?? ""),
        subject: String(item?.subject ?? ""),
        complaint: String(item?.complaint ?? ""),
        image: String(item?.image ?? ""),
        reply: String(item?.reply ?? ""),
        status: String(item?.status ?? ""),
        created_at: String(item?.created_at ?? ""),
      },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("complaintTicket")}</Text>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.push("/add-complaint" as any)}
        >
          <MaterialIcons name="add" size={26} color={PRIMARY} />
        </Pressable>
      </View>

      {loading ? (
        <Loader />
      ) : complaints.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="confirmation-number" size={64} color="#ddd" />
          <Text style={styles.emptyText}>{t("noComplaints")}</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/add-complaint" as any)}
          >
            <Text style={styles.emptyBtnText}>{t("addComplaint")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={complaints}
          keyExtractor={(item, index) => String(item?.id ?? index)}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[PRIMARY]}
              tintColor={PRIMARY}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={PRIMARY}
                style={{ marginVertical: 12 }}
              />
            ) : null
          }
          renderItem={({ item }) => {
            const imageUri = resolveImageUrl(item?.image, "complaints");
            const statusColor = complaintStatusColor(item?.status);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => openDetail(item)}
                activeOpacity={0.85}
              >
                <View style={styles.cardTop}>
                  <View style={styles.iconBox}>
                    <MaterialIcons
                      name="confirmation-number"
                      size={22}
                      color={PRIMARY}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={1}>
                      {item?.subject || t("complaintTicket")}
                    </Text>
                    <Text style={styles.description} numberOfLines={2}>
                      {item?.complaint || ""}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color="#ccc" />
                </View>
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={styles.metaRow}>
                  <View
                    style={[
                      styles.statusChip,
                      { backgroundColor: `${statusColor}18` },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {complaintStatusLabel(item?.status)}
                    </Text>
                  </View>
                  <Text style={styles.time}>
                    {formatComplaintDate(item?.created_at)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
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
  list: { flex: 1, backgroundColor: COLORS.secondary },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start" },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#F1EBFA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  title: { fontSize: 15, fontWeight: "700", color: "#130e1b" },
  description: { fontSize: 13, color: "#555", marginTop: 4, lineHeight: 19 },
  thumb: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    marginTop: 12,
    backgroundColor: "#f5f5f5",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  time: { fontSize: 12, color: "#999" },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 32,
  },
  emptyText: { fontSize: 15, color: "#aaa", fontWeight: "500" },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: PRIMARY,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700" },
});
