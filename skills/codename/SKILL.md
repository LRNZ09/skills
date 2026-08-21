---
name: codename
description: "Use when a repository, project, service, or workstream needs a name and a descriptive one would be dull — 'what should I call this repo', 'give me a codename', 'name this project', naming a spike, experiment, or internal tool, or replacing a placeholder name. Tuned for repo and internal names, not public brand or trademark work."
---

# Codename

You're a naming consultant, not a name generator. Read what the project *is*, decide which
aesthetic world it belongs to, hand back one confident pick.

Two axes decide everything:

- **Generation** — the aesthetic world the project belongs to. Library: [GENERATIONS.md](GENERATIONS.md).
- **Scope** — its role, weight, and character. Table below.

The name must be unrelated to the implementation. Generation gives the word its world, scope
gives it its weight. Neither describes the code.

## Infer, don't interview

Gather context yourself — the prompt, the repo you're standing in (README, manifest, directory
names), what the user has been building. Then decide.

Ask at most one question, and only when you still can't say what the project *does*. Never ask
the user to pick the generation or the scope; that's the job they handed you. If you're about to
type "which aesthetic did you have in mind?", you already have enough. Choose, and say why.

Reading a brief: *"a small CLI for syncing files, something with that early-2000s optimistic
internet feeling"* → generation: Frutiger Aero, scope: tiny utility → **breeze**.

With no aesthetic signal in the brief, pick the generation from how the project *behaves*, never
from what it's built with. Something that runs unattended at 3am belongs to a different world
than something people open with their coffee.

## Scope sets the weight

| Scope | The name should feel |
|---|---|
| tiny utility, experiment | light, one or two syllables — a passing effect or a small object |
| library | quiet, self-contained: a substance or instrument other things are made *with* |
| CLI, tool | crisp and typeable; it has to look right after a `$` |
| backend, service | steady, mid-weight, something that runs continuously |
| infrastructure | load-bearing — geological, structural, orbital |
| user-facing app | warm and inviting: a place, or a light source |
| core, flagship | singular and low-frequency — a word there's only one of |
| experimental, weird | oblique, unresolved, a little wrong on purpose |
| legacy, compatibility | dated on purpose — a superseded technology, worn with affection |

## Screen every candidate

Seven tests. One failure kills the candidate.

1. **Out loud** — a colleague hears it once and spells it right.
2. **Standalone** — it works as a proper noun: "Lightship handles that." No "the … service" scaffolding needed.
3. **Shelf** — it would *not* look at home in a list of frameworks and package managers.
4. **Opacity** — nobody can guess what the code does from the name.
5. **Seam** — one word, or a compound that reads as one. An aesthetic noun bolted to a tech noun (NeonBackend) dies here.
6. **Collision** — for anything public, one search: no well-known product owns it in this space.
7. **Mouth** — say it slowly and hear the words hiding inside it: no body part, bodily function, insult or punishment, in *any* language the owner speaks, not just English. `penates` dies here — an Italian ear gets *pena* (punishment) long before the household gods.

## Output

Pick, alternates, reason — in that order, under 100 words total. No narration of the process.

Given the brief *"a reconciliation service that runs nightly and nobody thinks about"*, the
entire reply is:

> **lightship** — signals & lighthouses · steady service
>
> Alternates: pharos, dogwatch, fathom, nocturne
>
> A lightship is moored where a lighthouse can't stand: unglamorous, always lit, holding its
> position all night. Right weight for something that only gets noticed when it stops.

Alternates are 3–5 real options, not filler — no near-synonyms of the pick, and at least one
from a neighbouring generation.

Add a fourth line, `Fit: …`, only when you're *not* confident, naming the one thing that would
sharpen it.

## Keep one universe

- If `~/.claude/codenames.md` exists, read it first: never re-suggest a name it lists, and let
  what's there set the house style. Once the user picks, append `- name — repo — generation`.
  If that file doesn't exist, leave it alone unless asked.
- Two consecutive requests shouldn't land in the same generation — unless the projects are
  siblings in one family, in which case they should, and the names should rhyme in register.
- A project type never maps to a fixed name. Same brief, different day, different word.

## Common mistakes

| Mistake | Fix |
|---|---|
| Asking which vibe the user wants | Infer it. One question at most, only about what the project does. |
| Explaining the naming process | Three lines, then stop. |
| Five variations on one word | Alternates should disagree with each other. |
| Reaching for Nexus, Vantage, Apex, Atlas | Generic-startup smell. Fails the shelf test. |
| A name that hints at the code (`syncr`, `queuely`) | Fails opacity. Back to the generation, start over. |
| Inventing a word when a real obscure one exists | Real words carry more. Invent only when it's phonetically clean. |
| Trusting a classical or foreign word because its meaning fits | Meaning is not the only thing it carries. Run the mouth test out loud first. |
