# Slide patterns

## Contents

- Deck outline
- Demo item
- Also this sprint
- Type labels
- Footers
- Closing slide

## Deck outline

| # | Slide | Holds |
|---|---|---|
| 1 | Title | the prior deck's title slide, with the sprint number and demo date updated |
| 2+ | Demo items | for each item with a demo (a video, or before/after screenshots), most visible first: its Before/Now slide, then its demo slide |
| | Also this sprint | one card per other item, ticket or not, internal and tooling work included |
| last | Closing | the results, then an invitation for questions |

## Demo item

**Before/Now slide**:

```markdown
<!-- _footer: 'KEY-123' -->

## <What changed, as a plain statement>

_<emoji> <Type> · <Priority>_

**Before** <what the user saw>. <the worst consequence, one sentence>.

**Now** <what happens instead>. <short list of what no longer happens>.

- <where it applies: platforms, apps, which engine or default>
- <one guard or limit that matters, with its real number>
```

**Demo slide**:

```markdown
<!-- _footer: 'KEY-123' -->

## Demo: <what it shows>

<video data-autoplay src="./media/demo.mp4" poster="./media/demo-still.png" muted playsinline style="display:block;width:100%;"></video>

> <what was simulated or shown, and what differs>
```

Use before/after screenshots in place of the video when there is no recording. The caption
is one or two lines, written like a figure caption: plain weight, no sentence in bold, no
"Now…" opener, so it doesn't read as an announcement. Video setup is in `marp-rendering.md`.

## Also this sprint

One card per item, most visible first, at most 3 per row, all at one text size. The grid
CSS is in `marp-rendering.md`.

```markdown
<!-- _footer: 'KEY-124 · KEY-125' -->

## Also this sprint

<div class="cards">
<div>

#### 🐛 Bugfix · Medium

**<Short name>**: on <platform>, <what happens now>, so <the symptom> no longer happens.

</div>
<div>

#### ✨ Feature · Major

**<Short name>**: <what it does now>, <the condition it holds under>.

</div>
<div>

#### 🛠️ Tooling

**<Tool>** (`<repo>`): <what it does now>.

</div>
</div>
```

- The `####` line is the card's type line (see Type labels). The theme renders it small,
  grey and in normal case.
- After the bold name comes one sentence of about 20 words: what happens now, plus its
  condition. A bugfix states its symptom ("no longer …"). A condition beats the word guide:
  never drop one to fit.
- A tooling card puts its repo in code style right after the name, in the same paragraph.
- More cards than fit one slide: see the Layout check in `marp-rendering.md`.

## Type labels

| Emoji | Type | Use for |
|---|---|---|
| 🐛 | Bugfix | something users or the team saw broken now works |
| ✨ | Feature | a new capability, command, or flow |
| ⚡ | Performance | smaller, faster, lighter, with a number |
| 🧹 | Clean-up | internal tidy-up with no visible change |
| 🧪 | Tests | test reliability and coverage |
| 🛠️ | Tooling | work outside the product repos: team tools, scripts, skills |

- Pick the type from **what shipped**, not the ticket type: a performance ticket that only
  shipped a click fix is a 🐛 Bugfix. Work outside the product repos is always 🛠️ Tooling.
- One emoji per type, the same everywhere in the deck.
- A demo item's type line is `_<emoji> <Type> · <Priority>_` (`_🐛 Bugfix · Major_`); a
  card's type line is `#### <emoji> <Type> · <Priority>`. Without a ticket, both drop
  ` · <Priority>`.
- The priority is the ticket's live tracker priority, at every level, not only the top one.
  The closing slide shows none.

## Footers

- Ticket keys only, joined with ` · `, in reading order: on a grid, left to right, then top
  to bottom. Example: `<!-- _footer: 'KEY-1 · KEY-2' -->`
- Each grid slide lists only its own cards' keys. A demo slide keeps its item's key.
- A slide without a ticket has no footer.
- No PR numbers anywhere in the deck. No presenter name in footers.

## Closing slide

```markdown
<!-- _class: lead -->

## That's all, folks!

- **<Demo item short name>**: <its result>.
- **<What related cards share>**: <their results, a few words each>.

> Questions? Happy to dig into any of these.
```

One bullet per demo item, in deck order, then short results for the cards, in card order,
not bare names. Every card appears in one bullet; to stay within 5 bullets, group cards
under a label they share. Then the questions quote. Every bullet matches its slide or cards
and claims nothing more.
