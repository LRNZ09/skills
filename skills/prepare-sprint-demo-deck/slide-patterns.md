# Slide patterns

## Contents

- Deck outline
- Templates
- Type labels
- Statuses
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
Leave out anything the presenter was not assignee or author of. Ask before including an
item that is still in progress; deferring it to the next sprint's deck is usually better.

## Templates

**Headline item** (single change, user-facing):

```markdown
<!-- _footer: 'KEY-123' -->

## <What changed, as a plain statement>

_<emoji> <Type>, <status>._

**Before** <what the user saw>. <the worst consequence, one sentence>.

**Now** <what happens instead>. <short list of what no longer happens>.

- <where it applies: platforms, apps, which engine or default>
- <one guard or limit that matters, with its real number>
```

Take `<status>` from the Statuses table, and name an environment only when the status has
one: `_✨ Feature, in review._`, `_🐛 Bugfix, in testing on <env>._`

**Explanatory "under the hood" slide**: symptom, then cause, then fix.

```markdown
## Under the hood: <component>

_<emoji> <Type>, <status> (<one light aside, optional>)._

**Before** <the symptom people saw>.

- **Why**: <one line: the cause, naming the exact component>.

**Now** <the fix>, <the measurable result or a small table>.
```

**Grouped items** ("Also this sprint"): one bullet per item, emoji first, status last.

```markdown
- <emoji> **<Short name>**: <what it does now, one line where possible>. _<Status>._
```

**Team tooling**: name the repository in code style after the item name, and give each
item its own status: `- **<Tool>** (\`<repo>\`): <change>. _<Status>._` No type emoji here;
the slide title already says what these are.

**Demo slide**: the video, then a one- or two-line caption that states exactly what was
simulated and the single takeaway in bold. See `marp-rendering.md` for video setup.

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
- Single-item slides: emoji plus text at the start of the status line,
  e.g. `_🐛 Bugfix, in testing on development._`
- Grouped slides ("Also this sprint"): emoji only, at the start of each bullet.
- Team tooling bullets: no type emoji.

## Statuses

Re-read them live before handing over. Use the tracker and code-host facts, not intent.

| Write | Only when |
|---|---|
| _In progress_ | ticket in progress, no PR ready for review |
| _In review_ | PR open (all parts, or say "last part in review") |
| _Merged_ | merged, but not necessarily released or deployed |
| _In testing on <env>_ | merged, deployed to that environment, ticket in testing |
| _On <env>_ | deployed there; say which environment |
| _Behind a feature flag_ | users cannot reach it without the flag |
| _Internal use for now_ | it exists but only the team uses it |

"Merged" is not "available": say who has it already and who gets it in the next release.

## Ordering

1. Headline items first, then the demo, then "Also this sprint", "Under the hood",
   "Team tooling", closing.
2. Inside a grouped slide: **done** (On <env>, In testing on <env>, Merged, Behind a
   feature flag, Internal use for now), then **In review**, then **In progress**.
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

- **<Headline short name>**: <one-line result>. <status>.
- **Also this sprint**: <item names, in slide order>.
- **Under the hood**: <one phrase per under-the-hood slide>.
- **Team tooling**: <items>, with any still in review phrased as "on their way".

> Questions? Happy to dig into any of these.
```

Bullets for grouped slides reuse those slides' titles. Each bullet must match the slide it
summarises: same status, same numbers, no claim the slide does not make.
