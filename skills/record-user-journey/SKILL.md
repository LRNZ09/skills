---
name: record-user-journey
description: Use when you need a recording or visual proof of a real user journey through a running app — a demo video for a PR, ticket or stakeholder, evidence that a fix behaves correctly end to end, a walkthrough captured at a fixed device viewport (TV, tablet, kiosk), or the same journey re-recorded later after code changed. Also use when a recording came out cropped, juddering, or showing something that did not happen.
---

# Record a User Journey

Drive a running app over the Chrome DevTools Protocol, capture the journey as video, and
annotate it with what actually happened. The journey is data; the harness in this directory
executes it.

**Core principle: the recording is evidence, so it has to be honest.** A frame that shows a
held video still while the screen was off, a caption that claims success the run did not
achieve, a viewport that is really a cropped window — each turns a demo into a false claim.
Every rule below exists to keep the recording faithful.

## Prerequisites

1. The app running locally, and a Chrome you control:
   ```sh
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 --user-data-dir=/tmp/journey-profile \
     --hide-crash-restore-bubble
   ```
   **Do not pass `--disable-backgrounding-occluded-windows` or
   `--disable-renderer-backgrounding`** — they stop the page ever being backgrounded, so any
   journey that hides the app silently tests nothing. Automation-launched browsers
   (including MCP-driven ones) commonly set them; launch your own instead.
   If you copy a real profile to inherit a login, delete `SingletonLock`, `SingletonCookie`
   and `SingletonSocket` from the copy first or Chrome hands off to the running instance and
   never opens the port.
2. Sign in manually once. The profile keeps the session.
3. **Confirm the server is serving the code you intend to demonstrate.** Check the branch,
   and check the code is reachable — an effect nobody subscribes to is dead code. Restart the
   dev server after switching branches. Skipping this produces recordings of the wrong build
   that look exactly like recordings of the right one.
4. **Start the dev server so it does not inherit your shell's file descriptors**, and load
   the route you are about to record before recording it. A server backgrounded from an
   agent's own shell (`nohup … &`, even with `< /dev/null`) keeps serving, but a plugin that
   spawns a child process to compile — vanilla-extract does, per CSS module, lazily on first
   request — fails with `spawn EBADF` once the parent's descriptors go away. The page then
   returns 200 with an empty body, so the run aborts on a missing selector and looks like a
   bad journey rather than a broken server. Use the harness's own detached-process mechanism,
   check the server log for `EBADF`, and confirm the route's key element renders first.

## Running it

```sh
node driver.mjs journeys/my-journey.json --out ./recording
```

Outputs `recording/<name>.mp4`, the frames and concat list, and `journey.json` with every
fact the run collected plus a list of held frames. A `verifyViewport` step also writes
`verify-viewport.jpg`. `--no-encode` skips ffmpeg. The `frames/` subdirectory of `--out` is
cleared on each run; nothing else in it is touched.

## Before/after comparisons

Recording the same journey against two builds is the common case, and the pair only reads as
evidence if the presentation is identical every time. Run the same journey file twice, into
separate `--out` directories, then compose:

```sh
scripts/side-by-side.sh <before.mp4> <after.mp4> <out-dir> <TICKET> [before-label] [after-label]
```

**The standard, so a comparison looks the same across tickets:**

- **Filename** `<TICKET>-before-after-side-by-side.mp4`, with the single-build clips as
  `<TICKET>-before.mp4` / `<TICKET>-after.mp4` and stills as `<TICKET>-still-<what>.png`.
  Recognisable from the filename alone, and successive tickets sort together.
- **Labels are floating badges in each pane's top-left corner**, over the video: pastel red
  `#F2A6A6` for before, pastel green `#A8DCB0` for after, so the colour says bad/good before
  a word is read. Ink is a deep tint of the same hue (`#5A1111`, `#14431F`), never white —
  white on either pastel measures under 2:1 and is unreadable, while these land at 7.1:1 and
  7.3:1. 50px tall, inset 17x20 in a 1280-wide pane. Not a header bar above the panes — a bar
  steals height from both and pushes the app's own top-of-screen UI (a search field, the
  caption) away from the frame edge it was designed against. The badge sits in a corner apps
  leave empty.
- **Geometry** two 1280x720 panes plus a 4px separator, so 2564x720; 30fps CFR, yuv420p.
- **A markdown summary next to the video**, `<TICKET>-before-after.md`: what was recorded in
  two lines, then a table of every fact field whose value differs between the runs. The
  script generates it from the two facts files, and omits rows that are identical — a table
  where most rows say "unchanged" buries the two or three that carry the result.
- **Keep implementation detail out of that table, and make every row that stays readable on
  its own.** A summary is read by people who were not in the investigation, and a number they
  cannot interpret is worse than no number: it invites a wrong conclusion. Declare the noisy
  fields in the journey as `summaryExclude` (leaf names, or `fact.field` for one specific
  row); the script drops them and footnotes how many it withheld, so nothing is hidden
  silently. Two kinds belong there:
  - **Technical** — internal geometry with no user-visible meaning (a virtualizer's row
    height in px, its loaded-row count, a JS heap figure that excludes the resource the fix
    is actually about).
  - **Misleading** — anything where a bigger number is not plainly better or worse. A raw
    count of "tiles in view" varies with row height, overscan and how far a list has
    paginated, so the same value can move in either direction for reasons unrelated to the
    change. Prefer a self-describing form: `"6 of 6 recording tiles"` says what a bare `6`
    cannot, and stays true whatever the window happens to contain.
- **Alignment** a journey with fixed holds runs to the same length twice, so any difference
  is start-up latency at the head. The script trims the head of the longer clip so the two
  align at the *tail*, where the summary panel is, and says so when it does. Drift then
  lands in the idle opening rather than across a caption, where one pane would appear a step
  ahead of the other.

The script needs ImageMagick: most ffmpeg builds ship without libfreetype, so `drawtext` is
unavailable and the badges have to be rendered as PNGs and overlaid.

**Both runs must see the same fixture data.** Two runs against drifting fixtures produce a
diff of the fixtures, not of the builds. Confirm the data is stable before the first run
rather than between them: a seeding job still landing rows during run one showed a third of
the continue-watching bars missing, which read exactly like the branch having dropped them.

**Keep the journey as short as the evidence allows.** Every extra step is a step that can
diverge between two runs, and a comparison is only as trustworthy as its shortest path to
the thing being shown.

- **Do not drive UI to reach a state the default view already shows.** A leg that switches a
  filter or opens a menu to surface some item type is wasted when the unfiltered view already
  contains it — and worse, a convergence target that is already satisfied lets the step skip
  itself while the caption still claims the switch happened.
- **Scroll two or three rows, not to the end of the list.** Enough to force the next page and
  show what stays mounted; more just adds runtime and lets the two runs drift apart. Reaching
  the end of a list also changes what the virtualizer keeps, which muddies exactly the
  measurement a scroll leg is there to take.

Start from `journeys/standby-teardown.example.json` and replace the selectors. Keep a
journey per scenario; they are small and readable. Every journey key and per-step option is
listed in reference.md.

Three things that are easy to get wrong when authoring one:

- **`verifyViewport` must run while capture is active** or it can only check the screenshot
  path, which cannot crop — it will pass while the recording is cropped. It says so when it
  falls back.
- **Put dwell between visual changes**, and let the run end shortly after the last one. The
  capture stream only emits on change.
- **`summary` always draws the tracked-request timeline.** If the journey is not about
  requests, put `{"resetTimeline": true}` before it, or the panel carries rows from whatever
  the app happened to send.

## Journey steps

One action per step. `{{fact.path}}` interpolates anything an earlier step stored.

| Step | Does |
|---|---|
| `{"goto": "/path", "waitFor": "sel"}` | navigate (a fresh document — this is how you model a relaunch) |
| `{"type": {"text": "sport", "perChar": 600, "into": "sel"}}` | type text one character at a time (`into` asserts that field holds focus; `clear` empties it first) |
| `{"press": "Enter", "untilPath": "/x"}` | send remote keys, retrying until the route matches |
| `{"press": "Enter", "untilSelector": "sel"}` | retry until an element appears — use when a route alone is not proof |
| `{"press": "ArrowDown", "untilFocus": "id"}` | press until a target is focused — never count keys |
| `{"click": {"selector": "sel", "untilSelector": "sel"}}` | click with a real mouse, for a pointer app rather than a remote |
| `{"hold": 4000}` | dwell on the current screen |
| `{"capture": "start"\|"stop"}` | with `"captureFrom": "manual"`, keep boot and setup out of the video |
| `{"expect": {"focus"\|"selector"\|"path": …}}` | assert before acting; abort loudly if wrong |
| `{"read": {"js": "…", "as": "name"}}` | evaluate in the page, store as a fact |
| `{"scan": {…}}` | step through a list, checking each candidate, stop at the first that qualifies |
| `{"play": {"holdMs": n}}` | wait for video that is decoding *and advancing*, then dwell |
| `{"check": "name", "as": "before"}` | run a declared HTTP check from inside the page |
| `{"armKill": true}` | model a platform that kills the app the instant it is hidden |
| `{"standby": {…}}` | black the screen, hide the page for real, restore |
| `{"ring": {…}}`, `{"caption": "…"}` | annotate the frame |
| `{"summary": {…}}` | draw the timeline + fact panel |
| `{"verifyViewport": true}` | measure a captured frame and fail if it is cropped or rescaled |

## The five rules that decide if the recording is trustworthy

1. **Capture the compositor stream, and make the viewport fit the window.**
   `Page.startScreencast` captures the *window surface*, so a viewport bigger or
   differently shaped than the window comes back rescaled — this is what "it's cropped"
   always turns out to be.
2. **Never resize the window.** Fit the emulated viewport into whatever the window gives
   you via `scale` on `Emulation.setDeviceMetricsOverride`, the way device mode does.
3. **Keep the tab in the foreground.** A hidden tab reports `visibilityState: "hidden"` and
   silently drops injected key events.
4. **Black the screen before hiding the page.** A hidden tab does not composite, so capture
   pauses and the last frame is held. Without a blackout the video shows playback
   continuing with the screen off.
5. **Encode to a constant frame rate.** Irregular screencast timing played as a
   variable-rate stream is the "glitching" — resample with `fps=30` + `-fps_mode cfr`.

Full explanations, symptoms and checks: reference.md.

## Shortcuts that look reasonable and ruin the evidence

Each of these is a design a capable engineer arrives at independently. Each produces a
recording that looks fine and proves less than it appears to.

| Shortcut | Why it appeals | What it costs |
|---|---|---|
| Capture with `Page.captureScreenshot` | it is viewport-true at any window size, so the cropping problem disappears | it tops out near 10-15fps with uneven spacing. The result judders, and "capture-rate physics" is the wrong conclusion — screencast plus a fitted viewport is both smooth *and* complete |
| Synthesise the hidden state — redefine `document.hidden`, dispatch `visibilitychange` yourself | the page keeps compositing, so the teardown is recorded instead of vanishing into a capture gap | a browser-dispatched event runs a microtask checkpoint after *each* listener; a scripted one runs them all in a single task. Any behaviour that depends on teardown ordering gets a friendlier world than production. You recorded your shim, not the app |
| Skip the blackout, accept a capture gap | it is honest in the log | the video holds the last decoded frame, so the screen appears to keep playing while the device is off. A viewer reads frames, not logs |
| Seed a flag or setting so the app tears down on cue | otherwise the scenario will not trigger locally | you are now demonstrating a configuration you invented. Model the platform behaviour in instrumentation and leave the app's own config alone, or state plainly that the flag was forced |
| Put the harness in the product repo | it looks like a tool the team would want | it is not what you were asked for, and it lands in someone's branch. Keep it with the skill; keep the app-specific journey file wherever that project keeps scratch work |
| Record first, check the build later | the app is right there and running | a recording of the wrong build is indistinguishable from a recording of the right one. Verify the branch and that the code is reachable *before* capture |

## Prove the mechanism, not just the outcome

If the behaviour depends on ordering — which listener wins, which transport carried a
request — record that ordering. The harness traces every teardown listener (target, phase,
time) and labels every tracked request with its transport, so the video can show

```
window capture visibilitychange → request sent over synchronous XHR → document listeners → app killed
```

instead of asserting it. An outcome that is right for the wrong reason looks identical to
one that is right by design.

## Common mistakes

| Mistake | Consequence | Fix |
|---|---|---|
| Hard-coded fixture ids | works once, then the journey consumed its own fixture | `scan` for an item in the right state at run time |
| Counting keypresses | focus starts somewhere else and the journey ends up on the wrong page | `untilFocus` / `untilPath` |
| Recording on `paused === false` | opens on a buffering spinner | require `readyState >= 3`, `videoWidth > 0`, advancing `currentTime` |
| Captions written up front | narration claims a success the run did not achieve | derive every caption from a collected fact |
| Annotation appended to `body` | a transformed ancestor drags it off the frame | append to `documentElement`, assert the rect |
| Re-running the driver on one tab | init scripts accumulate and re-wrap `fetch` until the stack overflows | the instrumentation guards itself; keep that guard |
| Matching a tile by visible text | duplicate titles ring the wrong one | match ids, or skip candidates whose title already exists |
