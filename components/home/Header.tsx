import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
// import * as Location from "expo-location";
import * as Location from "expo-location";

const { width } = Dimensions.get("window");
const PRIMARY = COLORS.primary;

import { useFocusEffect } from "expo-router";
import COLORS from "@/constants/colors";

let isFirstLaunch = true;

export default function Header() {
  const router = useRouter();
  const [savedAddress, setSavedAddress] = useState("Loading...");
  const [initials, setInitials] = useState("U");

  useFocusEffect(
    React.useCallback(() => {
      if (isFirstLaunch) {
        isFirstLaunch = false;
        fetchLiveLocation();
      } else {
        readSavedLocation();
      }
      getUserDetails();
    }, []),
  );

  const getUserDetails = async () => {
    try {
      const name = await AsyncStorage.getItem("user_name");
      if (name) {
        const parts = name.trim().split(" ");
        if (parts.length > 1) {
          setInitials((parts[0][0] + parts[parts.length - 1][0]).toUpperCase());
        } else {
          setInitials(name.substring(0, 2).toUpperCase());
        }
      }
    } catch (error) {
      console.error("Error getting user name:", error);
    }
  };

  const readSavedLocation = async () => {
    try {
      const stored = await AsyncStorage.getItem("@selected_location");
      if (stored) {
        const data = JSON.parse(stored);
        if (data.address) setSavedAddress(data.address);
      }
    } catch (err) {
      console.error("Error reading storage", err);
    }
  };

  const fetchLiveLocation = async () => {
    try {
      setSavedAddress("Detecting location...");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        // Try getting cached position first (instantaneous)
        let location = await Location.getLastKnownPositionAsync({});

        // If no cached position, fetch with lower accuracy for speed
        if (!location) {
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
          });
        }

        if (location) {
          const lat = location.coords.latitude;
          const lng = location.coords.longitude;
          try {
            const geocode = await Location.reverseGeocodeAsync({
              latitude: lat,
              longitude: lng,
            });
            let address = "Unknown Location";
            if (geocode && geocode.length > 0) {
              const place = geocode[0];
              address = [place.name, place.city, place.region]
                .filter(Boolean)
                .join(", ");
            }
            setSavedAddress(address);
            await AsyncStorage.setItem(
              "@selected_location",
              JSON.stringify({ latitude: lat, longitude: lng, address }),
            );
          } catch (err) {
            console.error("Geocoding error:", err);
            setSavedAddress("Select location");
          }
          return;
        }
      }
      setSavedAddress("Select location");
    } catch {
      setSavedAddress("Select location");
    }
  };

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.delivering}>Delivering to</Text>
        <TouchableOpacity
          style={styles.locationRow}
          activeOpacity={0.7}
          onPress={() => router.push("/location")}
        >
          <Ionicons name="location-sharp" size={20} color={PRIMARY} />
          <Text numberOfLines={1} style={styles.locationText}>
            {savedAddress}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#8b8b8b" />
        </TouchableOpacity>
      </View>

      {/* <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/notification' as any)}>
        <Ionicons name="notifications-outline" size={22} color="#333" />
        <View style={styles.badge} />
      </TouchableOpacity> */}

      <TouchableOpacity
        style={styles.avatarButton}
        activeOpacity={0.8}
        onPress={() => router.push("/account")}
      >
        <Text style={styles.avatarText}>{initials}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  delivering: {
    fontSize: 11,
    color: "#8b8b8b",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  locationRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    maxWidth: width * 0.55,
    fontSize: 12,
    color: COLORS.text,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  badge: {
    width: 10,
    height: 10,
    borderRadius: 6,
    position: "absolute",
    right: 6,
    top: 6,
    backgroundColor: "#FF3B30",
    borderWidth: 1,
    borderColor: "#fff",
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f3e8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "800",
  },
});
