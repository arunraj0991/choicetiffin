export function identifyOneSignalUser(
  userId: string | number | null | undefined,
) {
  if (userId == null || userId === "") return;
  try {
    const id = String(userId);
    const { OneSignal } = require("react-native-onesignal") as typeof import("react-native-onesignal");
    OneSignal.login(`user_${id}`);
    OneSignal.User.addTag("user_id", id);
  } catch (error) {
    console.warn("[OneSignal] identify skipped:", error);
  }
}

export function logoutOneSignalUser() {
  try {
    const { OneSignal } = require("react-native-onesignal") as typeof import("react-native-onesignal");
    OneSignal.logout();
  } catch (error) {
    console.warn("[OneSignal] logout skipped:", error);
  }
}
