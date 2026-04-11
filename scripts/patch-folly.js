#!/usr/bin/env node
/**
 * Patches react-native-reanimated C++ files that include folly headers.
 * Fixes: 'folly/coro/Coroutine.h' file not found on Xcode 26 / iOS 26 SDK.
 * Run BEFORE expo prebuild via eas.json prebuildCommand.
 */
const fs = require('fs');
const path = require('path');

const FOLLY_GUARD = '#ifndef FOLLY_CFG_NO_COROUTINES\n#define FOLLY_CFG_NO_COROUTINES 1\n#endif\n\n';
const projectRoot = process.cwd();

function patchFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('FOLLY_CFG_NO_COROUTINES')) return false;
  fs.writeFileSync(filePath, FOLLY_GUARD + content, 'utf8');
  return true;
}

function scanDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log('[patch-folly] Not found:', dir);
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full);
    } else if (entry.name.endsWith('.cpp') || entry.name.endsWith('.h')) {
      try {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('#include <folly/') || content.includes('#include "folly/')) {
          if (patchFile(full)) {
            console.log('[patch-folly] Patched:', path.relative(projectRoot, full));
          }
        }
      } catch (e) { /* skip */ }
    }
  }
}

console.log('[patch-folly] Patching folly-dependent files...');
scanDir(path.join(projectRoot, 'node_modules/react-native-reanimated/Common/cpp'));
console.log('[patch-folly] Done.');
