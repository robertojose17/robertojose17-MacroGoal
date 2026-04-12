Pod::Spec.new do |s|
  s.name         = 'RNWorklets'
  s.version      = '0.5.1'
  s.summary      = 'Stub — bundled inside react-native-reanimated 3.17.x'
  s.description  = 'Empty stub to prevent duplicate symbol errors. Worklets are bundled inside react-native-reanimated 3.17.x. Having both causes duplicate symbol linker errors (_OBJC_CLASS_$_NativeWorkletsModuleSpecBase).'
  s.homepage     = 'https://github.com/software-mansion/react-native-reanimated'
  s.license      = 'MIT'
  s.author       = { 'stub' => 'stub@stub.com' }
  s.platform     = :ios, '13.4'
  s.source       = { :path => '.' }
  # No source_files — this is a no-op stub. All worklets symbols are provided
  # by libRNReanimated.a in react-native-reanimated 3.17.x.
  s.source_files = []
  # Exclude all architectures so the empty pod compiles nothing and links nothing.
  # Belt-and-suspenders alongside the post_install hook in withFollyCoroutineFix.js.
  s.pod_target_xcconfig = {
    'EXCLUDED_ARCHS[sdk=iphoneos*]'        => 'arm64 x86_64 arm64e',
    'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'arm64 x86_64 arm64e',
    'EXCLUDED_ARCHS'                       => 'arm64 x86_64 arm64e',
  }
end
