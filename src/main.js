import { InstanceBase, InstanceStatus, Regex } from '@companion-module/base'
import upgradeScripts from './upgrades.js'
import setupActions from './actions.js'
import setupFeedbacks from './feedbacks.js'
import setupVariables, { computeValues } from './variables.js'
import setupPresets from './presets.js'
import { apiUrl, getJson, postJson } from './api.js'

// base 2.x loads the entrypoint's DEFAULT export (the InstanceBase subclass) and a
// named `UpgradeScripts` export — there is no runEntrypoint() in 2.x.
export const UpgradeScripts = upgradeScripts

// Signature of the parts of a show that drive the dropdowns / variable list, so we
// only rebuild definitions when they actually change (not on every 5 s poll).
function showSignature(s) {
	if (!s) return ''
	return JSON.stringify([
		(s.timelines || []).map(
			(t) => t.id + ':' + t.name + ':' + t.folder + ':' + (t.cues || []).map((c) => c.id).join('.'),
		),
		(s.cueSets || []).map((g) => g.id + ':' + (g.presets || []).map((p) => p.id + '=' + p.name).join(',')),
		(s.variables || []).map((v) => v.key + ':' + v.name),
		((s.surface && s.surface.pages) || []).map((p) => p.name + ':' + (p.widgets || []).map((w) => w.id).join('.')),
	])
}

export default class DirectorControlInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		this.show = { timelines: [], cueSets: [], variables: [], surface: { pages: [] }, showName: '' }
		this.live = { timelines: [], variables: [], cueSets: [], _connected: false }
		this._showSig = ''
	}

	async init(config) {
		this.config = config
		this.updateStatus(InstanceStatus.Connecting)
		this.rebuildDefinitions() // empty defs until the first show poll
		this.startPolling()
	}

	async destroy() {
		this.stopPolling()
	}

	async configUpdated(config) {
		this.config = config
		this._showSig = '' // force a rebuild against the new target
		this.stopPolling()
		this.startPolling()
	}

	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'WTAV Watchout Director Control',
				value:
					'Drives a running WTAV Director Control app over its /api/v1 surface. In that app: Settings → start the web control surface (default port 3333), then Discover.',
			},
			{ type: 'textinput', id: 'host', label: 'Director Control IP / hostname', width: 8, default: '127.0.0.1' },
			{ type: 'textinput', id: 'port', label: 'Port', width: 4, default: '3333', regex: Regex.PORT },
			{ type: 'number', id: 'pollMs', label: 'State poll interval (ms)', width: 4, default: 300, min: 100, max: 5000 },
		]
	}

	// --- api helpers ---------------------------------------------------------
	apiGet(path) {
		return getJson(apiUrl(this.config, path))
	}
	async apiPost(path, body) {
		const r = await postJson(apiUrl(this.config, path), body)
		if (!r.ok) this.log('warn', 'POST ' + path + ' failed: ' + (r.error || 'HTTP ' + r.status))
		return r
	}

	rebuildDefinitions() {
		setupActions(this)
		setupFeedbacks(this)
		setupVariables(this)
		setupPresets(this)
	}

	// --- polling -------------------------------------------------------------
	startPolling() {
		const fast = Math.max(100, Number(this.config && this.config.pollMs) || 300)
		this._stateTimer = setInterval(() => this.pollState(), fast)
		this._showTimer = setInterval(() => this.pollShow(), 5000)
		this.pollShow()
		this.pollState()
	}
	stopPolling() {
		if (this._stateTimer) clearInterval(this._stateTimer)
		if (this._showTimer) clearInterval(this._showTimer)
		this._stateTimer = this._showTimer = null
	}

	async pollShow() {
		const s = await this.apiGet('/show')
		if (!s) return // pollState owns the connection status
		this.show = {
			timelines: s.timelines || [],
			cueSets: s.cueSets || [],
			variables: s.variables || [],
			surface: s.surface || { pages: [] },
			showName: s.showName || '',
		}
		const sig = showSignature(s)
		if (sig !== this._showSig) {
			this._showSig = sig
			this.rebuildDefinitions() // dropdowns + variable list follow the show
			this.log(
				'info',
				'discovered ' +
					this.show.timelines.length +
					' timelines, ' +
					this.show.cueSets.length +
					' cue sets, ' +
					this.show.variables.filter((v) => v.key).length +
					' keyed variables',
			)
		}
	}

	async pollState() {
		const st = await this.apiGet('/state')
		if (!st) {
			if (this.live._connected !== false) this.updateStatus(InstanceStatus.ConnectionFailure, 'no /api/v1 response')
			this.live = { ...this.live, _connected: false }
			this.setVariableValues(computeValues(this))
			return
		}
		this.updateStatus(InstanceStatus.Ok)
		this.live = {
			timelines: st.timelines || [],
			variables: st.variables || [],
			cueSets: st.cueSets || [],
			_connected: true,
		}
		if (!this.show.showName && st.showName) this.show.showName = st.showName
		this.setVariableValues(computeValues(this))
		this.checkFeedbacks('timeline_state', 'countdown_warning', 'cueset_active', 'timeline_progress', 'variable_bar')
	}
}
