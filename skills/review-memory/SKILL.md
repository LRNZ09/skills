---
name: review-memory
description: Use when reviewing, auditing, cleaning up or pruning Claude Code's persistent memory (the global ~/.claude/memory folder and per-project projects/<key>/memory folders with their MEMORY.md indexes) — finding stale, duplicated, contradicted or obsolete memories, going through them with the user one by one to keep, update, move or delete each, shrinking a MEMORY.md index that is near its load cap, fixing dead [[links]] between memories, or committing memory changes when the memory lives in a git repo. Use it even when the user only says "my memory is getting long", "clean up what you remember", "is any of this still true?" or "review my memories". Not for saving, recalling or editing one memory the user names, not for setting up hooks or checks around memory, not for CLAUDE.md or AGENTS.md instruction files, and not for a program's RAM.
---

# Review Memory

Go through Claude Code's memory with the user, memory by memory, and leave every memory either confirmed, corrected, moved to the right scope, or gone — each change as its own reviewable step.

**Core principle: the user owns their memory.** A memory records what they told you or what you learned with them; only they decide whether it still holds. Your job is to bring evidence (is it stale, contradicted, duplicated, wrongly scoped?) and a recommendation, never to retire a preference because it looks old. A memory that changed a *rule* — what future sessions will do differently — always gets shown to the user as Before / Now, even if the change was yours and recent.

## Settle these first

Find what you can; ask one question for the rest.

| Input | Default / where to find it |
|---|---|
| Memory folders | global: `${CLAUDE_CONFIG_DIR:-~/.claude}/memory`; projects: `.../projects/<key>/memory`. Follow symlinks: the folders often live in a git repo. |
| Git repo? | `git -C <resolved folder> rev-parse --show-toplevel`. If yes, every change is one commit in that repo's subject style. If not, just edit. |
| Other sessions' pending edits | `git status` in the repo before touching anything. Those files and index lines are not yours: never stage them, and check after every commit that none slipped in. |
| Scope | global, one project, or both. Default: global first (it loads in every session), then the current project. |
| Review window | what "recent changes" are measured from: the last review — a tag if one marks it, otherwise the commit just before the last review's first change (`git log` of the memory folders shows it). Ask if it isn't clear. Without git there is no window; skip that card field. |
| Depth | **Bulk sweep, then cards** when the memory has never been reviewed or is near the index cap; **cards only** for a routine review. |
| Attribution | follow the user's and the harness's rules for commit trailers; never add AI attribution in public or work repos. |

Run `scripts/inventory.sh <folder>...` for the baseline: index lines and bytes against the load cap, unindexed files, index lines pointing at missing files, and pending changes.

## The workflow

```
0 Baseline ──> 1 Bulk sweep (optional) ──> 2 Cards ──> 3 Review with user ──> 4 Apply each decision ──> 5 Final checks
```

Phases 2–4 interleave: review a batch of four, apply those four, move on. Report a one-line status between long stretches of tool calls; the user may be following along.

### 1. Bulk sweep (optional)

A fast first pass over every memory: parallel read-only finders give each memory a verdict (keep / drop / merge / move / fix) with evidence, a skeptic per batch tries to argue each non-keep verdict back to keep, the user picks which groups to act on, repair agents edit disjoint file sets, an independent reviewer checks the edits, and you commit them in dependency order. Details, agent prompts and schemas: [bulk-sweep.md](bulk-sweep.md).

The sweep can change rules in bulk. That is why the card review runs after it and shows every rule change as Before / Now — expect the user to revert or delete some of what the sweep produced.

### 2. Cards

Prepare one card per memory, in index order, with parallel read-only agents (about 18 memories per batch). A card says what the memory tells Claude, what changed recently, a recommendation with evidence, and — for an update — the exact edit. Card schema and the agent prompt: [card-review.md](card-review.md).

Start reviewing as soon as the first batch is back; don't wait for all of them.

### 3. Review with the user

Four memories per AskUserQuestion, one question each, in index order, recommended option first. Show what the memory says, its recent change (as Before / Now when a rule moved), the recommendation and its evidence, and a preview of the exact edit for an update or merge. Always offer Delete; add Keep, Update, Merge into another memory, Revert the recent change, or Move to global / to a project as they fit. Format details: [card-review.md](card-review.md).

Read every answer, including free-text notes: "delete", "re-check if this is still the case", "use another example", "leave a handoff note for another agent" all mean something specific. When asked to re-check, verify with a primary source and report before acting.

### 4. Apply each decision immediately

One decision, one commit, right after the answer — not batched at the end.

1. **Inbound links first.** `scripts/inbound-links.sh <file.md> <folders>...` lists every memory that links the target by `name:` or file stem. For a delete, remove or reword those links in the same commit. For a move to a narrower scope, links from a wider scope can no longer reach it: name it in words instead.
2. **The memory itself.** Read before you Edit or Write. Verify every fact you write (a path, a tool name, a flag) with a read-only check. Keep `name:` unless the memory moves or merges, since links depend on it. A move copies the content with clean frontmatter, drops links the new scope can't reach, and removes the old file.
3. **The index line.** Edit `MEMORY.md` with the Edit tool, not shell appends, so Claude Code's own size warning can fire. Keep index lines short; they all load every session.
4. **Stage exactly, commit.** `scripts/commit.sh` stages the listed paths (and `--rm` deletions), refuses to commit if anything else is staged, and wraps the body. When another session has pending edits in the same index or file, stage your version from HEAD with `scripts/stage-index.sh` and pass it with `--staged`.

If the user deletes a memory but wants its state kept for later work, write a handoff note in a gitignored spot of the repo that work belongs to, and say where.

### 5. Final checks

- `scripts/dead-links.sh <global folder> <project folders>...` — every `[[link]]` must match a memory's `name:` or file stem in its own folder or the global one (code blocks are skipped).
- `scripts/inventory.sh` again: nothing unindexed, no index line pointing at a missing file, sizes well under the cap.
- In a git repo: every commit signed if the repo signs, no other session's lines committed, what is still uncommitted and whose it is.

Close with a short before/after table (files and index size per folder) and what is still open.

## Traps

Shell, git and Claude Code traps that cost time in past reviews — zsh not splitting variables, BSD `sed`, `awk` `NR`, git pairing two sessions' hunks, rename detection, `Edit` needing a prior `Read`: [pitfalls.md](pitfalls.md). Skim it before Phase 4.
