'use strict';
// Stub for react-native-svg — used by Metro extraNodeModules when the real
// native module is not linked. Provides no-op components for all common exports.
var React = require('react');
var RN = require('react-native');

function noop() { return null; }

module.exports = {
  default: noop,
  Svg: noop,
  Circle: noop,
  Ellipse: noop,
  G: noop,
  Text: noop,
  TSpan: noop,
  TextPath: noop,
  Path: noop,
  Polygon: noop,
  Polyline: noop,
  Line: noop,
  Rect: noop,
  Use: noop,
  Image: noop,
  Symbol: noop,
  Defs: noop,
  LinearGradient: noop,
  RadialGradient: noop,
  Stop: noop,
  ClipPath: noop,
  Pattern: noop,
  Mask: noop,
  Marker: noop,
  ForeignObject: noop,
  SvgXml: noop,
  SvgUri: noop,
  SvgFromUri: noop,
  SvgFromXml: noop,
  SvgCss: noop,
  SvgCssUri: noop,
  SvgAst: noop,
  SvgWithCss: noop,
  SvgWithCssUri: noop,
};
