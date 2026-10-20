# Bulk sweep

A first pass over every memory before the card review: it finds the stale, duplicated, contradicted and wrongly scoped memories fast, and it fixes the obvious ones in one round. Run it when the memory has never been reviewed or its index is near the load cap. Use the Workflow tool when it is available (one stage per launch, a report to the user between stages); otherwise parallel subagents.

## Stage 1: find and verify (read-only)

Split the index into groups of sections (about 15–20 memories each). Per group, one **finder** and one **skeptic**, pipelined:

**Finder** — reads every memory in its group in full, and compares it against the whole global index, every project index, the always-loaded instruction files, and the code or tools it names. Verdict per memory:

- `drop` — obsolete (the tool, path, setup or workflow is gone), superseded or contradicted by a newer memory or instruction, fully covered by an instruction file that loads everywhere it applies, a duplicate, or a one-off with no lasting lesson
- `merge` — overlaps another memory substantially; name the target and what must move into it
- `move` — applies to one project only (or to every project); name the destination
- `fix` — valid, but part of it (or its index line) is out of date; say which part
- `keep`

with `reason` and `evidence` (what was checked, with path:line quotes).

**Skeptic** — gets the finder's non-keep verdicts and tries to refute each: re-checks the evidence, looks for projects the duplicate doesn't reach, details the merge target lacks, contradictions that are really scoped differently, tools that still exist. `upheld` only when the verdict survives. Default to keep only when the evidence is genuinely uncertain — not against clear evidence: a memory that calls itself a case of another is a merge (its extra detail moves into `must_preserve`, it is not a reason to keep both), and a project memory that repeats that repo's `AGENTS.md` is a drop (`AGENTS.md` loads on its own and takes priority over `CLAUDE.md`). It names, for merge/move/fix, the exact detail that must survive (`must_preserve`).

Both are read-only and never touch files another session has pending.

## Stage 2: the user picks

Show the surviving candidates grouped (drops, merges, moves, and the fixes that give actively wrong advice called out separately), with the before/after size of the index. Ask which groups to act on. Expect extra instructions ("also drop anything about tool X").

## Stage 3: repair (one owner per file)

Group the approved changes so that **every file belongs to exactly one agent and one change**. Each repair agent:

- edits or creates only the files it owns; lists inbound links it does not own as follow-ups
- never deletes (lists files to delete), never edits an index (returns index edits: add / remove / replace, with the full new line and section), never runs git commands that change state
- verifies every fact it writes
- returns one entry per change: commit subject, body, files written, files to delete, index edits

## Stage 4: review (read-only)

One reviewer per repair group checks the uncommitted edits against `must_preserve` and the old text: lost detail, newly wrong facts, links that don't resolve, frontmatter, scope creep, index lines, commit messages. Issues come back as must-fix / should-fix / nit with the exact edit. Apply them (one mechanical agent is fine), then commit.

## Stage 5: commit in dependency order

One commit per change, applying each change's index edits with the Edit tool just before its commit. Order the commits so no commit leaves a link dangling:

1. add new merged files and repoint inbound links to them
2. the fixes whose links point at the new files
3. delete the merged-away files last

Edit one index line, commit, then the next: editing several lines and then committing puts other changes' lines in the wrong commit.

## Then: the card review

The sweep's fixes changed rules. Run the card review on everything afterwards, so the user sees each rule change as Before / Now and can keep, revert or delete it.
