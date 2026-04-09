'use strict';

const noop = () => {};
const noopObj = { connect: noop, disconnect: noop, send: noop, on: noop, off: noop };

function connectToDevTools() { return noopObj; }
function connectWithCustomMessenger() { return noopObj; }

module.exports = {
  connectToDevTools,
  connectWithCustomMessenger,
  default: { connectToDevTools, connectWithCustomMessenger },
};
