const { withPodfileProperties } = require('@expo/config-plugins');

/**
 * Fix for 'folly/coro/Coroutine.h' file not found on Xcode 26 / iOS 26 SDK.
 *
 * Sets FOLLY_CFG_NO_COROUTINES=1 via Podfile.properties.json.
 * The main fix is applied by scripts/patch-folly.js (source files) and
 * scripts/patch-podfile.js (Podfile post_install hook), both run via
 * eas.json prebuildCommand in the correct order.
 */
const withFollyCoroutineFix = (config) => {
  return withPodfileProperties(config, (cfg) => {
    cfg.modResults['FOLLY_CFG_NO_COROUTINES'] = '1';
    return cfg;
  });
};

module.exports = withFollyCoroutineFix;
