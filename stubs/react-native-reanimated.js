'use strict';
var React = require('react');
var RN = require('react-native');
var Animated = RN.Animated;
var View = RN.View;
var Text = RN.Text;
var ScrollView = RN.ScrollView;
var FlatList = RN.FlatList;
var Image = RN.Image;

// Layout animation stubs — must be objects with a build() method so that
// Reanimated's entering/exiting prop accepts them without crashing.
function makeLayoutAnimation(name) {
  var obj = {
    duration: function(ms) { return obj; },
    delay: function(ms) { return obj; },
    springify: function() { return obj; },
    damping: function(v) { return obj; },
    stiffness: function(v) { return obj; },
    build: function() { return {}; },
  };
  return obj;
}

var FadeIn = makeLayoutAnimation('FadeIn');
var FadeOut = makeLayoutAnimation('FadeOut');
var SlideInRight = makeLayoutAnimation('SlideInRight');
var SlideOutLeft = makeLayoutAnimation('SlideOutLeft');
var ZoomIn = makeLayoutAnimation('ZoomIn');
var ZoomOut = makeLayoutAnimation('ZoomOut');
var SlideInLeft = makeLayoutAnimation('SlideInLeft');
var SlideOutRight = makeLayoutAnimation('SlideOutRight');

module.exports = {
  default: {},
  useSharedValue: function(v) { return { value: v }; },
  useAnimatedStyle: function(fn) { return {}; },
  withTiming: function(v) { return v; },
  withSpring: function(v) { return v; },
  withDelay: function(d, v) { return v; },
  withSequence: function() { var args = Array.prototype.slice.call(arguments); return args[args.length - 1]; },
  withRepeat: function(v) { return v; },
  interpolate: function(v, input, output) { return output[0]; },
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  runOnJS: function(fn) { return fn; },
  runOnUI: function(fn) { return fn; },
  useAnimatedScrollHandler: function() { return {}; },
  useAnimatedRef: function() { return { current: null }; },
  useAnimatedGestureHandler: function() { return {}; },
  useDerivedValue: function(fn) { return { value: fn() }; },
  useAnimatedReaction: function() {},
  cancelAnimation: function() {},
  // Layout animations
  FadeIn: FadeIn,
  FadeOut: FadeOut,
  SlideInRight: SlideInRight,
  SlideOutLeft: SlideOutLeft,
  ZoomIn: ZoomIn,
  ZoomOut: ZoomOut,
  SlideInLeft: SlideInLeft,
  SlideOutRight: SlideOutRight,
  // Re-exported RN primitives
  Animated: Animated,
  View: View,
  Text: Text,
  ScrollView: ScrollView,
  FlatList: FlatList,
  Image: Image,
};
