'use strict';
// Stub for react-native-calendars — used by Metro extraNodeModules when the
// real native module is not linked.
var React = require('react');

function noop() { return null; }

module.exports = {
  default: noop,
  Calendar: noop,
  CalendarList: noop,
  Agenda: noop,
  WeekCalendar: noop,
  ExpandableCalendar: noop,
  TimelineList: noop,
  DateData: {},
};
