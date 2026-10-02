import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "@/constants/colors";

const CHEF_DATA = [
  {
    id: "1",
    name: "Sharma Tiffin House",
    specialty: "Authentic North Indian thalis & parathas",
    rating: "4.8",
    image:
      "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300",
  },
  {
    id: "2",
    name: "Green Leaf Kitchen",
    specialty: "Healthy salads & diet meals",
    rating: "4.9",
    image:
      "https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=300",
  },
  {
    id: "3",
    name: "Nawab Foods",
    specialty: "Mughlai biryanis & rich curries",
    rating: "4.7",
    image:
      "https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=300",
  },
  {
    id: "4",
    name: "Anjali's Home Foods",
    specialty: "Homestyle cooking & comfort food",
    rating: "4.6",
    image:
      "https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=300",
  },
  {
    id: "5",
    name: "Bite & Sip",
    specialty: "Fast food, shakes & quick bites",
    rating: "4.5",
    image:
      "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300",
  },
  {
    id: "6",
    name: "The Royal Kitchen",
    specialty: "Premium dining, royal thalis",
    rating: "4.9",
    image:
      "https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=300",
  },
  {
    id: "7",
    name: "Healthy Habits",
    specialty: "Diet food, protein meals, salads",
    rating: "4.8",
    image:
      "https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=300",
  },
  {
    id: "8",
    name: "Spicy Affair",
    specialty: "Spicy curries, Andhra style",
    rating: "4.7",
    image:
      "https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=300",
  },
  {
    id: "9",
    name: "Breakfast Club",
    specialty: "Pancakes, idli, upma, tea",
    rating: "4.6",
    image:
      "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300",
  },
  {
    id: "10",
    name: "Desi Dhaba",
    specialty: "Authentic dhaba style food",
    rating: "4.7",
    image:
      "https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=300",
  },
];

export default function TopRatedChefsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Top Rated Chefs</Text>
      </View>

      <FlatList
        data={CHEF_DATA}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={styles.cardContent}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.specialty} numberOfLines={2}>
                {item.specialty}
              </Text>

              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#F5A623" />
                <Text style={styles.ratingText}>{item.rating}</Text>
              </View>

              {/* <TouchableOpacity style={styles.viewBtn} activeOpacity={0.8}>
                <Text style={styles.viewBtnText}>View Menu</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
              </TouchableOpacity> */}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  image: {
    width: 90,
    height: 110,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: COLORS.secondary,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
    position: "relative",
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  specialty: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginLeft: 4,
  },
  viewBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
    marginRight: 2,
  },
});
