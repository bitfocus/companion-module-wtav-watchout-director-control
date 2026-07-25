// Isolated tests for the module's dependency-free core — no @companion-module/base
// needed. Covers the show->choices helpers + id scheme, the time/fraction maths,
// the API url builder, and the PNG bar renderer (valid PNG, fill actually varies).
// Run: node scratchpad/test-module.js   (also `npm test`)
import * as util from '../src/util.js'
import { apiUrl } from '../src/api.js'
import { barPng, barPngDataUrl, encodePng } from '../src/bar.js'

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
		{ id: '0', name: 'Main', folder: null },
		{ id: '1', name: 'Intro', folder: 'Openers/Sub' },
	],
	cueSets: [{ id: 'g1', name: 'Set01', presets: [{ id: 'a', name: 'Apple' }, { id: 'd', name: 'Deliver' }] }],
	variables: [
		{ key: '', name: 'masterVolume', min: 0, max: 100 },
		{ key: 'v1', name: 'Variable1', min: 0, max: 1 },
	],
}
eq(util.timelineChoices(show).length, 2, 'timeline choices count')
ok(util.timelineChoices(show)[1].label.indexOf('Openers/Sub') === 0, 'folder prefixed in label')
eq(util.variableChoices(show).map((c) => c.id), ['v1'], 'variable choices drop key-less')
eq(util.cuesetPresetChoices(show).length, 2, 'cueset preset choices count')
const pair = util.cuesetPresetChoices(show)[0].id
eq(util.unpackPair(pair), { groupId: 'g1', presetId: 'a' }, 'pack/unpack pair round-trip')
ok(util.unpackPair('garbage') === null, 'unpackPair rejects garbage')
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
eq(apiUrl({ host: 'dir', port: 8080 }, '/timeline/0/play'), 'http://dir:8080/api/v1/timeline/0/play', 'apiUrl numeric port')

// --- bar png ---------------------------------------------------------------
console.log('bar png')
const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const b64 = barPng(0.5, { w: 72, h: 72 })
const buf = Buffer.from(b64, 'base64')
ok(buf.slice(0, 8).equals(SIG), 'bar output is a valid PNG (signature)')
ok(buf.length > 100, 'bar PNG has real content')
ok(barPngDataUrl(0.5, { w: 20, h: 20 }).startsWith('data:image/png;base64,'), 'data URL wrapper')
const empty = barPng(0, { w: 40, h: 20 }),
	half = barPng(0.5, { w: 40, h: 20 }),
	full = barPng(1, { w: 40, h: 20 })
ok(empty !== half && half !== full && empty !== full, 'fill fraction changes the image')
ok(barPng(NaN, { w: 20, h: 20 }) === barPng(0, { w: 20, h: 20 }), 'NaN fraction renders as empty')
ok(barPng(2, { w: 40, h: 20 }) === full, 'over-1 fraction clamps to full')
const png = encodePng(10, 4, Buffer.alloc(10 * 4 * 4, 0xff))
ok(png.readUInt32BE(16) === 10 && png.readUInt32BE(20) === 4, 'encodePng writes width/height in IHDR')

console.log('\n' + pass + ' passed, ' + fail + ' failed')
process.exit(fail ? 1 : 0)
