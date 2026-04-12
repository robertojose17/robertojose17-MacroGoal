const { withDangerousMod } = require('@expo/config-plugins');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Belt-and-suspenders fix for 'folly/coro/Coroutine.h file not found' on Xcode 26 / iPhoneOS26.0.sdk.
 *
 * Two-pronged approach:
 *  1. Runs scripts/patch-folly.js via execSync DURING expo prebuild (after node_modules exist),
 *     so the source-level #define guard is in place before Xcode compiles anything.
 *  2. Injects FOLLY_CFG_NO_COROUTINES=1 into GCC_PREPROCESSOR_DEFINITIONS for every pod target
 *     via the Podfile post_install hook — covers any Folly-using pod not caught by the source patch.
 */
function withFollyCoroutineFix(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      // ── Step 1: Run the source-file patch script ──────────────────────────
      const projectRoot =
        (cfg._internal && cfg._internal.projectRoot) || process.cwd();
      const patchScript = path.join(projectRoot, 'scripts', 'patch-folly.js');

      if (fs.existsSync(patchScript)) {
        console.log('[withFollyCoroutineFix] Running scripts/patch-folly.js...');
        try {
          execSync(`node "${patchScript}"`, {
            cwd: projectRoot,
            stdio: 'inherit',
          });
        } catch (e) {
          // Non-fatal — log and continue so prebuild doesn't abort
          console.warn('[withFollyCoroutineFix] patch-folly.js exited with error (non-fatal):', e.message);
        }
      } else {
        console.warn('[withFollyCoroutineFix] scripts/patch-folly.js not found, skipping source patch.');
      }

      // ── Step 2: Inject into Podfile post_install ──────────────────────────
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        console.warn('[withFollyCoroutineFix] Podfile not found, skipping Podfile injection.');
        return cfg;
      }

      let content = fs.readFileSync(podfilePath, 'utf8');

      // Idempotency guard
      if (content.includes('withFollyCoroutineFix')) {
        console.log('[withFollyCoroutineFix] Podfile already patched.');
        return cfg;
      }

      // Inject immediately after the opening line of the existing post_install block
      const postInstallRegex = /^([ \t]*post_install do \|installer\|[ \t]*)$/m;
      if (!postInstallRegex.test(content)) {
        console.warn('[withFollyCoroutineFix] Could not find existing post_install block — skipping Podfile injection.');
        return cfg;
      }

      const injection = `  # withFollyCoroutineFix — disable Folly coroutines for Xcode 26 / iPhoneOS26.0.sdk
  unless installer.pods_project.nil?
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        unless config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'].include?('FOLLY_CFG_NO_COROUTINES=1')
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_CFG_NO_COROUTINES=1'
        end
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
