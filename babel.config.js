module.exports = function (api) {
  api.cache(true);

  const EDITABLE_COMPONENTS =
    process.env.EXPO_PUBLIC_ENABLE_EDIT_MODE === "TRUE" &&
    process.env.NODE_ENV === "development"
      ? [
          ["./babel-plugins/editable-elements.js", {}],
          ["./babel-plugins/inject-source-location.js", {}],
        ]
      : [];

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          extensions: [
            ".ios.ts",
            ".android.ts",
            ".ts",
            ".ios.tsx",
            ".android.tsx",
            ".tsx",
            ".jsx",
            ".js",
            ".json",
          ],
          alias: {
            "@": "./",
            "@components": "./components",
            "@style": "./style",
            "@hooks": "./hooks",
            "@types": "./types",
            "@contexts": "./contexts",
          },
        },
      ],
      ...EDITABLE_COMPONENTS,
      "@babel/plugin-proposal-export-namespace-from",
      // NOTE: react-native-reanimated/plugin is intentionally REMOVED.
      // The real react-native-reanimated native module is NOT linked in the
      // preview build — Metro stubs it out via extraNodeModules in metro.config.js.
      // Including the babel plugin while the native module is absent causes a
      // silent blank white screen on iOS cold start because the plugin injects
      // worklet runtime initialisation code that calls into the missing native module.
    ],
  };
};
