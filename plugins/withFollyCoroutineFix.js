const {
  withDangerousMod,
  withPodfileProperties,
  withXcodeProject,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin that fixes the 'folly/coro/Coroutine.h file not found' build
 * error in react-native-reanimated by defining FOLLY_CFG_NO_COROUTINES=1
 * across all three injection points:
 *   1. Podfile.properties.json  (picked up by the React Native Podfile template)
 *   2. Xcode project build settings for all targets/configurations
 *   3. Podfile post_install hook — injected INSIDE the existing block, not as a new one
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

// ─── 3. Podfile — inject folly fix INSIDE the existing post_install block ─────
const FOLLY_FIX_CODE = `
  # Fix for folly/coro/Coroutine.h not found (withFollyCoroutineFix)
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_NO_CONFIG=1'
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_MOBILE=1'
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_USE_LIBCPP=1'
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_CFG_NO_COROUTINES=1'
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_HAVE_CLOCK_GETTIME=1'
      config.build_settings['OTHER_CPLUSPLUSFLAGS'] ||= ['$(inherited)']
      config.build_settings['OTHER_CPLUSPLUSFLAGS'] << '-DFOLLY_CFG_NO_COROUTINES=1'
    end
  end`;

const withFollyPodfilePatch = (config) => {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        console.warn('[withFollyCoroutineFix] Podfile not found, skipping patch.');
        return cfg;
      }

      let contents = fs.readFileSync(podfilePath, 'utf8');

      // Skip if already injected
      if (contents.includes('FOLLY_CFG_NO_COROUTINES')) {
        console.log('[withFollyCoroutineFix] Folly fix already present in Podfile, skipping.');
        return cfg;
      }

      // Find the existing post_install block and inject our code before its closing `end`
      // Matches: post_install do |installer| ... end  (non-greedy, multiline)
      const postInstallRegex = /^(post_install do \|installer\|)([\s\S]*?)(^end)/m;
      const match = postInstallRegex.exec(contents);

      if (match) {
        const insertionIndex = match.index + match[1].length + match[2].length;
        contents =
          contents.slice(0, insertionIndex) +
          FOLLY_FIX_CODE +
          '\n' +
          contents.slice(insertionIndex);
        fs.writeFileSync(podfilePath, contents);
        console.log('[withFollyCoroutineFix] Injected folly fix inside existing post_install block.');
      } else {
        // No existing post_install block found — append a new one as fallback
        console.warn('[withFollyCoroutineFix] No existing post_install block found, appending a new one.');
        contents +=
          `\npost_install do |installer|` +
          FOLLY_FIX_CODE +
          '\nend\n';
        fs.writeFileSync(podfilePath, contents);
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
