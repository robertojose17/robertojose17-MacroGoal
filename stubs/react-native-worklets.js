'use strict';
// react-native-worklets is stubbed out because react-native-reanimated 3.x
// bundles worklets internally. Having both linked natively causes duplicate
// symbol linker errors (_OBJC_CLASS_$_NativeWorkletsModuleSpecBase, worklets::*)
// between libRNReanimated.a and libRNWorklets.a.
// All worklet primitives should be imported from 'react-native-reanimated' instead.
module.exports = {
  default: {},
  useWorklet: function() {},
  runOnJS: function(fn) { return fn; },
  runOnUI: function(fn) { return fn; },
};
