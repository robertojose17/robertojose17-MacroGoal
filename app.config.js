
module.exports = {
  expo: {
    name: "Elite Macro Tracker",
    slug: "elite-macro-tracker",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/final_quest_240x240.png",
    scheme: "elitemacrotracker",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/final_quest_240x240__.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourcompany.elitemacrotracker",
      // RevenueCat requires these capabilities
      infoPlist: {
        NSUserTrackingUsageDescription: "This identifier will be used to deliver personalized subscription offers to you."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/final_quest_240x240.png",
        backgroundColor: "#ffffff"
      },
      package: "com.yourcompany.elitemacrotracker",
      // RevenueCat permissions
      permissions: [
        "com.android.vending.BILLING"
      ]
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/final_quest_240x240.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-camera",
        {
          "cameraPermission": "Allow Elite Macro Tracker to access your camera to scan barcodes and take progress photos."
        }
      ],
      // RevenueCat plugin configuration
      // Note: react-native-purchases works with Expo without additional plugins
      // Just ensure you run 'npx expo prebuild' before building
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: "your-eas-project-id"
      }
    }
  }
};
