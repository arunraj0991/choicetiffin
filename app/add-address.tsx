import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import MapView, { Region, PROVIDER_GOOGLE } from "react-native-maps";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

// import COLORS from '@/constants/colors';
import COLORS from "@/constants/colors";
import { addAddress } from "@/src/api/api";

const GOOGLE_KEY = "AIzaSyADMQGvxws3rPSIn0cY0U50deogK-OTjw8";
const MAP_HEIGHT = 260;

export default function AddAddressScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeIdRef = useRef(0);

  const [region, setRegion] = useState<Region>({
    latitude: 28.6139,
    longitude: 77.209,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [address, setAddress] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [landmark, setLandmark] = useState("");
  const [type, setType] = useState<"Home" | "Work" | "Other">("Home");
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);

  // GPS on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) return;
        const loc =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }));
        if (!loc || cancelled) return;
        const r: Region = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(r);
        mapRef.current?.animateToRegion(r, 800);
        reverseGeocode(loc.coords.latitude, loc.coords.longitude);
      } catch {}
    })();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const reverseGeocode = async (lat: number, lng: number) => {
    const myId = ++geocodeIdRef.current;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_KEY}`,
      );
      const json = await res.json();
      if (
        geocodeIdRef.current === myId &&
        json.results?.[0]?.formatted_address
      ) {
        setAddress(json.results[0].formatted_address);
      }
    } catch {}
    if (geocodeIdRef.current === myId) setGeocoding(false);
  };

  const onRegionChangeComplete = (
    r: Region,
    details?: { isGesture?: boolean },
  ) => {
    setRegion(r);
    if (!details?.isGesture) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => reverseGeocode(r.latitude, r.longitude),
      700,
    );
  };

  const onPlaceSelect = (data: any, details: any) => {
    const loc = details?.geometry?.location;
    if (!loc) return;
    geocodeIdRef.current++;
    setGeocoding(false);
    const r: Region = {
      latitude: loc.lat,
      longitude: loc.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setRegion(r);
    mapRef.current?.animateToRegion(r, 400);
    setAddress(details?.formatted_address || data.description);
  };

  const handleSave = async () => {
    if (!address.trim()) {
      Alert.alert(
        "Missing Address",
        "Please search or drag the map to set your delivery address.",
      );
      return;
    }
    if (!houseNo.trim()) {
      Alert.alert(
        "Missing House Number",
        "Please enter your Flat / House No.",
      );
      return;
    }
    setSaving(true);
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        router.replace("/login" as any);
        return;
      }

      const res = await addAddress(
        userId,
        address.trim(),
        houseNo.trim(),
        landmark.trim(),
        type,
        region.latitude,
        region.longitude,
      );

      const payload = res?.data ?? res;
      const failed =
        payload?.status === false ||
        payload?.status === 0 ||
        payload?.status === "false" ||
        res?.status === false ||
        res?.status === 0 ||
        res?.status === "false";
      if (failed) {
        Alert.alert(
          "Error",
          payload?.message ||
            payload?.error ||
            payload?.msg ||
            res?.message ||
            res?.error ||
            res?.msg ||
            "Failed to save address. Please try again.",
        );
        return;
      }

      // API returns all addresses newest-first — auto-select the one we just added
      const newAddress = res?.data?.[0];
      if (newAddress) {
        const saved = {
          ...newAddress,
          house_no: newAddress.house_no || houseNo.trim(),
        };
        await AsyncStorage.setItem("delivery_address", JSON.stringify(saved));
        if (Array.isArray(res.data)) {
          const list = [...res.data];
          list[0] = saved;
          await AsyncStorage.setItem("user_addresses", JSON.stringify(list));
        }
      }

      router.back();
    } catch {
      Alert.alert("Error", "Failed to save address. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add Address</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.body}>
        {/* Map */}
        <View style={s.mapWrap}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            region={region}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation
            showsMyLocationButton={false}
          />

          {/* Fixed center pin */}
          <View style={s.pinOverlay} pointerEvents="none">
            <View
              style={{ transform: [{ translateY: -20 }], alignItems: "center" }}
            >
              <MaterialIcons
                name="location-pin"
                size={44}
                color={COLORS.primary}
              />
              <View style={s.pinDot} />
            </View>
          </View>

          {/* Geocoding badge */}
          {geocoding && (
            <View style={s.geocodingBadge}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={s.geocodingText}>Updating…</Text>
            </View>
          )}
        </View>

        {/* Form */}
        <ScrollView
          style={s.form}
          contentContainerStyle={s.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.field}>
            <Text style={s.label}>Address</Text>
            <TextInput
              style={[s.input, s.inputMulti]}
              value={address}
              onChangeText={setAddress}
              placeholder="Your delivery address"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Flat / House No. *</Text>
            <TextInput
              style={s.input}
              value={houseNo}
              onChangeText={setHouseNo}
              placeholder="e.g. A-101, 2nd Floor"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>
              Landmark <Text style={s.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={s.input}
              value={landmark}
              onChangeText={setLandmark}
              placeholder="e.g. Near city mall, beside school"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Address Type</Text>
            <View style={s.typeRow}>
              {(["Home", "Work", "Other"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[s.typeBtn, type === t && s.typeBtnActive]}
                  onPress={() => setType(t)}
                  activeOpacity={0.75}
                >
                  <MaterialIcons
                    name={
                      t === "Work" ? "work" : t === "Other" ? "place" : "home"
                    }
                    size={16}
                    color={type === t ? COLORS.primary : "#64748b"}
                    style={{ marginBottom: 2 }}
                  />
                  <Text style={[s.typeText, type === t && s.typeTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Search overlay — floats above map */}
        <View style={s.searchOverlay}>
          <GooglePlacesAutocomplete
            placeholder="Search location…"
            onPress={onPlaceSelect}
            query={{
              key: GOOGLE_KEY,
              language: "en",
              components: "country:in",
            }}
            fetchDetails
            styles={{
              container: { flex: 0 },
              textInputContainer: s.searchInputContainer,
              textInput: s.searchInput,
              listView: s.searchList,
              row: {
                paddingVertical: 10,
                paddingHorizontal: 14,
                backgroundColor: "#fff",
              },
              description: { fontSize: 13, color: "#0f172a" },
              separator: { height: 1, backgroundColor: "#f1f5f9" },
            }}
            enablePoweredByContainer={false}
            debounce={300}
            keyboardShouldPersistTaps="handled"
            textInputProps={{ placeholderTextColor: "#94a3b8" }}
          />
        </View>
      </View>

      {/* Save button */}
      <View style={s.bottom}>
        <TouchableOpacity
          style={[s.saveBtn, (!address.trim() || saving) && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!address.trim() || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.saveBtnText}>Save Address</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f1f5f9" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },

  body: { flex: 1 },

  /* Map */
  mapWrap: { height: MAP_HEIGHT, backgroundColor: "#dde1e7" },

  pinOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: MAP_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  pinDot: {
    width: 8,
    height: 4,
    borderRadius: 4,
    backgroundColor: "rgba(74,21,148,0.3)",
    alignSelf: "center",
    marginTop: -4,
  },

  geocodingBadge: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  geocodingText: { fontSize: 12, color: "#64748b", fontWeight: "500" },

  /* Form */
  form: { flex: 1, backgroundColor: "#f1f5f9" },
  formContent: { padding: 16, paddingBottom: 24 },

  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  optional: { fontWeight: "400", color: "#94a3b8" },

  input: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: "#0f172a",
  },
  inputMulti: { height: 72, paddingTop: 14 },

  typeRow: { flexDirection: "row", gap: 12 },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  typeBtnActive: {
    backgroundColor: "rgba(74,21,148,0.06)",
    borderColor: COLORS.primary,
  },
  typeText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  typeTextActive: { color: COLORS.primary },

  /* Search overlay */
  searchOverlay: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    zIndex: 20,
    elevation: 20,
  },
  searchInputContainer: {
    backgroundColor: "#fff",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 5,
    overflow: "hidden",
  },
  searchInput: {
    height: 50,
    margin: 0,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
  },
  searchList: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    maxHeight: 210,
  },

  /* Bottom */
  bottom: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 10,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: "#cbd5e1",
    shadowColor: "#64748b",
    shadowOpacity: 0.1,
    elevation: 1,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
