const { withPodfileProperties, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const FOLLY_GUARD = `// Fix for Xcode 26 / iOS 26 SDK: folly/coro/Coroutine.h is missing
#ifndef FOLLY_CFG_NO_COROUTINES
#define FOLLY_CFG_NO_COROUTINES 1
#endif

`;

const FILES_TO_PATCH = [
  'node_modules/react-native-reanimated/Common/cpp/reanimated/Fabric/ShadowTreeCloner.cpp',
];

const withFollyCoroutineFix = (config) => {
  // 1. Set via Podfile properties
  config = withPodfileProperties(config, (cfg) => {
    cfg.modResults['FOLLY_CFG_NO_COROUTINES'] = '1';
    return cfg;
  });

  // 2. Patch source files directly so the define is present before any folly include
  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      for (const relPath of FILES_TO_PATCH) {
        const filePath = path.join(projectRoot, relPath);
        if (!fs.existsSync(filePath)) continue;
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('FOLLY_CFG_NO_COROUTINES')) continue; // already patched
        fs.writeFileSync(filePath, FOLLY_GUARD + content, 'utf8');
      }
      return cfg;
    },
  ]);

  return config;
};

module.exports = withFollyCoroutineFix;
