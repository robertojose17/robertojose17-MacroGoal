#!/usr/bin/env node
/**
 * Patches react-native-reanimated C++ source files that include ANY folly header.
 * Fixes: 'folly/coro/Coroutine.h' file not found on Xcode 26 / iPhoneOS26.0.sdk.
 *
 * Root cause: folly headers transitively pull in folly/coro/Coroutine.h, which
 * requires C++20 coroutine support that Xcode 26's clang does not provide for
 * the iOS target in the same way. Setting FOLLY_CFG_NO_COROUTINES=1 disables
 * the coroutine code paths inside folly.
 *
 * Strategy: prepend a #define guard at the very top of every .cpp/.h file that
 * contains any `#include <folly/` or `#include "folly/` line. This is a
 * belt-and-suspenders complement to the Podfile GCC_PREPROCESSOR_DEFINITIONS
 * injection — the source-level define fires before any header is parsed.
 *
 * Idempotent: files already containing the marker are skipped.
 *
 * Run via eas.json prebuildCommand BEFORE expo prebuild.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

// Directories to scan
const SCAN_DIRS = [
  path.join(projectRoot, 'node_modules/react-native-reanimated/Common/cpp'),
  path.join(projectRoot, 'node_modules/react-native-reanimated/android'),
  path.join(projectRoot, 'node_modules/react-native-reanimated/ios'),
];

// Specific high-priority files to always patch if they exist
const PRIORITY_FILES = [
  'node_modules/react-native-reanimated/Common/cpp/reanimated/Fabric/ReanimatedMountHook.cpp',
  'node_modules/react-native-reanimated/Common/cpp/reanimated/Fabric/ShadowTreeCloner.cpp',
  'node_modules/react-native-reanimated/Common/cpp/reanimated/Fabric/ReanimatedCommitHook.cpp',
  'node_modules/react-native-reanimated/Common/cpp/reanimated/Core/ReanimatedHiddenHeaders.h',
].map((p) => path.join(projectRoot, p));

// Match any #include that pulls in a folly header (angle-bracket or quoted)
const FOLLY_INCLUDE_RE = /#include\s+[<"]folly\//;

// Idempotency marker — if this string is present the file is already patched
const ALREADY_PATCHED_MARKER = 'patch-folly: disable coroutines';

// The define block to prepend
const DEFINE_BLOCK =
  '// patch-folly: disable coroutines for Xcode 26\n' +
  '#ifndef FOLLY_CFG_NO_COROUTINES\n' +
  '#define FOLLY_CFG_NO_COROUTINES 1\n' +
  '#endif\n\n';

let patchedCount = 0;
let skippedCount = 0;
let missingCount = 0;

function patchFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (_e) {
    missingCount++;
    return;
  }

  // Idempotency check
  if (content.includes(ALREADY_PATCHED_MARKER)) {
    skippedCount++;
    return;
  }

  // Only patch files that actually include folly headers
  if (!FOLLY_INCLUDE_RE.test(content)) {
    return;
  }

  try {
    fs.writeFileSync(filePath, DEFINE_BLOCK + content, 'utf8');
    patchedCount++;
    console.log('[patch-folly] Patched:', path.relative(projectRoot, filePath));
  } catch (e) {
    console.error('[patch-folly] Failed to write:', filePath, e.message);
  }
}

function patchFileUnconditionally(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (_e) {
    // File doesn't exist on this machine — that's fine
    return;
  }

  if (content.includes(ALREADY_PATCHED_MARKER)) {
    skippedCount++;
    return;
  }

  try {
    fs.writeFileSync(filePath, DEFINE_BLOCK + content, 'utf8');
    patchedCount++;
    console.log('[patch-folly] Patched (priority):', path.relative(projectRoot, filePath));
  } catch (e) {
    console.error('[patch-folly] Failed to write:', filePath, e.message);
  }
}

function scanDir(dir) {
  if (!fs.existsSync(dir)) {
    console.warn('[patch-folly] Directory not found (will exist on build server):', path.relative(projectRoot, dir));
    return;
  }

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    console.error('[patch-folly] Cannot read dir:', dir, e.message);
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (ext === '.cpp' || ext === '.h' || ext === '.mm' || ext === '.cc') {
        patchFile(full);
      }
    }
  }
}

console.log('[patch-folly] Starting folly coroutine patch for react-native-reanimated...');

// 1. Patch priority files unconditionally (even if they don't match the regex,
//    they are known to trigger the build error)
console.log('[patch-folly] Patching priority files...');
for (const f of PRIORITY_FILES) {
  patchFileUnconditionally(f);
}

// 2. Scan all C++ source directories
console.log('[patch-folly] Scanning source directories...');
for (const dir of SCAN_DIRS) {
  scanDir(dir);
}

console.log(
  `[patch-folly] Done. Patched: ${patchedCount}, Already patched (skipped): ${skippedCount}, Not found: ${missingCount}`
);
