import type { ConfigContext, ExpoConfig } from 'expo/config';
// Build setting only; this temporary access never represents a purchase.
export function resolvePremiumTestAccess(value: string | undefined, buildProfile: string | undefined) {
  if (buildProfile === 'production') return false;
  return (value ?? 'true') === 'true';
}
export default function appConfig({ config }: ConfigContext): ExpoConfig {
  const googlePlugin = '@react-native-google-signin/google-signin';
  // The installer adds a bare plugin, which needs native configuration. Keep previews usable until IDs exist.
  const plugins = (config.plugins ?? []).filter(plugin => (Array.isArray(plugin) ? plugin[0] : plugin) !== googlePlugin);
  if (!plugins.some(plugin => (Array.isArray(plugin) ? plugin[0] : plugin) === 'expo-video')) plugins.push(['expo-video', { supportsBackgroundPlayback: false, supportsPictureInPicture: false }]);
  if (!plugins.some(plugin => (Array.isArray(plugin) ? plugin[0] : plugin) === 'expo-audio')) plugins.push(['expo-audio', { microphonePermission: false, recordAudioAndroid: false, enableBackgroundPlayback: false, enableBackgroundRecording: false }]);
  const iosClient = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  if (iosClient && /^[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test(iosClient)) {
    plugins.push([googlePlugin, { iosUrlScheme: 'com.googleusercontent.apps.' + iosClient.replace('.apps.googleusercontent.com', '') }]);
  }
  return {
    ...config, name: config.name ?? 'Bíblia Smart', slug: config.slug ?? 'biblia-mulher', plugins,
    extra: { ...config.extra, premiumTestAccess: resolvePremiumTestAccess(process.env.APP_PREMIUM_TEST_ACCESS, process.env.EAS_BUILD_PROFILE) },
    android: { ...config.android, ...(process.env.APP_ANDROID_PACKAGE ? { package: process.env.APP_ANDROID_PACKAGE.trim() } : {}) },
    ios: { ...config.ios, ...(process.env.APP_IOS_BUNDLE_IDENTIFIER ? { bundleIdentifier: process.env.APP_IOS_BUNDLE_IDENTIFIER.trim() } : {}) },
  };
}
