#!/usr/bin/env node
/**
 * Injects FOLLY_CFG_NO_COROUTINES=1 preprocessor definition into the Podfile.
 * This fixes 'folly/coro/Coroutine.h' file not found on Xcode 26 / iOS 26 SDK.
 *
 * The RCT-Folly CocoaPod includes folly/coro/ headers that are incompatible
 * with Xcode 26. Setting FOLLY_CFG_NO_COROUTINES=1 disables those code paths.
 *
 * Run AFTER expo prebuild (the Podfile must already exist).
 * Safe to run on Android-only builds — exits cleanly if Podfile is absent.
 */
const fs = require('fs');
const path = require('path');

const podfilePath = path.join(process.cwd(), 'ios', 'Podfile');

if (!fs.existsSync(podfilePath)) {
  console.log('[patch-podfile] No Podfile found (not an iOS build?), skipping.');
  process.exit(0);
}

let podfile = fs.readFileSync(podfilePath, 'utf8');

if (podfile.includes('FOLLY_CFG_NO_COROUTINES')) {
  console.log('[patch-podfile] Already patched, skipping.');
  process.exit(0);
}

// Append a standalone post_install block.
// CocoaPods allows multiple post_install blocks — each runs in order.
const postInstallBlock = `
# patch-podfile.js — fix folly/coro/Coroutine.h not found on Xcode 26 / iOS 26 SDK
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      # Disable Folly coroutines — incompatible with Xcode 26 / iOS 26 SDK
      existing = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS']
      if existing.nil?
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = ['$(inherited)', 'FOLLY_CFG_NO_COROUTINES=1']
      elsif existing.is_a?(Array)
        unless existing.any? { |d| d.to_s.include?('FOLLY_CFG_NO_COROUTINES') }
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = existing + ['FOLLY_CFG_NO_COROUTINES=1']
        end
      elsif existing.is_a?(String)
        unless existing.include?('FOLLY_CFG_NO_COROUTINES')
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = [existing, 'FOLLY_CFG_NO_COROUTINES=1']
        end
      end
    end
  end
end
`;

podfile = podfile + '\n' + postInstallBlock;
fs.writeFileSync(podfilePath, podfile, 'utf8');
console.log('[patch-podfile] Podfile patched with FOLLY_CFG_NO_COROUTINES=1 post_install hook.');
