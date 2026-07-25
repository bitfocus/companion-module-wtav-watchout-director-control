# WTAV Director Control

Control a running **WTAV Director Control** app (a control surface for Dataton **WATCHOUT 7**) from
Companion. This module talks to the app's semantic **`/api/v1`** surface — timelines, cue sets and
variables by name/id, independent of how the app's canvas is laid out.

## Setup

1. In the **WTAV Director Control** app: open **Settings** and **start the web control surface**
   (default port **3333**). Press **Discover** so the app knows the show's timelines, cue sets and
   variables.
2. In this connection's config, set the **host** (the machine running Director Control — `127.0.0.1`
   if it's the same PC) and the **port** (3333 by default).
3. When connected, the connection goes green and the timeline / cue-set / variable dropdowns fill in.

## Actions

- **Timeline: play / pause / stop / toggle** — transport for one timeline.
- **Timeline: play from position (ms)** — play starting at an exact millisecond.
- **Timeline: jump to time or cue** — in **cue** mode you pick a cue straight from a dropdown of the
  show's cues (each already carries its own timeline, so no id typing); in **time** mode you pick a
  timeline + a millisecond. Then play or hold (pause).
- **Cue set: activate preset** — switch a WATCHOUT cue set to one of its presets.
- **Variable: set value** — set an input **by its key** (the external-control key you assign in
  WATCHOUT Producer; an empty key would hit every variable, so only keyed variables are listed).
- **Surface: press a button / widget** — press a specific widget on the app's own canvas, listed
  grouped per page (the semantic mirror of the phone remote). Only single-press widget types are
  offered (buttons, multi-actions, schedules, Wake-on-LAN, Companion, device).

## Presets

Ready-made buttons are generated from the discovered show, grouped into sections: **Timelines —
Play/Pause** (green when playing, amber when paused), **— Stop** (red when stopped), **— Progress bars**
(live fill, press toggles), **Cue sets** (highlight on the active preset), **Variables** (a live value
bar plus set-to-min/max examples), **Surface buttons** (one per pressable widget, per page), and
**Status**. Drag one onto a button and it arrives fully wired with its feedback.

## Feedbacks

- **Timeline: play state (colour)** — restyle a button when a timeline is playing / paused / stopped.
- **Timeline: countdown warning (colour)** — turn a button red when the countdown to the next marker
  drops under a chosen number of seconds (default 10).
- **Cue set: preset is active (colour)** — light up the active preset.
- **Timeline: progress bar (0-100%)** — a live fill bar of the timeline's position.
- **Variable: value bar (0-100%)** — a live fill bar of a variable's value across its range.

## Variables

Per timeline: name, state, current time (m:ss and ms), progress %, **countdown to the next marker**
(m:ss and ms), the **countdown marker name** it is counting toward, the **next cue name**, and time to
the next cue. Per keyed variable: value, %, and value **source**. Plus `show_name` and `connection`.

Readout presets come in three sections so you pick the layout: **Timelines — Current time**,
**— Countdown** (with the marker name it counts toward), and **— Current time + Countdown**. Every
readout button (and the Play/Pause preset) leads with the **timeline name**, so a placed button always
says which timeline it is. The countdown buttons turn red under 10 s and read `--:--` when no marker is
ahead.

## About variable feedback — an honest note

WATCHOUT does **not** report variable values back to controllers (its input API is write-only). So a
variable bar/percentage shows the **last value set** (by Companion or the app) — the `source` variable
reads `set`. If you configure WATCHOUT to push a variable out (an OSC/HTTP output cue) the app can
capture the real live value (`source` = `osc`), and a future native WATCHOUT read-back will show as
`watchout`. **Timeline** progress, by contrast, is always real live feedback.
