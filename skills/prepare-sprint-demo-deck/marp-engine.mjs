/**
 * Marp engine: slide videos autoplay on their slide, and a click opens them full-window.
 *
 * Autoplay (opt-in with `data-autoplay`): the video starts from the top, muted, when its
 * slide becomes the current one, and pauses when the deck moves on. Only in the audience
 * window: the presenter view and its next-slide preview load with ?view=…, and playing
 * there would start the video before the audience sees the slide.
 *
 * Full-window player (every slide video): Marpit draws each slide inside a scaled
 * `<svg><foreignObject>`, and browsers do not handle native video controls in there.
 * Safari draws them at the wrong scale and clips them; Chromium only shows them while the
 * pointer is moving. So the theme hides the inline controls, and a click on the video
 * opens a plain <video> appended to <body>, outside the svg, where controls work. It
 * starts where the slide video was, in the clicked window only. On close the slide video
 * jumps to where the full-window one stopped, and plays on only if both were playing.
 *
 * The overlay's styles are inlined here, not in the Marpit theme: Marpit scopes every
 * theme rule to the slide section, so no theme rule can match an element under <body>.
 * They avoid `>` because Marp HTML-escapes it inside the injected block.
 *
 * marp-cli calls a functional engine with the already-constructed instance, so this needs
 * no import of @marp-team/marp-core (which would not resolve from here anyway).
 */

const SCRIPT = `<style>
.marp-video-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5vmin;
  background: rgb(0 0 0 / 92%);
  cursor: zoom-out;
}
.marp-video-overlay video {
  max-width: 100%;
  max-height: 100%;
  cursor: auto;
  background: #000;
  box-shadow: 0 24px 70px rgb(0 0 0 / 60%);
}
</style>
<script>
(function () {
  var open = function (slideVideo) {
    var wasPlaying = !slideVideo.paused;
    slideVideo.pause();

    var box = document.createElement("div");
    box.className = "marp-video-overlay";
    var video = document.createElement("video");
    video.src = slideVideo.currentSrc || slideVideo.src;
    video.controls = true;
    video.playsInline = true;
    video.muted = slideVideo.muted;
    video.currentTime = slideVideo.currentTime;
    box.appendChild(video);

    var close = function () {
      slideVideo.currentTime = video.currentTime;
      if (wasPlaying && !video.paused) {
        var resumed = slideVideo.play();
        if (resumed && resumed.catch) resumed.catch(function () {});
      }
      box.remove();
      document.removeEventListener("keydown", onKey, true);
    };
    var onKey = function (event) {
      if (event.key === "Escape") close();
      // The deck binds arrow keys and space to slide navigation. While the overlay is up
      // they belong to the video, so stop them reaching the presentation underneath.
      event.stopPropagation();
    };
    // Only a click on the backdrop closes. Clicks on the video itself are its controls.
    box.addEventListener("click", function (event) {
      if (event.target === box) close();
    });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(box);
    var playing = video.play();
    if (playing && playing.catch) playing.catch(function () {});
  };

  var wire = function () {
    document.querySelectorAll("foreignObject video").forEach(function (video) {
      if (video.dataset.marpVideoOverlay) return;
      video.dataset.marpVideoOverlay = "1";
      video.removeAttribute("controls");
      video.addEventListener("click", function () {
        open(video);
      });
    });
  };

  var autoplayHere = !new URLSearchParams(location.search).get("view");
  var syncAutoplay = function () {
    if (!autoplayHere) return;
    document.querySelectorAll("foreignObject video[data-autoplay]").forEach(function (video) {
      var slide = video.closest(".bespoke-marp-slide, svg[data-marpit-svg]");
      var current = !!slide && slide.classList.contains("bespoke-marp-active");
      if (current && !video.dataset.marpAutoplaying) {
        video.dataset.marpAutoplaying = "1";
        video.muted = true;
        video.currentTime = 0;
        var playing = video.play();
        if (playing && playing.catch) playing.catch(function () {});
      } else if (!current && video.dataset.marpAutoplaying) {
        delete video.dataset.marpAutoplaying;
        video.pause();
      }
    });
  };

  var start = function () {
    wire();
    syncAutoplay();
    new MutationObserver(syncAutoplay).observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
</script>`;

export default ({ marp }) =>
  marp.use((md) => {
    md.core.ruler.push("marp_slide_video", (state) => {
      // Header and footer directives render inline and run this chain too: inject once per deck.
      if (state.inlineMode) return;
      const token = new state.Token("html_block", "", 0);
      token.content = SCRIPT;
      state.tokens.push(token);
    });
  });
