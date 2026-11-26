import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fc from "fast-check";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import * as driver from "./driver.mjs";

// driver.mjs is plain JS, so its frame timing interface is stated here.
interface Frame {
  readonly file: string;
  readonly ts: number;
}

interface TimedFrame extends Frame {
  readonly seconds: number;
}

interface HeldFrame {
  readonly atSeconds: number;
  readonly heldFor: number;
}

interface FrameTiming {
  readonly tailHold: (lastFrame: Frame, stoppedAt: number, maxSeconds: number) => number;
  readonly frameDurations: (frames: readonly Frame[], tail: number) => readonly TimedFrame[];
  readonly heldFrames: (frames: readonly Frame[]) => readonly HeldFrame[];
  readonly concatList: (timeline: readonly TimedFrame[]) => string;
  readonly encodeArgs: (framesTxt: string, mp4: string, timeline: readonly TimedFrame[], fps: number) => readonly string[];
}

const { tailHold, frameDurations, heldFrames, concatList, encodeArgs } = driver as FrameTiming;

const frameAt = (ts: number, index = 0): Frame => ({ file: `f${String(index + 1).padStart(6, "0")}.jpg`, ts });

const framesAt = (timestamps: readonly number[]): readonly Frame[] => timestamps.map((ts, index) => frameAt(ts, index));

// Builds frames from a start time and the gaps between frames, the way a capture produces them.
const framesWithGaps = (start: number, gaps: readonly number[]): readonly Frame[] =>
  gaps.reduce<readonly Frame[]>((frames, gap) => {
    const previous = frames.at(-1);
    return previous == null ? frames : [...frames, frameAt(previous.ts + gap, frames.length)];
  }, [frameAt(start)]);

// Screencast timestamps are epoch seconds, so the arbitraries use that range.
const startArb = fc.double({ min: 1_700_000_000, max: 1_800_000_000, noNaN: true });
const gapArb = fc.double({ min: 0.001, max: 30, noNaN: true });
const framesArb = fc.tuple(startArb, fc.array(gapArb, { maxLength: 200, size: "max" })).map(([start, gaps]) => framesWithGaps(start, gaps));
const tailArb = fc.double({ min: 0.4, max: 12, noNaN: true });

const spanOf = (frames: readonly Frame[]): number => {
  const [first] = frames;
  const last = frames.at(-1);
  return first == null || last == null ? 0 : last.ts - first.ts;
};

describe("tailHold", () => {
  test("measures the time from the last frame to the end of capture", () => {
    expect(tailHold(frameAt(10), 12.5, 12)).toBe(2.5);
  });

  test("caps the hold at the journey maximum", () => {
    expect(tailHold(frameAt(10), 40, 12)).toBe(12);
  });

  test("keeps the final frame on screen for at least 0.4 seconds", () => {
    expect(tailHold(frameAt(10), 10.1, 12)).toBe(0.4);
  });

  test("lets the 0.4 second floor win over a lower journey maximum", () => {
    expect(tailHold(frameAt(10), 20, 0.2)).toBe(0.4);
  });

  test("stays between the floor and the maximum", () => {
    fc.assert(
      fc.property(startArb, fc.double({ min: -5, max: 120, noNaN: true }), fc.double({ min: 0, max: 60, noNaN: true }), (ts, after, max) => {
        const hold = tailHold(frameAt(ts), ts + after, max);
        expect(hold >= 0.4 && hold <= Math.max(0.4, max)).toBe(true);
      }),
    );
  });
});

describe("frameDurations", () => {
  test("returns nothing for an empty capture", () => {
    expect(frameDurations([], 1)).toEqual([]);
  });

  test("gives a single frame the tail hold", () => {
    expect(frameDurations([frameAt(5)], 1.5)).toEqual([{ ...frameAt(5), seconds: 1.5 }]);
  });

  test("gives each frame the exact gap to the next frame", () => {
    expect(frameDurations(framesAt([0, 0.5, 2]), 1).map(({ seconds }) => seconds)).toEqual([0.5, 1.5, 1]);
  });

  test("keeps every frame, in order", () => {
    fc.assert(
      fc.property(framesArb, tailArb, (frames, tail) => {
        expect(frameDurations(frames, tail).map(({ file, ts }) => ({ file, ts }))).toEqual([...frames]);
      }),
    );
  });

  test("adds up to the capture span plus the tail hold", () => {
    fc.assert(
      fc.property(framesArb, tailArb, (frames, tail) => {
        const total = frameDurations(frames, tail).reduce((sum, { seconds }) => sum + seconds, 0);
        expect(total).toBeCloseTo(spanOf(frames) + tail, 6);
      }),
    );
  });

  test("never gives a frame a negative duration", () => {
    fc.assert(
      fc.property(framesArb, tailArb, (frames, tail) => {
        expect(frameDurations(frames, tail).every(({ seconds }) => seconds >= 0)).toBe(true);
      }),
    );
  });
});

describe("heldFrames", () => {
  test("reports nothing for two frames or fewer", () => {
    expect(heldFrames(framesAt([0, 10]))).toEqual([]);
  });

  test("reports a long pause with its start in video time and its length", () => {
    expect(heldFrames(framesAt([100, 100.1, 100.2, 105.2, 105.3]))).toEqual([{ atSeconds: 0.2, heldFor: 5 }]);
  });

  test("ignores a gap under 0.4 seconds, even far above the median", () => {
    expect(heldFrames(framesAt([0, 0.1, 0.2, 0.55, 0.65]))).toEqual([]);
  });

  test("reports a gap above 2.5 median gaps when the median is long", () => {
    expect(heldFrames(framesAt([0, 1, 2, 5, 6]))).toEqual([{ atSeconds: 2, heldFor: 3 }]);
  });

  test("reports every long pause, in time order", () => {
    expect(heldFrames(framesAt([0, 3, 13, 24, 24.5, 25]))).toEqual([
      { atSeconds: 3, heldFor: 10 },
      { atSeconds: 13, heldFor: 11 },
    ]);
  });

  test("rounds the hold start and length to hundredths of a second", () => {
    expect(heldFrames(framesAt([0, 1, 2.0071, 5.2, 6.2]))).toEqual([{ atSeconds: 2.01, heldFor: 3.19 }]);
  });

  test("ignores a gap under 2.5 median gaps", () => {
    expect(heldFrames(framesAt([0, 1, 2, 4.2, 5.2]))).toEqual([]);
  });

  test("ignores a gap of exactly 2.5 median gaps", () => {
    expect(heldFrames(framesAt([0, 1, 2, 4.5, 5.5]))).toEqual([]);
  });

  test("takes the upper middle gap as the median of an even count", () => {
    expect(heldFrames(framesAt([0, 0.1, 0.2, 1.2, 3.2]))).toEqual([]);
  });

  test("reports nothing for a steady frame rate", () => {
    fc.assert(
      fc.property(startArb, gapArb, fc.integer({ min: 0, max: 200 }), (start, gap, count) => {
        expect(heldFrames(framesWithGaps(start, Array.from({ length: count }, () => gap)))).toEqual([]);
      }),
    );
  });

  test("reports only holds of at least 0.4 seconds", () => {
    fc.assert(
      fc.property(framesArb, (frames) => {
        expect(heldFrames(frames).every(({ heldFor }) => heldFor >= 0.4)).toBe(true);
      }),
    );
  });

  test("reports at most one hold per gap", () => {
    fc.assert(
      fc.property(framesArb, (frames) => {
        expect(heldFrames(frames).length).toBeLessThanOrEqual(Math.max(0, frames.length - 1));
      }),
    );
  });
});

// Runs the real ffmpeg, because the encode bugs live in how ffmpeg reads the concat list.
describe("encodeArgs", () => {
  const run = promisify(execFile);
  let dir = "";

  interface Swatch {
    readonly name: string;
    readonly r: number;
    readonly g: number;
    readonly b: number;
  }

  // Frame n of a test video is a solid block of swatch n, so a sampled pixel names its frame.
  const PALETTE = [
    { name: "red", r: 255, g: 0, b: 0 },
    { name: "lime", r: 0, g: 255, b: 0 },
    { name: "blue", r: 0, g: 0, b: 255 },
    { name: "yellow", r: 255, g: 255, b: 0 },
    { name: "magenta", r: 255, g: 0, b: 255 },
  ] as const satisfies readonly Swatch[];

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "record-user-journey-"));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  // Encodes one solid-colour frame per timestamp the way finish() does, and returns the mp4 path.
  const encode = async (name: string, timestamps: readonly number[], tail: number, fps: number): Promise<string> => {
    const frames = await Promise.all(
      timestamps.map(async (ts, index) => {
        const file = join(dir, `${name}-${index}.jpg`);
        const colour = PALETTE.at(index % PALETTE.length)?.name ?? "red";
        await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", `color=${colour}:s=64x36`, "-frames:v", "1", "-y", file]);
        return { file, ts };
      }),
    );
    const framesTxt = join(dir, `${name}.txt`);
    const mp4 = join(dir, `${name}.mp4`);
    const timeline = frameDurations(frames, tail);
    await writeFile(framesTxt, concatList(timeline));
    await run("ffmpeg", [...encodeArgs(framesTxt, mp4, timeline, fps)]);
    return mp4;
  };

  const secondsOf = async (mp4: string): Promise<number> => {
    const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4]);
    return Number(stdout);
  };

  // The name of the palette swatch nearest to the video's picture at the given second.
  const colourAt = async (mp4: string, at: number): Promise<string> => {
    const { stdout } = await run(
      "ffmpeg",
      ["-v", "error", "-ss", String(at), "-i", mp4, "-frames:v", "1", "-vf", "scale=1:1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
      { encoding: "buffer" },
    );
    const [r = 0, g = 0, b = 0] = stdout;
    const distance = (swatch: Swatch): number => (swatch.r - r) ** 2 + (swatch.g - g) ** 2 + (swatch.b - b) ** 2;
    const [nearest] = PALETTE.toSorted((one, other) => distance(one) - distance(other));
    return nearest?.name ?? "none";
  };

  test("keeps the tail hold of the final frame in the video", async () => {
    expect(await secondsOf(await encode("tail", [0, 0.5, 1], 2, 30))).toBeCloseTo(3, 1);
  });

  test("keeps a single frame on screen for its whole tail hold", async () => {
    expect(await secondsOf(await encode("single", [0], 3, 30))).toBeCloseTo(3, 1);
  });

  test("holds the final frame, not an earlier one, when a 24 fps run ends on a burst", async () => {
    expect(await colourAt(await encode("burst", [0, 0.5, 1.44, 1.46, 1.48], 6, 24), 7.4)).toBe("magenta");
  });
});
