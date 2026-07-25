// Preset definitions — ready-made buttons generated from the discovered show,
// grouped into sections by kind, with the matching feedback already attached.
// base 2.x: setPresetDefinitions(structure, presets) — structure is the sections,
// presets is a map keyed by id. Preset type is 'simple'.
import { combineRgb } from '@companion-module/base'
import { sanitizeId, packPair } from './util.js'

const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)
const DARK = combineRgb(28, 28, 28)
const GREEN = combineRgb(0, 160, 0)
const AMBER = combineRgb(200, 140, 0)
const RED = combineRgb(160, 0, 0)
const CORAL = combineRgb(255, 138, 92)
const BLUE = combineRgb(74, 163, 255)

export default function (self) {
	const show = self.show || {}
	const timelines = show.timelines || []
	const cueSets = show.cueSets || []
	const variables = (show.variables || []).filter((v) => v.key)
	const pages = (show.surface && show.surface.pages) || []
	const tlName = (t) => t.name || 'Timeline ' + t.id
	const lbl = self.label || 'internal' // for referencing our own variables in button text
	const v = (id) => '$(' + lbl + ':' + id + ')'

	const presets = {}
	const sections = []
	const section = (id, name, description, ids) => sections.push({ id, name, description, definitions: ids })

	// --- Timelines: play/pause toggle (state colour) -------------------------
	const toggleIds = []
	for (const t of timelines) {
		const sid = sanitizeId(t.id)
		const pid = 'tl_' + sid + '_toggle'
		presets[pid] = {
			type: 'simple',
			name: tlName(t) + ': Play/Pause',
			// name + a small live current time underneath
			style: { text: tlName(t) + '\n' + v('tl_' + sid + '_time'), size: '14', color: WHITE, bgcolor: DARK },
			steps: [{ down: [{ actionId: 'timeline_transport', options: { timeline: String(t.id), verb: 'toggle' } }], up: [] }],
			feedbacks: [
				{ feedbackId: 'timeline_state', options: { timeline: String(t.id), state: 'playing' }, style: { bgcolor: GREEN, color: WHITE } },
				{ feedbackId: 'timeline_state', options: { timeline: String(t.id), state: 'paused' }, style: { bgcolor: AMBER, color: BLACK } },
			],
		}
		toggleIds.push(pid)
	}
	if (toggleIds.length) section('tl_playpause', 'Timelines — Play / Pause', 'Toggle a timeline; green = playing, amber = paused.', toggleIds)

	// --- Timelines: stop -----------------------------------------------------
	const stopIds = []
	for (const t of timelines) {
		const pid = 'tl_' + sanitizeId(t.id) + '_stop'
		presets[pid] = {
			type: 'simple',
			name: tlName(t) + ': Stop',
			style: { text: 'STOP ' + tlName(t), size: '14', color: WHITE, bgcolor: combineRgb(60, 0, 0) },
			steps: [{ down: [{ actionId: 'timeline_transport', options: { timeline: String(t.id), verb: 'stop' } }], up: [] }],
			feedbacks: [{ feedbackId: 'timeline_state', options: { timeline: String(t.id), state: 'stopped' }, style: { bgcolor: RED, color: WHITE } }],
		}
		stopIds.push(pid)
	}
	if (stopIds.length) section('tl_stop', 'Timelines — Stop', 'Stop a timeline; red = stopped.', stopIds)

	// --- Timelines: live progress bar ---------------------------------------
	const progIds = []
	for (const t of timelines) {
		const pid = 'tl_' + sanitizeId(t.id) + '_progress'
		presets[pid] = {
			type: 'simple',
			name: tlName(t) + ': Progress bar',
			style: { text: tlName(t), size: '14', color: WHITE, bgcolor: BLACK, show_topbar: false },
			steps: [{ down: [{ actionId: 'timeline_transport', options: { timeline: String(t.id), verb: 'toggle' } }], up: [] }],
			feedbacks: [{ feedbackId: 'timeline_progress', options: { timeline: String(t.id), fg: GREEN, bg: DARK, vertical: false } }],
		}
		progIds.push(pid)
	}
	if (progIds.length) section('tl_progress', 'Timelines — Progress bars', 'Live position bar; press toggles play/pause.', progIds)

	// --- Timelines: readouts — three separate sections so you pick the layout ---
	// Every variant leads with the timeline NAME so a placed button always says which
	// timeline it is. 'auto' text size keeps the multi-line ones readable.
	const cdWarn = (t) => [{ feedbackId: 'countdown_warning', options: { timeline: String(t.id), seconds: 10 }, style: { bgcolor: RED, color: WHITE } }]
	const timeIds = [],
		cdIds = [],
		bothIds = []
	for (const t of timelines) {
		const sid = sanitizeId(t.id)
		const nm = tlName(t)
		const pTime = 'tl_' + sid + '_readout_time'
		presets[pTime] = {
			type: 'simple',
			name: nm + ': Current time',
			style: { text: nm + '\n' + v('tl_' + sid + '_time'), size: '18', color: WHITE, bgcolor: BLACK, show_topbar: false },
			steps: [{ down: [], up: [] }],
			feedbacks: [],
		}
		const pCd = 'tl_' + sid + '_readout_countdown'
		presets[pCd] = {
			type: 'simple',
			name: nm + ': Countdown',
			// name · ▼ countdown · the marker name it counts toward
			style: {
				text: nm + '\n▼ ' + v('tl_' + sid + '_countdown') + '\n' + v('tl_' + sid + '_countdown_name'),
				size: 'auto',
				color: WHITE,
				bgcolor: BLACK,
				show_topbar: false,
			},
			steps: [{ down: [], up: [] }],
			feedbacks: cdWarn(t),
		}
		const pBoth = 'tl_' + sid + '_readout_both'
		presets[pBoth] = {
			type: 'simple',
			name: nm + ': Current time + countdown',
			// name · current time · ▼ countdown · marker name
			style: {
				text: nm + '\n' + v('tl_' + sid + '_time') + '\n▼ ' + v('tl_' + sid + '_countdown') + '\n' + v('tl_' + sid + '_countdown_name'),
				size: 'auto',
				color: WHITE,
				bgcolor: BLACK,
				show_topbar: false,
			},
			steps: [{ down: [], up: [] }],
			feedbacks: cdWarn(t),
		}
		timeIds.push(pTime)
		cdIds.push(pCd)
		bothIds.push(pBoth)
	}
	if (timeIds.length) section('tl_read_time', 'Timelines — Current time', 'Timeline name + live current time.', timeIds)
	if (cdIds.length) section('tl_read_cd', 'Timelines — Countdown', 'Countdown to the next marker (with its name); red under 10 s, --:-- when no marker is ahead.', cdIds)
	if (bothIds.length) section('tl_read_both', 'Timelines — Current time + Countdown', 'Current time and countdown on one button.', bothIds)

	// --- Cue sets: activate preset (active highlight) ------------------------
	const cueIds = []
	for (const g of cueSets) {
		for (const p of g.presets || []) {
			const pid = 'cue_' + sanitizeId(g.id) + '_' + sanitizeId(p.id)
			presets[pid] = {
				type: 'simple',
				name: (g.name || g.id) + ': ' + (p.name || p.id),
				style: { text: p.name || p.id, size: '14', color: WHITE, bgcolor: DARK },
				steps: [{ down: [{ actionId: 'cueset_preset', options: { preset: packPair(g.id, p.id) } }], up: [] }],
				feedbacks: [{ feedbackId: 'cueset_active', options: { preset: packPair(g.id, p.id) }, style: { bgcolor: CORAL, color: BLACK } }],
			}
			cueIds.push(pid)
		}
	}
	if (cueIds.length) section('cuesets', 'Cue sets', 'Activate a cue-set preset; highlighted = active.', cueIds)

	// --- Variables: value bar + set to min/max -------------------------------
	const varIds = []
	for (const v of variables) {
		const skey = sanitizeId(v.key)
		const bar = 'var_' + skey + '_bar'
		presets[bar] = {
			type: 'simple',
			name: (v.name || v.key) + ': value bar',
			style: { text: v.name || v.key, size: '14', color: WHITE, bgcolor: BLACK, show_topbar: false },
			steps: [{ down: [], up: [] }],
			feedbacks: [{ feedbackId: 'variable_bar', options: { variable: v.key, fg: BLUE, bg: DARK, vertical: false } }],
		}
		varIds.push(bar)
		for (const [suffix, label, value] of [
			['max', 'Max', v.max],
			['min', 'Min', v.min],
		]) {
			if (value == null || !isFinite(Number(value))) continue
			const pid = 'var_' + skey + '_set' + suffix
			presets[pid] = {
				type: 'simple',
				name: (v.name || v.key) + ': set ' + label + ' (' + value + ')',
				style: { text: (v.name || v.key) + ' = ' + value, size: '14', color: WHITE, bgcolor: DARK },
				steps: [{ down: [{ actionId: 'set_variable', options: { variable: v.key, value: Number(value) } }], up: [] }],
				feedbacks: [],
			}
			varIds.push(pid)
		}
	}
	if (varIds.length) section('variables', 'Variables', 'Live value bar, and set-to-min/max examples (duplicate and edit the value).', varIds)

	// --- Surface: press a widget, grouped per page ---------------------------
	const pressIds = []
	for (const pg of pages) {
		for (const w of pg.widgets || []) {
			const pid = 'press_' + sanitizeId(w.id)
			presets[pid] = {
				type: 'simple',
				name: (pg.name || 'Page') + ': ' + (w.label || w.id),
				style: { text: w.label || w.id, size: '14', color: WHITE, bgcolor: combineRgb(40, 40, 60) },
				steps: [{ down: [{ actionId: 'press_widget', options: { widget: String(w.id) } }], up: [] }],
				feedbacks: [],
			}
			pressIds.push(pid)
		}
	}
	if (pressIds.length) section('surface', 'Surface buttons', 'Press a button/widget on the app’s own canvas, per page.', pressIds)

	// --- Status --------------------------------------------------------------
	presets['status'] = {
		type: 'simple',
		name: 'Connection status',
		style: { text: 'Director\n' + v('connection'), size: '14', color: WHITE, bgcolor: DARK },
		steps: [{ down: [], up: [] }],
		feedbacks: [],
	}
	section('status', 'Status', 'Connection + show info.', ['status'])

	self.setPresetDefinitions(sections, presets)
}
