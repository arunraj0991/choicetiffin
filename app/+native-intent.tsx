/**
 * Expo opens the app with:
 *   choicetiffinservices://expo-development-client/?url=http://127.0.0.1:8081
 * Without this redirect, that host becomes a missing route and the UI stays blank
 * under the white native splash.
 */
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  if (!path) return '/';

  const lower = path.toLowerCase();
  if (
    lower.includes('expo-development-client') ||
    lower.includes('127.0.0.1') ||
    lower.includes('localhost:808')
  ) {
    return '/';
  }

  return path;
}
