'use strict';
const React = require('react');

function MapView(props) { return null; }
function Marker(props) { return null; }
function Callout(props) { return null; }
function Circle(props) { return null; }
function Polygon(props) { return null; }
function Polyline(props) { return null; }

module.exports = {
  default: MapView,
  MapView: MapView,
  Marker: Marker,
  Callout: Callout,
  Circle: Circle,
  Polygon: Polygon,
  Polyline: Polyline,
  PROVIDER_GOOGLE: 'google',
  PROVIDER_DEFAULT: null,
};
