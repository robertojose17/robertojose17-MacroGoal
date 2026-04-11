const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Fix for 'folly/coro/Coroutine.h' file not found on Xcode 26 / iOS 26 SDK.
 * react-native-reanimated and other pods use Folly with coroutines enabled by default,
 * but the coroutine headers are missing from the iOS 26 SDK.
 *
 * This appends a post_install hook to the Podfile that sets
 * FOLLY_CFG_NO_COROUTINES=1 as a preprocessor definition on every pod target,
 * which disables the coroutine code paths in Folly.
 */
const withFollyCoroutineFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      const marker = '# FOLLY_CFG_NO_COROUTINES_FIX';

      // Only add once
      if (podfileContent.includes(marker)) {
        return cfg;
      }

      const postInstallHook = `
${marker}
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
      unless config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'].include?('FOLLY_CFG_NO_COROUTINES=1')
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_CFG_NO_COROUTINES=1'
      end
    end
  end
end
`;

      // Check if there's already a post_install hook — if so, we need to merge
      // React Native's Podfile template already has a post_install hook.
      // We cannot add a second one. Instead, inject our lines INSIDE the existing one.
      if (podfileContent.includes('post_install do |installer|')) {
        // Inject our lines at the start of the existing post_install block
        const injection = `
  ${marker}
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
      unless config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'].include?('FOLLY_CFG_NO_COROUTINES=1')
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_CFG_NO_COROUTINES=1'
      end
    end
  end
`;
        podfileContent = podfileContent.replace(
          'post_install do |installer|',
          `post_install do |installer|\n${injection}`
        );
      } else {
        // No existing post_install — append ours
        podfileContent += postInstallHook;
      }

      fs.writeFileSync(podfilePath, podfileContent);
      return cfg;
    },
  ]);
};

module.exports = withFollyCoroutineFix;
