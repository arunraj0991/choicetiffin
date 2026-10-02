import React, { useState } from "react";
import { Text, StyleSheet, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from "@/constants/colors";
import WeeklyMenuModal from "@/components/common/WeeklyMenuModal";

export default function WeeklyMenu() {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable style={styles.button} onPress={() => setVisible(true)}>
        <MaterialIcons name="event-available" size={22} color={COLORS.text} />
        <Text style={styles.buttonText}>Check Your Weekly Menu</Text>
      </Pressable>

      <WeeklyMenuModal visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
});
