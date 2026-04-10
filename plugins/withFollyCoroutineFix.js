const {
  withDangerousMod,
  withPodfileProperties,
  withXcodeProject,
} = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin that fixes the 'folly/coro/Coroutine.h file not found' build
 * error in react-native-reanimated by defining FOLLY_CFG_NO_COROUTINES=1
 * across all three injection points:
 *   1. Podfile.properties.json  (picked up by the React Native Podfile template)
 *   2. Xcode project build settings for all targets/configurations
 *   3. Podfile post_install hook for all pod targets
 */

// ─── 1. Podfile.properties.json ──────────────────────────────────────────────
const withFollyPodfileProperties = (config) => {
  return withPodfileProperties(config, (cfg) => {
    cfg.modResults['FOLLY_CFG_NO_COROUTINES'] = '1';
    return cfg;
  });
};

// ─── 2. Xcode project — all targets, all build configurations ────────────────
const withFollyXcodeProject = (config) => {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const pbxProject = project.pbxXCBuildConfigurationSection();

    Object.values(pbxProject).forEach((buildConfig) => {
      if (typeof buildConfig !== 'object' || !buildConfig.buildSettings) return;

      const settings = buildConfig.buildSettings;

      // OTHER_CPLUSPLUSFLAGS
      if (!settings['OTHER_CPLUSPLUSFLAGS']) {
        settings['OTHER_CPLUSPLUSFLAGS'] = '"$(inherited) -DFOLLY_CFG_NO_COROUTINES=1"';
      } else if (!String(settings['OTHER_CPLUSPLUSFLAGS']).includes('FOLLY_CFG_NO_COROUTINES')) {
        settings['OTHER_CPLUSPLUSFLAGS'] =
          settings['OTHER_CPLUSPLUSFLAGS'].replace(/["']?$/, '') +
          ' -DFOLLY_CFG_NO_COROUTINES=1"';
      }

      // OTHER_CFLAGS
      if (!settings['OTHER_CFLAGS']) {
        settings['OTHER_CFLAGS'] = '"$(inherited) -DFOLLY_CFG_NO_COROUTINES=1"';
      } else if (!String(settings['OTHER_CFLAGS']).includes('FOLLY_CFG_NO_COROUTINES')) {
        settings['OTHER_CFLAGS'] =
          settings['OTHER_CFLAGS'].replace(/["']?$/, '') +
          ' -DFOLLY_CFG_NO_COROUTINES=1"';
      }
    });

    return cfg;
  });
};

// ─── 3. Podfile post_install hook — all pod targets ──────────────────────────
const POST_INSTALL_BLOCK = `
# withFollyCoroutineFix: inject FOLLY_CFG_NO_COROUTINES=1 into every pod target
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['OTHER_CPLUSPLUSFLAGS'] ||= ['$(inherited)']
      config.build_settings['OTHER_CPLUSPLUSFLAGS'] << '-DFOLLY_CFG_NO_COROUTINES=1'
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_CFG_NO_COROUTINES=1'
    end
  end
end
`;

const withFollyPodfilePatch = (config) => {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        console.warn('[withFollyCoroutineFix] Podfile not found, skipping patch.');
        return cfg;
      }

      const podfileContents = fs.readFileSync(podfilePath, 'utf8');

      const result = mergeContents({
        tag: 'withFollyCoroutineFix',
        src: podfileContents,
        newSrc: POST_INSTALL_BLOCK,
        anchor: /^(\s*)end\s*$/m, // append before the last `end` in the file
        offset: 0,
        comment: '#',
      });

      if (!result.didMerge) {
        console.log('[withFollyCoroutineFix] Podfile already contains the post_install block, skipping.');
      } else {
        console.log('[withFollyCoroutineFix] Appended post_install block to Podfile.');
        fs.writeFileSync(podfilePath, result.contents);
      }

      return cfg;
    },
  ]);
};

// ─── Compose all three modifiers ─────────────────────────────────────────────
const withFollyCoroutineFix = (config) => {
  config = withFollyPodfileProperties(config);
  config = withFollyXcodeProject(config);
  config = withFollyPodfilePatch(config);
  return config;
};

module.exports = withFollyCoroutineFix;
