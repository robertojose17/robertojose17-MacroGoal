const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Adds FOLLY_CFG_NO_COROUTINES=1 to the existing post_install hook in the Podfile.
 * Fixes: 'folly/coro/Coroutine.h' file not found on Xcode 26 / iOS 26 SDK.
 *
 * Instead of appending a new post_install block (which CocoaPods rejects as of
 * recent versions), this plugin finds the existing `post_install do |installer|`
 * line and injects the fix code immediately after it.
 */
function withFollyCoroutineFix(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        console.warn('[withFollyCoroutineFix] Podfile not found, skipping.');
        return cfg;
      }

      let content = fs.readFileSync(podfilePath, 'utf8');

      // Guard: already patched
      if (content.includes('withFollyCoroutineFix')) {
        console.log('[withFollyCoroutineFix] Already patched.');
        return cfg;
      }

      // Find the existing post_install hook and inject immediately after its opening line
      const postInstallRegex = /^([ \t]*post_install do \|installer\|[ \t]*)$/m;
      if (!postInstallRegex.test(content)) {
        console.warn('[withFollyCoroutineFix] Could not find existing post_install block. Skipping.');
        return cfg;
      }

      const injection = `  # withFollyCoroutineFix — disable Folly coroutines for Xcode 26 / iOS 26 SDK
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_CFG_NO_COROUTINES=1'
    end
  end`;

      content = content.replace(postInstallRegex, `$1\n${injection}`);
      fs.writeFileSync(podfilePath, content, 'utf8');
      console.log('[withFollyCoroutineFix] Podfile patched (injected inside existing post_install).');
      return cfg;
    },
  ]);
}

module.exports = withFollyCoroutineFix;
