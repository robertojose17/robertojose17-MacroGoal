'use strict';
var React = require('react');
var RN = require('react-native');
var View = RN.View;
var Text = RN.Text;
var ScrollView = RN.ScrollView;
var FlatList = RN.FlatList;
var Image = RN.Image;
var Animated = RN.Animated;

// Layout animation stubs — plain objects with chainable builder methods.
// IMPORTANT: each method returns the SAME object (not a new one) to allow
// chaining (.duration(300).delay(100)) without circular module references.
// These are NOT circular imports — just self-referential JS objects, which
// is perfectly safe at runtime.
function makeLayoutAnimation() {
  var obj = {
    duration: function() { return obj; },
    delay: function() { return obj; },
    springify: function() { return obj; },
    damping: function() { return obj; },
    stiffness: function() { return obj; },
    mass: function() { return obj; },
    overshootClamping: function() { return obj; },
    restDisplacementThreshold: function() { return obj; },
    restSpeedThreshold: function() { return obj; },
    build: function() { return {}; },
    reduceMotion: function() { return obj; },
    withInitialValues: function() { return obj; },
    easing: function() { return obj; },
    randomDelay: function() { return obj; },
  };
  return obj;
}

// createAnimatedComponent — returns the component unchanged in stub mode
function createAnimatedComponent(component) {
  return component;
}

// Shared value stub
function useSharedValue(v) {
  return { value: v, addListener: function() {}, removeListener: function() {} };
}

// Animated style stub — calls fn once to avoid stale closure warnings
function useAnimatedStyle(fn) {
  try { fn(); } catch (e) {}
  return {};
}

function useAnimatedKeyboard() {
  return { height: { value: 0 }, state: { value: 0 } };
}

function useScrollViewOffset() {
  return { value: 0 };
}

function useDerivedValue(fn) {
  var val = 0;
  try { val = fn(); } catch (e) {}
  return { value: val };
}

function useAnimatedProps(fn) {
  try { fn(); } catch (e) {}
  return {};
}

// The default export must include Animated.View etc. so that
// `import Animated from 'react-native-reanimated'; <Animated.View>` works.
var AnimatedDefault = {
  View: View,
  Text: Text,
  ScrollView: ScrollView,
  Image: Image,
  FlatList: FlatList,
  createAnimatedComponent: createAnimatedComponent,
};

var Easing = {
  linear: function(t) { return t; },
  ease: function(t) { return t; },
  quad: function(t) { return t; },
  cubic: function(t) { return t; },
  poly: function() { return function(t) { return t; }; },
  sin: function(t) { return t; },
  circle: function(t) { return t; },
  exp: function(t) { return t; },
  elastic: function() { return function(t) { return t; }; },
  back: function() { return function(t) { return t; }; },
  bounce: function(t) { return t; },
  bezier: function() { return function(t) { return t; }; },
  bezierFn: function() { return function(t) { return t; }; },
  in: function(easing) { return easing; },
  out: function(easing) { return easing; },
  inOut: function(easing) { return easing; },
};

module.exports = {
  default: AnimatedDefault,
  useSharedValue: useSharedValue,
  useAnimatedStyle: useAnimatedStyle,
  withTiming: function(v, config, callback) {
    if (callback) setTimeout(function() { callback(true); }, 0);
    return v;
  },
  withSpring: function(v, config, callback) {
    if (callback) setTimeout(function() { callback(true); }, 0);
    return v;
  },
  withDelay: function(d, v) { return v; },
  withSequence: function() {
    var args = Array.prototype.slice.call(arguments);
    return args[args.length - 1];
  },
  withRepeat: function(v) { return v; },
  withDecay: function() { return 0; },
  interpolate: function(v, input, output) { return output[0]; },
  interpolateColor: function(v, input, output) { return output[0]; },
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  ExtrapolationType: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  runOnJS: function(fn) { return fn; },
  runOnUI: function(fn) { return fn; },
  useAnimatedScrollHandler: function() { return function() {}; },
  useAnimatedRef: function() { return { current: null }; },
  useAnimatedGestureHandler: function() { return {}; },
  useDerivedValue: useDerivedValue,
  useAnimatedReaction: function() {},
  useAnimatedProps: useAnimatedProps,
  useAnimatedKeyboard: useAnimatedKeyboard,
  useScrollViewOffset: useScrollViewOffset,
  cancelAnimation: function() {},
  measure: function() { return null; },
  scrollTo: function() {},
  setGestureState: function() {},
  createAnimatedComponent: createAnimatedComponent,
  addWhitelistedNativeProps: function() {},
  addWhitelistedUIProps: function() {},
  // Layout animations — each is a fresh independent object (no shared state)
  FadeIn: makeLayoutAnimation(),
  FadeOut: makeLayoutAnimation(),
  FadeInUp: makeLayoutAnimation(),
  FadeInDown: makeLayoutAnimation(),
  FadeOutUp: makeLayoutAnimation(),
  FadeOutDown: makeLayoutAnimation(),
  SlideInRight: makeLayoutAnimation(),
  SlideOutLeft: makeLayoutAnimation(),
  SlideInLeft: makeLayoutAnimation(),
  SlideOutRight: makeLayoutAnimation(),
  SlideInUp: makeLayoutAnimation(),
  SlideInDown: makeLayoutAnimation(),
  SlideOutUp: makeLayoutAnimation(),
  SlideOutDown: makeLayoutAnimation(),
  ZoomIn: makeLayoutAnimation(),
  ZoomOut: makeLayoutAnimation(),
  ZoomInRotate: makeLayoutAnimation(),
  ZoomOutRotate: makeLayoutAnimation(),
  BounceIn: makeLayoutAnimation(),
  BounceOut: makeLayoutAnimation(),
  FlipInEasyX: makeLayoutAnimation(),
  FlipOutEasyX: makeLayoutAnimation(),
  FlipInXUp: makeLayoutAnimation(),
  FlipOutXDown: makeLayoutAnimation(),
  FlipInYLeft: makeLayoutAnimation(),
  FlipOutYRight: makeLayoutAnimation(),
  LightSpeedInRight: makeLayoutAnimation(),
  LightSpeedOutRight: makeLayoutAnimation(),
  StretchInX: makeLayoutAnimation(),
  StretchOutX: makeLayoutAnimation(),
  Layout: makeLayoutAnimation(),
  LinearTransition: makeLayoutAnimation(),
  CurvedTransition: makeLayoutAnimation(),
  EntryExitTransition: makeLayoutAnimation(),
  SequencedTransition: makeLayoutAnimation(),
  JumpingTransition: makeLayoutAnimation(),
  SharedTransition: makeLayoutAnimation(),
  Easing: Easing,
  // Re-exported RN primitives (Animated.View etc.)
  Animated: Animated,
  View: View,
  Text: Text,
  ScrollView: ScrollView,
  FlatList: FlatList,
  Image: Image,
};
