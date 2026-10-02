import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import COLORS from "@/constants/colors";
import { useAuthStore } from "@/src/store/auth";

export default function Headline() {
  const [greeting, setGreeting] = useState("Good Evening");
  const userName = useAuthStore((s) => s.user);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 16) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  return (
    <View style={styles.wrap}>
      <View style={styles.separator} />
      <Text style={styles.greeting}>
        {greeting}, <Text style={styles.userName}>{userName?.name || "Guest"}</Text>
      </Text>
      <Text style={styles.sub}>What are you craving tonight?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16 },
  separator: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginBottom: 6,
  },
  greeting: { fontSize: 26, fontWeight: "800", color: "#222" },
  userName: { color: COLORS.primary },
  sub: { fontSize: 13, color: "#7b7b7b", marginTop: 2 },
});
