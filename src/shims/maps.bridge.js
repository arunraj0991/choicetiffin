/**
 * Loads real react-native-maps only when RNMapsAirModule exists.
 * Requires must be static strings so Metro can resolve them.
 */
const { Platform, TurboModuleRegistry } = require("react-native");

const hasNative =
  (Platform.OS === "ios" || Platform.OS === "android") &&
  TurboModuleRegistry.get("RNMapsAirModule") != null;

if (hasNative) {
  module.exports = require("../../node_modules/react-native-maps/src/index");
} else {
  if (Platform.OS === "ios" || Platform.OS === "android") {
    console.warn(
      "[Maps] Native module missing. Using no-op shim. Open the Choice Tiffin app (not Expo Go) after npm run android.",
    );
  }
  module.exports = require("./maps.web");
}
