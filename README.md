# companion-module-wtav-watchout-director-control

A [Bitfocus Companion](https://bitfocus.io/companion) module for the **WTAV Director Control** app —
a control surface for Dataton **WATCHOUT 7**. It drives the app's semantic **`/api/v1`** surface
(timelines, cue sets, variables) with live feedback, including 0-100% progress/value gauges.

**Requires Companion 5.0 or newer** (module API 2.1). The bars are drawn by Companion from a gauge
graphics element, which Companion 4 does not have. Companion 4.x users can request a legacy v1.0.0
build at control-support@avtrade.nl; see [`companion/HELP.md`](companion/HELP.md).

See [`companion/HELP.md`](companion/HELP.md) for the user-facing documentation (actions, feedbacks,
variables, setup).

## Development

This is a plain-JavaScript module (no build step). The entry point is `src/main.js`; actions,
feedbacks and variables are in `src/`. The dropdown/formatting helpers (`src/util.js`), the variable
value diff (`src/variables.js`) and the API client URL builder (`src/api.js`) are dependency-free and
covered by an isolated test.

```bash
npm install          # installs @companion-module/base
npm test             # runs scratchpad/test-module.js (no Companion needed)
```

### Running it in Companion (sideload)

You do **not** need to publish this to Bitfocus to use it. In Companion, open the settings and set the
**Developer modules path** to the folder that _contains_ this module folder, then add a **WTAV Director
Control** connection. Companion hot-reloads the module when you edit a file.

### Notes for maintainers

- Variable values are pushed with a diff (`pushValues()` in `src/variables.js`): only ids whose value
  actually changed go over the wire, and the cache is cleared whenever the definitions are rebuilt,
  because redefining a variable can drop the value Companion holds for it.
- No `advanced` feedbacks: the bars are `layered` presets with a `gauge` element. Graphics element
  coordinates are percentages of the button, not pixels.
- A frozen Companion-4 build of v1.0.0 lives in the private WTAV Director Control repo
  (`companion-module-legacy-c4/`) and is sent to users on request.

## The contract

This module targets **`/api/v1`** of WTAV Director Control (v1.5.1-b04+). Every response carries
`apiVersion`; breaking changes bump it. Endpoints: `GET /ping|show|state`,
`POST /timeline/{id}/{play|pause|stop|toggle}` (+`?time=`), `/timeline/{id}/jump`,
`/cueset/{group}/{preset}`, `/variable`.
