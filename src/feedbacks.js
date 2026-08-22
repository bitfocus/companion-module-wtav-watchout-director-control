// Feedback definitions. All of these are BOOLEAN feedbacks: the callback returns true or
// false and the user picks the style it applies. Live 0-100% bars are NOT drawn here — a
// Companion 5 gauge element bound to our *_pct variables does that (see presets.js), which
// is why this module has no `advanced` feedbacks. All read from self.live (the
// /api/v1/state snapshot refreshed by the poll loop).
import { timelineChoices, cuesetPresetChoices, unpackPair } from './util.js'

function liveTimeline(self, id) {
	return (self.live.timelines || []).find((t) => String(t.id) === String(id)) || null
}

export default function (self) {
	const tls = timelineChoices(self.show)
	const presets = cuesetPresetChoices(self.show)
	const tlField = {
		type: 'dropdown',
		id: 'timeline',
		label: 'Timeline',
		default: (tls[0] && tls[0].id) || '0',
		choices: tls.length ? tls : [{ id: '0', label: 'Timeline 0' }],
		allowCustom: true,
	}

	self.setFeedbackDefinitions({
		timeline_state: {
			name: 'Timeline: play state (colour)',
			type: 'boolean',
			defaultStyle: { bgcolor: 0x228b22, color: 0xffffff },
			options: [
				tlField,
				{
					type: 'dropdown',
					id: 'state',
					label: 'Is',
					default: 'playing',
					choices: [
						{ id: 'playing', label: 'Playing' },
						{ id: 'paused', label: 'Paused' },
						{ id: 'stopped', label: 'Stopped' },
					],
				},
			],
			callback: (fb) => {
				const t = liveTimeline(self, fb.options.timeline)
				const st = t ? t.state : 'stopped'
				return st === fb.options.state
			},
		},

		countdown_warning: {
			name: 'Timeline: countdown warning (colour)',
			type: 'boolean',
			defaultStyle: { bgcolor: 0xcc0000, color: 0xffffff },
			options: [
				tlField,
				{
					type: 'number',
					id: 'seconds',
					label: 'Turn on when countdown is under (seconds)',
					default: 10,
					min: 1,
					max: 3600,
				},
			],
			callback: (fb) => {
				const t = liveTimeline(self, fb.options.timeline)
				if (!t || t.countdownMs == null) return false
				return t.countdownMs < Number(fb.options.seconds) * 1000
			},
		},

		cueset_active: {
			name: 'Cue set: preset is active (colour)',
			type: 'boolean',
			defaultStyle: { bgcolor: 0xff8a5c, color: 0x000000 },
			options: [
				{
					type: 'dropdown',
					id: 'preset',
					label: 'Cue set → preset',
					default: (presets[0] && presets[0].id) || '',
					choices: presets.length ? presets : [{ id: '', label: '(no cue sets yet)' }],
				},
			],
			callback: (fb) => {
				const pair = unpackPair(fb.options.preset)
				if (!pair) return false
				const g = (self.live.cueSets || []).find((x) => String(x.id) === String(pair.groupId))
				return !!g && String(g.activePresetId) === String(pair.presetId)
			},
		},
	})
}
