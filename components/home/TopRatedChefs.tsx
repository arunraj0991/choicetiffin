import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import COLORS from "@/constants/colors";

const CHEF_DATA = [
  {
    id: "1",
    name: "Sharma Tiffin House",
    image:
      "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300",
  },
  {
    id: "2",
    name: "Green Leaf Kitchen",
    image:
      "https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=300",
  },
  {
    id: "3",
    name: "Nawab Foods",
    image:
      "https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=300",
  },
];

export default function TopRatedChefs() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Top Rated Chefs</Text>
        <TouchableOpacity onPress={() => router.push("/top-rated-chefs")}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {CHEF_DATA.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.8}
            style={styles.card}
          >
            <View style={styles.imageContainer}>
              <Image source={{ uri: item.image }} style={styles.image} />
            </View>
            <View style={styles.infoContainer}>
              <Text style={styles.chefName} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    width: 240,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: 140,
    backgroundColor: COLORS.secondary,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  infoContainer: {
    padding: 16,
    alignItems: "flex-start", // Changed from center to left
  },
  chefName: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
});
