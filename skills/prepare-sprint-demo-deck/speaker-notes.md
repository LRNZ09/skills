# Speaker notes

## Format

Notes are HTML comments after each slide's content. Marp turns them into presenter notes.

```markdown
<!--
[~15 s]

Until now, a short network drop reloaded the whole channel.

If that took over ten seconds, you'd even see "Playback failed".

Now we let the player retry on its own, so the picture just waits and carries on.
-->
```

- First paragraph: the time budget `[~N s]`, alone.
- **One sentence per paragraph, a blank line between paragraphs**, never a single line
  break: the presenter scans one sentence at a time.
- Stage directions go in square brackets, each in its own paragraph, right before the line
  they trigger: `[at "Network back"]`, `[The video starts by itself: it runs 39 s.]`. They
  aren't spoken.

## Spoken style

- Write a speech, not slide text read aloud. The note says **less** than the slide; the
  audience reads the details.
- A grid slide's note is its `[~N s]` budget, a transition, then one spoken sentence per
  card, in card order. Never read a ticket key or a priority aloud.
- Talk, don't recite. Tell the problem as what happened, main clause first and in everyday
  words: "Until now, a highlight the editors removed could stay on the page all session." A
  staged scene ("Say…", "Imagine…") or a long clause up front sounds read from a book. The
  slide carries the technical term.
- Don't explain what the room already knows ("the embedded player, the one partners put on
  their own sites").
- Open with two paragraphs, a greeting and then what's coming, and use transitions that tell
  the room where they are. Read the prior decks' notes first and word the greeting, the
  what's-coming line and every transition differently: the room hears the same deck format
  every sprint.
- Prefer the symptom and the fix over the mechanism. If the presenter says it's hard to
  picture, cut the mechanism from the note and keep it on the slide.
- Write for the ear: short sentences, one idea each. Join two clauses with "and" or "so", or
  make them two sentences, instead of a colon: a colon reads well and is hard to hear. Name
  the thing instead of a loose "it": "…but they weren't the cause, and anyone who played a
  recording that soon got the bug", not "…weren't the cause: anyone who played a recording
  that soon got it".
- The demo note starts the video immediately and talks over it; cue lines to the captions
  the video shows.
- Close with two paragraphs, "That's it from me." and "Thanks, and happy to take any
  questions!". These two may stay the same every sprint.

## Timing

1. Before drafting, budget the slot: the script holds about
   `(slot seconds − video seconds) × 140 / 60` spoken words (3 minutes with a 40 s video:
   about 325). Give each planned slide its seconds.
2. Count spoken words per slide, excluding bracketed lines.
3. Budget per slide: `round(words / 150 × 60)` seconds, written as `[~N s]`. A video slide's
   budget is the video's length, and its spoken words don't add to the total as long as
   they fit inside the video at 150 words per minute (at most video seconds × 2.5 words);
   count any words beyond that.
4. Report the total at 160, 150 and 140 words per minute.
5. Target: under the slot at 140 words per minute, with at least 10 s to spare at 150.
6. Recompute after every note edit, and update the `[~N s]` lines.

## Cutting to fit

Cut in this order, and offer the cuts as a numbered list with the seconds each saves:

1. Spoken lines that repeat the slide title ("Let's start with live TV.").
2. Transitions that the next slide's title already makes.
3. Details the slide shows in full (a long list, a command, a size table).
4. Mechanism sentences, keeping symptom and fix.
5. A card in the speech: skip it, and it stays on the slide.
6. Whole items: move an item to a card, or defer it to the next deck, with the user's
   agreement.

Never offer skipping the demo video as a cut. To save time there, shorten the clip instead:
cut the waiting and add "» N s later" badges (see `marp-rendering.md`).

Never cut a fact that only exists in the note. When the user declines a cut, keep it on the
list for later.

## Presenting

- Presenter view: open the rendered HTML and press **p**. It shows the current note, the
  next slide and a timer. In the dry run, check it and the videos in the browser the
  presenter will use.
- Ask the presenter to do one timed read-through and report their real pace.
