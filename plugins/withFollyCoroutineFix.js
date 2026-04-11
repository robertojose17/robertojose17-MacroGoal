const { withPodfileProperties, withXcodeProject } = require('@expo/config-plugins');

/**
 * Fix for 'folly/coro/Coroutine.h' file not found on iOS 26 SDK / newer Xcode.
 * Applies FOLLY_CFG_NO_COROUTINES=1 via Podfile properties and Xcode project settings.
 * Does NOT modify the Podfile directly to avoid "multiple post_install hooks" errors.
 */
const withFollyCoroutineFix = (config) => {
  // 1. Set via Podfile properties (picked up by React Native's Podfile template)
  config = withPodfileProperties(config, (cfg) => {
    cfg.modResults['FOLLY_CFG_NO_COROUTINES'] = '1';
    return cfg;
  });

  // 2. Inject into Xcode project GCC_PREPROCESSOR_DEFINITIONS for all targets/configs
  config = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const buildConfigs = project.pbxXCBuildConfigurationSection();

    for (const key of Object.keys(buildConfigs)) {
      const buildConfig = buildConfigs[key];
      if (typeof buildConfig !== 'object' || !buildConfig.buildSettings) continue;

      const settings = buildConfig.buildSettings;
      const existing = settings['GCC_PREPROCESSOR_DEFINITIONS'];

      if (Array.isArray(existing)) {
        if (!existing.includes('FOLLY_CFG_NO_COROUTINES=1')) {
          existing.push('FOLLY_CFG_NO_COROUTINES=1');
        }
      } else if (typeof existing === 'string') {
        if (!existing.includes('FOLLY_CFG_NO_COROUTINES=1')) {
          settings['GCC_PREPROCESSOR_DEFINITIONS'] = [existing, 'FOLLY_CFG_NO_COROUTINES=1'];
        }
      } else {
        settings['GCC_PREPROCESSOR_DEFINITIONS'] = ['"$(inherited)"', 'FOLLY_CFG_NO_COROUTINES=1'];
      }
    }

    return cfg;
  });

  return config;
};

module.exports = withFollyCoroutineFix;
