# Slide patterns

## Contents

- Deck outline
- Templates
- Type labels
- Merged work only
- Ordering
- Footers and identifiers
- Closing slide

## Deck outline

| # | Slide | Holds |
|---|---|---|
| 1 | Title | sprint number, team, `Presenter · demo date` |
| 2+ | Headline items | one slide per user-facing change worth showing, most visible first |
| | Demo | a before/after video for the headline item, when one exists |
| | Also this sprint | the remaining ticketed items, one bullet each |
| | Under the hood | one slide per internal change that needs a cause to make sense |
| | Team tooling | work outside the product repos, each item naming its repository |
| last | Closing | one summary bullet per slide group, then an invitation for questions |

Work without a ticket goes on the "Under the hood" or "Team tooling" slides at the end.
Leave out anything the presenter was not assignee or author of. Only merged work goes in;
open PRs and tickets still in progress wait for the next deck (see "Merged work only").

## Templates

**Headline item** (single change, user-facing):

```markdown
<!-- _footer: 'KEY-123' -->

## <What changed, as a plain statement>

_<emoji> <Type>_

**Before** <what the user saw>. <the worst consequence, one sentence>.

**Now** <what happens instead>. <short list of what no longer happens>.

- <where it applies: platforms, apps, which engine or default>
- <one guard or limit that matters, with its real number>
```

**Explanatory "under the hood" slide**: symptom, then cause, then fix.

```markdown
## Under the hood: <component>

_<emoji> <Type>_

**Before** <the symptom people saw>.

- **Why**: <one line: the cause, naming the exact component>.

**Now** <the fix>, <the measurable result or a small table>.
```

**Grouped items** ("Also this sprint"): one bullet per item, emoji first.

```markdown
- <emoji> **<Short name>**: <what it does now, one line where possible>.
```

**Team tooling**: name the repository in code style after the item name:
`- **<Tool>** (\`<repo>\`): <change>.` No type emoji here; the slide title already says
what these are.

**Demo slide**: the video or the before/after screenshots, then a one- or two-line caption
that states exactly what was simulated or shown and what differs. Write it like a figure
caption: plain weight, no sentence in bold, no "Now…" opener, so it doesn't read as an
announcement. Keep its wording close to the slide's speaker note. See `marp-rendering.md`
for video setup.

## Type labels

Use one emoji per type, the same everywhere in the deck.

| Emoji | Type | Use for |
|---|---|---|
| 🐛 | Bugfix | something users or the team saw broken now works |
| ✨ | Feature | a new capability, command, or flow |
| ⚡ | Performance | smaller, faster, lighter, with a number |
| 🧹 | Clean-up | internal tidy-up with no visible change |
| 🧪 | Tests | test reliability, tooling, coverage |

- Pick the type from **what shipped**, not the ticket type: a performance ticket that only
  shipped a click fix is a 🐛 Bugfix.
- Single-item slides: emoji plus text in the type line, e.g. `_🐛 Bugfix_`. A type line that
  holds only the type ends without a period; one with an aside (see Humour in `wording.md`)
  ends with one.
- Grouped slides ("Also this sprint"): emoji only, at the start of each bullet.
- Team tooling bullets: no type emoji.

## Merged work only

The deck shows merged work and says nothing about where it stands in the release flow. A
sprint's work rarely reaches production inside the same sprint, so a release status would
read the same on every slide and tell the room nothing.

- **What goes in**: a ticket goes in once every PR for it has merged. While any is still
  open, the whole ticket waits, like open PRs and tickets still in progress. Work without a
  ticket goes in PR by PR. Re-check live PR states right before handing over, so an item
  merged overnight can join and nothing unmerged stays in. Nothing needs listing: the next
  run looks back one sprint and finds what waited.
- **Type lines**: a single-item slide's type line is its type alone, plus at most one light
  aside (see "Humour" in `wording.md`).
- **Limits**: a limit that holds at every release stage stays, written as a condition:
  "on TVs that count frames", "behind a feature flag", "internal use for now", "we haven't
  measured the gain yet".
- **Once per item**: an item an earlier deck already showed stays out, including as a "now
  on production" one-liner. An item left out while in review that has merged since is new
  to the room, so it can go in.
- Speaker notes follow the same rule.

## Ordering

1. Headline items first, then the demo, then "Also this sprint", "Under the hood",
   "Team tooling", closing.
2. Inside a grouped slide: most visible first.
3. Footer keys, the speaker note and the closing summary list items in the same order as
   the slide.

## Footers and identifiers

- Footer: ticket keys only, joined with ` · `, in item order. Example:
  `<!-- _footer: 'KEY-1 · KEY-2' -->`
- No PR numbers on any slide or caption.
- No presenter name in footers; it reads as self-promotion. The title slide carries it.
- A slide with no ticket gets no footer at all.

## Closing slide

```markdown
<!-- _class: lead -->

## That's all, folks!

- **<Headline short name>**: <one-line result>.
- **Also this sprint**: <item names, in slide order>.
- **Under the hood**: <one phrase per under-the-hood slide>.
- **Team tooling**: <items>.

> Questions? Happy to dig into any of these.
```

Bullets for grouped slides reuse those slides' titles. Each bullet must match the slide it
summarises: same numbers, same conditions, no claim the slide does not make.
