import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import COLORS from "@/constants/colors";

export const Loader = ({ text = "Loading..." }: { text?: string }) => (
  <View style={styles.fullScreen}>
    <MaterialIcons name="fastfood" size={40} color={COLORS.primary} />
    <Text style={styles.loaderText}>{text}</Text>
  </View>
);

export const BackButton = ({ style }: { style?: object }) => {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.backBtn, style]}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(tabs)");
        }
      }}
    >
      <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
});
