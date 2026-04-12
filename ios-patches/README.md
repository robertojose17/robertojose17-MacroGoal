# ios-patches

This directory contains stub podspecs used to override conflicting CocoaPods dependencies.

## RNWorklets.podspec
Overrides `react-native-worklets` to produce an empty pod.
react-native-reanimated 3.17.x bundles worklets internally, so having both
causes duplicate symbol linker errors (_OBJC_CLASS_$_NativeWorkletsModuleSpecBase, worklets::*).
