#!/usr/bin/env node
// Records a video of a user journey through a web app, driven over the Chrome DevTools
// Protocol. Dependency-free: Node 22+ global WebSocket and fetch, ffmpeg for the encode.
//
//   node driver.mjs journeys/my-journey.json [--port 9222] [--out ./recording] [--no-encode]
//
// The journey is data (see journeys/*.json and reference.md). This file only knows how to
// execute steps; nothing here is specific to any application.
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname);

const argv = process.argv.slice(2);
const VALUED = new Set(["--port", "--out"]);
const flag = (name, fallback) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};
let journeyPath = null;
for (let i = 0; i < argv.length; i++) {
  if (VALUED.has(argv[i])) { i++; continue; }
  if (argv[i].startsWith("--")) continue;
  journeyPath = argv[i];
  break;
}
if (!journeyPath) {
  console.error("usage: node driver.mjs <journey.json> [--port 9222] [--out ./recording] [--no-encode]");
  process.exit(2);
}
const PORT = flag("--port", "9222");
const OUT = path.resolve(flag("--out", "./recording"));
const ENCODE = !argv.includes("--no-encode");
const FRAMES = path.join(OUT, "frames");

const journey = JSON.parse(await readFile(path.resolve(journeyPath), "utf8"));
const VIEW = journey.viewport ?? { width: 1920, height: 1080 };
const BASE = journey.baseUrl ?? "";

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = async (message) => {
  log("ABORT:", message);
  await finish({ aborted: message });
  process.exit(1);
};

// ---- facts + interpolation -------------------------------------------------
// Steps read each other's results through `facts`: {{item.id}}, {{before.status}}. Values
// come from `read`, `scan`, `check` and `ring` steps.
const facts = {};
const lookup = (expr) =>
  expr.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), facts);
const fill = (value) => {
  if (typeof value === "string")
    return value.replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
      // {{a.b|fallback}} keeps a caption readable when a fact is legitimately absent, which
      // is the normal case when the journey is recording a failure rather than a success.
      const [rawKey, fallback = ""] = expr.split("|");
      const key = rawKey.trim();
      if (key.startsWith("localStorage:")) return `%%LS:${key.slice(13)}%%`;
      const found = lookup(key);
      return found == null || found === "" ? fallback.trim() : String(found);
    });
  if (Array.isArray(value)) return value.map(fill);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v)]));
  return value;
};
// A journey may express a condition as a small JS expression over `item`, `check`, `facts`.
const predicate = (expr, scope) =>
  expr == null ? false : Function("item", "check", "facts", `return (${expr});`)(scope.item, scope.check, facts);

// ---- CDP session -----------------------------------------------------------
const targets = await (await fetch(`http://localhost:${PORT}/json`)).json();
const wanted = journey.targetMatch ? new RegExp(journey.targetMatch) : /./;
const target = targets.find((t) => t.type === "page" && wanted.test(t.url));
if (!target) {
  console.error(`no page target matching ${wanted} on port ${PORT}; open the app first`);
  process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let messageId = 0;
const pending = new Map();
const listeners = new Set();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  else if (msg.method) for (const l of [...listeners]) l(msg);
};
const send = (method, params = {}) =>
  new Promise((res) => {
    const n = ++messageId;
    pending.set(n, res);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const waitEvent = (method, timeout = 60000) =>
  new Promise((res, rej) => {
    const timer = setTimeout(() => { listeners.delete(l); rej(new Error(`timeout waiting for ${method}`)); }, timeout);
    const l = (m) => { if (m.method === method) { clearTimeout(timer); listeners.delete(l); res(m); } };
    listeners.add(l);
  });

async function evaluate(expression) {
  const r = await send("Runtime.evaluate", {
    expression, awaitPromise: true, returnByValue: true, userGesture: true,
  });
  const thrown = r.result?.exceptionDetails;
  if (thrown) throw new Error("eval: " + (thrown.exception?.description ?? JSON.stringify(thrown)));
  return r.result?.result?.value;
}
// Captions are the semantic beats of a journey, and the only points where two runs of
// the same journey are supposed to be showing the same thing. Recording when each one
// landed -- in video time, taken from the last captured frame -- lets a before/after
// composition align on them. A single head trim cannot: convergence steps (untilFocus
// retries, goto settle) take different real time in each run, so the panes slip
// progressively rather than by a constant offset.
const captionTimeline = [];
const videoTimeNow = () =>
  frames.length ? +(frames.at(-1).ts - frames[0].ts).toFixed(3) : 0;
const caption = (text) => {
  captionTimeline.push({ text, at: videoTimeNow() });
  return evaluate(`__journeyCaption(${JSON.stringify(text)})`).then(() => log("caption:", text));
};

const VK = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Enter: 13, Escape: 27, Backspace: 8 };
async function pressKey(name) {
  const code = VK[name];
  if (code == null) throw new Error(`unknown key ${name}`);
  const base = { key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...base });
  if (name === "Enter") await send("Input.dispatchKeyEvent", { type: "char", ...base, text: "\r" });
  await send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
}

// Typing text is not the same as pressing a remote key: the app under test may be a text
// field, and a search journey's whole subject can be what happens *between* keystrokes.
// One char event per character, spaced out, so the recording shows each intermediate state.
// Sending `text` on the keyDown as well would insert every character twice.
async function typeText(text, perCharMs) {
  for (const ch of text) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: ch });
    await send("Input.dispatchKeyEvent", { type: "char", text: ch, unmodifiedText: ch, key: ch });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: ch });
    await sleep(perCharMs);
  }
}

async function navigate(url) {
  const loaded = waitEvent("Page.loadEventFired");
  await send("Page.navigate", { url });
  await loaded;
}

async function waitFor(expression, tries = 30, gap = 1000) {
  for (let i = 0; i < tries; i++) {
    if (await evaluate(expression)) return true;
    await sleep(gap);
  }
  return false;
}

// ---- capture ---------------------------------------------------------------
// The compositor stream, not a screenshot loop. Page.captureScreenshot is viewport-true at
// any window size but tops out near 10fps with uneven spacing, which judders once resampled
// to a constant frame rate. A screencast frame is a capture of the window's surface, so it
// is only trustworthy while the emulated viewport fits inside that surface -- which is what
// the fit scale below guarantees.
const frames = [];
let frameCount = 0;
let firstMeta = null;
let capturing = false;
let captureStoppedAt = 0;
const pendingWrites = new Set();
listeners.add((m) => {
  if (m.method !== "Page.screencastFrame") return;
  const { data, sessionId, metadata } = m.params;
  firstMeta ??= metadata;
  // Record the frame synchronously. An async handler that pushed after awaiting the ack and
  // the disk write let two frames interleave, so the concat list came out non-chronological:
  // the closing frame ended up mid-list with 16ms, and an earlier frame inherited the tail
  // hold. The visible symptom is the last thing the journey does flashing past.
  const file = path.join(FRAMES, `f${String(++frameCount).padStart(6, "0")}.jpg`);
  frames.push({ file, ts: metadata.timestamp });
  // Acknowledge before writing: Chrome produces no further frames until the previous one is
  // acked, so disk work ahead of the ack directly caps the frame rate.
  const work = (async () => {
    await send("Page.screencastFrameAck", { sessionId });
    await writeFile(file, Buffer.from(data, "base64"));
  })().finally(() => pendingWrites.delete(work));
  pendingWrites.add(work);
});
async function startCapture() {
  if (capturing) return;
  capturing = true;
  await send("Page.startScreencast", {
    format: "jpeg", quality: journey.quality ?? 92,
    maxWidth: VIEW.width, maxHeight: VIEW.height, everyNthFrame: 1,
  });
}
async function stopCapture() {
  if (!capturing) return;
  capturing = false;
  captureStoppedAt = Date.now() / 1000;
  await send("Page.stopScreencast");
}

// ---- named HTTP checks -----------------------------------------------------
// Run from inside the page so the app's own origin, cookies and stored credentials apply.
async function runCheck(name) {
  const spec = journey.checks?.[name];
  if (!spec) throw new Error(`no check named "${name}"`);
  const url = fill(spec.path);
  const headers = fill(spec.headers ?? {});
  const headerExpr = Object.entries(headers)
    .map(([k, v]) => {
      const parts = String(v).split(/%%LS:([^%]+)%%/);
      const expr = parts
        .map((part, i) => (i % 2 ? `localStorage.getItem(${JSON.stringify(part)})` : JSON.stringify(part)))
        .filter((p) => p !== '""')
        .join(" + ");
      return `${JSON.stringify(k)}: ${expr || '""'}`;
    })
    .join(", ");
  const fieldExpr = Object.entries(spec.fields ?? {})
    .map(([name, pathExpr]) => `${JSON.stringify(name)}: (body && body.${pathExpr})`)
    .join(", ");
  return evaluate(`(async () => {
    const r = await fetch(${JSON.stringify(url)}, { headers: { ${headerExpr} } });
    const text = await r.text();
    let body = null; try { body = JSON.parse(text); } catch (e) {}
    return { status: r.status, entry: !!(${spec.entryWhen ?? "body"}), ${fieldExpr} };
  })()`);
}

// ---- steps -----------------------------------------------------------------
const steps = {
  // A caption may be conditional on what the run actually found:
  //   { "caption": { "if": "!!facts.tile", "then": "...", "else": "..." } }
  // Without this a journey can only narrate the outcome it hoped for, and the same file used
  // to record a failure will cheerfully claim success over a panel that says otherwise.
  async caption(step) {
    const spec = step.caption;
    if (typeof spec === "string") return caption(fill(spec));
    const branch = predicate(spec.if, {}) ? spec.then : spec.else;
    if (branch == null) return;
    await caption(fill(branch));
  },

  async hold(step) {
    await sleep(step.hold);
  },

  async goto(step) {
    const url = BASE + fill(step.goto);
    log("navigating to", url);
    await navigate(url);
    if (step.waitFor && !(await waitFor(`!!document.querySelector(${JSON.stringify(step.waitFor)})`, step.tries ?? 30)))
      await fail(`after navigating to ${url}, ${step.waitFor} never appeared`);
    await sleep(step.settle ?? 2500);
  },

  // Types into whatever holds DOM focus. `into` asserts which element that is: typing into
  // a field the journey only assumed was focused produces a run that looks fine and searched
  // for nothing.
  async type(step) {
    const spec = typeof step.type === "string" ? { text: step.type } : step.type;
    const text = fill(spec.text);
    const perChar = spec.perChar ?? 400;

    if (spec.into) {
      const ok = await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(spec.into)})`);
      if (!ok) await fail(`cannot type ${JSON.stringify(text)}: ${spec.into} does not hold focus`);
    }
    if (spec.clear) {
      const n = await evaluate("document.activeElement && 'value' in document.activeElement ? document.activeElement.value.length : 0");
      for (let i = 0; i < n; i++) { await pressKey("Backspace"); await sleep(spec.perChar ?? 120); }
    }

    log(`typing ${JSON.stringify(text)} one character at a time`);
    await typeText(text, perChar);

    if (spec.into) {
      const got = await evaluate(`(document.querySelector(${JSON.stringify(spec.into)}) || {}).value`);
      log(`  the field now reads ${JSON.stringify(got)}`);
      if (spec.clear && got !== text) await fail(`typed ${JSON.stringify(text)} but the field reads ${JSON.stringify(got)}`);
    }
  },

  async press(step) {
    const keys = Array.isArray(step.press) ? step.press : [step.press];
    const gap = step.gap ?? 900;

    // A convergence target is checked before pressing anything, so a step is a no-op when the
    // app is already where the journey wants it. Without this, a journey only works from one
    // starting screen: an app that restored a different route sends the whole key sequence
    // somewhere unintended, and the run fails on a screen it never meant to be on.
    const goal = step.untilFocus
      ? `!!document.querySelector(${JSON.stringify(`[data-testid=${JSON.stringify(fill(step.untilFocus))}][data-focused=true]`)})`
      : step.untilSelector
        ? `!!document.querySelector(${JSON.stringify(fill(step.untilSelector))})`
        : null;
    if (goal && (await evaluate(goal))) {
      log(`  already at ${step.untilFocus ?? step.untilSelector}, no keys sent`);
      return;
    }

    for (const k of keys) { await pressKey(k); await sleep(gap); }

    // Converge on a target instead of counting keys. Where focus starts is not something a
    // journey can assume -- it depends on which rail or column the app restored -- so a
    // fixed number of presses lands somewhere different from one run to the next.
    // A route can change for reasons other than the action you meant to take -- moving focus
    // inside a menu is enough in some apps -- so untilPath can go green before anything
    // happened. untilSelector converges on an element that exists only once the action landed.
    if (step.untilSelector) {
      const there = `!!document.querySelector(${JSON.stringify(fill(step.untilSelector))})`;
      for (let i = 0; i < (step.retries ?? 4); i++) {
        if (await evaluate(there)) break;
        log(`  ${step.untilSelector} is not there yet; pressing ${keys.at(-1)} again`);
        await pressKey(keys.at(-1));
        await sleep(step.retryGap ?? 2500);
      }
      if (!(await evaluate(there))) await fail(`pressing ${keys.at(-1)} never produced ${step.untilSelector}`);
    }

    if (step.untilFocus) {
      const want = `[data-testid=${JSON.stringify(fill(step.untilFocus))}][data-focused=true]`;
      const reached = `!!document.querySelector(${JSON.stringify(want)})`;
      for (let i = 0; i < (step.retries ?? 8); i++) {
        if (await evaluate(reached)) break;
        await pressKey(keys.at(-1));
        await sleep(gap);
      }
      if (!(await evaluate(reached)))
        await fail(`pressing ${keys.at(-1)} never reached focus ${step.untilFocus}; focus is ${await evaluate(
          `JSON.stringify([...document.querySelectorAll("[data-focused=true]")].map(e => e.getAttribute("data-testid")))`,
        )}`);
    }

    if (!step.untilPath) return;
    // A focused control can swallow the first activation while a route is still settling.
    // Retry until the route actually moves rather than waiting out a later timeout.
    const want = fill(step.untilPath);
    for (let i = 0; i < (step.retries ?? 4); i++) {
      if (await evaluate(`location.pathname.includes(${JSON.stringify(want)})`)) return;
      log(`  the route has not reached ${want} yet; pressing ${keys.at(-1)} again`);
      await pressKey(keys.at(-1));
      await sleep(step.retryGap ?? 2500);
    }
    if (!(await evaluate(`location.pathname.includes(${JSON.stringify(want)})`)))
      await fail(`the route never reached ${want}`);
  },

  // A pointer app needs a real mouse, not remote keys. Two reasons this dispatches
  // Input events rather than calling `element.click()`: a scripted click is not a user
  // gesture, so it cannot satisfy the autoplay policy and a player stays paused on a
  // still frame; and it bypasses whatever sits on top of the target, so a click the user
  // could never make looks like it worked.
  //
  // Player chrome is usually hidden behind `pointer-events: none` until the pointer is
  // over the video, so the move to the target is not decoration: without it the press
  // lands on the element underneath. The rect is measured after the move, because
  // revealing the controls is what gives them a box in the first place.
  async click(step) {
    const spec = typeof step.click === "string" ? { selector: step.click } : step.click;
    const finder = spec.text
      ? `[...document.querySelectorAll(${JSON.stringify(spec.within ?? "button, a, [role=button]")})].filter(e => (e.innerText || "").trim() === ${JSON.stringify(fill(spec.text))})[${spec.nth ?? 0}]`
      : `[...document.querySelectorAll(${JSON.stringify(fill(spec.selector))})][${spec.nth ?? 0}]`;
    // Coordinates are viewport-relative, so a target below the fold has to be brought into
    // view before it can be measured: dispatching a press at an off-screen y hits whatever
    // happens to be at that row instead, or nothing.
    const measure = `(() => {
      const e = ${finder};
      if (!e) return null;
      const r0 = e.getBoundingClientRect();
      if (r0.top < 0 || r0.bottom > innerHeight) e.scrollIntoView({ block: "center" });
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) return { hidden: true };
      // Both axes, because a press is dispatched at viewport coordinates and one outside
      // them is simply discarded. The horizontal check is what catches an app still laid
      // out at the pre-emulation window width: the element is there, its box is real, and
      // its centre is off to the right of the viewport that will exist a moment later.
      if (r.bottom < 0 || r.top > innerHeight) return { hidden: true };
      if (r.right < 0 || r.left > innerWidth) return { hidden: true };
      const x = Math.round(r.left + r.width / 2);
      const y = Math.round(r.top + r.height / 2);
      if (x < 0 || x > innerWidth || y < 0 || y > innerHeight) return { hidden: true };
      return { x, y };
    })()`;

    if (spec.hover) {
      const over = JSON.parse(await evaluate(`JSON.stringify(${measure.replace(finder, `document.querySelector(${JSON.stringify(fill(spec.hover))})`)})`));
      if (!over || over.hidden) await fail(`nothing to hover at ${spec.hover}`);
      for (let i = 0; i < 5; i++) {
        await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: over.x + i, y: over.y + i, button: "none" });
        await sleep(120);
      }
      await sleep(spec.hoverSettle ?? 500);
    }

    let box = null;
    for (let i = 0; i < (spec.tries ?? 8); i++) {
      box = JSON.parse(await evaluate(`JSON.stringify(${measure})`));
      if (box && !box.hidden) break;
      await sleep(spec.gap ?? 600);
    }
    if (!box || box.hidden)
      await fail(`click target ${JSON.stringify(spec.text ?? spec.selector)} never became clickable`);

    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y, button: "none" });
    await sleep(120);
    for (const type of ["mousePressed", "mouseReleased"])
      await send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
    log(`clicked ${JSON.stringify(spec.text ?? spec.selector)} at ${box.x},${box.y}`);

    // Same retry shape as `press`: an app can swallow an activation while a route settles.
    if (spec.untilPath) {
      const want = fill(spec.untilPath);
      for (let i = 0; i < (spec.retries ?? 4); i++) {
        if (await evaluate(`location.pathname.includes(${JSON.stringify(want)})`)) return;
        log(`  the route has not reached ${want} yet; clicking again`);
        for (const type of ["mousePressed", "mouseReleased"])
          await send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
        await sleep(spec.retryGap ?? 2500);
      }
      if (!(await evaluate(`location.pathname.includes(${JSON.stringify(want)})`)))
        await fail(`the route never reached ${want}`);
    }
    // Same retry shape as `untilPath`. A click that lands while the layout is still
    // settling hits whatever was under the pointer a moment ago, and one that lands on a
    // control the app has not wired up yet does nothing at all. Both look identical from
    // here, and both are fixed by measuring and clicking again.
    if (spec.untilSelector) {
      const want = fill(spec.untilSelector);
      for (let i = 0; i < (spec.retries ?? 4); i++) {
        if (await evaluate(`!!document.querySelector(${JSON.stringify(want)})`)) return;
        log(`  ${want} has not appeared yet; clicking again`);
        const again = JSON.parse(await evaluate(`JSON.stringify(${measure})`));
        if (again && !again.hidden) {
          await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: again.x, y: again.y, button: "none" });
          await sleep(120);
          for (const type of ["mousePressed", "mouseReleased"])
            await send("Input.dispatchMouseEvent", { type, x: again.x, y: again.y, button: "left", clickCount: 1 });
        }
        await sleep(spec.retryGap ?? 2500);
      }
      if (!(await evaluate(`!!document.querySelector(${JSON.stringify(want)})`)))
        await fail(`clicking never produced ${want}`);
    }
  },

  async expect(step) {
    const { focus, selector, path: wantPath } = step.expect;
    if (focus) {
      const sel = `[data-testid=${JSON.stringify(fill(focus))}][data-focused=true]`;
      if (!(await waitFor(`!!document.querySelector(${JSON.stringify(sel)})`, step.tries ?? 8)))
        await fail(`expected focus on ${focus}, focus is ${await evaluate(
          `JSON.stringify([...document.querySelectorAll("[data-focused=true]")].map(e => e.getAttribute("data-testid")))`,
        )}`);
    }
    if (selector && !(await waitFor(`!!document.querySelector(${JSON.stringify(fill(selector))})`, step.tries ?? 20)))
      await fail(`expected ${selector} to be present`);
    if (wantPath && !(await waitFor(`location.pathname.includes(${JSON.stringify(fill(wantPath))})`, step.tries ?? 10)))
      await fail(`expected the route to include ${wantPath}`);
  },

  async read(step) {
    const value = await evaluate(fill(step.read.js));
    facts[step.read.as] = value;
    log(`read ${step.read.as}:`, JSON.stringify(value)?.slice(0, 200));
  },

  // Step through a list with one key, reading an attribute set per stop, until a candidate
  // passes. This is how a journey reaches "an item that has not been used yet" without
  // hard-coding an id that goes stale between runs.
  async scan(step) {
    const s = step.scan;
    if (s.caption) await caption(fill(s.caption));
    const readExpr = Object.entries(s.read)
      .map(([name, attr]) =>
        `${JSON.stringify(name)}: ${attr === "text" ? `(el.innerText || "").split("\\n")[0].trim()` : `el.getAttribute(${JSON.stringify(attr)})`}`)
      .join(", ");
    const probe = `(() => { const el = document.querySelector(${JSON.stringify(s.selector)});
      return el ? JSON.stringify({ ${readExpr} }) : null; })()`;

    for (let i = 0; i < (s.max ?? 12); i++) {
      await pressKey(s.key);
      await sleep(s.gap ?? 1400);
      const raw = await evaluate(probe);
      const item = raw ? JSON.parse(raw) : null;
      if (!item) { log(`  step ${i + 1}: nothing selected`); continue; }
      if (s.skipIf && predicate(s.skipIf, { item })) { log(`  step ${i + 1}: ${item[s.labelKey ?? "title"]} skipped`); continue; }
      let check = null;
      if (s.check) {
        facts[s.as ?? "item"] = item;
        check = await runCheck(s.check);
      }
      log(`  step ${i + 1}:`, JSON.stringify(item), check ? JSON.stringify(check) : "");
      if (!s.acceptIf || predicate(s.acceptIf, { item, check })) {
        facts[s.as ?? "item"] = item;
        if (check) facts[(s.as ?? "item") + "Check"] = check;
        return;
      }
    }
    await fail(`scan with ${s.key} found no candidate in ${s.max ?? 12} steps`);
  },

  // Wait for a <video> that is decoding AND advancing. `paused === false` flips well before
  // the first decoded frame, so recording on that alone opens on a buffering spinner.
  async play(step) {
    const p = step.play ?? {};
    const probe = `(() => {
      const v = [...document.querySelectorAll("video")].sort((a,b) => b.currentTime - a.currentTime)[0];
      return v ? JSON.stringify({ t: Math.round(v.currentTime*100)/100, paused: v.paused, ready: v.readyState, w: v.videoWidth }) : null;
    })()`;
    let previous = null;
    for (let i = 0; i < (p.tries ?? 25); i++) {
      const state = JSON.parse((await evaluate(probe)) ?? "null");
      if (i % 5 === 0) log("  playback:", JSON.stringify(state));
      if (state && !state.paused && state.ready >= 3 && state.w > 0 && previous !== null && state.t - previous > 0.3) {
        await sleep(p.settle ?? 3000);
        if (p.holdMs) await sleep(p.holdMs);
        return;
      }
      previous = state && !state.paused ? state.t : null;
      await sleep(1000);
    }
    await fail("playback never produced advancing frames: " + (await evaluate("document.body.innerText.slice(0, 160)")));
  },

  async check(step) {
    const result = await runCheck(step.check);
    facts[step.as ?? step.check] = result;
    log(`check ${step.check} (${step.as ?? step.check}):`, JSON.stringify(result));
    if (step.failIf && predicate(step.failIf, { check: result }))
      await fail(`check ${step.check} failed its precondition: ${JSON.stringify(result)}`);
  },

  async resetTimeline() {
    await evaluate(`(() => { __journey.log.length = 0; __journey.t0 = Date.now(); __journey.dead = false; return 1; })()`);
    log("timeline reset");
  },

  async armKill() {
    await evaluate(`(() => { __journey.deadEnabled = true; return 1; })()`);
    log("kill-on-hidden model armed");
  },

  // Hide the page for real by putting another tab in front of it, which is what makes the
  // browser fire visibilitychange and lets the app tear itself down.
  async standby(step) {
    const s = step.standby ?? {};
    if (s.caption) await caption(fill(s.caption));
    if (s.blackout !== false) { await evaluate("__journeyBlackout(true)"); await sleep(s.blackoutMs ?? 1400); }
    await stopCapture();

    const blank = await (await fetch(`http://localhost:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
    await sleep(s.hiddenMs ?? 4000);
    const list = await (await fetch(`http://localhost:${PORT}/json`)).json();
    const app = list.find((t) => t.type === "page" && wanted.test(t.url));
    await fetch(`http://localhost:${PORT}/json/close/${blank.id}`);
    if (app) await fetch(`http://localhost:${PORT}/json/activate/${app.id}`);
    await send("Page.bringToFront");
    await sleep(1200);
    await startCapture();
    await sleep(s.afterMs ?? 2000);
    const timeline = await evaluate("JSON.stringify(__journey.log)");
    facts.timeline = JSON.parse(timeline);
    log("timeline:", timeline);
  },

  async ring(step) {
    const r = step.ring;
    await evaluate("__journeyClearRings()");
    const box = r.matchText
      ? await evaluate(`__journeyRingMatching(${JSON.stringify(fill(r.selectorAll))}, ${JSON.stringify(fill(r.matchText))}, ${JSON.stringify(r.closest ?? null)}, ${JSON.stringify(fill(r.label ?? ""))})`)
      : await evaluate(`__journeyRing(document.querySelector(${JSON.stringify(fill(r.selector))}), ${JSON.stringify(fill(r.label ?? ""))})`);
    facts[r.as ?? "ring"] = box;
    log("ring:", JSON.stringify(box));
    if (!box && r.required) await fail(`nothing to ring for ${JSON.stringify(r.matchText ?? r.selector)}`);
  },

  async summary(step) {
    const spec = step.summary;
    const payload = {
      title: fill(spec.title ?? journey.name ?? "journey"),
      log: facts.timeline ?? JSON.parse(await evaluate("JSON.stringify(__journey.log)")),
      lines: (spec.lines ?? []).map((l) => ({ label: fill(l.label), text: fill(l.text), color: l.color })),
      showListeners: !!spec.showListeners,
    };
    await evaluate(`(() => { window.__journeySummary = ${JSON.stringify(payload)}; return 1; })()`);
    const placed = await evaluate(await readFile(path.join(HERE, "overlay.js"), "utf8"));
    facts.summary = placed;
    log("summary panel:", JSON.stringify(placed));
    if (placed.rect.top < 0 || placed.rect.bottom > placed.viewport[1])
      log("WARNING: the summary panel is not fully inside the frame");
  },

  async capture(step) {
    if (step.capture === "start") await startCapture();
    else await stopCapture();
  },

  // Measure, don't eyeball. Dimensions alone prove nothing: a stretched crop is also the
  // right size. Four distinct corner patches catch crop and offset; the checkerboard's
  // surviving contrast catches rescale. Runs against a real captured frame, so it tests the
  // capture path rather than the DOM.
  async verifyViewport(step) {
    const size = JSON.parse(await evaluate("JSON.stringify([innerWidth, innerHeight])"));
    if (size[0] !== VIEW.width || size[1] !== VIEW.height)
      await fail(`viewport is ${size}, expected ${[VIEW.width, VIEW.height]}`);

    // Note the frame count *before* the pattern appears: the change itself produces the frame,
    // so sampling afterwards waits for a second change that never comes on a static screen, and
    // falls back to the path that cannot prove anything.
    const framesBefore = frames.length;
    await evaluate(`__journeyTestPattern(true, ${VIEW.width}, ${VIEW.height})`);
    await sleep(400);
    // Probe a frame from the *screencast*, because that is the path the video comes from and
    // the only one that can hand back a rescaled window surface. Verifying a
    // Page.captureScreenshot with an explicit clip proves nothing here: that path cannot crop,
    // so it passes happily while the recording itself is cropped.
    let framePath = null;
    if (capturing) {
      for (let i = 0; i < 60 && frames.length === framesBefore; i++) await sleep(100);
      if (frames.length > framesBefore) {
        framePath = frames.at(-1).file;
        await writeFile(path.join(OUT, "verify-viewport.jpg"), await readFile(framePath));
      }
    }
    if (!framePath) {
      framePath = path.join(OUT, "verify-viewport.png");
      const shot = await send("Page.captureScreenshot", {
        format: "png", clip: { x: 0, y: 0, width: VIEW.width, height: VIEW.height, scale: 1 },
        fromSurface: true,
      });
      await writeFile(framePath, Buffer.from(shot.result.data, "base64"));
      log("NOTE: no screencast frame was available, so this checks Page.captureScreenshot only" +
        " and cannot detect a cropped screencast. Run this step while capture is active.");
    }
    await evaluate("__journeyTestPattern(false)");

    const probe = async (w, h, x, y) => {
      const out = await new Promise((res) => {
        let buf = "";
        const p = spawn("ffmpeg", ["-v", "error", "-i", framePath, "-vf",
          `crop=${w}:${h}:${x}:${y},signalstats,metadata=print:file=-`, "-f", "null", "-"]);
        p.stdout.on("data", (d) => (buf += d));
        p.stderr.on("data", (d) => (buf += d));
        p.on("close", () => res(buf));
      });
      const read = (key) => Number((out.match(new RegExp(`signalstats\\.${key}=([-\\d.]+)`)) ?? [])[1]);
      return { y: read("YAVG"), u: read("UAVG"), v: read("VAVG"), min: read("YMIN"), max: read("YMAX") };
    };

    const W = VIEW.width, H = VIEW.height;
    const corners = {
      "top-left": await probe(24, 24, 0, 0),
      "top-right": await probe(24, 24, W - 24, 0),
      "bottom-left": await probe(24, 24, 0, H - 24),
      "bottom-right": await probe(24, 24, W - 24, H - 24),
    };
    const board = await probe(480, 12, Math.round(W / 2) - 240, 2);
    const signature = (c) => [c.y, c.u, c.v].map((n) => Math.round(n / 12)).join(":");
    const distinct = new Set(Object.values(corners).map(signature));
    const report = { corners, checkerboard: board, distinctCorners: distinct.size };
    facts.viewportVerification = report;
    log("viewport verification:", JSON.stringify(report));

    const problems = [];
    if (distinct.size < 4)
      problems.push(`only ${distinct.size} of 4 corner patches are distinguishable, so the frame is cropped or offset`);
    if (!(board.max - board.min > 170))
      problems.push(`the checkerboard contrast is ${Math.round(board.max - board.min)} (want >170), so the frame is being rescaled`);
    if (problems.length) {
      log(`the frame is not a faithful ${W}x${H} capture: ${problems.join("; ")}`);
      log(`inspect ${framePath}`);
      if (step?.verifyViewport !== "warn") await fail("viewport verification failed");
    } else {
      log(`verified: a faithful ${W}x${H} capture (4 distinct corners, checkerboard contrast ${Math.round(board.max - board.min)})`);
    }
  },
};

// ---- setup -----------------------------------------------------------------
// Only the frames directory is cleared. --out used to be removed wholesale, which happily
// deleted a journey file or notes kept alongside it.
await rm(FRAMES, { recursive: true, force: true });
await mkdir(FRAMES, { recursive: true });
await send("Page.enable");
await send("Runtime.enable");

// The tab has to be the foreground tab of a foreground window. A background one reports
// visibilityState "hidden" and the renderer silently drops injected key events -- and being
// hidden is usually the thing under test.
await fetch(`http://localhost:${PORT}/json/activate/${target.id}`);
await send("Page.bringToFront");
await sleep(500);

// Never resize the window. Measure what it already gives the page and fit the emulated
// viewport into it, the way device mode scales a device to fit.
await send("Emulation.clearDeviceMetricsOverride");
await sleep(300);
const contentBox = JSON.parse(await evaluate("JSON.stringify([innerWidth, innerHeight])"));
const fitScale = Math.min(1, contentBox[0] / VIEW.width, contentBox[1] / VIEW.height);
log(`window content ${contentBox} -> fitting a ${VIEW.width}x${VIEW.height} viewport at scale ${fitScale.toFixed(3)}`);
if (fitScale < 1)
  log(`WARNING: the window is smaller than the target viewport, so frames are captured at scale ${fitScale.toFixed(3)}`);

// Deliberately NOT enabling Emulation.setFocusEmulationEnabled by default. Keeping the
// renderer "focused" sounds helpful for a recording, but measured on Chrome it also keeps the
// page reporting visibilityState "visible" when another tab is activated, and no
// visibilitychange fires at all:
//   focusEmulation=false -> during=hidden,  events=["hidden","visible"]
//   focusEmulation=true  -> during=visible, events=[]
// Any journey about backgrounding or teardown would record a page that was never hidden.
if (journey.focusEmulation === true) {
  log("WARNING: focusEmulation is on, so this page will not report visibility changes and a" +
    " standby step will record a page that never hid");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
}
// A scrollbar eats horizontal space and changes layout; a TV or kiosk screen has none.
await send("Emulation.setScrollbarsHidden", { hidden: true });
// A machine with reduce-motion enabled would otherwise record a UI with its transitions off.
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});

// Everything this driver overrides gets undone, including on Ctrl-C. Leaving someone's
// browser pinned to a 1920x1080 TV viewport with a spoofed user agent is a nasty parting gift.
let restored = false;
async function restoreBrowser() {
  if (restored) return;
  restored = true;
  try {
    await send("Page.stopScreencast");
    await send("Emulation.clearDeviceMetricsOverride");
    await send("Emulation.setUserAgentOverride", { userAgent: "" });
    if (journey.focusEmulation === true)
      await send("Emulation.setFocusEmulationEnabled", { enabled: false });
    await send("Emulation.setScrollbarsHidden", { hidden: false });
    await send("Emulation.setEmulatedMedia", { features: [] });
    if (instrumentId) await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: instrumentId });
    await evaluate("__journeyBlackout(false), __journeyClearRings(), __journeyTestPattern(false)");
  } catch {}
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => { await restoreBrowser(); process.exit(130); });
if (journey.userAgent)
  await send("Emulation.setUserAgentOverride", {
    userAgent: journey.userAgent,
    // Optional, but worth setting when the app reads UA client hints: a UA string that says
    // "TV" while the hints say "macOS" is a contradiction some apps notice.
    ...(journey.userAgentMetadata ? { userAgentMetadata: journey.userAgentMetadata } : {}),
  });
await send("Emulation.setDeviceMetricsOverride", {
  width: VIEW.width, height: VIEW.height,
  deviceScaleFactor: journey.deviceScaleFactor ?? 1, mobile: false, scale: fitScale,
});

const instrument = await readFile(path.join(HERE, "instrument.js"), "utf8");
const config = {
  trackUrlIncludes: journey.track?.urlIncludes ?? null,
  trackFields: journey.track?.fields ?? {},
  traceEvents: journey.track?.traceEvents,
  killLabel: journey.killLabel,
  hideSelectors: journey.hideSelectors ?? [],
};
const instrumentSource = `window.__journeyConfig = ${JSON.stringify(config)};\n${instrument}`;
// Keep the identifier and remove it on exit. Registrations otherwise survive for the life of
// the target, and since only the first copy to run installs the stateful half, a later run
// would silently execute an earlier run's tracking config.
const instrumentId = (await send("Page.addScriptToEvaluateOnNewDocument", { source: instrumentSource }))
  .result?.identifier;
// addScriptToEvaluateOnNewDocument only fires on the *next* document. The page is already
// loaded, so install into it as well or every helper is undefined until the first navigation.
// Safe to run twice: the script installs once per document.
await evaluate(instrumentSource);

// ---- run -------------------------------------------------------------------
async function finish(extra = {}) {
  // Screencast frames only arrive when the surface changes, so stopping the moment the last
  // step returns drops the frame showing that step's result -- a ring or summary panel could
  // be recorded in journey.json and absent from the video.
  if (capturing) await sleep(journey.tailMs ?? 1200);
  await stopCapture();
  // Frames still in flight would otherwise be missing from disk when ffmpeg reads the list.
  await Promise.allSettled([...pendingWrites]);
  // Defensive: the list must be chronological whatever order the writes completed in.
  frames.sort((a, b) => a.ts - b.ts);
  // How long the closing frame genuinely stayed on screen, capped so a very long trailing hold
  // does not end the video on a minute of stillness.
  const lastFrameHeldFor = frames.length
    ? Math.min(journey.maxTailSeconds ?? 12, Math.max(0.4, (captureStoppedAt || Date.now() / 1000) - frames.at(-1).ts))
    : 0.4;
  if (frames.length) {
    // Every frame gets its measured on-screen duration and nothing is repeated. The usual
    // "repeat the last entry so its duration applies" idiom double-counts that duration,
    // which shows up as a video half a second longer than the run actually was.
    const lines = [];
    for (let i = 0; i < frames.length; i++) {
      // The final frame's duration is the real time it stayed on screen, not a constant: a
      // trailing hold over a static page emits no frames, and a hard-coded value threw that
      // dwell away, leaving the payoff of the recording on screen for a fraction of a second.
      const dur = i < frames.length - 1
        ? Math.max(0.016, frames[i + 1].ts - frames[i].ts)
        : Math.max(0.4, lastFrameHeldFor);
      lines.push(`file '${frames[i].file}'`, `duration ${dur.toFixed(3)}`);
    }
    await writeFile(path.join(OUT, "frames.txt"), lines.join("\n"));
  }
  // Publish the stalls instead of smoothing them over. A held frame in the finished video is
  // legitimate -- the screen really did not change -- but the reader deserves to know which
  // second of video repeats and why, rather than discovering it and assuming a bug.
  const gaps = [];
  if (frames.length > 2) {
    const intervals = frames.slice(1).map((f, i) => f.ts - frames[i].ts);
    const median = [...intervals].sort((a, b) => a - b)[Math.floor(intervals.length / 2)];
    intervals.forEach((dur, i) => {
      if (dur > Math.max(0.4, median * 2.5))
        gaps.push({ atSeconds: +(frames[i].ts - frames[0].ts).toFixed(2), heldFor: +dur.toFixed(2) });
    });
  }
  await writeFile(path.join(OUT, "journey.json"),
    JSON.stringify({ journey: journey.name, frames: frames.length, firstMeta, fitScale, heldFrames: gaps, captionTimeline, summaryExclude: journey.summaryExclude ?? [], facts, ...extra }, null, 2));
  await restoreBrowser();
  log(`captured ${frames.length} frames into ${OUT}`);
  if (gaps.length) log(`held frames (the picture repeats here): ${gaps.map((g) => `${g.atSeconds}s for ${g.heldFor}s`).join(", ")}`);

  if (ENCODE && frames.length) {
    const mp4 = path.join(OUT, `${journey.name ?? "journey"}.mp4`);
    // fps + cfr, not raw concat timestamps: screencast frames arrive irregularly and a
    // variable-rate stream judders in most players.
    const args = [
      "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0",
      "-i", path.join(OUT, "frames.txt"),
      // Screencast JPEGs decode full-range. Without the conversion libx264 tags the output
      // yuvj420p/pc, and any player that ignores the flag crushes the blacks -- which matters
      // most in exactly the stretch a blackout makes black on purpose.
      "-vf", `fps=${journey.fps ?? 30},scale=in_range=full:out_range=limited,format=yuv420p`,
      "-fps_mode", "cfr", "-color_range", "tv",
      "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-movflags", "+faststart", "-y", mp4,
    ];
    await new Promise((res) => spawn("ffmpeg", args, { stdio: "inherit" }).on("close", res));
    log("wrote", mp4);
  }
  try { ws.close(); } catch {}
}

// A previous run's caption, rings, blackout or summary panel survive route changes and would
// otherwise be recorded as if they belonged to this journey.
await evaluate("__journeyBlackout(false), __journeyClearRings(), __journeyTestPattern(false)");
await evaluate('document.querySelectorAll(".journey-summary,#journey-caption").forEach(n => n.remove())');

const geometry = await evaluate(`JSON.stringify({
  viewport: [innerWidth, innerHeight], visibility: document.visibilityState,
  userAgent: navigator.userAgent.slice(0, 60),
})`);
log("geometry:", geometry);
if (JSON.parse(geometry).visibility !== "visible")
  await fail("the page reports visibilityState hidden; raise the browser window and run again");

if (journey.captureFrom !== "manual") await startCapture();
for (let i = 0; i < 40 && frameCount === 0; i++) await sleep(100);
log("capture running, first frame:", JSON.stringify(firstMeta));
if (firstMeta && (firstMeta.deviceWidth !== VIEW.width || firstMeta.deviceHeight !== VIEW.height))
  log(`WARNING: the captured surface reports ${firstMeta.deviceWidth}x${firstMeta.deviceHeight}`);

for (const [index, step] of (journey.steps ?? []).entries()) {
  const kinds = Object.keys(steps).filter((k) => k in step);
  if (!kinds.length) await fail(`step ${index + 1} has no known action: ${JSON.stringify(step)}`);
  // Dispatch used to take the first handler whose name appeared in the step, so a step
  // carrying two actions silently ran whichever was declared first in this file.
  if (kinds.length > 1)
    await fail(`step ${index + 1} carries ${kinds.length} actions (${kinds.join(", ")}); use one action per step`);
  await steps[kinds[0]](step);
}

await finish();
