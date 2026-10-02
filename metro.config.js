const fs = require("fs");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = fs.realpathSync(__dirname);
const config = getDefaultConfig(projectRoot);

// Always resolve native-only packages through bridges that check TurboModuleRegistry
// before loading the real package. Prevents getEnforcing crashes in Expo Go / web / SSR.
const packageBridges = {
  "react-native-onesignal": path.resolve(
    projectRoot,
    "src/shims/onesignal.bridge.js",
  ),
  "react-native-maps": path.resolve(projectRoot, "src/shims/maps.bridge.js"),
};

const webOnlyShims = {
  "@stripe/stripe-react-native": path.resolve(
    projectRoot,
    "src/shims/stripe.web.tsx",
  ),
  "react-native-razorpay": path.resolve(projectRoot, "src/shims/razorpay.web.ts"),
};

const defaultResolver = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (packageBridges[moduleName]) {
    return {
      filePath: packageBridges[moduleName],
      type: "sourceFile",
    };
  }

  const useWebShim =
    platform !== "ios" &&
    platform !== "android" &&
    webOnlyShims[moduleName];

  if (useWebShim) {
    return {
      filePath: webOnlyShims[moduleName],
      type: "sourceFile",
    };
  }

  if (defaultResolver) {
    return defaultResolver(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
