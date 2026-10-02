import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LanguageProvider } from "@/src/i18n/context";
import { useAuthStore } from "@/src/store/auth";
import { useFoodTypeFilterStore } from "@/src/store/foodTypeFilter";
import { identifyOneSignalUser } from "@/src/utils/onesignal";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    console.log("[App] RootLayout mounted");
    useFoodTypeFilterStore.getState().hydrate();

    const splashFallback = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 8000);

    let OneSignal: typeof import("react-native-onesignal").OneSignal | null =
      null;
    const onSubscriptionChange = (event: {
      current: { id?: string; token?: string; optedIn?: boolean };
    }) => {
      if (!__DEV__) return;
      console.log("OneSignal subscription id:", event.current.id);
      console.log("OneSignal token:", event.current.token);
      console.log("OneSignal opted in:", event.current.optedIn);
    };
    const onNotificationClick = (event: {
      notification: { additionalData?: Record<string, unknown> };
    }) => {
      if (__DEV__) {
        console.log("OneSignal: notification clicked:", event);
      }
      const data = event.notification.additionalData;
      const screen =
        typeof data?.screen === "string" ? data.screen : "/subscription";
      router.push(screen as any);
    };

    const timer = setTimeout(() => {
      try {
        const onesignal =
          require("react-native-onesignal") as typeof import("react-native-onesignal");
        OneSignal = onesignal.OneSignal;
        if (__DEV__) {
          OneSignal.Debug.setLogLevel(onesignal.LogLevel.Verbose);
        }
        OneSignal.initialize("867092cf-5af4-4295-91e2-bcdc819c9c6e");
        OneSignal.Notifications.requestPermission(false);

        const restoreOneSignalUser = async () => {
          const userId =
            useAuthStore.getState().user?.id ||
            (await AsyncStorage.getItem("user_id"));
          identifyOneSignalUser(userId);
        };
        restoreOneSignalUser();

        OneSignal.User.pushSubscription.addEventListener(
          "change",
          onSubscriptionChange,
        );
        OneSignal.Notifications.addEventListener("click", onNotificationClick);
      } catch (error) {
        console.warn("[OneSignal] init skipped:", error);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      clearTimeout(splashFallback);
      try {
        OneSignal?.Notifications.removeEventListener(
          "click",
          onNotificationClick,
        );
        OneSignal?.User.pushSubscription.removeEventListener(
          "change",
          onSubscriptionChange,
        );
      } catch {
        // Native module may be a no-op shim.
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="intro" />
            <Stack.Screen name="location" />
            <Stack.Screen name="search" />
            <Stack.Screen name="store/[storeId]" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="otp" />
            <Stack.Screen name="forgot" />
            <Stack.Screen name="done" />
            <Stack.Screen name="cart" />
            <Stack.Screen name="checkout" />
            <Stack.Screen name="thanks" />
            <Stack.Screen name="address" />
            <Stack.Screen name="account" />
            <Stack.Screen name="setting" />
            <Stack.Screen name="subscription" />
            <Stack.Screen name="modify-meal" />
            <Stack.Screen name="refer" />
            <Stack.Screen name="wallet" />
            <Stack.Screen name="contact" />
            <Stack.Screen name="complaints" />
            <Stack.Screen name="payment-history" />
            <Stack.Screen name="weekly-menu" />
            <Stack.Screen name="complaint-detail" />
            <Stack.Screen name="add-complaint" />
            <Stack.Screen name="language" />
            <Stack.Screen name="delivery" />
            <Stack.Screen name="notification" />
            <Stack.Screen name="category" />
            <Stack.Screen name="category-meals" />
            <Stack.Screen name="storeinfo" />
            <Stack.Screen
              name="modal"
              options={{
                presentation: "modal",
                headerShown: true,
                title: "Modal",
              }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
