// Companion variable DEFINITIONS (base 2.x: an OBJECT keyed by variableId),
// rebuilt when the show changes. The matching VALUES are computed by computeValues()
// from the live /state and pushed by main.js each poll. One id scheme, shared, so
// the two never drift.
import { sanitizeId, fmtTime, fmtNum } from './util.js'

function tlIds(sid) {
	return {
		name: 'tl_' + sid + '_name',
		state: 'tl_' + sid + '_state',
		time: 'tl_' + sid + '_time',
		timeMs: 'tl_' + sid + '_time_ms',
		pct: 'tl_' + sid + '_pct',
	}
}
function varIds(skey) {
	return { value: 'var_' + skey + '_value', pct: 'var_' + skey + '_pct', source: 'var_' + skey + '_source' }
}

export default function (self) {
	const defs = {
		connection: { name: 'Connection status' },
		show_name: { name: 'Show name' },
	}
	for (const t of self.show.timelines || []) {
		const sid = sanitizeId(t.id)
		const id = tlIds(sid)
		const nm = t.name || 'Timeline ' + t.id
		defs[id.name] = { name: 'Timeline ' + t.id + ' — name' }
		defs[id.state] = { name: nm + ' — state' }
		defs[id.time] = { name: nm + ' — time (m:ss)' }
		defs[id.timeMs] = { name: nm + ' — time (ms)' }
		defs[id.pct] = { name: nm + ' — progress %' }
	}
	for (const v of self.show.variables || []) {
		if (!v.key) continue
		const skey = sanitizeId(v.key)
		const id = varIds(skey)
		const nm = v.name || v.key
		defs[id.value] = { name: nm + ' — value' }
		defs[id.pct] = { name: nm + ' — %' }
		defs[id.source] = { name: nm + ' — value source' }
	}
	self.setVariableDefinitions(defs)
}

export function computeValues(self) {
	const out = {
		connection: self.live && self.live._connected ? 'OK' : 'offline',
		show_name: (self.show && self.show.showName) || '',
	}
	const liveTl = {}
	for (const t of self.live.timelines || []) liveTl[String(t.id)] = t
	for (const t of self.show.timelines || []) {
		const sid = sanitizeId(t.id)
		const id = tlIds(sid)
		const lt = liveTl[String(t.id)] || {}
		out[id.name] = t.name || 'Timeline ' + t.id
		out[id.state] = lt.state || 'stopped'
		out[id.time] = fmtTime(lt.timeMs != null ? lt.timeMs : 0)
		out[id.timeMs] = Math.round(lt.timeMs || 0)
		out[id.pct] = lt.pct != null ? Math.round(lt.pct * 100) : 0
	}
	const liveVar = {}
	for (const v of self.live.variables || []) liveVar[String(v.key)] = v
	for (const v of self.show.variables || []) {
		if (!v.key) continue
		const skey = sanitizeId(v.key)
		const id = varIds(skey)
		const lv = liveVar[String(v.key)] || {}
		out[id.value] = lv.value != null ? fmtNum(lv.value) : '—'
		out[id.pct] = lv.pct != null ? Math.round(lv.pct * 100) : '—'
		out[id.source] = lv.source || '—'
	}
	return out
}
