import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import COLORS from "@/constants/colors";

// import COLORS from '@/constants/colors';

const GOOGLE_MAPS_APIKEY = "AIzaSyADMQGvxws3rPSIn0cY0U50deogK-OTjw8";

const DEFAULT_REGION = {
  latitude: 28.6139,
  longitude: 77.209,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function LocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const searchRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [selectedAddress, setSelectedAddress] = useState(
    "Fetching your location…",
  );

  // Auto-focus search on mount
  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setupInitialLocation();
  }, []);

  const setupInitialLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Location access is needed to set your delivery area.",
        );
        setSelectedAddress("Search for your delivery area below.");
        setLoading(false);
        return;
      }

      const location =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }));

      if (!location) {
        setSelectedAddress("Could not detect location. Search below.");
        setLoading(false);
        return;
      }

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      await reverseGeocode(newRegion.latitude, newRegion.longitude);
    } catch (e) {
      console.warn("Location setup failed:", e);
      setSelectedAddress("Could not detect location. Search below.");
      setLoading(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_APIKEY}`,
      );
      const json = await res.json();
      setSelectedAddress(
        json.results?.[0]?.formatted_address ?? "Selected Location",
      );
    } catch {
      setSelectedAddress("Selected Location");
    } finally {
      setLoading(false);
    }
  };

  const handleRegionChangeComplete = (newRegion: typeof DEFAULT_REGION) => {
    const moved =
      Math.abs(newRegion.latitude - region.latitude) > 0.0001 ||
      Math.abs(newRegion.longitude - region.longitude) > 0.0001;

    if (moved) {
      setRegion(newRegion);
      reverseGeocode(newRegion.latitude, newRegion.longitude);
    }
  };

  const handleContinue = async () => {
    try {
      await AsyncStorage.setItem(
        "@selected_location",
        JSON.stringify({
          latitude: region.latitude,
          longitude: region.longitude,
          address: selectedAddress,
        }),
      );
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Error", "Could not save location. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Delivery Area</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Map ── */}
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          initialRegion={DEFAULT_REGION}
          region={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
        >
          <Marker
            coordinate={{
              latitude: region.latitude,
              longitude: region.longitude,
            }}
          />
        </MapView>

        {/* ── Search overlay ── */}
        <View style={styles.searchContainer}>
          <GooglePlacesAutocomplete
            ref={searchRef}
            placeholder="Search for your area…"
            fetchDetails
            debounce={500}
            textInputProps={{ autoFocus: true }}
            onPress={(data, details = null) => {
              if (!details) return;
              const newRegion = {
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              };
              setRegion(newRegion);
              mapRef.current?.animateToRegion(newRegion, 800);
              setSelectedAddress(data.description);
              setLoading(false);
            }}
            query={{
              key: GOOGLE_MAPS_APIKEY,
              language: "en",
              components: "country:in",
            }}
            styles={{
              textInputContainer: styles.searchInputContainer,
              textInput: styles.searchInput,
              listView: styles.resultsList,
              row: styles.resultRow,
              description: styles.resultText,
            }}
            enablePoweredByContainer={false}
            keepResultsAfterBlur={false}
          />
        </View>

        {/* ── Recenter FAB ── */}
        <TouchableOpacity
          style={styles.fab}
          onPress={setupInitialLocation}
          activeOpacity={0.85}
        >
          <MaterialIcons name="my-location" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Footer ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.footerLabel}>DELIVERY LOCATION</Text>
        <View style={styles.addressRow}>
          <Ionicons name="location" size={22} color={COLORS.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.addressText} numberOfLines={2}>
              {loading ? "Updating address…" : selectedAddress}
            </Text>
          </View>
          {loading && <ActivityIndicator size="small" color={COLORS.primary} />}
        </View>

        <TouchableOpacity
          style={[styles.continueBtn, loading && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <View style={styles.continueRow}>
              <ActivityIndicator
                size="small"
                color="#fff"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.continueTxt}>Detecting location…</Text>
            </View>
          ) : (
            <Text style={styles.continueTxt}>Confirm &amp; Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    zIndex: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  backBtn: { padding: 6 },

  /* Search */
  searchContainer: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    zIndex: 999,
  },
  searchInputContainer: {
    backgroundColor: "transparent",
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  searchInput: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#fff",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.text,
  },
  resultsList: {
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 5,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultRow: { padding: 14 },
  resultText: { fontSize: 14, color: COLORS.text },

  /* FAB */
  fab: {
    position: "absolute",
    bottom: 20,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  /* Footer */
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#AAA",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  addressText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
    lineHeight: 20,
  },

  /* Continue */
  continueBtn: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  continueBtnDisabled: { opacity: 0.75 },
  continueRow: { flexDirection: "row", alignItems: "center" },
  continueTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
