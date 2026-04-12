#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
let patched = 0, skipped = 0, missing = 0;

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

const fabricDir = path.join(
  projectRoot,
  'node_modules/react-native-reanimated/Common/cpp/reanimated/Fabric'
);

// Fix 1: FOLLY_CFG_NO_COROUTINES for ReanimatedMountHook and ReanimatedCommitHook
for (const name of ['ReanimatedMountHook.cpp', 'ReanimatedCommitHook.cpp']) {
  const filePath = path.join(fabricDir, name);
  if (!fs.existsSync(filePath)) { missing++; console.log('[patch-folly] Not found (ok):', name); continue; }
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(FOLLY_MARKER)) { skipped++; console.log('[patch-folly] Already patched:', name); continue; }
  fs.writeFileSync(filePath, FOLLY_BLOCK + content, 'utf8');
  patched++; console.log('[patch-folly] Patched (folly):', name);
}

// Fix 2: Replace ShadowTreeCloner.cpp entirely
const shadowTreeClonerPath = path.join(fabricDir, 'ShadowTreeCloner.cpp');
if (!fs.existsSync(shadowTreeClonerPath)) {
  missing++; console.log('[patch-folly] ShadowTreeCloner.cpp not found (ok)');
} else {
  const content = fs.readFileSync(shadowTreeClonerPath, 'utf8');
  if (content.includes(RANGES_MARKER)) {
    skipped++; console.log('[patch-folly] ShadowTreeCloner.cpp already patched');
  } else {
    fs.writeFileSync(shadowTreeClonerPath, FIXED_SHADOW_TREE_CLONER, 'utf8');
    patched++; console.log('[patch-folly] Patched ShadowTreeCloner.cpp (<ranges> removed)');
  }
}

// Fix 3: ReanimatedMountHook.h — replace `double mountTime` with `HighResTimeStamp mountTime`
const mountHookHPath = path.join(fabricDir, 'ReanimatedMountHook.h');
if (!fs.existsSync(mountHookHPath)) {
  missing++; console.log('[patch-folly] ReanimatedMountHook.h not found (ok)');
} else {
  const content = fs.readFileSync(mountHookHPath, 'utf8');
  if (content.includes(MOUNT_HOOK_MARKER)) {
    skipped++; console.log('[patch-folly] ReanimatedMountHook.h already patched');
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
    patched++; console.log('[patch-folly] Patched ReanimatedMountHook.h (HighResTimeStamp)');
  }
}

// Fix 4: ReanimatedMountHook.cpp — replace `double)` with `HighResTimeStamp /*mountTime*/)`
const mountHookCppPath = path.join(fabricDir, 'ReanimatedMountHook.cpp');
if (!fs.existsSync(mountHookCppPath)) {
  missing++; console.log('[patch-folly] ReanimatedMountHook.cpp not found (ok)');
} else {
  const content = fs.readFileSync(mountHookCppPath, 'utf8');
  if (content.includes(MOUNT_HOOK_MARKER)) {
    skipped++; console.log('[patch-folly] ReanimatedMountHook.cpp already patched');
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
    patched++; console.log('[patch-folly] Patched ReanimatedMountHook.cpp (HighResTimeStamp)');
  }
}

// Fix 5: ReanimatedModuleProxy.cpp — add shadowNodeFromValue compat shim for RN 0.81.x
const reanimatedProxyPath = path.join(
  projectRoot,
  'node_modules/react-native-reanimated/Common/cpp/reanimated/NativeModules/ReanimatedModuleProxy.cpp'
);
const PROXY_SHIM_MARKER = 'compat-shim: shadowNodeFromValue removed in RN 0.81.x';
// Shim goes AFTER the primitives.h include — no need to re-include it
const PROXY_SHIM = `\n// ${PROXY_SHIM_MARKER}\nnamespace {\ninline facebook::react::ShadowNode::Shared shadowNodeFromValue(\n    facebook::jsi::Runtime &rt,\n    const facebook::jsi::Value &value) {\n  return shadowNodeListFromValue(rt, value).front();\n}\n} // namespace\n`;
const PRIMITIVES_INCLUDE = '#include <react/renderer/uimanager/primitives.h>';

if (!fs.existsSync(reanimatedProxyPath)) {
  missing++; console.log('[patch-folly] ReanimatedModuleProxy.cpp not found (ok)');
} else {
  let content = fs.readFileSync(reanimatedProxyPath, 'utf8');
  if (content.includes(PROXY_SHIM_MARKER)) {
    skipped++; console.log('[patch-folly] ReanimatedModuleProxy.cpp already has compat shim');
  } else if (!content.includes(PRIMITIVES_INCLUDE)) {
    missing++; console.log('[patch-folly] ReanimatedModuleProxy.cpp: primitives.h include not found, skipping shim');
  } else {
    // Remove any previous bad patches (replaceAll attempts that changed call sites)
    content = content
      .replaceAll('shadowNodeListFromValue(rnRuntime, shadowNodeWrapper).front()', 'shadowNodeFromValue(rnRuntime, shadowNodeWrapper)')
      .replaceAll('shadowNodeListFromValue(rt, shadowNodeWrapper).front()', 'shadowNodeFromValue(rt, shadowNodeWrapper)')
      .replaceAll('shadowNodeListFromValue(rt, shadowNodeValue).front()', 'shadowNodeFromValue(rt, shadowNodeValue)')
      .replaceAll('shadowNodeListFromValue(rnRuntime, shadowNodeWrapper)->front()', 'shadowNodeFromValue(rnRuntime, shadowNodeWrapper)')
      .replaceAll('shadowNodeListFromValue(rt, shadowNodeWrapper)->front()', 'shadowNodeFromValue(rt, shadowNodeWrapper)')
      .replaceAll('shadowNodeListFromValue(rt, shadowNodeValue)->front()', 'shadowNodeFromValue(rt, shadowNodeValue)');
    // Inject shim right after the primitives.h include line
    content = content.replace(PRIMITIVES_INCLUDE, PRIMITIVES_INCLUDE + PROXY_SHIM);
    fs.writeFileSync(reanimatedProxyPath, content, 'utf8');
    patched++; console.log('[patch-folly] Patched ReanimatedModuleProxy.cpp: injected shadowNodeFromValue compat shim after primitives.h');
  }
}

console.log(`[patch-folly] Done. patched=${patched} skipped=${skipped} missing=${missing}`);
process.exit(0);
