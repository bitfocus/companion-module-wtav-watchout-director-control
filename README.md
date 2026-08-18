# companion-module-wtav-watchout-director-control

A [Bitfocus Companion](https://bitfocus.io/companion) module for the **WTAV Director Control** app —
a control surface for Dataton **WATCHOUT 7**. It drives the app's semantic **`/api/v1`** surface
(timelines, cue sets, variables) with live feedback, including 0-100% progress/value bars.

See [`companion/HELP.md`](companion/HELP.md) for the user-facing documentation (actions, feedbacks,
variables, setup).

## Development

This is a plain-JavaScript module (no build step). The entry point is `src/main.js`; actions,
feedbacks and variables are in `src/`. The dropdown/formatting helpers (`src/util.js`), the PNG bar
renderer (`src/bar.js`) and the API client URL builder (`src/api.js`) are dependency-free and covered
by an isolated test.

```bash
npm install          # installs @companion-module/base
npm test             # runs scratchpad/test-module.js (no Companion needed)
```

### Running it in Companion (sideload)

You do **not** need to publish this to Bitfocus to use it. In Companion, open the settings and set the
**Developer modules path** to the folder that *contains* this module folder, then add a **WTAV Director
Control** connection. Companion hot-reloads the module when you edit a file.

### Publishing (optional, later)

To make it installable by everyone, request a repo / submit via the
[Bitfocus Developer Portal](https://developer.bitfocus.io/) (`#module-development` on Slack). Bitfocus'
naming convention prefers a manufacturer prefix (`companion-module-wtav-directorcontrol`); the module
`id` is already `wtav-directorcontrol`.

## The contract

This module targets **`/api/v1`** of WTAV Director Control (v1.5.1-b04+). Every response carries
`apiVersion`; breaking changes bump it. Endpoints: `GET /ping|show|state`,
`POST /timeline/{id}/{play|pause|stop|toggle}` (+`?time=`), `/timeline/{id}/jump`,
`/cueset/{group}/{preset}`, `/variable`.
