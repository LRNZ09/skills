// Injected into every document via Page.addScriptToEvaluateOnNewDocument, so it survives
// the navigations a journey makes and is in place before any application code runs.
//
// Idempotent on purpose: addScriptToEvaluateOnNewDocument accumulates one copy per driver
// run for the lifetime of the target, and a copy that re-wraps window.fetch will re-wrap
// the previous wrapper. Ten runs deep that recursion overflows the stack mid-journey.
(function installJourneyInstrumentation() {
  var cfg = window.__journeyConfig || {};
  // Read the tracking config at call time, not install time. Only the first installed copy
  // runs, so a snapshot would leave a later run silently using an earlier run's url filter and
  // field mapping while window.__journeyConfig shows the current one.
  var live = function () { return window.__journeyConfig || {}; };

  // Two halves, guarded differently. The stateful half -- transport wrappers, listener
  // tracing, the collected log -- must install exactly once per document, or each extra copy
  // wraps the previous wrapper. The annotation helpers below are pure functions and are
  // always redefined, so editing this file takes effect on a document that already has an
  // older copy instead of being silently ignored.
  if (!window.__journey) {

  var journey = {
    log: [],
    t0: Date.now(),
    // Set by the driver at the point the app is supposed to be dead. Sends attempted after
    // it are recorded as lost instead of being let through, which is what makes a
    // "the process was already gone" failure visible in the recording.
    dead: false,
    deadEnabled: false,
  };
  window.__journey = journey;

  function mark(kind, extra) {
    var e = { at: Date.now() - journey.t0, kind: kind };
    for (var k in extra) e[k] = extra[k];
    journey.log.push(e);
    return e;
  }
  window.__journeyMark = mark;

  function tracked(url) {
    var needle = live().trackUrlIncludes;
    return needle != null && String(url).indexOf(needle) !== -1;
  }

  function readFields(body) {
    var out = {};
    var parsed = null;
    try {
      parsed = JSON.parse(body);
    } catch (e) {
      return out;
    }
    var fields = live().trackFields || {};
    for (var name in fields) out[name] = parsed[fields[name]];
    return out;
  }

  function record(transport, url, body) {
    if (!tracked(url)) return false;
    var extra = readFields(body);
    extra.transport = transport;
    mark(journey.dead ? "lost" : "sent", extra);
    return journey.dead;
  }

  // --- transports -----------------------------------------------------------
  // Every transport a teardown handler might reach for, so the recording shows which one
  // actually carried the request rather than assuming.
  var XHR = window.XMLHttpRequest;
  var open = XHR.prototype.open;
  var send = XHR.prototype.send;
  XHR.prototype.open = function (method, url, async) {
    this.__url = url;
    this.__sync = async === false;
    return open.apply(this, arguments);
  };
  XHR.prototype.send = function (body) {
    if (record(this.__sync ? "synchronous XHR" : "async XHR", this.__url, body)) return;
    return send.apply(this, arguments);
  };

  var fetchImpl = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : input && input.url;
    var body = init && init.body;
    var transport = init && init.keepalive ? "keepalive fetch" : "fetch";
    if (record(transport, url, body)) return new Promise(function () {});
    return fetchImpl(input, init);
  };

  if (navigator.sendBeacon) {
    var beacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, body) {
      if (record("sendBeacon", url, body)) return false;
      return beacon(url, body);
    };
  }

  // --- teardown listener trace ---------------------------------------------
  // Which listener ran, on which target, in which phase, in what order. When a fix depends
  // on winning the race between teardown handlers, this is the only honest evidence: the
  // outcome alone cannot tell you whether the intended path ran or something else got
  // lucky. Wrappers are remembered so removeEventListener still works.
  (function traceTeardown() {
    var types = cfg.traceEvents || ["visibilitychange", "pagehide", "freeze", "beforeunload"];
    var add = EventTarget.prototype.addEventListener;
    var remove = EventTarget.prototype.removeEventListener;
    var wrappers = new WeakMap();
    var nameOf = function (t) {
      return t === window ? "window" : t === document ? "document" : (t && t.tagName) || "other";
    };
    EventTarget.prototype.addEventListener = function (type, fn, opts) {
      if (types.indexOf(type) !== -1 && typeof fn === "function") {
        var capture = opts === true || !!(opts && opts.capture);
        var label = nameOf(this) + " " + (capture ? "capture" : "bubble") + " " + type;
        var wrapped = function () {
          mark("listener", { detail: label, hidden: document.hidden });
          return fn.apply(this, arguments);
        };
        var byLabel = wrappers.get(fn) || {};
        byLabel[label] = wrapped;
        wrappers.set(fn, byLabel);
        return add.call(this, type, wrapped, opts);
      }
      return add.apply(this, arguments);
    };
    EventTarget.prototype.removeEventListener = function (type, fn, opts) {
      if (types.indexOf(type) !== -1 && typeof fn === "function") {
        var capture = opts === true || !!(opts && opts.capture);
        var label = nameOf(this) + " " + (capture ? "capture" : "bubble") + " " + type;
        var byLabel = wrappers.get(fn);
        if (byLabel && byLabel[label]) return remove.call(this, type, byLabel[label], opts);
      }
      return remove.apply(this, arguments);
    };
  })();

  // The app being killed the instant it is hidden is what a TV does on standby, and it is
  // the pressure a teardown fix has to survive. Modelled as a microtask queued from a
  // document listener, which is where an application's own state-driven teardown lands.
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) return;
    mark("hidden", { detail: "visibilitychange -> hidden" });
    if (!journey.deadEnabled) return;
    queueMicrotask(function () {
      journey.dead = true;
      mark("killed", { detail: live().killLabel || "the platform kills the app here" });
    });
  });

    // Development overlays are not part of the product UI; hide them so the recording shows
    // the app as a user would see it.
    (function hideDevWidgets() {
      var selectors = cfg.hideSelectors;
      if (!selectors || !selectors.length) return;
      var apply = function () {
        if (!document.head) return setTimeout(apply, 50);
        if (document.getElementById("journey-hide-dev")) return;
        var style = document.createElement("style");
        style.id = "journey-hide-dev";
        style.textContent = selectors.join(",") + "{display:none !important}";
        document.head.appendChild(style);
      };
      apply();
    })();
  } // end install-once

  // --- on-screen annotations (always redefined) -----------------------------
  window.__journeyCaption = function (text) {
    var el = document.getElementById("journey-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "journey-caption";
      // Wraps rather than running off both edges. A caption derived from a fact is as long
      // as the fact, and `nowrap` on a centre-translated box loses the ends of it silently
      // -- the reading is in the frame, so a clipped caption is a lost measurement.
      //
      // `overflow-wrap` must be `anywhere`, not `break-word`. This box is shrink-to-fit, so
      // its width comes from the content's intrinsic size, and `break-word` contributes no
      // soft-wrap opportunity to that calculation: a JSON fact with no spaces then sizes the
      // box past its own max-width and hangs off both sides again. Measured at a 1938px
      // viewport, the same caption gives 1870px under `break-word` against an 1818px
      // max-width, and 969px under `anywhere`. The cost is that a long token can break
      // mid-word; that is the correct trade for never losing a digit.
      el.style.cssText =
        "position:fixed;top:26px;left:50%;transform:translateX(-50%);z-index:2147483646;" +
        "background:rgba(10,4,24,.92);border:2px solid #7c5cff;border-radius:24px;" +
        "padding:12px 30px;font:600 24px/1.35 ui-monospace,Menlo,monospace;color:#e9e6f5;" +
        "max-width:calc(100vw - 120px);white-space:pre-wrap;overflow-wrap:anywhere;" +
        "text-align:center;box-shadow:0 14px 40px rgba(0,0,0,.7)";
      document.documentElement.appendChild(el);
    }
    el.textContent = text;
    return text;
  };

  // The screen a device shows once it is off. Frame capture has to be paused while the tab
  // is hidden -- a hidden tab does not composite -- so without this the last decoded video
  // frame is held for the whole gap and the recording looks like playback continued with
  // the screen off.
  window.__journeyBlackout = function (on) {
    var el = document.getElementById("journey-blackout");
    if (!on) {
      if (el) el.remove();
      return false;
    }
    if (!el) {
      el = document.createElement("div");
      el.id = "journey-blackout";
      el.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:#000";
      document.documentElement.appendChild(el);
    }
    return true;
  };

  window.__journeyClearRings = function () {
    var rings = document.querySelectorAll(".journey-ring");
    for (var i = 0; i < rings.length; i++) rings[i].remove();
    return true;
  };

  // documentElement, never body: anything above the root could be a containing block for a
  // fixed box and drag the annotation off the frame.
  window.__journeyRing = function (el, label) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    var ring = document.createElement("div");
    ring.className = "journey-ring";
    ring.style.cssText =
      "position:fixed;z-index:2147483645;pointer-events:none;border:5px solid #63f08f;" +
      "border-radius:14px;box-shadow:0 0 0 5px rgba(99,240,143,.22),0 0 40px rgba(99,240,143,.5);" +
      "left:" + (r.left - 10) + "px;top:" + (r.top - 10) + "px;" +
      "width:" + (r.width + 20) + "px;height:" + (r.height + 20) + "px";
    document.documentElement.appendChild(ring);
    if (label) {
      var tag = document.createElement("div");
      tag.className = "journey-ring";
      tag.textContent = label;
      tag.style.cssText =
        "position:fixed;z-index:2147483645;pointer-events:none;background:#63f08f;color:#05170c;" +
        "font:700 20px/1 ui-monospace,Menlo,monospace;padding:10px 16px;border-radius:10px;" +
        "left:" + (r.left - 10) + "px;top:" + (r.top + r.height + 18) + "px";
      document.documentElement.appendChild(tag);
    }
    return {
      left: Math.round(r.left), top: Math.round(r.top),
      width: Math.round(r.width), height: Math.round(r.height),
    };
  };

  window.__journeyRingMatching = function (selectorAll, text, closestSelector, label) {
    var nodes = document.querySelectorAll(selectorAll);
    for (var i = 0; i < nodes.length; i++) {
      if ((nodes[i].innerText || "").trim() !== String(text).trim()) continue;
      var target = closestSelector ? nodes[i].closest(closestSelector) : nodes[i];
      return window.__journeyRing(target || nodes[i], label);
    }
    return null;
  };

  // A fiducial pattern designed to be measured, not eyeballed. Four differently coloured
  // corner patches on a black backdrop catch crop and offset: a cropped frame puts backdrop
  // or the wrong colour in a corner. The 8px checkerboard catches rescale, which dimensions
  // alone cannot -- a stretched crop is still the right size, but resampling collapses the
  // checkerboard's contrast toward grey while a 1:1 mapping keeps it black-and-white.
  window.__journeyTestPattern = function (on, width, height) {
    var existing = document.getElementById("journey-pattern");
    if (existing) existing.remove();
    if (!on) return false;
    var p = document.createElement("div");
    p.id = "journey-pattern";
    p.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;pointer-events:none;background:#000;" +
      "font:700 26px ui-monospace,Menlo,monospace;color:#888";
    var patch = function (css, colour) {
      return '<div style="position:absolute;' + css + ';width:40px;height:40px;background:' + colour + '"></div>';
    };
    var squares = "";
    for (var i = 0; i < 64; i++)
      squares += '<div style="position:absolute;left:' + (i * 8) + "px;top:0;width:8px;height:16px;background:" +
        (i % 2 ? "#fff" : "#000") + '"></div>';
    p.innerHTML =
      patch("left:0;top:0", "#f00") +
      patch("right:0;top:0", "#0f0") +
      patch("left:0;bottom:0", "#00f") +
      patch("right:0;bottom:0", "#f0f") +
      '<div style="position:absolute;left:50%;top:0;transform:translateX(-256px);width:512px;height:16px">' +
        squares + "</div>" +
      '<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)">' +
        width + " x " + height + "</div>";
    document.documentElement.appendChild(p);
    return true;
  };

  // Development overlays are not part of the product UI; hide them so the recording shows
  // the app as a user would see it.
  (function hideDevWidgets() {
    var selectors = cfg.hideSelectors;
    if (!selectors || !selectors.length) return;
    var apply = function () {
      if (!document.head) return setTimeout(apply, 50);
      var style = document.createElement("style");
      style.textContent = selectors.join(",") + "{display:none !important}";
      document.head.appendChild(style);
    };
    apply();
  })();
})();
