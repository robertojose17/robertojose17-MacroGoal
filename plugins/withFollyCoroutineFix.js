const { withPodfileProperties, withXcodeProject } = require('@expo/config-plugins');

const FOLLY_FLAG = 'FOLLY_CFG_NO_COROUTINES=1';

const withFollyCoroutineFix = (config) => {
  // 1. Set via Podfile properties (for CocoaPods / pod install phase)
  config = withPodfileProperties(config, (cfg) => {
    cfg.modResults['FOLLY_CFG_NO_COROUTINES'] = '1';
    return cfg;
  });

  // 2. Set via Xcode build settings (for direct xcodebuild / EAS build)
  config = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;

    // Get all build configurations
    const configurations = project.pbxXCBuildConfigurationSection();

    Object.keys(configurations).forEach((key) => {
      const config_entry = configurations[key];
      if (typeof config_entry !== 'object' || !config_entry.buildSettings) return;

      const settings = config_entry.buildSettings;

      // Only apply to the main app target (has PRODUCT_NAME or INFOPLIST_FILE)
      if (!settings.PRODUCT_BUNDLE_IDENTIFIER && !settings.INFOPLIST_FILE) return;

      // Get or create GCC_PREPROCESSOR_DEFINITIONS array
      let defs = settings.GCC_PREPROCESSOR_DEFINITIONS;

      if (!defs) {
        settings.GCC_PREPROCESSOR_DEFINITIONS = ['"$(inherited)"', `"${FOLLY_FLAG}"`];
      } else if (Array.isArray(defs)) {
        if (!defs.includes(`"${FOLLY_FLAG}"`)) {
          defs.push(`"${FOLLY_FLAG}"`);
        }
      } else if (typeof defs === 'string') {
        // Already a string value like "$(inherited)" — convert to array
        if (!defs.includes(FOLLY_FLAG)) {
          settings.GCC_PREPROCESSOR_DEFINITIONS = [defs, `"${FOLLY_FLAG}"`];
        }
      }
    });

    return cfg;
  });

  return config;
};

module.exports = withFollyCoroutineFix;
