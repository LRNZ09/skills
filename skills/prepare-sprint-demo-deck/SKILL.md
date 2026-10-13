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
| Sprint | the sprint being demoed: usually the active sprint on the presenter's board, but the one that just closed if a new sprint has already started; confirm name, id, start and end dates |
| Presenter | the user; their tracker account and code-host account |
| Demo date | ask; it goes on the title slide |
| Time slot | ask (a typical slot is 3 minutes) |
| Deck folder | ask, or a new folder next to the prior decks |
| Prior decks | reuse their format, theme, title slide and render setup |
| Output | the deck source plus rendered PDF (with notes), HTML, and a notes text file |
| Presenting browser | ask when the deck has video; presenter view and video controls differ by browser |

## Workflow

Do these in order. Report between phases; do not chain them silently.

1. **Gather.** Collect every candidate item:
   - tracker issues in the sprint the presenter was **assignee** of at any point, plus their
     issues whose status changed inside the sprint window;
   - pull requests the presenter **authored** that were opened or merged in the window, in
     **every** repository of the workspace, not only the main one;
   - for each item: ticket key, PR, live tracker status, live PR state, deployed
     environments, and what actually shipped (which can differ from the ticket title).
   With more than a handful of items, verify them in parallel, one researcher per item.
2. **Curate.** Keep issues the presenter worked on while assignee, and PRs they authored.
   Leave out work they only reported or reviewed for someone else. When an issue changed
   hands during the sprint, ask who should present it. Ask whether in-progress items go in
   this deck or the next one. Then build the slide plan: read `slide-patterns.md`.
   Budget the slot before drafting: the script holds about
   `(slot seconds − video seconds) × 140 / 60` spoken words (3 minutes with a 40 s video:
   about 325). Give each planned slide its seconds. Items that don't fit become one-line
   bullets on a grouped slide or move to the next deck; the user picks which.
3. **Draft slides.** Follow `slide-patterns.md` and `wording.md`, then render once and fix
   any overflow (`marp-rendering.md`), so the accuracy pass reviews wording that already
   fits.
4. **Write speaker notes.** Read `speaker-notes.md`.
5. **Verify.** Read `accuracy-review.md` and run it on the whole deck. Present findings and
   wait for approval before applying fixes: they change what the presenter will say.
6. **Render and check layout.** Read `marp-rendering.md`. Re-render after every edit and
   read the rendered slides back.
7. **Hand over.** After the last edit, do one spelling and grammar pass over every slide,
   caption and note in the source. List each change in one line, re-render, then report the
   timing table, what to check in the dry run, and anything still open.

## Non-negotiables

1. **Accuracy.** Every factual sentence on a slide or in a note has a source you checked:
   code on the default branch (or the PR's head commit for work still in review), merge
   commit, PR description and state, tracker status, deployment record. Numbers come from
   a measurement or a PR table, never from memory.
2. **Live status.** Re-check tracker and PR states right before handing over; PRs merge
   overnight.
3. **Ownership.** Only the presenter's assigned or authored work. Credit others' work
   accurately. Frame a change by what it adds ("now also fits a Mac that has a custom
   setup"), not by what earlier work got wrong ("no longer assumes your Mac is fresh out of
   the box"). A bugfix still states its symptom plainly.
4. **Identifiers.** No PR numbers anywhere on slides. Ticket keys go in footers only.
   No presenter name in footers. Slides without a ticket get no footer.
5. **User wording.** Apply the user's wording as given, fixing grammar only, and say what
   you fixed in one line. If their wording is inaccurate, say so in the same reply with the
   evidence and an accurate alternative of similar length.
6. **One term per concept.** The same thing has the same name on the slide, in its note, in
   the caption and on the closing slide.
7. **Fit.** No text may touch the footer or the slide edge. Trim your own wording first,
   never the user's dictated text without asking.
8. **Timing.** The script fits the slot with margin (see `speaker-notes.md`); recompute
   after every note edit.
9. **Ask before launching a browser** to inspect the deck.

## Final checklist

Run before calling the deck ready, and again after any batch of edits.

| Area | Check |
|---|---|
| Accuracy | `accuracy-review.md` pass done; every finding applied or explicitly kept by the user |
| Status | every status line and "In review"/"Merged" tag matches the live tracker and PR state |
| Ownership | every item is the presenter's; deferred items are noted for the next deck |
| Ordering | grouped items run done → in review → in progress (see `slide-patterns.md`); footer keys, notes and closing summary follow the same order |
| Labels | single-item slides open with an emoji + type status line; ticketed grouped items start with the type emoji; one emoji per type throughout |
| Identifiers | no PR numbers; footers hold ticket keys only, in item order |
| Consistency | statuses, numbers, names and terms match across slide, note, caption and closing slide |
| Wording | `wording.md` rules hold: exact components, stated conditions, no jargon, contractions, no repeated openers |
| Spelling | one spelling and grammar pass over every slide, caption and note, after the last edit; each change reported |
| Notes format | one sentence per paragraph, blank line between them, `[~N s]` budget first, stage cues on their own line |
| Timing | total under the slot at 140 wpm and at least 10 s under at 150 wpm; report 160 wpm too |
| Layout | every slide read back from the render; nothing touches the footer; emoji inline |
| Media | videos load from relative paths, start as intended, and show what the caption claims |
| Outputs | PDF, HTML and notes file regenerated from the final source |

## References

| Open when you need to... | Read |
|---|---|
| decide which slides exist, their order, templates, type labels, statuses or footers | `slide-patterns.md` |
| write or edit any text on a slide, caption or note | `wording.md` |
| write speaker notes, fix their format, or cut the speech to fit the slot | `speaker-notes.md` |
| verify the deck, answer "is this accurate?", or check a claim the user dictated | `accuracy-review.md` |
| render, fix an overflowing slide or misplaced emoji, or set up video and presenter view | `marp-rendering.md` |
| add autoplay and a full-window player to slide videos | `marp-engine.mjs` (bundled Marp engine; setup in `marp-rendering.md`) |
