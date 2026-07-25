// Action definitions. Every callback maps onto a single /api/v1 write via
// self.apiPost(...). Dropdowns are filled from self.show (the discovered timelines
// / cue sets / variables) and refresh whenever the show changes. allowCustom lets
// you type an id before a show has been discovered.
import { timelineChoices, variableChoices, cuesetPresetChoices, cueChoices, surfaceWidgetChoices, unpackPair } from './util.js'

export default function (self) {
	const tls = timelineChoices(self.show)
	const vars = variableChoices(self.show)
	const presets = cuesetPresetChoices(self.show)
	const cues = cueChoices(self.show)
	const widgets = surfaceWidgetChoices(self.show)

	const timelineField = (id = 'timeline', label = 'Timeline') => ({
		type: 'dropdown',
		id,
		label,
		default: (tls[0] && tls[0].id) || '0',
		choices: tls.length ? tls : [{ id: '0', label: 'Timeline 0 (no show discovered yet)' }],
		allowCustom: true,
	})

	self.setActionDefinitions({
		timeline_transport: {
			name: 'Timeline: play / pause / stop / toggle',
			options: [
				timelineField(),
				{
					type: 'dropdown',
					id: 'verb',
					label: 'Action',
					default: 'play',
					choices: [
						{ id: 'play', label: 'Play' },
						{ id: 'pause', label: 'Pause' },
						{ id: 'stop', label: 'Stop' },
						{ id: 'toggle', label: 'Toggle play/pause' },
					],
				},
			],
			callback: async (e) => {
				const id = String(e.options.timeline)
				await self.apiPost('/timeline/' + encodeURIComponent(id) + '/' + e.options.verb)
			},
		},

		timeline_play_at: {
			name: 'Timeline: play from position (ms)',
			options: [timelineField(), { type: 'number', id: 'time', label: 'Start position (ms)', default: 0, min: 0, max: 86400000 }],
			callback: async (e) => {
				const id = String(e.options.timeline)
				const time = Number(e.options.time)
				await self.apiPost('/timeline/' + encodeURIComponent(id) + '/play?time=' + (isFinite(time) ? Math.round(time) : 0))
			},
		},

		timeline_jump: {
			name: 'Timeline: jump to time or cue',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Jump to',
					default: 'cue',
					choices: [
						{ id: 'cue', label: 'A cue (pick from the show)' },
						{ id: 'time', label: 'A time (ms)' },
					],
				},
				// Cue mode: one picker that already carries its own timeline — no id typing.
				{
					type: 'dropdown',
					id: 'cue',
					label: 'Cue',
					default: (cues[0] && cues[0].id) || '',
					choices: cues.length ? cues : [{ id: '', label: '(no cues discovered yet)' }],
					isVisible: (o) => o.mode === 'cue',
				},
				// Time mode: pick the timeline + the millisecond.
				{ ...timelineField(), isVisible: (o) => o.mode === 'time' },
				{ type: 'number', id: 'time', label: 'Time (ms)', default: 0, min: 0, max: 86400000, isVisible: (o) => o.mode === 'time' },
				{
					type: 'dropdown',
					id: 'state',
					label: 'Then',
					default: 'play',
					choices: [
						{ id: 'play', label: 'Play' },
						{ id: 'pause', label: 'Pause (hold)' },
					],
				},
			],
			callback: async (e) => {
				const body = { state: e.options.state }
				let id
				if (e.options.mode === 'cue') {
					const pair = unpackPair(e.options.cue) // [timelineId, cueId]
					if (!pair) {
						self.log('warn', 'jump: pick a cue')
						return
					}
					id = pair.groupId
					body.cue = pair.presetId
				} else {
					id = String(e.options.timeline)
					body.time = Number(e.options.time)
				}
				await self.apiPost('/timeline/' + encodeURIComponent(id) + '/jump', body)
			},
		},

		press_widget: {
			name: 'Surface: press a button / widget',
			options: [
				{
					type: 'dropdown',
					id: 'widget',
					label: 'Widget (grouped per page)',
					default: (widgets[0] && widgets[0].id) || '',
					choices: widgets.length ? widgets : [{ id: '', label: '(no pressable widgets discovered yet)' }],
					allowCustom: true,
				},
			],
			callback: async (e) => {
				const id = String(e.options.widget)
				if (!id) {
					self.log('warn', 'press: pick a widget')
					return
				}
				await self.apiPost('/press/' + encodeURIComponent(id))
			},
		},

		cueset_preset: {
			name: 'Cue set: activate preset',
			options: [
				{
					type: 'dropdown',
					id: 'preset',
					label: 'Cue set → preset',
					default: (presets[0] && presets[0].id) || '',
					choices: presets.length ? presets : [{ id: '', label: '(no cue sets discovered yet)' }],
				},
			],
			callback: async (e) => {
				const pair = unpackPair(e.options.preset)
				if (!pair) {
					self.log('warn', 'cue set: pick a preset')
					return
				}
				await self.apiPost('/cueset/' + encodeURIComponent(pair.groupId) + '/' + encodeURIComponent(pair.presetId))
			},
		},

		set_variable: {
			name: 'Variable: set value',
			options: [
				{
					type: 'dropdown',
					id: 'variable',
					label: 'Variable (by key)',
					default: (vars[0] && vars[0].id) || '',
					choices: vars.length ? vars : [{ id: '', label: '(no keyed variables discovered yet)' }],
					allowCustom: true,
				},
				{ type: 'number', id: 'value', label: 'Value (in the variable’s own units)', default: 0, min: -1000000, max: 1000000, step: 0.01 },
			],
			callback: async (e) => {
				const key = String(e.options.variable)
				const value = Number(e.options.value)
				if (!key) {
					self.log('warn', 'variable: an empty key would hit every variable — pick one')
					return
				}
				if (!isFinite(value)) {
					self.log('warn', 'variable: value is not a number')
					return
				}
				await self.apiPost('/variable', { key, value })
			},
		},
	})
}
