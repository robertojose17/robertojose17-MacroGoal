'use strict';
// Stub for react-native-svg — used by Metro extraNodeModules when the real
// native module is not linked. Provides no-op React components for all common exports.
// IMPORTANT: These must be proper React function components (not plain functions)
// so that lucide-react-native and other libraries can use them as JSX elements
// and set .displayName on them without crashing.
var React = require('react');

function makeComponent(name) {
  function SvgComponent() { return null; }
  SvgComponent.displayName = name;
  return SvgComponent;
}

var Svg = makeComponent('Svg');
var Circle = makeComponent('Circle');
var Ellipse = makeComponent('Ellipse');
var G = makeComponent('G');
var Text = makeComponent('Text');
var TSpan = makeComponent('TSpan');
var TextPath = makeComponent('TextPath');
var Path = makeComponent('Path');
var Polygon = makeComponent('Polygon');
var Polyline = makeComponent('Polyline');
var Line = makeComponent('Line');
var Rect = makeComponent('Rect');
var Use = makeComponent('Use');
var SvgImage = makeComponent('Image');
var Symbol = makeComponent('Symbol');
var Defs = makeComponent('Defs');
var LinearGradient = makeComponent('LinearGradient');
var RadialGradient = makeComponent('RadialGradient');
var Stop = makeComponent('Stop');
var ClipPath = makeComponent('ClipPath');
var Pattern = makeComponent('Pattern');
var Mask = makeComponent('Mask');
var Marker = makeComponent('Marker');
var ForeignObject = makeComponent('ForeignObject');
var SvgXml = makeComponent('SvgXml');
var SvgUri = makeComponent('SvgUri');
var SvgFromUri = makeComponent('SvgFromUri');
var SvgFromXml = makeComponent('SvgFromXml');
var SvgCss = makeComponent('SvgCss');
var SvgCssUri = makeComponent('SvgCssUri');
var SvgAst = makeComponent('SvgAst');
var SvgWithCss = makeComponent('SvgWithCss');
var SvgWithCssUri = makeComponent('SvgWithCssUri');

module.exports = {
  default: Svg,
  Svg: Svg,
  Circle: Circle,
  Ellipse: Ellipse,
  G: G,
  Text: Text,
  TSpan: TSpan,
  TextPath: TextPath,
  Path: Path,
  Polygon: Polygon,
  Polyline: Polyline,
  Line: Line,
  Rect: Rect,
  Use: Use,
  Image: SvgImage,
  Symbol: Symbol,
  Defs: Defs,
  LinearGradient: LinearGradient,
  RadialGradient: RadialGradient,
  Stop: Stop,
  ClipPath: ClipPath,
  Pattern: Pattern,
  Mask: Mask,
  Marker: Marker,
  ForeignObject: ForeignObject,
  SvgXml: SvgXml,
  SvgUri: SvgUri,
  SvgFromUri: SvgFromUri,
  SvgFromXml: SvgFromXml,
  SvgCss: SvgCss,
  SvgCssUri: SvgCssUri,
  SvgAst: SvgAst,
  SvgWithCss: SvgWithCss,
  SvgWithCssUri: SvgWithCssUri,
};
