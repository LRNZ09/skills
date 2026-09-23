# Reference: recording journeys over CDP

Everything here was learned by getting it wrong first. Each item states the symptom, the
cause, and the check that catches it.

## Frame capture: which CDP call

| | `Page.startScreencast` | `Page.captureScreenshot` |
|---|---|---|
| What it captures | the window's compositor surface | the emulated viewport, rendered on demand |
| Frame rate | follows the compositor, ~30fps | ~9-15fps, uneven spacing |
| Cropping risk | **yes** — a viewport larger or differently shaped than the window comes back rescaled | none, with an explicit `clip` |
| Video content | correct, it is the composited stream | correct, but the pacing judders once resampled |

**Use screencast for the recording, and make the viewport fit the window** (see below).
Use `captureScreenshot` with `clip: {x:0, y:0, width, height, scale:1}` for single
verification frames, where being viewport-true matters more than smoothness.

Symptom of getting this wrong: the app's fixed-size layout looks zoomed in, edge UI is
missing, and an overlay you positioned at `bottom: 5%` sits half outside the frame.

## Emulate and scale, never resize the window

Resizing someone's browser window is intrusive and usually unnecessary.
`Emulation.setDeviceMetricsOverride` takes a `scale`, which is exactly what device mode's
"50%" does: the page still lays out at the target size, it just renders smaller.

```js
await send("Emulation.clearDeviceMetricsOverride");          // measure the real box first
const [w, h] = JSON.parse(await evaluate("JSON.stringify([innerWidth, innerHeight])"));
const scale = Math.min(1, w / TARGET.width, h / TARGET.height);
await send("Emulation.setDeviceMetricsOverride", { ...TARGET, deviceScaleFactor: 1, mobile: false, scale });
```

At `scale < 1` the screencast frames are downscaled, so they are complete but soft. Warn
about it rather than silently shipping a blurry recording.

## The tab must be in the foreground

A tab that is not the foreground tab of a foreground window reports
`visibilityState: "hidden"`, and the renderer **silently drops `Input.dispatchKeyEvent`** —
no error, the keys simply never arrive. Symptom: the journey stalls with focus in the right
place and nothing responding.

```js
await fetch(`http://localhost:${PORT}/json/activate/${target.id}`);
await send("Page.bringToFront");
// then assert:
if (await evaluate("document.visibilityState") !== "visible") throw new Error("raise the window");
```

This matters twice over when hiding the page is the thing under test: you cannot observe a
transition into hidden from a tab that was already hidden.

## Init scripts accumulate on the target

`Page.addScriptToEvaluateOnNewDocument` registers one copy **per driver run, for the
lifetime of the target**. Nothing removes them when your process exits. A script that wraps
`window.fetch` will, on the tenth run, wrap the ninth wrapper:

```
RangeError: Maximum call stack size exceeded
  at window.fetch (<anonymous>:36:10)
  at window.fetch (<anonymous>:36:10)   ... x200
```

Guard the script so only the first copy installs:

```js
if (window.__journey) return;
```

## A hidden tab does not composite

While the page is hidden no screencast frames arrive, and a `captureScreenshot` call can
block. Either way the recording holds the last frame for the whole gap — which, if that
frame was mid-video, reads as "playback continued while the screen was off". That is a lie
about what the device did.

Paint the screen black **before** hiding the page, and keep it black until the app
relaunches. Measure it: mean luma over the standby stretch should be near zero.

```sh
ffmpeg -ss 50 -i out.mp4 -frames:v 1 -f image2 - | \
  ffmpeg -i - -vf signalstats,metadata=print:key=lavfi.signalstats.YAVG -f null -
```

## Encode to a constant frame rate

Screencast frames arrive irregularly. A concat list with per-frame durations preserves real
timing, but feeding that straight out as a variable-rate stream judders in most players.
Resample explicitly:

```sh
ffmpeg -f concat -safe 0 -i frames.txt \
  -vf "fps=30,format=yuv420p" -fps_mode cfr \
  -c:v libx264 -preset slow -crf 20 -movflags +faststart -y out.mp4
```

Check the result really is constant rate, and that nothing in the container implies a
different display aspect:

```sh
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,avg_frame_rate,sample_aspect_ratio -of default=nw=1 out.mp4
# expect: avg_frame_rate=30/1, sample_aspect_ratio=1:1
```

To judge smoothness, count how many frames carry new content:

```sh
ffmpeg -ss 30 -t 14 -i out.mp4 -vf mpdecimate -f null - 2>&1 | grep -oE 'frame=\s*[0-9]+' | tail -1
# 291 of 420 = 69% distinct.
```

**Only meaningful over a stretch that should contain continuous motion**, such as video
playback. A UI that sits still between keypresses emits almost no frames, so a perfectly
good recording of a menu can measure under 10% distinct. Measure a stretch you know was
moving, and expect roughly 50% or better there.

## Driving a virtual-focus UI

Spatial-navigation libraries often run "virtual" focus: `document.activeElement` stays on
`<body>`, and the focused element is marked in the DOM instead (commonly
`data-focused="true"`). There are no DOM focus events to await.

- Read focus by querying the marker, not `activeElement`.
- **Assert focus before activating.** Pressing Enter into the wrong focus silently sends the
  journey somewhere else.
- Activation keys get swallowed while a route or list is settling. Retry until the observable
  state changes — `location.pathname` moving is the reliable signal, not a fixed sleep.
- Give each key ~900ms and each grid step ~1400ms. Faster desyncs the focus model.

## Wait for frames, not for `paused === false`

`paused` flips well before the first decoded frame, so a recording started on it opens on a
buffering spinner. Require all of: `!paused`, `readyState >= 3`, `videoWidth > 0`, and
`currentTime` advancing between two samples. Then settle a further ~3s.

When several `<video>` elements exist (ads, previews, the real player), sort by
`currentTime` descending and take the first — index order is not playback order.

## Never hard-code fixture ids

Ids for "an item in the right state" go stale between runs, and a journey that consumes
state (creating a progress entry, marking something watched) invalidates its own fixture.
Discover the item at run time by stepping through the UI and checking each candidate against
the backend, skipping ones already in the target state. Watch out for duplicate labels:
match on ids, and if you must highlight by visible text, skip candidates whose title already
appears in the list you are about to compare against.

## Prove the mechanism, not just the outcome

An outcome can be right for the wrong reason. If the behaviour under test depends on
ordering — which listener runs first, which transport carried a request — instrument that
ordering directly. Wrap `addEventListener` to record target, phase and time per invocation:

```
13636  window capture visibilitychange
13638  sent over synchronous XHR
13883  document bubble visibilitychange
```

Without the trace, a run that passes by luck looks identical to a run that passes by design.
This is how a whole afternoon of recordings turned out to have been made against a build
that did not contain the change at all: one run happened to succeed.

**Before recording anything as proof, confirm the server is serving the code you think it
is** — check the branch, and check the code is actually reachable (an effect nobody
subscribes to is dead code). Restart the dev server after switching branches.

## Verification checklist

Run these before handing over a recording:

- [ ] `verify-viewport.png` shows all four corner markers and the centre crosshair
- [ ] `ffprobe` reports `sample_aspect_ratio=1:1` and a constant frame rate. The pixel
      resolution equals the target only at `fitScale === 1`; below that, check the aspect ratio
      instead and expect a softer picture
- [ ] `pix_fmt` is `yuv420p` with `color_range=tv`. Screencast JPEGs decode full-range, and a
      `yuvj420p`/`pc` file has its blacks crushed by any player that ignores the flag — most
      visible in exactly the stretch a blackout makes black
- [ ] the summary/annotation rect is inside the viewport (the driver warns if not)
- [ ] the standby stretch is black, not a held video frame
- [ ] `mpdecimate` shows a healthy share of distinct frames through any motion
- [ ] the backend facts in `journey.json` match what the captions claim
- [ ] captions never assert success unconditionally — they must be derived from what happened

## Launch your own browser

Automation-launched Chrome (Puppeteer, Playwright, MCP browser tools) commonly passes
`--disable-backgrounding-occluded-windows` and `--disable-renderer-backgrounding`. Those
flags stop the page from ever being backgrounded, so a journey that hides the app records a
page that was never hidden and proves nothing. Launch a browser you control:

```sh
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 --user-data-dir=/tmp/journey-profile --hide-crash-restore-bubble
```

Verify the page really can be hidden before trusting a run: open a second tab and watch for
the transition.

```js
document.addEventListener("visibilitychange", () => (document.title = "VIS-" + document.visibilityState));
```

Copying an existing profile to inherit a login works, but delete `SingletonLock`,
`SingletonCookie` and `SingletonSocket` from the copy first — otherwise Chrome hands the
command off to the already-running instance and no debugging port opens. A copied profile
holds live credentials and cookies: keep it out of shared locations and delete it after.

## Hiding the page for real

`Emulation.setPageScaleFactor` and friends do not change visibility, and dispatching a
synthetic `visibilitychange` is not the same event: a browser-dispatched event runs a
microtask checkpoint after *each* listener, so effects woken by an earlier listener run
before later listeners do. A scripted `document.dispatchEvent` runs every listener in one
task with no checkpoints, which is precisely the ordering a teardown fix has to survive.

Put a real tab in front instead:

```
PUT /json/new?about:blank   → wait → /json/close/<blank> → /json/activate/<app>
```

## Secure-context features

DRM, EME and other secure-context APIs are unavailable on plain `http://`. If playback needs
them, either serve the app over https or, for a throwaway profile only, pass
`--unsafely-treat-insecure-origin-as-secure=http://host:port` — be aware it adds a visible
infobar that changes the window's content box, and therefore what the capture fits into.

## Handed a browser you did not launch

Someone else's Chrome may be configured in ways that change what you capture. Check, in
order:

- `document.visibilityState` — must be `"visible"`, or injected keys vanish.
- The window's content box, since that is what sets the fit scale. `--auto-open-devtools-for-tabs`
  docks a panel that takes horizontal space, and any tab you open afterwards auto-opens
  DevTools and steals the foreground. A DevTools frontend attached to your target also drives
  Emulation and screencast itself and will overwrite your overrides.
- Leftover state from earlier runs: a live `setDeviceMetricsOverride` (possibly at the wrong
  device scale factor), accumulated init-script registrations, and annotation nodes still on
  `documentElement`. The driver clears the overrides and the annotations at startup and
  unregisters its own init script on exit.
- `deviceScaleFactor`. On a retina display, `Page.captureScreenshot` with `clip: {scale: 1}`
  returns 3840x2160 until an override pins the factor to 1. Emulating a device means pinning
  it, not inheriting the developer's monitor.

## Journey and step options

Journey level: `name`, `baseUrl`, `targetMatch` (a regex against the target URL — without it
the driver attaches to whatever page target comes first, which may be a DevTools tab),
`viewport`, `userAgent`, `userAgentMetadata`, `deviceScaleFactor`, `quality`, `fps`,
`captureFrom: "manual"`, `tailMs`, `maxTailSeconds`, `hideSelectors` (without these the dev
overlays of a development build sit in frame), `killLabel`, `track`, `checks`, `steps`.

Per step: `gap`, `retries`, `retryGap`, `tries`, `settle`, `waitFor`, `as`, `failIf`.

`type` sends one `char` event per character (never `text` on the keyDown as well, which
inserts everything twice) and spaces them by `perChar`, so the recording shows each
intermediate state rather than a field that fills in one frame. It types into whatever holds
DOM focus: pass `into` so a run that lost focus fails loudly instead of searching for nothing.

`click` takes `selector`, or `text` for an exact label (searched over `button, a,
[role=button]` unless `within` narrows it), plus `nth` to pick among matches, `hover` to
put the pointer over another element first, and `untilPath`/`untilSelector` to retry.
Three things it does that `element.click()` cannot, and that a journey needs:

- **Real `Input` events, so the click is a user gesture.** A scripted click is not, so it
  cannot satisfy the autoplay policy: the player stays paused and the recording opens on
  a still frame that looks like playback.
- **It cannot land through an overlay.** A scripted click reaches a covered element the
  user could never reach, so the run proves a path that does not exist.
- **It only presses inside the viewport, after the layout settles.** Coordinates are
  viewport-relative and a press outside them is discarded. The element is scrolled into
  view and re-measured, and a target whose centre falls outside either axis counts as not
  yet clickable, which is what catches an app still laid out at the pre-emulation window
  width. `untilSelector`/`untilPath` then re-measure and click again, because a press that
  lands mid-layout and one that lands on a control the app has not wired up yet look
  identical from here.

Player chrome is the usual reason to pass `hover`: controls commonly carry
`pointer-events: none` until the pointer is over the video, so they have no box to measure
and the press goes to whatever is underneath.

Behaviour worth knowing:

- **One action per step, enforced.** A step carrying two action keys is rejected rather than
  silently running whichever the driver declares first.
- **`read.js` and `expect.path` are interpolated**, so a fact can be derived from earlier
  facts, and a route assertion can bind to an id a previous step captured
  (`"path": "/details/{{item.id}}"`) instead of just matching a prefix.
- **`untilFocus` and `expect.focus` require the app to mark focus as
  `data-focused="true"` on the same element that carries the `data-testid`.** A UI that
  marks focus differently cannot use them; assert on a selector instead.
- **`scan` conditions (`skipIf`, `acceptIf`) are JS expressions** evaluated over `item`,
  `check` and `facts`.
- **`{{localStorage:key}}` works in check headers only**, not in paths.

## Emulation calls that quietly defeat a visibility test

`Emulation.setFocusEmulationEnabled` reads as an obvious win for a recording: the renderer
keeps treating the page as focused while your OS focus is in a terminal, so focus styling
stays correct. Measured on Chrome, it also stops the page reporting visibility changes at
all:

```
focusEmulation=false -> during=hidden,  events=["hidden","visible"]
focusEmulation=true  -> during=visible, events=[]
```

A journey about backgrounding, standby or teardown then records a page that was never
hidden, and the app's teardown handlers never run — while every other signal looks healthy.
The driver leaves it off; `"focusEmulation": true` opts in and logs a warning.

The general lesson: an emulation call that makes the page *more comfortable* is suspect when
the thing under test is the page being treated badly. Verify the mechanism still fires after
adding one — dispatch the transition and assert the listener ran.
