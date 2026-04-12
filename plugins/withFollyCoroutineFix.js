const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Two-pronged fix for 'folly/coro/Coroutine.h file not found' on Xcode 26 / iPhoneOS26.0.sdk:
 *
 * 1. SOURCE-LEVEL PATCH (primary): runs scripts/patch-folly.js to prepend
 *    `#define FOLLY_CFG_NO_COROUTINES 1` at the top of every reanimated C++
 *    file that includes any folly header. This fires before the compiler ever
 *    sees the folly/coro/ include chain.
 *
 * 2. PODFILE INJECTION (belt-and-suspenders): injects FOLLY_CFG_NO_COROUTINES=1
 *    into GCC_PREPROCESSOR_DEFINITIONS inside the existing post_install block.
 */
function withFollyCoroutineFix(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      // ── Step 1: Run the source-level patch script ──────────────────────────
      const patchScript = path.join(cfg.modRequest.projectRoot, 'scripts/patch-folly.js');
      if (fs.existsSync(patchScript)) {
        try {
          console.log('[withFollyCoroutineFix] Running source-level patch script...');
          execSync(`node "${patchScript}"`, {
            cwd: cfg.modRequest.projectRoot,
            stdio: 'inherit',
          });
        } catch (e) {
          // Non-fatal: log and continue so prebuild isn't blocked
          console.warn('[withFollyCoroutineFix] patch-folly.js exited with error:', e.message);
        }
      } else {
        console.warn('[withFollyCoroutineFix] patch-folly.js not found at:', patchScript);
      }

      // ── Step 2: Inject into Podfile post_install (belt-and-suspenders) ─────
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        console.warn('[withFollyCoroutineFix] Podfile not found, skipping Podfile injection.');
        return cfg;
      }

      let content = fs.readFileSync(podfilePath, 'utf8');

      // Guard: already patched
      if (content.includes('withFollyCoroutineFix')) {
        console.log('[withFollyCoroutineFix] Podfile already patched.');
        return cfg;
      }

      // Find the existing post_install hook and inject immediately after its opening line
      const postInstallRegex = /^([ \t]*post_install do \|installer\|[ \t]*)$/m;
      if (!postInstallRegex.test(content)) {
        console.warn('[withFollyCoroutineFix] Could not find existing post_install block — skipping Podfile injection.');
        return cfg;
      }

      const injection = `  # withFollyCoroutineFix — disable Folly coroutines for Xcode 26 / iOS 26 SDK
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
      unless config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'].include?('FOLLY_CFG_NO_COROUTINES=1')
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_CFG_NO_COROUTINES=1'
      end
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
