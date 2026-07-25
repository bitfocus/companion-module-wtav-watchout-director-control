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
- **Timeline: jump to time or cue** — seek to a time or a cue id, then play or hold (pause).
- **Cue set: activate preset** — switch a WATCHOUT cue set to one of its presets.
- **Variable: set value** — set an input **by its key** (the external-control key you assign in
  WATCHOUT Producer; an empty key would hit every variable, so only keyed variables are listed).

## Feedbacks

- **Timeline: play state (colour)** — restyle a button when a timeline is playing / paused / stopped.
- **Cue set: preset is active (colour)** — light up the active preset.
- **Timeline: progress bar (0-100%)** — a live fill bar of the timeline's position.
- **Variable: value bar (0-100%)** — a live fill bar of a variable's value across its range.

## Variables

Per timeline (`$(wtav-directorcontrol:tl_<id>_state)` etc.): name, state, time (m:ss), time (ms),
progress %. Per keyed variable: value, %, and value **source**. Plus `show_name` and `connection`.

## About variable feedback — an honest note

WATCHOUT does **not** report variable values back to controllers (its input API is write-only). So a
variable bar/percentage shows the **last value set** (by Companion or the app) — the `source` variable
reads `set`. If you configure WATCHOUT to push a variable out (an OSC/HTTP output cue) the app can
capture the real live value (`source` = `osc`), and a future native WATCHOUT read-back will show as
`watchout`. **Timeline** progress, by contrast, is always real live feedback.
