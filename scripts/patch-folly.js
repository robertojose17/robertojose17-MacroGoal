#!/usr/bin/env node
/**
 * Patches react-native-reanimated C++ files that include folly/coro/ headers.
 * Fixes: 'folly/coro/Coroutine.h' file not found on Xcode 26 / iOS 26 SDK.
 *
 * Strategy: for each #include line that references folly/coro/, wrap it with
 * an #ifndef FOLLY_CFG_NO_COROUTINES guard AND prepend a define at the top of
 * the file so the include is skipped when the flag is set (also set via Podfile).
 *
 * Run BEFORE expo prebuild via eas.json prebuildCommand.
 */
const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const REANIMATED_CPP = path.join(projectRoot, 'node_modules/react-native-reanimated/Common/cpp');
const REANIMATED_IOS = path.join(projectRoot, 'node_modules/react-native-reanimated/ios');
const REANIMATED_ANDROID = path.join(projectRoot, 'node_modules/react-native-reanimated/android');

// Matches any #include line that pulls in a folly/coro/ header
const FOLLY_CORO_INCLUDE_RE = /^([ \t]*#include\s+[<"][^"'>]*folly\/coro\/[^"'>]*[">].*)$/gm;
const ALREADY_PATCHED_MARKER = 'FOLLY_CFG_NO_COROUTINES';

// Prepend this define block at the very top of any file that has folly/coro includes
const DEFINE_HEADER = '#ifndef FOLLY_CFG_NO_COROUTINES\n#define FOLLY_CFG_NO_COROUTINES 1\n#endif\n\n';

let patchedCount = 0;
let skippedCount = 0;

function patchFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return;
  }

  // Skip if already patched
  if (content.includes(ALREADY_PATCHED_MARKER)) {
    skippedCount++;
    return;
  }

  // Only touch files that actually include folly/coro/ headers
  FOLLY_CORO_INCLUDE_RE.lastIndex = 0;
  if (!FOLLY_CORO_INCLUDE_RE.test(content)) {
    return;
  }
  FOLLY_CORO_INCLUDE_RE.lastIndex = 0;

  // Wrap each folly/coro include with a guard
  const wrapped = content.replace(FOLLY_CORO_INCLUDE_RE, (match) => {
    return `#ifndef FOLLY_CFG_NO_COROUTINES\n${match}\n#endif`;
  });

  // Also prepend the define at the top so the file itself disables coroutines
  fs.writeFileSync(filePath, DEFINE_HEADER + wrapped, 'utf8');
  patchedCount++;
  console.log('[patch-folly] Patched:', path.relative(projectRoot, filePath));
}

function scanDir(dir, extensions) {
  if (!fs.existsSync(dir)) {
    console.warn('[patch-folly] Directory not found:', dir);
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full, extensions);
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      patchFile(full);
    }
  }
}

console.log('[patch-folly] Scanning react-native-reanimated for folly/coro/ includes...');
scanDir(REANIMATED_CPP, ['.cpp', '.h']);
scanDir(REANIMATED_IOS, ['.h', '.mm']);
scanDir(REANIMATED_ANDROID, ['.h', '.cpp']);
console.log(`[patch-folly] Done. Patched: ${patchedCount}, Already patched: ${skippedCount}`);
