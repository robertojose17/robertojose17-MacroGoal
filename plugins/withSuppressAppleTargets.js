/**
 * No-op replacement for @bacons/apple-targets config plugin.
 *
 * @bacons/apple-targets v3.x calls BaseMods.provider() which was removed in
 * Expo SDK 54's @expo/config-plugins, causing "Expected string literal" /
 * "BaseMods.provider is not a function" errors during EAS prebuild.
 *
 * This project has no Apple targets (widgets/extensions), so the plugin
 * should not run at all. Expo auto-discovers packages with app.plugin.js and
 * runs them during prebuild. By listing THIS plugin in app.json instead of
 * @bacons/apple-targets, we prevent the broken plugin from executing.
 *
 * The @bacons/apple-targets package is still installed because WidgetContext.tsx
 * uses its ExtensionStorage runtime API on iOS (guarded with try/catch).
 */
module.exports = (config) => config;
