/**
 * Loads real react-native-onesignal only when the native TurboModule exists.
 * Avoids TurboModuleRegistry.getEnforcing('OneSignal') crashes in Expo Go / web / SSR.
 *
 * Requires must be static strings so Metro can resolve them.
 */
const { Platform, TurboModuleRegistry } = require("react-native");

const hasNative =
  (Platform.OS === "ios" || Platform.OS === "android") &&
  TurboModuleRegistry.get("OneSignal") != null;

if (hasNative) {
  module.exports = require("../../node_modules/react-native-onesignal/dist/index.js");
} else {
  if (Platform.OS === "ios" || Platform.OS === "android") {
    console.warn(
      "[OneSignal] Native module missing. Using no-op shim. Open the Choice Tiffin app (not Expo Go) after npm run android.",
    );
  }
  module.exports = require("./onesignal.web");
}
