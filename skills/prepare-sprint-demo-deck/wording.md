# Wording

Rules for every slide line, caption and spoken note. The audience hears each line once.

## Contents

- Rules
- Before and after
- Humour
- Handling the user's own wording

## Rules

| Rule | Do | Avoid |
|---|---|---|
| Name the exact component | "the native <vendor> ads integration" | "the ads code", or "the second player" when the room can't tell which one |
| Name the default when you mention it | "the default player (<engine>)" | "the default player" when the room may not know which one that is |
| Say which one when there could be several | "the <chat tool> release bot" | "the bot" when the audience could ask "which one?" |
| Set a new tool against the one the room already knows | "a new command lists a release's tickets for staging, pre-production and production, while the <chat tool> release bot only posts for production" | "a new command lists a release's tickets" when a bot already posts a list |
| Drop technicalities the point doesn't need | "bundled next to the other player modules" | "bundled next to the <N> player modules" |
| Shorten a label once the context is set | "the PR review skill", after the slide has introduced the skills | the full product-qualified name in every line |
| Use the technically right verb | "bundled twice" (it was in the build) | "downloaded twice" |
| Carry the status into every line about the item | "a small resolver clean-up, still in review" | "the resolver now resets" when its PR is still open |
| State the condition a claim depends on | "on development PRs", "uncompressed", "free users could get" | the claim without its condition |
| Count correctly | "the PR review skill" when one skill changed | "the skills" |
| Name the mechanism that changed | "their own access token" | "their own bot" when the token is what changed |
| Plain words over tool names | "your own login" | a credential-helper product name most of the room won't know |
| Introduce before you report | "There's a bug where a free user starts a recording after the ads, and the controls don't work. I've reproduced it…" | "The broken controls now reproduce in tests" |
| Say why for items that sound arbitrary, using the reason the source gives | the reason from the PR or ticket, e.g. "moved to async, for more reliable automated tests" when the PR says so | a reason you supplied; if the source gives none, ask the user and leave the reason out until they answer |
| Disambiguate words with two meanings | "automated tests" | "tests" (QA hears manual testing) |
| One term per concept | "drop" on the slide and in the note | "drop" on the slide, "hiccup" in the note |
| Avoid unbacked frequency words | "could get a new pre-roll" | "often", "usually", "most" without data |
| Attribute the change to your code | "now we let the library retry on its own" | "the library now retries" when it always did |
| Use the umbrella term when platforms differ | "error message" | "dialog" when one platform shows an overlay |
| Claim the mechanism, not the appearance | "the fix covers video and subtitle streams too" | "video and subtitles behave the same" |
| Contractions in speech and slides | doesn't, can't, it's, they've | does not, cannot, it is |
| No repeated openers or connectives | no two bullets or sentences on one slide, or in one note, start with the same words; vary "Then", "Next", "Plus", "Finally" | "A reload that took over 10 s…" and "A reload that never settles…" on one slide; "finally" three times |
| Grammar of noun adjuncts | "subtitle streams", "the need for" | "subtitles streams", "the need of" |
| Set phrases correctly | "That's all, folks!" | "That's all folks" |

## Before and after

Real corrections, generalised. Use them as the bar.

| First draft | Problem | Final |
|---|---|---|
| "**Before** the app bundled the player twice, just to be sure." | the joke implies it was deliberate, next to a line explaining the accident | "**Before** the app accidentally bundled the player twice." |
| "The setup wizard no longer assumes your Mac is fresh out of the box." | dismisses the earlier work | "The setup wizard now also fits a Mac that has a custom setup." |
| "the skills I built, tested by the whole team over the last couple of months" | overstates who tested and for how long | "the skills we've been using in the team for roughly a month" |
| "can use your own login, with the shared token only as a fallback" | wrong order: a stored shared token is tried first | "can use your own login instead of storing the shared token" |
| "In TV search, a click opens what you clicked." | nobody knows when it didn't | "a pointer click on <brand> TVs opens the tile under it, not the focused one" |
| "Each PR keeps one NX and one Lighthouse report" | the second report only appears for some PRs, and only on one branch | "Each PR into development keeps one NX report, plus a Lighthouse report when the app changes" |
| "Now it's less than half the size." | true only uncompressed | "Now it's less than half the size uncompressed." |
| "Claude Code skills for every team" (closing slide) | the PRs are still open | "Claude Code skills on their way to other teams" |

## Humour

- One light aside per slide at most, usually in the status line's parentheses:
  `_⚡ Performance, on development (still behind a feature flag, no worries 😉)._`
- Never put a joke inside a factual claim, and re-read it next to the facts around it: a
  joke that changes meaning ("just to be sure") is an inaccuracy.
- If it feels forced, cut it.

## Handling the user's own wording

1. Apply it as given.
2. Fix grammar only, and say exactly what you changed in one line ("need of" → "need for").
3. If it is inaccurate or ambiguous, say so in the same reply: the evidence, then an
   accurate alternative of similar length. Do not lecture; one short paragraph.
4. If it is the user's own experience ("we've used them for a month"), keep it, but tell
   them if the record says otherwise ("git shows about four weeks"), and let them choose.
5. When they change a phrase in a note, ask whether the slide and caption should match,
   or align them when they say so.
