import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Image,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

// import { getPush } from '@/src/api/api';
import { Loader } from "@/components/service";
import COLORS from "@/constants/colors";
import { useLanguage } from "@/src/i18n/context";
import { getPush } from "@/src/api/api";

export default function NotificationScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    try {
      const res = await getPush();
      setNotifications(res?.data?.data ?? []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)" as any)
          }
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("notifications")}</Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <Loader />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="notifications-off" size={64} color="#ddd" />
          <Text style={styles.emptyText}>{t("noNotifications")}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id?.toString()}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.img ? (
                <Image
                  source={{ uri: item.img }}
                  style={styles.banner}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.contentRow}>
                {!item.img && (
                  <View style={styles.iconBox}>
                    <MaterialIcons
                      name="notifications"
                      size={22}
                      color={COLORS.primary}
                    />
                  </View>
                )}
                <View style={styles.textBox}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.description}>{item.text}</Text>
                  <Text style={styles.time}>{item.date}</Text>
                </View>
              </View>
            </View>
          )}
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
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  banner: { width: "100%", height: 140 },
  contentRow: { flexDirection: "row", padding: 14 },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#F1EBFA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  textBox: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700", color: "#130e1b" },
  description: { fontSize: 13, color: "#555", marginTop: 4, lineHeight: 19 },
  time: { fontSize: 11, color: "#999", marginTop: 6 },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.secondary,
  },
  emptyText: { fontSize: 15, color: "#aaa", fontWeight: "500" },
});
