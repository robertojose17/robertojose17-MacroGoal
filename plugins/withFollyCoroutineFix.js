const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Adds FOLLY_CFG_NO_COROUTINES=1 to the Podfile post_install hook.
 * Fixes: 'folly/coro/Coroutine.h' file not found on Xcode 26 / iOS 26 SDK.
 * The RCT-Folly pod includes folly/coro/ headers incompatible with Xcode 26.
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

      if (content.includes('FOLLY_CFG_NO_COROUTINES')) {
        console.log('[withFollyCoroutineFix] Already patched.');
        return cfg;
      }

      const block = `
# withFollyCoroutineFix — disable Folly coroutines for Xcode 26 / iOS 26 SDK
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |build_config|
      existing = build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS']
      if existing.nil?
        build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = ['$(inherited)', 'FOLLY_CFG_NO_COROUTINES=1']
      elsif existing.is_a?(Array)
        unless existing.any? { |d| d.to_s.include?('FOLLY_CFG_NO_COROUTINES') }
          build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = existing + ['FOLLY_CFG_NO_COROUTINES=1']
        end
      elsif existing.is_a?(String)
        unless existing.include?('FOLLY_CFG_NO_COROUTINES')
          build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = existing + ' FOLLY_CFG_NO_COROUTINES=1'
        end
      end
    end
  end
end
`;

      content = content + '\n' + block;
      fs.writeFileSync(podfilePath, content, 'utf8');
      console.log('[withFollyCoroutineFix] Podfile patched.');
      return cfg;
    },
  ]);
}

module.exports = withFollyCoroutineFix;
