const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin that patches the generated Podfile to disable Folly coroutine
 * support, fixing the 'folly/coro/Coroutine.h file not found' build error
 * when building with iPhoneOS26.0.sdk (Xcode 26).
 */
const withFollyCoroutineFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        console.warn('[withFollyCoroutineFix] Podfile not found, skipping patch.');
        return config;
      }

      let podfileContents = fs.readFileSync(podfilePath, 'utf8');

      const follyFix = `
  # Fix Folly coroutine issue with iOS 26 SDK (iPhoneOS26.0.sdk / Xcode 26)
  # Resolves: 'folly/coro/Coroutine.h' file not found
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_CFG_NO_COROUTINES=1'
    end
  end`;

      // Guard: don't patch twice
      if (podfileContents.includes('FOLLY_CFG_NO_COROUTINES')) {
        console.log('[withFollyCoroutineFix] Podfile already patched, skipping.');
        return config;
      }

      if (podfileContents.includes('post_install do |installer|')) {
        // Merge into existing post_install block
        podfileContents = podfileContents.replace(
          'post_install do |installer|',
          `post_install do |installer|\n${follyFix}`
        );
        console.log('[withFollyCoroutineFix] Merged FOLLY_CFG_NO_COROUTINES into existing post_install block.');
      } else {
        // Append a new post_install block at the end
        podfileContents += `\npost_install do |installer|\n${follyFix}\nend\n`;
        console.log('[withFollyCoroutineFix] Added new post_install block with FOLLY_CFG_NO_COROUTINES fix.');
      }

      fs.writeFileSync(podfilePath, podfileContents);
      return config;
    },
  ]);
};

module.exports = withFollyCoroutineFix;
