const React = require('react');

const Svg = (props) => null;
Svg.displayName = 'Svg';

const createSvgComponent = (name) => {
  const Comp = (props) => null;
  Comp.displayName = name;
  return Comp;
};

const Circle = createSvgComponent('Circle');
const Ellipse = createSvgComponent('Ellipse');
const G = createSvgComponent('G');
const Text = createSvgComponent('Text');
const TSpan = createSvgComponent('TSpan');
const TextPath = createSvgComponent('TextPath');
const Path = createSvgComponent('Path');
const Polygon = createSvgComponent('Polygon');
const Polyline = createSvgComponent('Polyline');
const Line = createSvgComponent('Line');
const Rect = createSvgComponent('Rect');
const Use = createSvgComponent('Use');
const Image = createSvgComponent('Image');
const Symbol = createSvgComponent('Symbol');
const Defs = createSvgComponent('Defs');
const LinearGradient = createSvgComponent('LinearGradient');
const RadialGradient = createSvgComponent('RadialGradient');
const Stop = createSvgComponent('Stop');
const ClipPath = createSvgComponent('ClipPath');
const Pattern = createSvgComponent('Pattern');
const Mask = createSvgComponent('Mask');
const ForeignObject = createSvgComponent('ForeignObject');
const Marker = createSvgComponent('Marker');
const SvgXml = createSvgComponent('SvgXml');
const SvgUri = createSvgComponent('SvgUri');
const SvgFromUri = createSvgComponent('SvgFromUri');
const SvgFromXml = createSvgComponent('SvgFromXml');
const SvgCss = createSvgComponent('SvgCss');
const SvgCssUri = createSvgComponent('SvgCssUri');
const SvgAst = createSvgComponent('SvgAst');
const SvgWithCss = createSvgComponent('SvgWithCss');
const SvgWithCssUri = createSvgComponent('SvgWithCssUri');

module.exports = {
  __esModule: true,
  default: Svg,
  Svg,
  Circle,
  Ellipse,
  G,
  Text,
  TSpan,
  TextPath,
  Path,
  Polygon,
  Polyline,
  Line,
  Rect,
  Use,
  Image,
  Symbol,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  ClipPath,
  Pattern,
  Mask,
  ForeignObject,
  Marker,
  SvgXml,
  SvgUri,
  SvgFromUri,
  SvgFromXml,
  SvgCss,
  SvgCssUri,
  SvgAst,
  SvgWithCss,
  SvgWithCssUri,
};
