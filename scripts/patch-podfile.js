#!/usr/bin/env node
/**
 * Injects FOLLY_CFG_NO_COROUTINES=1 preprocessor definition into the Podfile.
 * This fixes 'folly/coro/Coroutine.h' file not found on Xcode 26 / iOS 26 SDK.
 *
 * Injects inside the EXISTING post_install block rather than appending a new one,
 * because CocoaPods rejects multiple post_install hooks with:
 *   [!] Specifying multiple 'post_install' hooks is unsupported.
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

// Guard: already patched (by this script or by withFollyCoroutineFix plugin)
if (podfile.includes('FOLLY_CFG_NO_COROUTINES')) {
  console.log('[patch-podfile] Already patched, skipping.');
  process.exit(0);
}

// Find the existing post_install hook and inject immediately after its opening line
const postInstallRegex = /^([ \t]*post_install do \|installer\|[ \t]*)$/m;
if (!postInstallRegex.test(podfile)) {
  console.warn('[patch-podfile] Could not find existing post_install block. Skipping.');
  process.exit(0);
}

const injection = `  # patch-podfile.js — fix folly/coro/Coroutine.h not found on Xcode 26 / iOS 26 SDK
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_CFG_NO_COROUTINES=1'
    end
  end`;

podfile = podfile.replace(postInstallRegex, `$1\n${injection}`);
fs.writeFileSync(podfilePath, podfile, 'utf8');
console.log('[patch-podfile] Podfile patched with FOLLY_CFG_NO_COROUTINES=1 (injected inside existing post_install).');
