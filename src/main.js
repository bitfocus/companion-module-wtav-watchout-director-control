'use strict';
const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base');
const UpgradeScripts = require('./upgrades');
const setupActions = require('./actions');
const setupFeedbacks = require('./feedbacks');
const setupVariables = require('./variables');
const { apiUrl, getJson, postJson } = require('./api');

// Signature of the parts of a show that drive the dropdowns / variable list, so we
// only rebuild definitions when they actually change (not on every 5 s poll).
function showSignature(s) {
  if (!s) return '';
  return JSON.stringify([
    (s.timelines || []).map(t => t.id + ':' + t.name + ':' + t.folder),
    (s.cueSets || []).map(g => g.id + ':' + (g.presets || []).map(p => p.id + '=' + p.name).join(',')),
    (s.variables || []).map(v => v.key + ':' + v.name)
  ]);
}

class DirectorControlInstance extends InstanceBase {
  constructor(internal) {
    super(internal);
    this.show = { timelines: [], cueSets: [], variables: [] };
    this.live = { timelines: [], variables: [], cueSets: [], _connected: false };
    this._showSig = '';
  }

  async init(config) {
    this.config = config;
    this.updateStatus(InstanceStatus.Connecting);
    this.rebuildDefinitions();     // empty defs until the first show poll
    this.startPolling();
  }

  async destroy() { this.stopPolling(); }

  async configUpdated(config) {
    this.config = config;
    this._showSig = '';            // force a rebuild against the new target
    this.stopPolling();
    this.startPolling();
  }

  getConfigFields() {
    return [
      { type: 'static-text', id: 'info', width: 12, label: 'WTAV Director Control',
        value: 'Drives a running WTAV Director Control app over its /api/v1 surface. In that app: Settings → start the web control surface (default port 3333).' },
      { type: 'textinput', id: 'host', label: 'Director Control host', width: 8, default: '127.0.0.1', regex: Regex.HOSTNAME },
      { type: 'textinput', id: 'port', label: 'Port', width: 4, default: '3333', regex: Regex.PORT },
      { type: 'number', id: 'pollMs', label: 'State poll interval (ms)', width: 4, default: 300, min: 100, max: 5000 }
    ];
  }

  // --- api helpers ---------------------------------------------------------
  apiGet(path) { return getJson(apiUrl(this.config, path)); }
  apiPost(path, body) {
    return postJson(apiUrl(this.config, path), body).then(r => {
      if (!r.ok) this.log('warn', 'POST ' + path + ' failed: ' + (r.error || ('HTTP ' + r.status)));
      return r;
    });
  }

  rebuildDefinitions() { setupActions(this); setupFeedbacks(this); setupVariables(this); }

  // --- polling -------------------------------------------------------------
  startPolling() {
    const fast = Math.max(100, Number(this.config && this.config.pollMs) || 300);
    this._stateTimer = setInterval(() => this.pollState(), fast);
    this._showTimer = setInterval(() => this.pollShow(), 5000);
    this.pollShow();
    this.pollState();
  }
  stopPolling() {
    if (this._stateTimer) clearInterval(this._stateTimer);
    if (this._showTimer) clearInterval(this._showTimer);
    this._stateTimer = this._showTimer = null;
  }

  async pollShow() {
    const s = await this.apiGet('/show');
    if (!s) return;                // pollState owns the connection status
    this.show = { timelines: s.timelines || [], cueSets: s.cueSets || [], variables: s.variables || [], showName: s.showName || '' };
    const sig = showSignature(s);
    if (sig !== this._showSig) {
      this._showSig = sig;
      this.rebuildDefinitions();   // dropdowns + variable list follow the show
      this.log('info', 'discovered ' + this.show.timelines.length + ' timelines, ' +
        this.show.cueSets.length + ' cue sets, ' + this.show.variables.filter(v => v.key).length + ' keyed variables');
    }
  }

  async pollState() {
    const st = await this.apiGet('/state');
    if (!st) {
      if (this.live._connected !== false) this.updateStatus(InstanceStatus.ConnectionFailure, 'no /api/v1 response');
      this.live._connected = false;
      this.setVariableValues(setupVariables.computeValues(this));
      return;
    }
    this.updateStatus(InstanceStatus.Ok);
    this.live = { timelines: st.timelines || [], variables: st.variables || [], cueSets: st.cueSets || [], _connected: true };
    if (this.show.showName == null && st.showName) this.show.showName = st.showName;
    this.setVariableValues(setupVariables.computeValues(this));
    this.checkFeedbacks('timeline_state', 'cueset_active', 'timeline_progress', 'variable_bar');
  }
}

runEntrypoint(DirectorControlInstance, UpgradeScripts);
