# Marp rendering

## Contents

- Setup
- Render commands
- Layout check
- Theme rules
- Video
- Troubleshooting

## Setup

- Never add Marp to the product repository's dependencies. Run the CLI ephemerally with the
  repo's package runner (`npx`, `yarn dlx`, `pnpm dlx`).
- Keep one config next to the decks so every deck renders the same way:

  ```yaml
  # .marprc.yml
  themeSet: ./<theme>.css     # registers the theme only; each deck sets `theme: <name>`
  allowLocalFiles: true
  html: true
  engine: ./marp-engine.mjs   # only when slides have video; see "Video"
  ```

- Each deck's front matter must say `theme: <name>`, the name in the CSS's
  `/* @theme <name> */` comment; otherwise it renders with Marp's default theme.
- Marp CLI reads `.marprc.yml` only from the current directory, never from a parent. Run
  every command from the folder that holds it, with the deck's path, or pass
  `--config-file <path>` (`-c`). Otherwise the config is skipped without a warning: default
  theme, no engine, and no `<video>` on the slides.
- One folder per deck; keep media under it and reference it with relative paths.

## Render commands

Always pass `--no-stdin`: without it the CLI waits for standard input and hangs when run
from a script or in the background.

```sh
# from the folder that holds .marprc.yml
marp --no-stdin sprint-N/deck.md --pdf --pdf-notes -o sprint-N/deck.pdf   # notes as PDF annotations
marp --no-stdin sprint-N/deck.md -o sprint-N/deck.html                    # presenter view with p
marp --no-stdin sprint-N/deck.md --notes -o sprint-N/deck-notes.txt       # script for paper
marp --no-stdin sprint-N/deck.md --images png -o /tmp/check/s.png         # per-slide images
```

Prefix `marp` with the package runner, e.g. `npx @marp-team/marp-cli`. `allowLocalFiles` in
the config covers local media; pass `--allow-local-files` when rendering without it.
Re-render all three outputs after every edit unless the user asked to batch renders.

## Layout check

After each render, read back every slide you touched (the PDF page or the PNG):

- no text touches the footer line or the page number; no table sits on the bottom edge;
- emoji sit inline with the text, not on a line of their own;
- each bullet wraps where you expect; a bullet that wraps by one or two words can usually be
  brought back to one line.

When a slide overflows, fix it in this order: trim your own wording, shorten the longest
bullet by a word or two, restructure (for example, move a cause into a one-line **Why**).
Do not shrink the font globally; a slide-scoped font size is a last resort, and only with
the user's agreement. Never trim the user's dictated text without asking.

## Theme rules

Marp scopes every theme rule to the slide, so a theme can style anything on a slide but
nothing appended to `<body>`. Put deck-wide fixes in the theme, not in a deck's front matter.

```css
/* Marp renders emoji as <img class="emoji">; a theme that displays images as blocks drops
 * them onto their own line. Keep them inline at text size. */
section img.emoji {
  display: inline;
  height: 1em;
  margin: 0;
  vertical-align: -0.15em;
}

/* Native video controls don't work inside Marp's scaled slide: Safari draws them at the
 * wrong scale and clips them, Chromium shows them only while the pointer moves. Hide them;
 * a click opens the full-window player from marp-engine.mjs. */
section video {
  cursor: zoom-in;
}

section video::-webkit-media-controls {
  display: none !important;
}
```

## Video

With the bundled `marp-engine.mjs` (copy it next to `.marprc.yml` and set `engine:`):

```html
<video data-autoplay src="./media/demo.mp4" poster="./media/demo-still.png" muted playsinline style="display:block;width:100%;"></video>
```

- `data-autoplay`: plays muted from the start when its slide becomes current, pauses when
  the deck moves on. Only in the audience window, never in the presenter view or its
  next-slide preview.
- Click: opens a full-window player at the same position, with native controls, in the
  clicked window only. The presenter view holds the live deck too, but only the slide number
  is synced, so click the video on the audience screen. Escape or a click on the backdrop
  closes it; the slide video jumps to where the full-window one stopped, and plays on only
  if both were playing.
- Styles injected by an engine must not contain `>`: Marp escapes it inside the injected
  block.

Long demo recordings: cut the waiting, keep every moment where something happens, and show
a "» N s later" badge for about two seconds at each cut. Captions inside the video keep the
real elapsed times, so the shorter clip doesn't misstate durations. Keep the uncut version
next to it. Record before and after with the same scripted journey on both builds, and
confirm each server serves the intended build before recording.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| default theme, no autoplay, video missing from its slide | rendered from a folder without `.marprc.yml` | run from the config's folder or pass `--config-file <path>` |
| deck renders with the default theme although the config is found | front matter lacks `theme: <name>` | add it |
| render never finishes | the CLI is waiting for standard input | add `--no-stdin`; kill the stuck process |
| emoji on its own line | theme displays images as blocks | add the emoji rule above to the theme |
| text overlaps the footer | slide too full | see "Layout check" |
| video controls vanish about 2 s after the pointer stops | Chromium's native behaviour; CSS can't pin them (internal parts) | expected: pause to keep them visible; keep the native controls, and build a custom control bar only if the presenter asks |
| controls flicker or hide immediately in one browser only | browser-specific behaviour | reproduce in another Chromium browser before changing the deck |
| video doesn't load in the HTML | the HTML was moved away from its media | present from the deck folder |
| presenter view doesn't open | pop-up blocked; Caps Lock on (only a lowercase `p` opens it); or the browser blocks site storage for the page | allow pop-ups, turn Caps Lock off, allow site data, press p again |
| an engine style has no effect | `>` was escaped, or a theme rule targets an element under `<body>` | rewrite without `>`; style it from the engine |
