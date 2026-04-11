const { withPodfileProperties } = require('@expo/config-plugins');

/**
 * Fix for 'folly/coro/Coroutine.h' file not found on iOS 26 SDK / newer Xcode.
 * Sets FOLLY_CFG_NO_COROUTINES=1 via Podfile properties, which React Native's
 * Podfile template picks up and passes to CocoaPods as a preprocessor definition.
 *
 * NOTE: The withXcodeProject approach was removed because writing values containing
 * '=' into pbxproj build settings arrays without proper quoting causes:
 *   "Error: Expected string literal at line N, column N"
 * during `expo prebuild` / EAS "Configure Xcode project" step.
 * Podfile properties is the correct and safe mechanism for this flag.
 */
const withFollyCoroutineFix = (config) => {
  config = withPodfileProperties(config, (cfg) => {
    cfg.modResults['FOLLY_CFG_NO_COROUTINES'] = '1';
    return cfg;
  });

  return config;
};

module.exports = withFollyCoroutineFix;
