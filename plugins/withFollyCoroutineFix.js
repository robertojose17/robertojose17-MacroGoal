const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Fixes iOS build errors with Xcode 26 / iPhoneOS26.0.sdk:
 * 1. `folly/coro/Coroutine.h file not found` — prepends FOLLY_CFG_NO_COROUTINES=1 define
 * 2. `#include <ranges>` broken — replaces ShadowTreeCloner.cpp with C++17-compatible version
 * 3. C++ override mismatch — ReanimatedMountHook::shadowTreeDidMount uses `double mountTime`
 *    but UIManagerMountHook base class changed to `HighResTimeStamp mountTime` in RN 0.81.x
 *
 * Uses withDangerousMod so it runs DURING expo prebuild, after node_modules exist.
 * Also injects FOLLY_CFG_NO_COROUTINES=1 into Podfile post_install as belt-and-suspenders.
 */

const FOLLY_MARKER = 'patch-folly: disable Folly coroutines for Xcode 26';
const FOLLY_BLOCK =
  '// ' + FOLLY_MARKER + '\n' +
  '#ifndef FOLLY_CFG_NO_COROUTINES\n' +
  '#define FOLLY_CFG_NO_COROUTINES 1\n' +
  '#endif\n\n';

const RANGES_MARKER = 'ranges-patch: removed <ranges> for iPhoneOS26.0.sdk';

// Marker for the HighResTimeStamp signature fix
const MOUNT_HOOK_MARKER = 'mount-hook-patch: HighResTimeStamp signature for RN 0.81.x';

const FIXED_SHADOW_TREE_CLONER = `// ${RANGES_MARKER}
// patch-folly: disable Folly coroutines for Xcode 26
#ifndef FOLLY_CFG_NO_COROUTINES
#define FOLLY_CFG_NO_COROUTINES 1
#endif

#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/ShadowTreeCloner.h>

#include <algorithm>
#include <utility>

namespace reanimated {

Props::Shared mergeProps(
    const ShadowNode &shadowNode,
    const PropsMap &propsMap,
    const ShadowNodeFamily &family) {
  const auto it = propsMap.find(&family);

  if (it == propsMap.end()) {
    return ShadowNodeFragment::propsPlaceholder();
  }

  PropsParserContext propsParserContext{
      shadowNode.getSurfaceId(), *shadowNode.getContextContainer()};
  const auto &propsVector = it->second;
  auto newProps = shadowNode.getProps();

#ifdef ANDROID
  if (propsVector.size() > 1) {
    folly::dynamic newPropsDynamic = folly::dynamic::object;
    for (const auto &props : propsVector) {
      newPropsDynamic = folly::dynamic::merge(
          props.operator folly::dynamic(), newPropsDynamic);
    }
    return shadowNode.getComponentDescriptor().cloneProps(
        propsParserContext, newProps, RawProps(newPropsDynamic));
  }
#endif

  for (const auto &props : propsVector) {
    newProps = shadowNode.getComponentDescriptor().cloneProps(
        propsParserContext, newProps, RawProps(props));
  }

  return newProps;
}

ShadowNode::Unshared cloneShadowTreeWithNewPropsRecursive(
    const ShadowNode &shadowNode,
    const ChildrenMap &childrenMap,
    const PropsMap &propsMap) {
  const auto family = &shadowNode.getFamily();
  const auto affectedChildrenIt = childrenMap.find(family);
  auto children = shadowNode.getChildren();

  if (affectedChildrenIt != childrenMap.end()) {
    for (const auto index : affectedChildrenIt->second) {
      children[index] = cloneShadowTreeWithNewPropsRecursive(
          *children[index], childrenMap, propsMap);
    }
  }

  return shadowNode.clone(
      {mergeProps(shadowNode, propsMap, *family),
       std::make_shared<ShadowNode::ListOfShared>(children),
       shadowNode.getState()});
}

RootShadowNode::Unshared cloneShadowTreeWithNewProps(
    const RootShadowNode &oldRootNode,
    const PropsMap &propsMap) {
  ChildrenMap childrenMap;

  for (auto &[family, _] : propsMap) {
    const auto ancestors = family->getAncestors(oldRootNode);

    for (auto rit = ancestors.rbegin(); rit != ancestors.rend(); ++rit) {
      const auto &parentNode = rit->first;
      const auto &index = rit->second;
      const auto parentFamily = &parentNode.get().getFamily();
      auto &affectedChildren = childrenMap[parentFamily];

      if (affectedChildren.contains(index)) {
        continue;
      }

      affectedChildren.insert(index);
    }
  }

  return std::static_pointer_cast<RootShadowNode>(
      cloneShadowTreeWithNewPropsRecursive(oldRootNode, childrenMap, propsMap));
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
`;

function applySourcePatches(projectRoot) {
  const fabricDir = path.join(
    projectRoot,
    'node_modules/react-native-reanimated/Common/cpp/reanimated/Fabric'
  );

  if (!fs.existsSync(fabricDir)) {
    console.warn('[withFollyCoroutineFix] Fabric dir not found — skipping source patches:', fabricDir);
    return;
  }

  // Fix 1: Prepend FOLLY_CFG_NO_COROUTINES to ReanimatedMountHook.cpp and ReanimatedCommitHook.cpp
  const follyTargets = [
    path.join(fabricDir, 'ReanimatedMountHook.cpp'),
    path.join(fabricDir, 'ReanimatedCommitHook.cpp'),
  ];

  for (const filePath of follyTargets) {
    if (!fs.existsSync(filePath)) {
      console.log('[withFollyCoroutineFix] Not found (ok):', filePath);
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(FOLLY_MARKER)) {
      console.log('[withFollyCoroutineFix] Already patched (folly):', path.basename(filePath));
      continue;
    }
    fs.writeFileSync(filePath, FOLLY_BLOCK + content, 'utf8');
    console.log('[withFollyCoroutineFix] Patched (folly):', path.basename(filePath));
  }

  // Fix 2: Replace ShadowTreeCloner.cpp entirely with C++17-compatible version
  const shadowTreeClonerPath = path.join(fabricDir, 'ShadowTreeCloner.cpp');
  if (!fs.existsSync(shadowTreeClonerPath)) {
    console.log('[withFollyCoroutineFix] ShadowTreeCloner.cpp not found (ok)');
  } else {
    const content = fs.readFileSync(shadowTreeClonerPath, 'utf8');
    if (content.includes(RANGES_MARKER)) {
      console.log('[withFollyCoroutineFix] ShadowTreeCloner.cpp already patched (<ranges>)');
    } else {
      fs.writeFileSync(shadowTreeClonerPath, FIXED_SHADOW_TREE_CLONER, 'utf8');
      console.log('[withFollyCoroutineFix] Patched ShadowTreeCloner.cpp (<ranges> removed)');
    }
  }

  // Fix 3: ReanimatedMountHook.h — replace `double mountTime` with `HighResTimeStamp mountTime`
  const mountHookHPath = path.join(fabricDir, 'ReanimatedMountHook.h');
  if (!fs.existsSync(mountHookHPath)) {
    console.log('[withFollyCoroutineFix] ReanimatedMountHook.h not found (ok)');
  } else {
    const content = fs.readFileSync(mountHookHPath, 'utf8');
    if (content.includes(MOUNT_HOOK_MARKER)) {
      console.log('[withFollyCoroutineFix] ReanimatedMountHook.h already patched');
    } else {
      // Replace the entire file with the fixed version
      const fixed = `// ${MOUNT_HOOK_MARKER}
#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/PropsRegistry.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>

#include <react/renderer/uimanager/UIManagerMountHook.h>

#include <memory>

namespace reanimated {

using namespace facebook::react;

class ReanimatedMountHook : public UIManagerMountHook {
 public:
  ReanimatedMountHook(
      const std::shared_ptr<PropsRegistry> &propsRegistry,
      const std::shared_ptr<UIManager> &uiManager);
  ~ReanimatedMountHook() noexcept override;

  void shadowTreeDidMount(
      const RootShadowNode::Shared &rootShadowNode,
      HighResTimeStamp mountTime) noexcept override;

 private:
  const std::shared_ptr<PropsRegistry> propsRegistry_;
  const std::shared_ptr<UIManager> uiManager_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
`;
      fs.writeFileSync(mountHookHPath, fixed, 'utf8');
      console.log('[withFollyCoroutineFix] Patched ReanimatedMountHook.h (HighResTimeStamp)');
    }
  }

  // Fix 5: ReanimatedModuleProxy.cpp — shadowNodeFromValue -> shadowNodeListFromValue(...).front()
  const reanimatedProxyPath = path.join(
    projectRoot,
    'node_modules/react-native-reanimated/Common/cpp/reanimated/NativeModules/ReanimatedModuleProxy.cpp'
  );
  if (!fs.existsSync(reanimatedProxyPath)) {
    console.log('[withFollyCoroutineFix] ReanimatedModuleProxy.cpp not found (ok)');
  } else {
    const proxyContent = fs.readFileSync(reanimatedProxyPath, 'utf8');
    if (proxyContent.includes('shadowNodeFromValue(')) {
      const fixedProxy = proxyContent.replace(/shadowNodeFromValue\(([^)]+)\)/g, 'shadowNodeListFromValue($1).front()');
      fs.writeFileSync(reanimatedProxyPath, fixedProxy, 'utf8');
      console.log('[withFollyCoroutineFix] Patched ReanimatedModuleProxy.cpp: shadowNodeFromValue -> shadowNodeListFromValue(...).front()');
    } else {
      console.log('[withFollyCoroutineFix] ReanimatedModuleProxy.cpp already patched (shadowNodeFromValue not found)');
    }
  }

  // Fix 4: ReanimatedMountHook.cpp — replace `double)` with `HighResTimeStamp /*mountTime*/)`
  const mountHookCppPath = path.join(fabricDir, 'ReanimatedMountHook.cpp');
  if (!fs.existsSync(mountHookCppPath)) {
    console.log('[withFollyCoroutineFix] ReanimatedMountHook.cpp not found (ok)');
  } else {
    const content = fs.readFileSync(mountHookCppPath, 'utf8');
    if (content.includes(MOUNT_HOOK_MARKER)) {
      console.log('[withFollyCoroutineFix] ReanimatedMountHook.cpp already patched');
    } else {
      const fixed = `// ${MOUNT_HOOK_MARKER}
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/ReanimatedCommitShadowNode.h>
#include <reanimated/Fabric/ReanimatedMountHook.h>

namespace reanimated {

ReanimatedMountHook::ReanimatedMountHook(
    const std::shared_ptr<PropsRegistry> &propsRegistry,
    const std::shared_ptr<UIManager> &uiManager)
    : propsRegistry_(propsRegistry), uiManager_(uiManager) {
  uiManager_->registerMountHook(*this);
}

ReanimatedMountHook::~ReanimatedMountHook() noexcept {
  uiManager_->unregisterMountHook(*this);
}

void ReanimatedMountHook::shadowTreeDidMount(
    const RootShadowNode::Shared &rootShadowNode,
    HighResTimeStamp /*mountTime*/) noexcept {
  auto reaShadowNode =
      std::reinterpret_pointer_cast<ReanimatedCommitShadowNode>(
          std::const_pointer_cast<RootShadowNode>(rootShadowNode));

  if (reaShadowNode->hasReanimatedMountTrait()) {
    reaShadowNode->unsetReanimatedMountTrait();
    return;
  }

  {
    auto lock = propsRegistry_->createLock();
    propsRegistry_->handleNodeRemovals(*rootShadowNode);
    propsRegistry_->unpauseReanimatedCommits();
    if (!propsRegistry_->shouldCommitAfterPause()) {
      return;
    }
  }

  const auto &shadowTreeRegistry = uiManager_->getShadowTreeRegistry();
  shadowTreeRegistry.visit(
      rootShadowNode->getSurfaceId(), [&](ShadowTree const &shadowTree) {
        shadowTree.commit(
            [&](RootShadowNode const &oldRootShadowNode)
                -> RootShadowNode::Unshared {
              PropsMap propsMap;

              RootShadowNode::Unshared rootNode =
                  std::static_pointer_cast<RootShadowNode>(
                      oldRootShadowNode.ShadowNode::clone({}));
              {
                auto lock = propsRegistry_->createLock();

                propsRegistry_->for_each([&](const ShadowNodeFamily &family,
                                             const folly::dynamic &props) {
                  propsMap[&family].emplace_back(props);
                });

                rootNode =
                    cloneShadowTreeWithNewProps(oldRootShadowNode, propsMap);
              }

              auto reaShadowNode =
                  std::reinterpret_pointer_cast<ReanimatedCommitShadowNode>(
                      rootNode);
              reaShadowNode->setReanimatedCommitTrait();

              return rootNode;
            },
            {false, true});
      });
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
`;
      fs.writeFileSync(mountHookCppPath, fixed, 'utf8');
      console.log('[withFollyCoroutineFix] Patched ReanimatedMountHook.cpp (HighResTimeStamp)');
    }
  }
}

function applyPodfilePatch(podfilePath) {
  if (!fs.existsSync(podfilePath)) {
    console.log('[withFollyCoroutineFix] Podfile not found, skipping.');
    return;
  }

  let content = fs.readFileSync(podfilePath, 'utf8');

  if (content.includes('withFollyCoroutineFix')) {
    console.log('[withFollyCoroutineFix] Podfile already patched.');
    return;
  }

  // Try to inject inside an existing post_install block first
  const postInstallRegex = /^([ \t]*post_install do \|installer\|[ \t]*)$/m;
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

  if (postInstallRegex.test(content)) {
    content = content.replace(postInstallRegex, `$1\n${injection}`);
    fs.writeFileSync(podfilePath, content, 'utf8');
    console.log('[withFollyCoroutineFix] Podfile patched (injected inside existing post_install).');
    return;
  }

  // No post_install block found — append one at the end of the file
  console.warn('[withFollyCoroutineFix] No post_install block found — appending one to Podfile.');
  const appendedBlock = `
post_install do |installer|
${injection}
end
`;
  fs.writeFileSync(podfilePath, content + appendedBlock, 'utf8');
  console.log('[withFollyCoroutineFix] Podfile patched (appended new post_install block).');
}

function withFollyCoroutineFix(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      // cfg._internal.projectRoot is the repo root; modRequest.projectRoot is also available
      const projectRoot =
        (cfg._internal && cfg._internal.projectRoot) ||
        cfg.modRequest.projectRoot ||
        process.cwd();

      console.log('[withFollyCoroutineFix] projectRoot:', projectRoot);
      console.log('[withFollyCoroutineFix] Applying source patches...');
      applySourcePatches(projectRoot);

      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      console.log('[withFollyCoroutineFix] Podfile path:', podfilePath);
      applyPodfilePatch(podfilePath);

      return cfg;
    },
  ]);
}

module.exports = withFollyCoroutineFix;
