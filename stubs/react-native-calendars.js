'use strict';
// Stub for react-native-calendars — used by Metro extraNodeModules when the
// real native module is not linked.
var React = require('react');

function noop() { return null; }

// DateData is used as a TypeScript type but also imported as a value in some files.
// Provide it as an empty object so destructuring imports don't crash.
var DateData = {};

module.exports = {
  default: noop,
  Calendar: noop,
  CalendarList: noop,
  Agenda: noop,
  WeekCalendar: noop,
  ExpandableCalendar: noop,
  TimelineList: noop,
  DateData: DateData,
};
