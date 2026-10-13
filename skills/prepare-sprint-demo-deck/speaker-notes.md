# Speaker notes

## Contents

- Format
- Spoken style
- Timing
- Cutting to fit
- Presenting

## Format

Notes are HTML comments after each slide's content. Marp turns them into presenter notes.

```markdown
<!--
[~18 s]

I'll start by demoing a bugfix where a short network drop used to reload the whole channel.

If that took over ten seconds, you'd even see "Playback failed".

Now we let the player retry on its own, so the picture just waits and carries on.
-->
```

- First paragraph: the time budget `[~N s]`, alone.
- **One sentence per paragraph, a blank line between paragraphs.** Never use single line
  breaks: the presenter scans one sentence at a time. Short lines count too: "Hey
  everyone!" is a paragraph of its own.
- Stage directions in square brackets, each in its own paragraph, placed right before the
  line they trigger: `[at "Network back"]`, `[The video starts by itself: it runs 39 s.]`
- Lines in brackets are not spoken; exclude them from word counts.

## Spoken style

- Write it as a speech, not as slide text read aloud. The notes say **less** than the slide;
  the audience reads the details.
- Open with two paragraphs: a greeting ("Hey everyone!"), then what's coming ("Here's what
  I've done this sprint so far.").
- Use transitions that tell the room where they are: "I'll start by demoing…", "Next, a few
  smaller things.", "Also under the hood…", "Finally, some tooling for all of us."
- Introduce each problem in user terms before the finding or fix.
- Say the status of anything not done in the same sentence: "still in review", "in
  progress", "in its next release". A note never says "now" about unmerged work.
- Prefer the symptom and the fix over the mechanism. If the presenter says it's hard to
  picture, cut the mechanism from the note and keep it on the slide.
- Contractions, short sentences, one idea per sentence.
- The demo note starts the video immediately and talks over it; cue lines to the captions
  the video shows.
- Close with two paragraphs: "That's it from me." and "Thanks, and happy to take any
  questions!"

## Timing

1. Count spoken words per slide, excluding bracketed lines.
2. Budget per slide: `round(words / 150 × 60)` seconds, written as `[~N s]`. A video slide's
   budget is the video's length, and its spoken words do not add to the total as long as
   they fit inside the video at the calm pace (at most video seconds × 2.5 words); count any
   words beyond that.
3. Report the total at three paces:

   | Pace | Words per minute |
   |---|---|
   | brisk | 160 |
   | calm | 150 |
   | slow | 140 |

4. Target: under the slot at the slow pace, with at least 10 s to spare at the calm pace.
5. Recompute after every note edit, and update the `[~N s]` lines.

## Cutting to fit

Cut in this order, and offer the cuts as a numbered list with the seconds each saves:

1. Spoken lines that repeat the slide title ("Let's start with live TV.").
2. Transitions that the next slide's title already makes.
3. Details the slide shows in full (a long list, a command, a size table).
4. Mechanism sentences, keeping symptom and fix.
5. Whole items: fold a slide into a grouped bullet, shorten the demo video, or defer an item
   to the next deck, with the user's agreement.

Never offer skipping the demo video as a cut. To save time there, shorten the clip instead:
cut the waiting and add "» N s later" badges (see `marp-rendering.md`).

Never cut a fact that only exists in the note. Never cut the user's own sentences without
asking. When the user declines a cut, keep it on the list for later.

## Presenting

- Presenter view: open the rendered HTML and press lowercase **p** (Caps Lock off). It shows
  the current note, the next slide and a timer. It has worked from a local `file://` URL in
  Edge; in any other browser, confirm it in the dry run, including that both windows stay
  in sync.
- Also export the notes to a text file for paper or a second screen.
- Ask the presenter to do one timed read-through and report their real pace.
