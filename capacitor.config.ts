/**
 * BooKanto Capacitor Configuration
 *
 * Configures native compilation targets for Google Play Store (Android)
 * and Apple App Store (iOS).
 */
export const config = {
  appId: "ph.bookanto.app",
  appName: "BooKanto",
  webDir: "public",
  bundledWebRuntime: false,
  server: {
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://bookanto.ph",
    cleartext: process.env.NODE_ENV === "development",
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#16a34a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#16a34a",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#16a34a",
      sound: "beep.wav",
    },
  },
};

export default config;
