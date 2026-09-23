// Renders the summary panel at the end of a journey: the tracked request timeline plus the
// fact lines the journey declared. Evaluated with a __journeySummary payload already set on
// the page by the driver.
(function renderJourneySummary() {
  var payload = window.__journeySummary || {};
  var log = payload.log || [];
  var lines = payload.lines || [];

  var old = document.querySelector(".journey-summary");
  if (old) old.remove();

  var box = document.createElement("div");
  box.className = "journey-summary";
  // Anchored to the viewport and height-capped, so it cannot fall outside the frame however
  // tall the page under it happens to be. The cap is generous because the alternative to a
  // panel that covers more of the page is a fact whose last line is silently cut off; the
  // driver still warns if the box ends up outside the frame.
  box.style.cssText =
    "position:fixed;left:3.5%;right:3.5%;bottom:5%;max-height:62%;overflow:hidden;" +
    "z-index:2147483647;background:rgba(10,4,24,.96);border:2px solid #7c5cff;border-radius:16px;" +
    "padding:22px 30px;font:500 20px/1.62 ui-monospace,Menlo,monospace;color:#e9e6f5;" +
    "box-shadow:0 24px 70px rgba(0,0,0,.8)";

  var esc = function (s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  };

  var rows = log
    .map(function (e) {
      if (e.kind === "sent") {
        var detail = Object.keys(e)
          .filter(function (k) { return k !== "at" && k !== "kind" && k !== "transport"; })
          .map(function (k) { return k + " " + esc(e[k]); })
          .join(", ");
        return '<div style="color:#63f08f">&#10003; sent over ' + esc(e.transport) +
          (detail ? " &mdash; " + detail : "") + "</div>";
      }
      if (e.kind === "lost")
        return '<div style="color:#ff6b6b">&#10007; lost (' + esc(e.transport) +
          ", the app was already gone)</div>";
      if (e.kind === "hidden")
        return '<div style="color:#ffd166">&#9679; ' + esc(e.detail) + "</div>";
      if (e.kind === "killed")
        return '<div style="color:#ffd166">&#9679; ' + esc(e.detail) + "</div>";
      if (e.kind === "listener" && payload.showListeners)
        return '<div style="color:#9d93b8">&nbsp;&nbsp;' + esc(e.at) + "ms " + esc(e.detail) + "</div>";
      return "";
    })
    .join("");

  var factRows = lines
    .map(function (l) {
      return '<div style="color:' + (l.color || "#e9e6f5") + '">' +
        esc(l.label) + ": " + esc(l.text) + "</div>";
    })
    .join("");

  box.innerHTML =
    '<div style="font-size:23px;color:#a58bff;margin-bottom:10px">' + esc(payload.title || "journey") + "</div>" +
    rows +
    (factRows
      ? '<div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(165,139,255,.35)">' +
        factRows + "</div>"
      : "");

  document.documentElement.appendChild(box);

  var r = box.getBoundingClientRect();
  return {
    rect: {
      top: Math.round(r.top), bottom: Math.round(r.bottom),
      left: Math.round(r.left), right: Math.round(r.right),
    },
    viewport: [window.innerWidth, window.innerHeight],
  };
})();
