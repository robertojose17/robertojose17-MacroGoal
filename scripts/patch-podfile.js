#!/usr/bin/env node
/**
 * Injects FOLLY_CFG_NO_COROUTINES=1 into the generated Podfile's post_install hook.
 * Fixes: 'folly/coro/Coroutine.h' file not found on Xcode 26 / iOS 26 SDK.
 * Run AFTER expo prebuild via eas.json prebuildCommand.
 */
const fs = require('fs');
const path = require('path');

const FOLLY_RUBY = `
  # patch-podfile.js: fix folly/coro/Coroutine.h not found on Xcode 26 / iOS 26 SDK
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |build_config|
      defs = build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS']
      if defs.nil?
        build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = ['$(inherited)', 'FOLLY_CFG_NO_COROUTINES=1']
      elsif defs.is_a?(Array)
        unless defs.any? { |d| d.to_s.include?('FOLLY_CFG_NO_COROUTINES') }
          build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs + ['FOLLY_CFG_NO_COROUTINES=1']
        end
      elsif defs.is_a?(String)
        unless defs.include?('FOLLY_CFG_NO_COROUTINES')
          build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = [defs, 'FOLLY_CFG_NO_COROUTINES=1']
        end
      end
    end
  end
`;

const podfilePath = path.join(process.cwd(), 'ios', 'Podfile');

if (!fs.existsSync(podfilePath)) {
  console.error('[patch-podfile] ERROR: Podfile not found at', podfilePath);
  process.exit(1);
}

let podfile = fs.readFileSync(podfilePath, 'utf8');

if (podfile.includes('patch-podfile.js')) {
  console.log('[patch-podfile] Already patched, skipping.');
  process.exit(0);
}

if (podfile.includes('post_install do |installer|')) {
  podfile = podfile.replace(
    'post_install do |installer|',
    'post_install do |installer|' + FOLLY_RUBY
  );
  console.log('[patch-podfile] Injected into existing post_install hook.');
} else {
  podfile += '\npost_install do |installer|' + FOLLY_RUBY + '\nend\n';
  console.log('[patch-podfile] Added new post_install hook.');
}

fs.writeFileSync(podfilePath, podfile, 'utf8');
console.log('[patch-podfile] Done.');
