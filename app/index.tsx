import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SPLASH_IMAGE = require("@/assets/images/splash.jpg");

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Index() {
  const [destination, setDestination] = useState<"/(tabs)" | "/welcome" | null>(
    null,
  );
  const [minTimeDone, setMinTimeDone] = useState(false);
  const [imageReady, setImageReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeDone(true), 1600);

    (async () => {
      let hasLocation = false;
      try {
        const stored = await AsyncStorage.getItem("@selected_location");
        if (stored) {
          const data = JSON.parse(stored);
          hasLocation = Boolean(data?.latitude && data?.longitude);
        }
      } catch {
        // Fall through to welcome.
      }
      setDestination(hasLocation ? "/(tabs)" : "/welcome");
    })();

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!imageReady) return;
    const id = requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
    return () => cancelAnimationFrame(id);
  }, [imageReady]);

  if (!destination || !minTimeDone) {
    return (
      <View style={styles.fill}>
        <Image
          source={SPLASH_IMAGE}
          style={styles.image}
          resizeMode="cover"
          onLoadEnd={() => setImageReady(true)}
        />
      </View>
    );
  }

  return <Redirect href={destination} />;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
