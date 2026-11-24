# Accuracy review

Run on the whole deck before calling it ready, after any batch of factual edits, and for
any single claim the user questions. Goal: nothing on a slide, card or in a note can be
refuted.

## Sources, in order of trust

| Source | Settles |
|---|---|
| code on the default branch | behaviour, defaults, which platforms, which errors, what is excluded |
| merge commit message and diff | what shipped, mechanism, scope |
| PR description and **live** state | sizes and measurements, test plan, known gaps, open vs merged |
| tracker issue and **live** fields | ticket intent, priority, sprint membership, whether it's still in progress |
| recordings and their logged facts | what a demo shows, real durations and timings |
| the user | their own experience and plans: keep them as user-supplied, but still compare them with the record and flag any disagreement for the user's call |

A ticket's wording is intent, not fact: when it disagrees with the merged code, the code
wins. A claim the ticket never makes (a device, a brand, a number) needs a code source.

## Procedure

1. Split the deck into claims: every sentence on every slide, card, caption, footer and
   note that states a fact, number, priority, scope, condition or cause.
2. Check each claim against the sources above. With subagents available, run one
   independent checker per item (each demo item and each card), plus one consistency
   checker for the whole deck; otherwise do the same passes yourself, one item at a time.
3. Run the consistency pass: names, terms, conditions and numbers match across each slide
   or card, its note, its caption and the closing slide; footer keys belong to that slide's
   items and follow its reading order; the title slide's date matches the demo day.
4. Review each finding yourself before reporting it. Checkers' own fixes can be wrong (for
   example, calling something a "fallback" when the code tries it first): verify the fix
   against the source too.
5. Report, then apply what the user picks and re-run the checks that the edits touched.

## Checker brief

Give each checker this shape (fill in the item and its sources):

> Fact-check item N: its slides or card, its type line, its demo caption if any, and its
> spoken lines.
> For every factual claim, try to **refute** it from primary sources: code on the default
> branch, the merge commit, the PR description and its live state, the tracker's live
> fields. Flag wrong facts, wrong plurality, wrong mechanism, overstated numbers, claims
> true only under a condition the text doesn't state, a priority that differs from the live
> ticket, any release status or unmerged work, and vague component names. Do not flag tone,
> jokes, or simplifications that stay true. Mark the presenter's personal statements as
> user-supplied. Report only what you can point at with evidence; prefer few solid findings.
> For each, give a corrected sentence of similar length, in plain spoken English. Read-only:
> change nothing.

Ask for structured output per finding: where, quote, verdict
(`inaccurate` / `imprecise` / `unmerged` / `release-status` / `inconsistent` / `user-supplied`),
evidence (file:line, commit, PR, ticket), fix.

## Reporting

Group findings for the user:

1. **Wrong**: the claim is false. Lead with these.
2. **Overstated**: true only under a condition, or too strong.
3. **Needs your call**: user-supplied statements the record disagrees with, framing choices.
4. **Against the rule**: unmerged items and release statuses. Propose cutting the item, or
   cutting the status and keeping any limit that holds at every stage as a condition.

For each: the quote, one line of evidence, the proposed wording. End with what checked out,
in one line.

## Claims that were wrong before

Generalised from real reviews. Check for each pattern explicitly.

| Draft claim | What was true | Pattern |
|---|---|---|
| "the skills now skip them" | one skill changed | plurality |
| "they have their own bot" | they have their own access token; the bot is how it appears | mechanism |
| "since the refactoring, every automated action shared one token, so reports piled up" | two scripts shared it; duplicates started when the token was reissued and renamed | cause and scope |
| "less than half the size" | 55% smaller uncompressed, 22% compressed | unstated condition |
| "compressed: 560 KB" | a harness setting, not what the CDN serves | label the measure |
| "for any environment" | three of four; development is refused | enumerate |
| "now use the async clock, with a lint rule" | the lint rule is only in an open PR | rests on an unmerged PR |
| "for every team" on the closing slide | the slide it sums up doesn't claim that | summary claims more than the slide |
| "as soon as the network is back" | playback resumed about 6 s later | timing from the recording |
| "a 30 s drop" | the block lasted about 37 s; 30 s is when the reading was taken | duration from logs |
| "often with a new pre-roll" | only for viewers who get ads, and frequency-capped | audience and frequency |
| "the library now retries" | it always did; the app stopped cancelling it | attribution |
| "no dialog" | one platform shows an in-player overlay | umbrella term |
| "on <brand> remotes" | the ticket never names a device; the code enables the pointer by default only there | cite the code |
| "downloads use your own login" | one package has it, the other doesn't yet | scope across parts |
| "tested by the whole team for months" | git shows about four weeks | user-supplied, flag |
| "reproduced in tests, two causes" | the closest reproduction did not need the condition in the ticket's title | read the evidence, not the summary |
| "<brand>'s browser doesn't count frames" | one browser test on one TV, not the app | one test is not a fleet |
| "three commits under the same version number" | three test builds; only one shipped | count what shipped, not what was built |
