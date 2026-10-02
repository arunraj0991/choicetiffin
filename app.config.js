module.exports = ({ config }) => {
  const isProd =
    process.env.EAS_BUILD_PROFILE === "production" ||
    process.env.ONESIGNAL_MODE === "production";

  const plugins = (config.plugins ?? []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === "onesignal-expo-plugin") {
      return [
        "onesignal-expo-plugin",
        {
          ...(plugin[1] || {}),
          mode: isProd ? "production" : "development",
        },
      ];
    }
    return plugin;
  });

  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...(config.ios?.infoPlist ?? {}),
        UIBackgroundModes: ["remote-notification"],
      },
      entitlements: {
        ...(config.ios?.entitlements ?? {}),
        "aps-environment": isProd ? "production" : "development",
      },
    },
    plugins,
  };
};
