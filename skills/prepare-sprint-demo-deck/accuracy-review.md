# Accuracy review

Run on the whole deck before calling it ready, after any batch of factual edits, and for
any single claim the user questions. Goal: nothing on a slide or in a note can be refuted.

## Contents

- Sources, in order of trust
- Procedure
- Checker brief
- Reporting
- Claims that were wrong before

## Sources, in order of trust

| Source | Settles |
|---|---|
| code on the default branch, or the PR's head commit for unmerged work | behaviour, defaults, which platforms, which errors, what is excluded |
| merge commit message and diff | what shipped, mechanism, scope |
| PR description and **live** state | sizes and measurements, test plan, known gaps, open vs merged |
| tracker issue and **live** status | ticket intent, status, sprint membership |
| deployment records or release tags | which environments have it |
| recordings and their logged facts | what a demo shows, real durations and timings |
| the user | their own experience and plans: keep them as user-supplied, but still compare them with the record and flag any disagreement for the user's call |

A ticket's wording is intent, not fact: when it disagrees with the merged code, the code
wins. A claim the ticket never makes (a device, a brand, a number) needs a code source.

## Procedure

1. Split the deck into claims: every sentence on every slide, caption, footer and note that
   states a fact, status, number, scope or cause.
2. Check each claim against the sources above. With subagents available, run one
   independent checker per content slide, plus one consistency checker for the whole deck;
   otherwise do the same passes yourself, one slide at a time.
3. Run the consistency pass: statuses, names, terms and numbers match across each slide, its
   note, its caption and the closing slide; footer keys belong to that slide's items and
   follow its order; the title slide's date matches the demo day.
4. Re-check live statuses (tracker, PRs, releases) even if they were checked yesterday.
5. Review each finding yourself before reporting it. Checkers' own fixes can be wrong (for
   example, calling something a "fallback" when the code tries it first): verify the fix
   against the source too.
6. Report, wait for the user's decision, apply, re-render, and re-run the checks that the
   edits touched.

## Checker brief

Give each checker this shape (fill in the slide and its sources):

> Fact-check slide N and its speaker note. For every factual claim, try to **refute** it
> from primary sources: code on the default branch (the PR's head for unmerged work), the
> merge commit, the PR description and its live state, the tracker status. Flag wrong facts,
> wrong plurality, wrong mechanism, overstated numbers, claims true only under a condition
> the text doesn't state, stale statuses, and vague component names. Do not flag tone,
> jokes, or simplifications that stay true. Mark the presenter's personal statements as
> user-supplied. Report only what you can point at with evidence; prefer few solid findings.
> For each, give a corrected sentence of similar length, in plain spoken English. Read-only:
> change nothing.

Ask for structured output per finding: where, quote, verdict
(`inaccurate` / `imprecise` / `stale-status` / `inconsistent` / `user-supplied`),
evidence (file:line, commit, PR, ticket), fix.

## Reporting

Group findings for the user:

1. **Wrong**: the claim is false. Lead with these.
2. **Overstated**: true only under a condition, or too strong.
3. **Needs your call**: user-supplied statements the record disagrees with, framing choices.

For each: the quote, one line of evidence, the proposed wording. End with what checked out,
in one line. Apply nothing until the user says which to apply.

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
| "now use the async clock, with a lint rule" | the lint rule is only in the PR still in review | merged vs in review |
| "for every team" on the closing slide | the PRs are still open | summary vs slide status |
| "as soon as the network is back" | playback resumed about 6 s later | timing from the recording |
| "a 30 s drop" | the block lasted about 37 s; 30 s is when the reading was taken | duration from logs |
| "often with a new pre-roll" | only for viewers who get ads, and frequency-capped | audience and frequency |
| "the library now retries" | it always did; the app stopped cancelling it | attribution |
| "no dialog" | one platform shows an in-player overlay | umbrella term |
| "on <brand> remotes" | the ticket never names a device; the code enables the pointer by default only there | cite the code |
| "downloads use your own login" | released for one package, the other gets it next release | merged vs released |
| "tested by the whole team for months" | git shows about four weeks | user-supplied, flag |
| "reproduced in tests, two causes" | the closest reproduction did not need the condition in the ticket's title | read the evidence, not the summary |
