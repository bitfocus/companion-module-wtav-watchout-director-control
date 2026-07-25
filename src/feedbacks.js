'use strict';
// Feedback definitions. Boolean feedbacks restyle a button (colour); "advanced"
// feedbacks draw a live 0-100% fill bar as a png64 image. All read from self.live
// (the /api/v1/state snapshot refreshed by the poll loop).
const { timelineChoices, variableChoices, cuesetPresetChoices, unpackPair } = require('./util');
const { barPng } = require('./bar');

function liveTimeline(self, id) { return (self.live.timelines || []).find(t => String(t.id) === String(id)) || null; }
function liveVariable(self, key) { return (self.live.variables || []).find(v => String(v.key) === String(key)) || null; }

module.exports = function (self) {
  const tls = timelineChoices(self.show);
  const vars = variableChoices(self.show);
  const presets = cuesetPresetChoices(self.show);
  const tlField = { type: 'dropdown', id: 'timeline', label: 'Timeline',
    default: (tls[0] && tls[0].id) || '0',
    choices: tls.length ? tls : [{ id: '0', label: 'Timeline 0' }], allowCustom: true };

  self.setFeedbackDefinitions({
    timeline_state: {
      name: 'Timeline: play state (colour)',
      type: 'boolean',
      defaultStyle: { bgcolor: 0x228b22, color: 0xffffff },
      options: [
        tlField,
        { type: 'dropdown', id: 'state', label: 'Is', default: 'playing', choices: [
          { id: 'playing', label: 'Playing' }, { id: 'paused', label: 'Paused' }, { id: 'stopped', label: 'Stopped' } ] }
      ],
      callback: (fb) => {
        const t = liveTimeline(self, fb.options.timeline);
        const st = t ? t.state : 'stopped';
        return st === fb.options.state;
      }
    },

    cueset_active: {
      name: 'Cue set: preset is active (colour)',
      type: 'boolean',
      defaultStyle: { bgcolor: 0xff8a5c, color: 0x000000 },
      options: [
        { type: 'dropdown', id: 'preset', label: 'Cue set → preset',
          default: (presets[0] && presets[0].id) || '',
          choices: presets.length ? presets : [{ id: '', label: '(no cue sets yet)' }] }
      ],
      callback: (fb) => {
        const pair = unpackPair(fb.options.preset); if (!pair) return false;
        const g = (self.live.cueSets || []).find(x => String(x.id) === String(pair.groupId));
        return !!g && String(g.activePresetId) === String(pair.presetId);
      }
    },

    timeline_progress: {
      name: 'Timeline: progress bar (0-100%)',
      type: 'advanced',
      options: [
        tlField,
        { type: 'colorpicker', id: 'fg', label: 'Bar colour', default: 0x33cc66 },
        { type: 'colorpicker', id: 'bg', label: 'Background', default: 0x222222 },
        { type: 'checkbox', id: 'vertical', label: 'Vertical', default: false }
      ],
      callback: (fb) => {
        const t = liveTimeline(self, fb.options.timeline);
        const frac = t && t.pct != null ? t.pct : 0;
        const w = (fb.image && fb.image.width) || 72, h = (fb.image && fb.image.height) || 72;
        return { png64: barPng(frac, { w, h, fg: fb.options.fg, bg: fb.options.bg, vertical: fb.options.vertical }) };
      }
    },

    variable_bar: {
      name: 'Variable: value bar (0-100%)',
      type: 'advanced',
      options: [
        { type: 'dropdown', id: 'variable', label: 'Variable (by key)',
          default: (vars[0] && vars[0].id) || '',
          choices: vars.length ? vars : [{ id: '', label: '(no keyed variables yet)' }], allowCustom: true },
        { type: 'colorpicker', id: 'fg', label: 'Bar colour', default: 0x4aa3ff },
        { type: 'colorpicker', id: 'bg', label: 'Background', default: 0x222222 },
        { type: 'checkbox', id: 'vertical', label: 'Vertical', default: false }
      ],
      callback: (fb) => {
        const v = liveVariable(self, fb.options.variable);
        const frac = v && v.pct != null ? v.pct : 0;
        const w = (fb.image && fb.image.width) || 72, h = (fb.image && fb.image.height) || 72;
        return { png64: barPng(frac, { w, h, fg: fb.options.fg, bg: fb.options.bg, vertical: fb.options.vertical }) };
      }
    }
  });
};
