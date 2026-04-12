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

  // Fix 5: ReanimatedModuleProxy.cpp — add shadowNodeFromValue compat shim for RN 0.81.x
  const reanimatedProxyPath = path.join(
    projectRoot,
    'node_modules/react-native-reanimated/Common/cpp/reanimated/NativeModules/ReanimatedModuleProxy.cpp'
  );
  const PROXY_SHIM_MARKER = 'compat-shim-v6: shadowNodeFromValue removed in RN 0.81.x';
  // Shim goes AFTER the primitives.h include — no need to re-include it
  const PROXY_SHIM = `\n// ${PROXY_SHIM_MARKER}\nnamespace {\ninline facebook::react::ShadowNode::Shared shadowNodeFromValue(\n    facebook::jsi::Runtime &rt,\n    const facebook::jsi::Value &value) {\n  auto result = shadowNodeListFromValue(rt, value);\n  return result->at(0);\n}\n} // namespace\n`;
  const PRIMITIVES_INCLUDE = '#include <react/renderer/uimanager/primitives.h>';

  if (!fs.existsSync(reanimatedProxyPath)) {
    console.log('[withFollyCoroutineFix] ReanimatedModuleProxy.cpp not found (ok)');
  } else {
    let proxyContent = fs.readFileSync(reanimatedProxyPath, 'utf8');
    if (proxyContent.includes(PROXY_SHIM_MARKER)) {
      console.log('[withFollyCoroutineFix] ReanimatedModuleProxy.cpp already has v6 compat shim');
    } else {
      // Remove any old shim versions
      const oldMarkers = [
        'compat-shim: shadowNodeFromValue removed in RN 0.81.x',
        'compat-shim-v5: shadowNodeFromValue removed in RN 0.81.x',
      ];
      for (const oldMarker of oldMarkers) {
        if (proxyContent.includes(oldMarker)) {
          const shimStart = proxyContent.indexOf('// ' + oldMarker);
          const shimEnd = proxyContent.indexOf('} // namespace\n', shimStart) + '} // namespace\n'.length;
          proxyContent = proxyContent.slice(0, shimStart) + proxyContent.slice(shimEnd);
          console.log('[withFollyCoroutineFix] Removed old shim version');
        }
      }
      // Also remove any call-site replacements from even older attempts
      proxyContent = proxyContent
        .replaceAll('shadowNodeListFromValue(rnRuntime, shadowNodeWrapper).front()', 'shadowNodeFromValue(rnRuntime, shadowNodeWrapper)')
        .replaceAll('shadowNodeListFromValue(rt, shadowNodeWrapper).front()', 'shadowNodeFromValue(rt, shadowNodeWrapper)')
        .replaceAll('shadowNodeListFromValue(rt, shadowNodeValue).front()', 'shadowNodeFromValue(rt, shadowNodeValue)')
        .replaceAll('shadowNodeListFromValue(rnRuntime, shadowNodeWrapper)->front()', 'shadowNodeFromValue(rnRuntime, shadowNodeWrapper)')
        .replaceAll('shadowNodeListFromValue(rt, shadowNodeWrapper)->front()', 'shadowNodeFromValue(rt, shadowNodeWrapper)')
        .replaceAll('shadowNodeListFromValue(rt, shadowNodeValue)->front()', 'shadowNodeFromValue(rt, shadowNodeValue)');
      if (!proxyContent.includes(PRIMITIVES_INCLUDE)) {
        console.log('[withFollyCoroutineFix] ReanimatedModuleProxy.cpp: primitives.h include not found, skipping shim');
      } else {
        proxyContent = proxyContent.replace(PRIMITIVES_INCLUDE, PRIMITIVES_INCLUDE + PROXY_SHIM);
        fs.writeFileSync(reanimatedProxyPath, proxyContent, 'utf8');
        console.log('[withFollyCoroutineFix] Patched ReanimatedModuleProxy.cpp: injected v6 compat shim');
      }
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

  if (content.includes('withFollyCoroutineFix-v6')) {
    console.log('[withFollyCoroutineFix] Podfile already patched.');
    return;
  }

  // Try to inject inside an existing post_install block first
  const postInstallRegex = /^([ \t]*post_install do \|installer\|[ \t]*)$/m;
  const injection = `  # withFollyCoroutineFix-v6 — disable Folly coroutines for Xcode 26 / iPhoneOS26.0.sdk
  unless installer.pods_project.nil?
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        unless config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'].include?('FOLLY_CFG_NO_COROUTINES=1')
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_CFG_NO_COROUTINES=1'
        end
      end
    end

    # Fix duplicate symbols: RNReanimated 3.17.x already bundles worklets symbols,
    # so remove libRNWorklets.a from every target's link phase to avoid collision.
    installer.pods_project.targets.each do |target|
      target.build_phases.each do |phase|
        next unless phase.is_a?(Xcodeproj::Project::Object::PBXFrameworksBuildPhase)
        phase.files.each do |file|
          if file.display_name&.include?('RNWorklets')
            phase.remove_file_reference(file.file_ref)
          end
        end
      end
    end

    # Fix shadowNodeFromValue removed in RN 0.81.x — inject compat shim into ReanimatedModuleProxy.cpp
    proxy_cpp_candidates = Dir.glob(File.join(installer.sandbox.root, '**', 'ReanimatedModuleProxy.cpp'))
    proxy_cpp_candidates.each do |proxy_cpp_path|
      next unless File.exist?(proxy_cpp_path)
      content = File.read(proxy_cpp_path)
      shim_marker = 'compat-shim-v6: shadowNodeFromValue removed in RN 0.81.x'
      primitives_include = '#include <react/renderer/uimanager/primitives.h>'
      next if content.include?(shim_marker)
      next unless content.include?(primitives_include)
      shim = <<~SHIM

// compat-shim-v6: shadowNodeFromValue removed in RN 0.81.x
namespace {
inline facebook::react::ShadowNode::Shared shadowNodeFromValue(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &value) {
  auto result = shadowNodeListFromValue(rt, value);
  return result->at(0);
}
} // namespace
SHIM
      patched_content = content.sub(primitives_include, primitives_include + shim)
      File.write(proxy_cpp_path, patched_content)
      puts "[withFollyCoroutineFix] Patched ReanimatedModuleProxy.cpp: injected v6 compat shim"
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
