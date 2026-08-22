// Isolated tests for the module's dependency-free core — no @companion-module/base
// needed. Covers the show->choices helpers + id scheme, the time/fraction maths,
// the API url builder, and the variable-value diff that keeps unchanged values off
// the wire. Run: node scratchpad/test-module.js   (also `npm test`)
import * as util from '../src/util.js'
import { apiUrl } from '../src/api.js'
import setupVariables, { pushValues } from '../src/variables.js'

let pass = 0,
	fail = 0
const ok = (c, m) => {
	if (c) pass++
	else {
		fail++
		console.error('  FAIL: ' + m)
	}
}
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + '  (got ' + JSON.stringify(a) + ')')

// --- util ------------------------------------------------------------------
console.log('util')
const show = {
	timelines: [
		{ id: '0', name: 'Main', folder: null, cues: [{ id: 'c1', name: 'Marker A', timeMs: 5000, kind: 'marker' }] },
		{ id: '1', name: 'Intro', folder: 'Openers/Sub', cues: [] },
	],
	cueSets: [
		{
			id: 'g1',
			name: 'Set01',
			presets: [
				{ id: 'a', name: 'Apple' },
				{ id: 'd', name: 'Deliver' },
			],
		},
	],
	variables: [
		{ key: '', name: 'masterVolume', min: 0, max: 100 },
		{ key: 'v1', name: 'Variable1', min: 0, max: 1 },
	],
	surface: {
		pages: [
			{
				name: 'Page 1',
				widgets: [
					{ id: 'id7', type: 'button', label: 'GO' },
					{ id: 'id9', type: 'multi', label: '' },
				],
			},
		],
	},
}
eq(util.timelineChoices(show).length, 2, 'timeline choices count')
ok(util.timelineChoices(show)[1].label.indexOf('Openers/Sub') === 0, 'folder prefixed in label')
eq(
	util.variableChoices(show).map((c) => c.id),
	['v1'],
	'variable choices drop key-less',
)
eq(util.cuesetPresetChoices(show).length, 2, 'cueset preset choices count')
const pair = util.cuesetPresetChoices(show)[0].id
eq(util.unpackPair(pair), { groupId: 'g1', presetId: 'a' }, 'pack/unpack pair round-trip')
ok(util.unpackPair('garbage') === null, 'unpackPair rejects garbage')

// cue choices: all cues across timelines, packed with their timeline id
const cc = util.cueChoices(show)
eq(cc.length, 1, 'cue choices count (only timelines with cues)')
eq(util.unpackPair(cc[0].id), { groupId: '0', presetId: 'c1' }, 'cue choice packs timeline+cue')
ok(cc[0].label.indexOf('Main → Marker A') === 0, 'cue label has timeline + cue name')

// surface widget choices: per page, labelled
const sw = util.surfaceWidgetChoices(show)
eq(
	sw.map((c) => c.id),
	['id7', 'id9'],
	'surface widget choices ids',
)
ok(sw[0].label.indexOf('Page 1: GO (button)') === 0, 'surface widget label has page + label + type')
ok(sw[1].label.indexOf('Page 1: id9 (multi)') === 0, 'surface widget label falls back to id')
eq(util.sanitizeId('a b/c.d'), 'a_b_c_d', 'sanitizeId')
eq(util.sanitizeId('v1'), 'v1', 'sanitizeId keeps clean')

eq(util.fmtTime(0), '0:00', 'fmtTime 0')
eq(util.fmtTime(65000), '1:05', 'fmtTime 1:05')
eq(util.fmtTime(3661000), '1:01:01', 'fmtTime hours')
eq(util.fmtTime(null), '--:--', 'fmtTime null')
eq(util.fraction(0.5, 0, 1), 0.5, 'fraction mid')
eq(util.fraction(150, 0, 100), 1, 'fraction clamps high')
eq(util.fraction(-5, 0, 100), 0, 'fraction clamps low')
ok(util.fraction(5, 10, 10) === null, 'fraction degenerate range -> null')

// --- api url ---------------------------------------------------------------
console.log('api url')
eq(apiUrl({ host: '10.0.0.5', port: '3333' }, '/show'), 'http://10.0.0.5:3333/api/v1/show', 'apiUrl full')
eq(apiUrl({}, 'ping'), 'http://127.0.0.1:3333/api/v1/ping', 'apiUrl defaults + adds slash')
eq(
	apiUrl({ host: 'dir', port: 8080 }, '/timeline/0/play'),
	'http://dir:8080/api/v1/timeline/0/play',
	'apiUrl numeric port',
)

// --- variable values: only push what changed ------------------------------
console.log('variable value diff')
const fake = {
	show: { timelines: [{ id: '0', name: 'Main' }], variables: [], showName: 'Demo' },
	live: {
		timelines: [{ id: '0', state: 'playing', timeMs: 1000, pct: 0.5 }],
		variables: [],
		cueSets: [],
		_connected: true,
	},
	_varCache: {},
	pushed: [],
	setVariableValues(values) {
		this.pushed.push(values)
	},
	setVariableDefinitions() {},
}
ok(pushValues(fake) > 0, 'first push sends the whole set')
ok(fake.pushed.length === 1 && fake.pushed[0].tl_0_state === 'playing', 'values reach setVariableValues')
eq(pushValues(fake), 0, 'an unchanged state pushes nothing')
ok(fake.pushed.length === 1, 'and does not call setVariableValues at all')
fake.live.timelines[0].timeMs = 2000
eq(pushValues(fake), 2, 'a moved playhead pushes only the two time values')
eq(Object.keys(fake.pushed[1]).sort(), ['tl_0_time', 'tl_0_time_ms'], 'exactly the changed ids')
setupVariables(fake)
eq(Object.keys(fake._varCache).length, 0, 'rebuilding the definitions clears the diff cache')
ok(pushValues(fake) > 2, 'so the next push re-sends everything')

console.log('\n' + pass + ' passed, ' + fail + ' failed')
process.exitCode = fail ? 1 : 0
