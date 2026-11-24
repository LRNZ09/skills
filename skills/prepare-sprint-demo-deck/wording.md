# Wording

Rules for every slide line, card, caption and spoken note. The audience hears each line once.

## Rules

| Rule | Do | Avoid |
|---|---|---|
| Say exactly which one, and set a new tool against the one the room knows | "the native <vendor> ads integration", "the default player (<engine>)", "the <chat tool> release bot"; "a new command lists a release's tickets for staging, pre-production and production, while the <chat tool> release bot only posts for production" | "the ads code", "the second player", "the default player" or "the bot" when the room could ask "which one?"; "a new command lists a release's tickets" when a bot already posts a list |
| Use the room's words | "bundled next to the other player modules", "a recording played right after the show", "your own login", "automated tests" | technicalities the point doesn't need ("the <N> player modules"), internal terms ("a recording whose end padding was still running"), a tool name most of the room won't know, a word with two meanings ("tests": QA hears manual testing) |
| Use the technically right verb | "bundled twice" (it was in the build) | "downloaded twice" |
| State the condition a claim depends on | "on development PRs", "uncompressed", "free users could get" | the claim without its condition |
| Frame a change by what it adds; a bugfix still states its symptom | "now also fits a Mac that has a custom setup" | "no longer assumes your Mac is fresh out of the box" |
| Introduce before you report | "There's a bug where a free user starts a recording after the ads, and the controls don't work. I've reproduced it…" | "The broken controls now reproduce in tests" |
| Say why for items that sound arbitrary, using the reason the source gives | the reason from the PR or ticket, e.g. "moved to async, for more reliable automated tests" when the PR says so | a reason you supplied; if the source gives none, ask the user and leave the reason out until they answer |
| Put a person in front of the action | "we fixed it with a hotfix the same day", "we deleted about 30,700 lines" | "a hotfix addressed it", "30,700 lines deleted": a thing or a passive standing in for people's work. Describing what the product does stays as is ("the release showed an error") |
| Say "we" for work the team planned | "we released a new one on the 4th" | "I released it" when the PO and the team planned it and the presenter only ran the deploy; keep "I" for work the presenter did alone, like recording the demo |
| Claim the mechanism, not the appearance | "the fix covers video and subtitle streams too" | "video and subtitles behave the same" |
| Contractions in speech and slides | doesn't, can't, it's, they've | does not, cannot, it is |
| No repeated openers or connectives | no two bullets, card sentences or other sentences on one slide, or in one note, start with the same words (card names and type lines may repeat); vary "Then", "Next", "Plus", "Finally" | "A reload that took over 10 s…" and "A reload that never settles…" on one slide; "finally" three times |
| At most one light aside per slide | an aside next to the facts, which it leaves true | a joke inside a factual claim, or in the type line |

Drafts often get the count, the mechanism, who changed what, a frequency word or a
platform term wrong: check each claim against "Claims that were wrong before" in
`accuracy-review.md`.

## Before and after

Real corrections, generalised. Use them as the bar.

| First draft | Problem | Final |
|---|---|---|
| "**Before** the app bundled the player twice, just to be sure." | the joke implies it was deliberate, next to a line explaining the accident | "**Before** the app accidentally bundled the player twice." |
| "In TV search, a click opens what you clicked." | nobody knows when it didn't | "a pointer click on <brand> TVs opens the tile under it, not the focused one" |
| "Each PR keeps one build report and one performance report" | the second report only appears for some PRs, and only on one branch | "Each PR into development keeps one build report, plus a performance report when the app changes" |
| "**Now the time counts, and the bar is grey where it isn't recorded yet.**" (demo caption) | a bold "Now…" sentence under screenshots reads as a big announcement | "After the fix, the time counts and the bar is grey past what's recorded so far." |
