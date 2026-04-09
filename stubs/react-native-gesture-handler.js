'use strict';
/* eslint-disable react/prop-types */
var React = require('react');
var RN = require('react-native');
var View = RN.View;
var ScrollView = RN.ScrollView;
var FlatList = RN.FlatList;
var TouchableOpacity = RN.TouchableOpacity;
var TouchableHighlight = RN.TouchableHighlight;
var TouchableNativeFeedback = RN.TouchableNativeFeedback;
var TouchableWithoutFeedback = RN.TouchableWithoutFeedback;
var Switch = RN.Switch;
var TextInput = RN.TextInput;

function GestureHandlerRootView(props) {
  return React.createElement(View, { style: [{ flex: 1 }, props.style] }, props.children);
}
function Swipeable(props) {
  return React.createElement(View, { style: props.containerStyle }, props.children);
}
function DrawerLayout(props) {
  return React.createElement(View, { style: { flex: 1 } }, props.children);
}
function PanGestureHandler(props) {
  return React.createElement(View, null, props.children);
}
function TapGestureHandler(props) {
  return React.createElement(View, null, props.children);
}
function LongPressGestureHandler(props) {
  return React.createElement(View, null, props.children);
}
function RotationGestureHandler(props) {
  return React.createElement(View, null, props.children);
}
function PinchGestureHandler(props) {
  return React.createElement(View, null, props.children);
}
function FlingGestureHandler(props) {
  return React.createElement(View, null, props.children);
}
function NativeViewGestureHandler(props) {
  return React.createElement(View, null, props.children);
}
function GestureDetector(props) {
  return React.createElement(View, null, props.children);
}
function RectButton(props) {
  return React.createElement(TouchableOpacity, { onPress: props.onPress, style: props.style }, props.children);
}
function BorderlessButton(props) {
  return React.createElement(TouchableOpacity, { onPress: props.onPress, style: props.style }, props.children);
}
function BaseButton(props) {
  return React.createElement(TouchableOpacity, { onPress: props.onPress, style: props.style }, props.children);
}

function gestureHandlerRootHOC(Component) {
  return Component;
}

var Gesture = {
  Pan: function() {
    var g = {
      onStart: function() { return g; },
      onUpdate: function() { return g; },
      onEnd: function() { return g; },
      onFinalize: function() { return g; },
      onBegin: function() { return g; },
      onTouchesDown: function() { return g; },
      onTouchesMove: function() { return g; },
      onTouchesUp: function() { return g; },
      onTouchesCancelled: function() { return g; },
      minDistance: function() { return g; },
      minPointers: function() { return g; },
      maxPointers: function() { return g; },
      activeOffsetX: function() { return g; },
      activeOffsetY: function() { return g; },
      failOffsetX: function() { return g; },
      failOffsetY: function() { return g; },
      enabled: function() { return g; },
      shouldCancelWhenOutside: function() { return g; },
      hitSlop: function() { return g; },
      runOnJS: function() { return g; },
      withRef: function() { return g; },
      simultaneousWithExternalGesture: function() { return g; },
      requireExternalGestureToFail: function() { return g; },
      blocksExternalGesture: function() { return g; },
    };
    return g;
  },
  Tap: function() {
    var g = {
      onStart: function() { return g; },
      onEnd: function() { return g; },
      onFinalize: function() { return g; },
      onBegin: function() { return g; },
      numberOfTaps: function() { return g; },
      maxDuration: function() { return g; },
      maxDelay: function() { return g; },
      maxDistance: function() { return g; },
      minPointers: function() { return g; },
      enabled: function() { return g; },
      shouldCancelWhenOutside: function() { return g; },
      hitSlop: function() { return g; },
      runOnJS: function() { return g; },
      withRef: function() { return g; },
      simultaneousWithExternalGesture: function() { return g; },
      requireExternalGestureToFail: function() { return g; },
    };
    return g;
  },
  LongPress: function() {
    var g = {
      onStart: function() { return g; },
      onEnd: function() { return g; },
      minDuration: function() { return g; },
      maxDistance: function() { return g; },
      enabled: function() { return g; },
      runOnJS: function() { return g; },
      withRef: function() { return g; },
    };
    return g;
  },
  Pinch: function() {
    var g = {
      onStart: function() { return g; },
      onUpdate: function() { return g; },
      onEnd: function() { return g; },
      enabled: function() { return g; },
      runOnJS: function() { return g; },
      withRef: function() { return g; },
    };
    return g;
  },
  Rotation: function() {
    var g = {
      onStart: function() { return g; },
      onUpdate: function() { return g; },
      onEnd: function() { return g; },
      enabled: function() { return g; },
      runOnJS: function() { return g; },
      withRef: function() { return g; },
    };
    return g;
  },
  Fling: function() {
    var g = {
      onStart: function() { return g; },
      onEnd: function() { return g; },
      direction: function() { return g; },
      enabled: function() { return g; },
      runOnJS: function() { return g; },
      withRef: function() { return g; },
    };
    return g;
  },
  Simultaneous: function() { return {}; },
  Race: function() { return {}; },
  Exclusive: function() { return {}; },
  Sequence: function() { return {}; },
  Hover: function() {
    var g = {
      onHoverIn: function() { return g; },
      onHoverOut: function() { return g; },
      enabled: function() { return g; },
    };
    return g;
  },
};

module.exports = {
  default: {},
  GestureHandlerRootView: GestureHandlerRootView,
  Swipeable: Swipeable,
  DrawerLayout: DrawerLayout,
  PanGestureHandler: PanGestureHandler,
  TapGestureHandler: TapGestureHandler,
  LongPressGestureHandler: LongPressGestureHandler,
  RotationGestureHandler: RotationGestureHandler,
  PinchGestureHandler: PinchGestureHandler,
  FlingGestureHandler: FlingGestureHandler,
  NativeViewGestureHandler: NativeViewGestureHandler,
  GestureDetector: GestureDetector,
  RectButton: RectButton,
  BorderlessButton: BorderlessButton,
  BaseButton: BaseButton,
  gestureHandlerRootHOC: gestureHandlerRootHOC,
  Gesture: Gesture,
  ScrollView: ScrollView,
  FlatList: FlatList,
  Switch: Switch,
  TextInput: TextInput,
  TouchableOpacity: TouchableOpacity,
  TouchableHighlight: TouchableHighlight,
  TouchableNativeFeedback: TouchableNativeFeedback,
  TouchableWithoutFeedback: TouchableWithoutFeedback,
  State: {
    UNDETERMINED: 0,
    FAILED: 1,
    BEGAN: 2,
    CANCELLED: 3,
    ACTIVE: 4,
    END: 5,
  },
  Directions: {
    RIGHT: 1,
    LEFT: 2,
    UP: 4,
    DOWN: 8,
  },
  HapticFeedbackTypes: {
    selection: 'selection',
    impactLight: 'impactLight',
    impactMedium: 'impactMedium',
    impactHeavy: 'impactHeavy',
    notificationSuccess: 'notificationSuccess',
    notificationWarning: 'notificationWarning',
    notificationError: 'notificationError',
  },
};
