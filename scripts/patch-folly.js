#!/usr/bin/env node
/**
 * Bulletproof patch for 'folly/coro/Coroutine.h file not found' on Xcode 26 / iPhoneOS26.0.sdk.
 *
 * Prepends FOLLY_CFG_NO_COROUTINES=1 define guards to specific reanimated Fabric C++ files.
 * Idempotent — files already containing the marker are skipped.
 * Safe — exits with code 0 even if files are missing (e.g. before node_modules exist).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

// The exact define block to prepend
const MARKER = 'patch-folly: disable Folly coroutines for Xcode 26 / iPhoneOS26.0.sdk';
const DEFINE_BLOCK =
  '// ' + MARKER + '\n' +
  '#ifndef FOLLY_CFG_NO_COROUTINES\n' +
  '#define FOLLY_CFG_NO_COROUTINES 1\n' +
  '#endif\n\n';

// Specific files known to trigger the build error — patch unconditionally
const TARGET_FILES = [
  'node_modules/react-native-reanimated/Common/cpp/reanimated/Fabric/ReanimatedMountHook.cpp',
  'node_modules/react-native-reanimated/Common/cpp/reanimated/Fabric/ShadowTreeCloner.cpp',
  'node_modules/react-native-reanimated/Common/cpp/reanimated/Fabric/ReanimatedCommitHook.cpp',
].map((p) => path.join(projectRoot, p));

// Additional directories to scan for any other folly-including C++ files
const SCAN_DIRS = [
  path.join(projectRoot, 'node_modules/react-native-reanimated/Common/cpp'),
  path.join(projectRoot, 'node_modules/react-native-reanimated/ios'),
];

const FOLLY_INCLUDE_RE = /#include\s+[<"]folly\//;

let patched = 0;
let skipped = 0;
let missing = 0;

function patchFile(filePath, unconditional) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (_e) {
    missing++;
    console.log('[patch-folly] Not found (ok):', path.relative(projectRoot, filePath));
    return;
  }

  if (content.includes(MARKER)) {
    skipped++;
    console.log('[patch-folly] Already patched, skipping:', path.relative(projectRoot, filePath));
    return;
  }

  if (!unconditional && !FOLLY_INCLUDE_RE.test(content)) {
    return;
  }

  try {
    fs.writeFileSync(filePath, DEFINE_BLOCK + content, 'utf8');
    patched++;
    console.log('[patch-folly] Patched:', path.relative(projectRoot, filePath));
  } catch (e) {
    console.error('[patch-folly] ERROR writing:', filePath, e.message);
  }
}

function scanDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log('[patch-folly] Scan dir not found (ok):', path.relative(projectRoot, dir));
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
        patchFile(full, false);
      }
    }
  }
}

// ─── Step 3: Remove <ranges> from ShadowTreeCloner.cpp ───────────────────────
// std::ranges::reverse_view is C++20 and broken under iPhoneOS26.0.sdk.
// Replace with a C++17-compatible manual reverse loop.
const RANGES_MARKER = 'ranges-patch: removed <ranges> for iPhoneOS26.0.sdk';
const SHADOW_TREE_CLONER = path.join(
  projectRoot,
  'node_modules/react-native-reanimated/Common/cpp/reanimated/Fabric/ShadowTreeCloner.cpp'
);

function patchRanges(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (_e) {
    console.log('[patch-folly] ShadowTreeCloner.cpp not found (ok):', path.relative(projectRoot, filePath));
    return;
  }

  if (content.includes(RANGES_MARKER)) {
    console.log('[patch-folly] ShadowTreeCloner.cpp <ranges> patch already applied, skipping.');
    return;
  }

  // Remove #include <ranges>
  content = content.replace(
    '#include <ranges>\n',
    '// #include <ranges> — removed: broken under iPhoneOS26.0.sdk\n'
  );

  // Add #include <algorithm> after #include <utility> if not already present
  if (!content.includes('#include <algorithm>')) {
    content = content.replace(
      '#include <utility>',
      '#include <algorithm>\n#include <utility>'
    );
  }

  // Replace std::ranges::reverse_view(ancestors) with a C++17 reverse loop.
  // Original:
  //   for (const auto &[parentNode, index] :
  //        std::ranges::reverse_view(ancestors)) {
  // Replacement uses rbegin/rend via a helper lambda to keep the same structure.
  content = content.replace(
    /for\s*\(const auto &\[parentNode, index\]\s*:\s*std::ranges::reverse_view\(ancestors\)\)/,
    'for (auto it = ancestors.rbegin(); it != ancestors.rend(); ++it)\n    if (const auto &[parentNode, index] = *it; true)'
  );

  // Prepend the idempotency marker comment
  content = '// ' + RANGES_MARKER + '\n' + content;

  try {
    fs.writeFileSync(filePath, content, 'utf8');
    patched++;
    console.log('[patch-folly] Patched <ranges> in ShadowTreeCloner.cpp');
  } catch (e) {
    console.error('[patch-folly] ERROR writing ShadowTreeCloner.cpp:', e.message);
  }
}

console.log('[patch-folly] Starting — patching react-native-reanimated for Xcode 26 / iPhoneOS26.0.sdk...');

// Step 1: Unconditionally patch the known-bad files (FOLLY_CFG_NO_COROUTINES)
console.log('[patch-folly] Step 1: Patching known target files unconditionally...');
for (const f of TARGET_FILES) {
  patchFile(f, true);
}

// Step 2: Scan broader directories for any other folly-including files
console.log('[patch-folly] Step 2: Scanning for other folly-including C++ files...');
for (const dir of SCAN_DIRS) {
  scanDir(dir);
}

// Step 3: Remove <ranges> / std::ranges::reverse_view from ShadowTreeCloner.cpp
console.log('[patch-folly] Step 3: Patching <ranges> usage in ShadowTreeCloner.cpp...');
patchRanges(SHADOW_TREE_CLONER);

console.log(
  `[patch-folly] Done. patched=${patched} skipped(already done)=${skipped} missing(ok)=${missing}`
);

process.exit(0);
