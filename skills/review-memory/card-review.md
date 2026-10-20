# Cards and the review with the user

## The card

One card per memory, as structured output:

| Field | What goes in it |
|---|---|
| `file` | path relative to the repo (or folder) root |
| `title` | the `[...]` title from the memory's index line |
| `says` | one or two plain sentences: what the memory tells Claude to do or know |
| `changed_recently` | empty if untouched in the window you are reviewing; otherwise `Before: ... Now: ...` about **rule** changes, or `Links/wording only` |
| `recommendation` | `keep`, `update`, `merge` (into another memory), `move` (to global or to a project), or `delete` |
| `reason` | one sentence with the evidence |
| `proposed_update` | for `update`: the concrete edit, at most three short lines ("Replace X with Y", "Drop the paragraph about Z"); for `merge`: the target and the sentence that moves into it; else empty |
| `checked` | a few words on what was verified |

Recommendation rules:

- **delete** — no longer guides future work: a finished task's status with no lasting lesson; a tool, path or setup that is gone; fully duplicated by another memory or by an instruction file that loads everywhere the memory applies; a one-off.
- **merge** — a memory that calls itself a case of another, or adds only a trigger or an example to another's rule: fold its extra detail into the target (one sentence, often) and delete it. Its own incident or action is a reason to carry that detail over, not a reason to keep two memories. Prefer merge over keep for these; the user does.
- **update** — still useful but partly wrong, outdated or bloated (a closed ticket's status around a lasting lesson: keep the lesson, drop the status).
- **move** — right content, wrong scope: a project memory that applies everywhere, or a global memory that only one project needs.
- **keep** — valid and useful as it is.

A preference the user stated is not stale because it is old. Only evidence makes it stale.

How instructions load, for the duplicate check: a repo's `AGENTS.md` is read by Claude Code on its own in every session in that repo, and it takes priority over `CLAUDE.md`; it needs no `CLAUDE.md` import. So a project memory that repeats that repo's `AGENTS.md` is redundant — recommend delete, don't hedge on whether the file loads. A global memory repeating one repo's `AGENTS.md` is only redundant in that repo.

## The card agent prompt

Batch the memories in index order (about 18 per agent), run the batches in parallel, read-only. Give each agent:

- The folders and how they load (global: every session; project: only that project).
- Its list (for example lines 1–18 of an index-order file you wrote with `inventory.sh --order`).
- How to find recent changes: `git log <since>..HEAD -- <path>` and `git diff <since> HEAD -- <path>`; a file moved or merged in that window shows as new, so compare it with its source (`git log --diff-filter=D`).
- How to verify cheaply: read the code the memory names (on the main branch, not the current checkout), check a ticket's status read-only, check a tool exists. Keep it to what a recommendation needs.
- The card fields and recommendation rules above.
- Hard rules: read-only — no edits, no git commands that change state, no tracker or code-host writes; skip files another session has pending.

Prior verdicts from a bulk sweep, if one ran, are leads only: the sweep's fixes may themselves be what the card should show as a recent change.

## The question format

Four memories per AskUserQuestion, one question each. Put the scope in front for project memories (`[project] ...`). The question text carries:

1. **Title: what it says**, in a sentence.
2. **What changed in the review window**: `RULE CHANGE SINCE THE LAST REVIEW: before, ...; now, ...` when a rule moved; `SINCE THE LAST REVIEW: links only` when it didn't; `Unchanged since the last review` when untouched.
3. **The recommendation and its evidence**, in one sentence.

Options, recommended first. **Delete is always one of them**, whatever the recommendation — the user often deletes memories you'd keep. Add the others that make sense:

- **Keep (Recommended)**
- **Update (Recommended)** with a `preview` showing the exact before/after text — the user decides on the words, not on "an update"
- **Merge into <target> (Recommended)** with a `preview` of the sentence that moves
- **Revert the recent change** — whenever the card shows a rule change in the review window
- **Move to global** / **Move to project** — when scope is in question
- **Delete**

At most four options fit a question; when space is short, drop a secondary option before Delete. Previews are single-select only, which these questions are. Keep option descriptions to one line.

Answers often carry notes. Follow the note over the label: "Update" with a note "use another example rather than an atom" means a different update than the preview showed; a free-text "re-check if this is still the case" means verify, report, and keep unless the check fails.
