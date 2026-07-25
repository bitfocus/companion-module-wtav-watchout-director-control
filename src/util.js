// Pure helpers (no Companion, no fetch) so they can be unit-tested in plain Node.
// They turn a /api/v1/show payload into Companion dropdown choices + safe ids, and
// carry the small formatting/normalisation maths. ESM (base 2.x modules are ESM).

// Companion variable ids allow [a-zA-Z0-9_-]; WATCHOUT timeline ids/keys don't.
export function sanitizeId(s) {
	return String(s == null ? '' : s).replace(/[^a-zA-Z0-9_-]/g, '_')
}

// A cue-set preset choice carries BOTH the group id and the preset id. Group ids
// may contain any character, so pack them as JSON rather than a delimiter split.
export function packPair(groupId, presetId) {
	return JSON.stringify([String(groupId), String(presetId)])
}
export function unpackPair(id) {
	try {
		const a = JSON.parse(id)
		if (Array.isArray(a) && a.length === 2) return { groupId: String(a[0]), presetId: String(a[1]) }
	} catch (e) {}
	return null
}

export function timelineChoices(show) {
	const tls = (show && show.timelines) || []
	return tls.map((t) => ({
		id: String(t.id),
		label: (t.folder ? t.folder + ' / ' : '') + (t.name || 'Timeline ' + t.id) + '  [' + t.id + ']',
	}))
}

// Only variables with a non-empty key are externally addressable (an empty key
// would hit EVERY variable), so the picker lists only those.
export function variableChoices(show) {
	const vars = (show && show.variables) || []
	return vars
		.filter((v) => v.key)
		.map((v) => ({ id: String(v.key), label: (v.name || v.key) + '  (' + fmtNum(v.min) + '…' + fmtNum(v.max) + ')' }))
}

export function cuesetPresetChoices(show) {
	const groups = (show && show.cueSets) || []
	const out = []
	for (const g of groups)
		for (const p of g.presets || []) {
			out.push({ id: packPair(g.id, p.id), label: (g.name || g.id) + ' → ' + (p.name || p.id) })
		}
	return out
}

export function fmtNum(n) {
	const v = Number(n)
	if (!isFinite(v)) return '?'
	return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000)
}

// ms -> "M:SS" or "H:MM:SS". `tenths` adds one decimal (a 100 ms tick can honestly
// show tenths, no more — same reasoning as the app's readouts).
export function fmtTime(ms, tenths) {
	if (ms == null || !isFinite(ms)) return '--:--'
	let s = Math.max(0, ms) / 1000
	const h = Math.floor(s / 3600)
	s -= h * 3600
	const m = Math.floor(s / 60)
	s -= m * 60
	const whole = Math.floor(s)
	const pad = (n) => (n < 10 ? '0' + n : String(n))
	let base = h > 0 ? h + ':' + pad(m) + ':' + pad(whole) : m + ':' + pad(whole)
	if (tenths) base += '.' + Math.floor((s - whole) * 10)
	return base
}

// Clamp a value into 0..1 across [min,max]; null when the range is degenerate.
export function fraction(value, min, max) {
	const v = Number(value),
		lo = Number(min),
		hi = Number(max)
	if (!isFinite(v) || !isFinite(lo) || !isFinite(hi) || hi === lo) return null
	return Math.max(0, Math.min(1, (v - lo) / (hi - lo)))
}
