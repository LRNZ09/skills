#!/usr/bin/env node
// Builds the ffmpeg filter_complex for a before/after stack, aligned on caption beats.
//
//   build-stack-filter.mjs <before-facts.json> <after-facts.json> <beforeDur> <afterDur> \
//                          <paneW|native> <badgeX> <badgeY> <sepColor>
//
// Prints two lines: the filter graph, then "OUT <width>x<height> <duration>".
//
// Why per-segment alignment rather than one head trim: the holds in a journey are fixed, but
// the convergence steps between them are not -- `untilFocus` retries and `goto` settle take
// different real time in each run. A single offset therefore only lines the panes up at one
// instant and lets them slip everywhere else. Cutting both clips at the captions and padding
// the shorter side of each pair (freezing its last frame) makes every beat start together, so
// the two panes are showing the same step whenever a viewer stops to compare them.
import { readFile } from "node:fs/promises";

const [bf, af, bDurS, aDurS, paneWArg, badgeX, badgeY, sep] = process.argv.slice(2);
const bDur = Number(bDurS), aDur = Number(aDurS);
const facts = async (p) => JSON.parse(await readFile(p, "utf8"));

let bTl = [], aTl = [];
try {
  bTl = (await facts(bf)).captionTimeline ?? [];
  aTl = (await facts(af)).captionTimeline ?? [];
} catch {}

const bounds = (tl, dur) => tl.map((c) => c.at).filter((t) => t > 0.05 && t < dur - 0.05);

let segs = [];
if (bTl.length && bTl.length === aTl.length) {
  const bp = bounds(bTl, bDur), ap = bounds(aTl, aDur);
  if (bp.length === ap.length && bp.length) {
    // Head and tail are handled differently from the beats between captions. Between two
    // captions both runs are doing the same thing, so padding the shorter to the longer keeps
    // them honest and costs a few frames. The head (app boot, first navigation) and the tail
    // (the closing hold) carry no information and differ by seconds -- padding those would
    // freeze one pane for that long. Trim both to the shorter instead.
    const LEAD = 2.0;
    const lead = Math.min(LEAD, bp[0], ap[0]);
    segs.push({ bStart: bp[0] - lead, bEnd: bp[0], aStart: ap[0] - lead, aEnd: ap[0], target: lead });
    for (let k = 0; k < bp.length - 1; k++) {
      const db = bp[k + 1] - bp[k], da = ap[k + 1] - ap[k];
      segs.push({ bStart: bp[k], bEnd: bp[k + 1], aStart: ap[k], aEnd: ap[k + 1], target: Math.max(db, da) });
    }
    const tail = Math.min(bDur - bp.at(-1), aDur - ap.at(-1));
    segs.push({ bStart: bp.at(-1), bEnd: bp.at(-1) + tail, aStart: ap.at(-1), aEnd: ap.at(-1) + tail, target: tail });
  }
}
if (!segs.length) {
  // No usable timeline: fall back to a single segment per clip, tails aligned by trimming the
  // head of the longer one. Better than nothing, and it is what the old behaviour did.
  const skew = Math.abs(bDur - aDur);
  const bs = bDur > aDur ? skew : 0, as = aDur > bDur ? skew : 0;
  const len = Math.min(bDur - bs, aDur - as);
  segs.push({ bStart: bs, bEnd: bs + len, aStart: as, aEnd: as + len, target: len });
  process.stderr.write("note: no matching caption timeline in both runs; falling back to a single tail-aligned segment\n");
} else {
  process.stderr.write(`note: aligning on ${segs.length - 1} caption beats (${segs.length} segments)\n`);
}

const parts = [];
const seg = (input, side, k, start, end, target) => {
  const own = end - start;
  const pad = Math.max(0, target - own);
  const label = `${side}${k}`;
  let chain = `[${input}]trim=start=${start.toFixed(3)}:end=${end.toFixed(3)},setpts=PTS-STARTPTS`;
  // Freeze the last frame rather than speeding either clip up: a pane that is genuinely
  // slower should look slower, it just must not run ahead into the next step.
  if (pad > 0.004) chain += `,tpad=stop_mode=clone:stop_duration=${pad.toFixed(3)}`;
  parts.push(`${chain}[${label}]`);
  return `[${label}]`;
};

const bLabels = segs.map((s, k) => seg("0:v", "bs", k, s.bStart, s.bEnd, s.target));
const aLabels = segs.map((s, k) => seg("1:v", "as", k, s.aStart, s.aEnd, s.target));
parts.push(`${bLabels.join("")}concat=n=${segs.length}:v=1:a=0[bcat]`);
parts.push(`${aLabels.join("")}concat=n=${segs.length}:v=1:a=0[acat]`);

const scale = paneWArg === "native" ? "" : `,scale=${paneWArg}:-2`;
parts.push(`[bcat]${scale ? scale.slice(1) : "null"}[bsc]`);
parts.push(`[acat]${scale ? scale.slice(1) : "null"}[asc]`);
parts.push(`[bsc][2:v]overlay=${badgeX}:${badgeY}[bl]`);
parts.push(`[asc][3:v]overlay=${badgeX}:${badgeY}[al]`);
parts.push(`[bl]pad=iw+4:ih:0:0:color=${sep}[bp]`);
parts.push(`[bp][al]hstack=inputs=2:shortest=1,format=yuv420p[out]`);

const total = segs.reduce((a, s) => a + s.target, 0);
process.stdout.write(parts.join(";") + "\n");
process.stdout.write(`OUT ${total.toFixed(3)}\n`);
