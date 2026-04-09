class RealtimeClient {
  constructor(endPoint, options) {
    this.endPoint = endPoint;
    this.options = options || {};
    this.channels = [];
    this.accessToken = null;
    this.apiKey = null;
    this.headers = {};
    this.params = {};
    this.ref = 0;
    this.timeout = 10000;
    this.heartbeatIntervalMs = 30000;
    this.logger = function() {};
    this.transport = null;
    this.conn = null;
    this.sendBuffer = [];
    this.heartbeatTimer = null;
    this.pendingHeartbeatRef = null;
    this.reconnectTimer = null;
    this.reconnectAfterMs = function() { return 10000; };
    this.encode = function(payload, callback) { callback(JSON.stringify(payload)); };
    this.decode = function(rawPayload, callback) { try { callback(JSON.parse(rawPayload)); } catch(e) { callback({}); } };
  }
  connect() { return this; }
  disconnect(callback) { if (callback) callback(); return this; }
  getChannels() { return []; }
  removeChannel(channel) { return Promise.resolve('ok'); }
  removeAllChannels() { return Promise.resolve([]); }
  channel(topic, params) { return new RealtimeChannel(topic, params, this); }
  setAuth(token) { this.accessToken = token; return this; }
  isConnected() { return false; }
  push() {}
  log() {}
  makeRef() { return String(++this.ref); }
  leaveOpenTopic() {}
  connectionState() { return 'closed'; }
  endPointURL() { return this.endPoint || ''; }
  sendHeartbeat() {}
  flushSendBuffer() {}
  onOpen() {}
  onClose() {}
  onError() {}
  onMessage() {}
  _onConnOpen() {}
  _onConnClose() {}
  _onConnError() {}
  _onConnMessage() {}
  _triggerChanError() {}
}

class RealtimeChannel {
  constructor(topic, params, socket) {
    this.topic = topic;
    this.params = Object.assign({ config: {} }, params || {});
    this.socket = socket;
    this.bindings = {};
    this.state = 'closed';
    this.joinedOnce = false;
    this.pushBuffer = [];
    this.rejoinTimer = null;
    this.presence = new RealtimePresence(this);
    this.broadcastEndpointURL = '';
    this.private = false;
    this.subTopic = topic;
  }
  subscribe(callback) {
    if (callback) setTimeout(function() { callback('CHANNEL_ERROR', new Error('Realtime not available')); }, 0);
    return this;
  }
  unsubscribe() { return Promise.resolve('ok'); }
  on(type, filter, callback) { return this; }
  off(type, filter) { return this; }
  send(payload) { return Promise.resolve('ok'); }
  track(payload, opts) { return Promise.resolve('ok'); }
  untrack() { return Promise.resolve('ok'); }
  onClose(callback) { return this; }
  onError(callback) { return this; }
  onMessage(callback) { return this; }
  isMember() { return false; }
  joinRef() { return null; }
  rejoin() {}
  trigger() {}
  replyEventName() { return ''; }
  isClosed() { return true; }
  isErrored() { return false; }
  isJoined() { return false; }
  isJoining() { return false; }
  isLeaving() { return false; }
}

class RealtimePresence {
  constructor(channel) {
    this.channel = channel;
    this.state = {};
    this.pendingDiffs = [];
    this.joinRef = null;
    this.caller = { onJoin: function() {}, onLeave: function() {}, onSync: function() {} };
  }
  onSync(callback) { return this; }
  onJoin(callback) { return this; }
  onLeave(callback) { return this; }
  list(by) { return []; }
  track(payload, opts) { return Promise.resolve('ok'); }
  untrack(opts) { return Promise.resolve('ok'); }
}

var REALTIME_SUBSCRIBE_STATES = { SUBSCRIBED: 'SUBSCRIBED', TIMED_OUT: 'TIMED_OUT', CLOSED: 'CLOSED', CHANNEL_ERROR: 'CHANNEL_ERROR' };
var REALTIME_PRESENCE_LISTEN_EVENTS = { SYNC: 'sync', JOIN: 'join', LEAVE: 'leave' };
var REALTIME_LISTEN_TYPES = { BROADCAST: 'broadcast', PRESENCE: 'presence', POSTGRES_CHANGES: 'postgres_changes' };
var REALTIME_POSTGRES_CHANGES_LISTEN_EVENT = { ALL: '*', INSERT: 'INSERT', UPDATE: 'UPDATE', DELETE: 'DELETE' };

module.exports = {
  default: RealtimeClient,
  RealtimeClient: RealtimeClient,
  RealtimeChannel: RealtimeChannel,
  RealtimePresence: RealtimePresence,
  REALTIME_SUBSCRIBE_STATES: REALTIME_SUBSCRIBE_STATES,
  REALTIME_PRESENCE_LISTEN_EVENTS: REALTIME_PRESENCE_LISTEN_EVENTS,
  REALTIME_LISTEN_TYPES: REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
};
