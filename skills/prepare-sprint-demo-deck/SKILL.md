---
name: prepare-sprint-demo-deck
description: Use when preparing a sprint demo or sprint review deck of one presenter's own work — building it from their sprint's tickets and pull requests, writing or trimming speaker notes to a time slot, fact-checking every slide and spoken line before presenting, fixing text that is inaccurate, inconsistent or overflowing, or making a slide's demo video autoplay with working controls. Tuned for short Marp markdown decks. Not for recording the video, team-wide or retrospective decks, or other talks.
---

# Prepare a Sprint Demo Deck

Build a short demo deck of one person's sprint work, with a speaker script that fits the
time slot, and prove every word of it before it is said.

**Core principle: the deck is spoken in public, under the presenter's name.** A wrong,
overstated or vague claim costs more than a missing one. Trace every claim to a primary
source; when a claim cannot be proven, qualify it precisely or cut it. Never trade
accuracy for brevity, wit, or a nicer sentence.

## Settle these first

Find what you can; ask one question for the rest.

| Input | Default / where to find it |
|---|---|
| Sprint | the sprint being demoed: usually the active sprint on the presenter's board, but the one that just closed if a new sprint has already started; confirm name, id, start and end dates, plus the previous sprint's start date (Gather looks back to it) |
| Presenter | the user; their tracker account and code-host account |
| Demo date | ask; it goes on the title slide |
| Time slot | ask (a typical slot is 3 minutes) |
| Deck folder | ask, or a new folder next to the prior decks |
| Prior decks | reuse their theme, title slide and render setup |
| Output | the deck source plus rendered PDF (with notes), HTML, and a notes text file |

## Workflow

Do these in order. Report between phases; do not chain them silently.

1. **Gather.** Collect every candidate item:
   - tracker issues the presenter was **assignee** of at any point, plus their issues whose
     status changed, since the start of the previous sprint (this sprint plus the one before);
   - pull requests the presenter **authored** that were opened or merged since the start of
     the previous sprint, in **every** repository of the workspace, not only the main one;
   - for each item: ticket key, PR, live tracker status and priority, live PR state, what
     actually shipped (which can differ from the ticket title), and its demo media if any (a
     video and its length, or before/after screenshots): look in the deck folder, else ask.
   Looking back one sprint is what brings back work that waited last time, so keep no list
   of it. With more than a handful of items, verify them in parallel, one researcher per item.
2. **Curate.** Keep issues the presenter worked on while assignee, and PRs they authored;
   leave out work they only reported or reviewed for someone else. When an issue changed
   hands during the sprint, ask who should present it. Keep only merged work: a ticket goes
   in once every PR for it has merged, and work without a ticket goes in PR by PR. A ticket
   still in progress waits too, even when every PR so far has merged. Grep every
   earlier deck for each candidate's ticket key and topic and drop what one already showed;
   an item that merged after an earlier deck left it out is new to the room.
   Then build the slide plan: read `slide-patterns.md`. Budget the slot before drafting
   (Timing in `speaker-notes.md`). Items that don't fit their own slide become cards, or move
   to the next deck; the user picks.
3. **Draft slides.** Follow `slide-patterns.md` and `wording.md`, then render once and fix
   any overflow (`marp-rendering.md`), so the accuracy pass reviews wording that already
   fits.
4. **Write speaker notes.** Read `speaker-notes.md`.
5. **Verify.** Read `accuracy-review.md` and run it on the whole deck. Present findings and
   wait for approval before applying fixes: they change what the presenter will say.
6. **Render and check layout.** Read `marp-rendering.md`.
7. **Hand over.** After the last edit, do one spelling and grammar pass over every slide,
   card, caption and note in the source, and list each change in one line. Before calling
   the deck ready, and after any batch of edits, re-check live PR states and priorities, run
   the consistency pass in `accuracy-review.md`, recompute timing, read back every rendered
   slide, and re-render all outputs. Then report the timing table, what was left out, what
   to check in the dry run, and anything still open.

## Non-negotiables

1. **Accuracy.** Numbers come from a measurement or a PR table, never from memory; every
   other claim from a source in `accuracy-review.md`.
2. **Merged only, no release status.** No slide, card or note says where an item stands in
   the release: a sprint's work rarely reaches production in the same sprint, so a status
   would read the same everywhere and tell the room nothing. No count or "Delivered" line
   and no version number either. A limit that holds at every stage stays, written as a
   condition: "on TVs that count frames", "behind a feature flag", "internal use for now",
   "we haven't measured the gain yet". Re-check live PR states and priorities right before
   handing over, since PRs merge and priorities change overnight.
3. **Ownership.** Don't name another developer for their dev work on an item unless the
   presenter really worked with them on it, or the claim isn't true without it. State the
   outcome instead ("every event we send carries all three", not "<name>'s change adds the
   other two"), and never present their part as the presenter's. Reviewers and the ticket's
   reporter can stay named ("<name> spotted it in the data and wrote the first fix").
4. **Identifiers.** No PR numbers anywhere; ticket keys only in footers (Footers in
   `slide-patterns.md`).
5. **The user's wording.** Apply it as given and fix grammar only, saying what you fixed in
   one line ("need of" → "need for"). If it is inaccurate or ambiguous, or the record
   disagrees with their own experience, say so in the same reply, in one short paragraph:
   the evidence and an accurate alternative of similar length. Let them choose. Never trim or cut it without asking, not even to fit a slide or the
   slot.
6. **One term per concept.** Terms, numbers and conditions match across a slide or card, its
   note, its caption and the closing slide ("drop" in both the slide and the note, not
   "hiccup" in the note). When the user changes a phrase in one place, ask whether the
   others should match.

## References

| Open when you need to... | Read |
|---|---|
| decide which slides and cards exist, their templates, type labels, priorities or footers | `slide-patterns.md` |
| write or edit any text on a slide, card, caption or note | `wording.md` |
| write speaker notes, fix their format, budget the slot or cut the speech to fit | `speaker-notes.md` |
| verify the deck, answer "is this accurate?", or check a claim the user dictated | `accuracy-review.md` |
| render, fix an overflowing slide or misplaced emoji, or set up the card grid, video autoplay (bundled `marp-engine.mjs`) or presenter view | `marp-rendering.md` |
