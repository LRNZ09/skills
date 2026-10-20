# Pitfalls

Traps that cost time in past memory reviews. Skim before applying changes.

## Shell

- **zsh does not split unquoted variables.** `for f in $LIST` and `cmd $FILES` pass one word. Write the list out, use `${(f)FILES}` (zsh), or pipe to `xargs`.
- **BSD `sed` has no `--` before files.** `sed -i '' 's/a/b/' -- file` treats `--` as a file. For paths starting with `-`, prefix `./`.
- **`awk` `NR` counts across files**; use `FNR` for per-file line numbers when reading several files.
- **A shell `%` in a git format string can glob** in zsh (`--format=%G?`). Quote it: `--format='%G?'`.
- **`sed -n '2p' a b`** prints line 2 of the concatenated stream, not of each file.
- **Links are not always slugs.** A memory's `name:` may contain spaces or punctuation; links may use the name or the file stem. Match both.

## Git

- **Another session's pending edits.** If a file or an index you need to change already has someone else's uncommitted edit, `git add` of the file commits theirs too. Stage your version built from HEAD instead (`scripts/stage-index.sh` for an index line), or ask whether their edit should go in.
- **Git pairs adjacent hunks.** A removal next to another session's addition can come out as one hunk, so hunk-filtering stages both or neither. Building the staged blob from HEAD avoids this.
- **Rename detection hides deletions.** A deleted file plus a new file with the same content shows as one rename in `git diff --cached --name-only`; compare staged sets with `--no-renames`.
- **`git rm` refuses a file with local modifications**; `git rm -f` discards them, so only use it when the user chose to delete that pending edit too.
- **Check after every commit** that no other session's line is in `HEAD` (grep the committed index for their file names). If one slipped in, take it back out in a new commit by staging HEAD's index without that line, leaving the working tree alone.
- **Never rewrite history unasked**; a forward fix commit is the default. Amending a commit you made seconds ago, before anything builds on it, is fine.

## Claude Code

- **Edit and Write need a prior Read** of the file in the session, even if you `cat` it in the shell.
- **Edit MEMORY.md with the Edit tool**, not shell appends: Claude Code's index-size warning only fires on its own writes.
- **The index load cap** (lines and bytes) truncates silently from the end; check the current values in your Claude Code version before quoting them.
- **Attribution instructions can arrive mid-session.** Follow the latest one, but the user's rule for public or work repos (no AI attribution) wins where it applies.
- **A permission deny rule may block a command you need** (for example a hooks setting). Don't work around it; give the user the exact command to run.
