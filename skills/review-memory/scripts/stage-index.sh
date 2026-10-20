#!/usr/bin/env bash
# stage-index.sh <MEMORY.md> remove <file.md>
# stage-index.sh <MEMORY.md> replace <file.md> <new line>
# stage-index.sh <MEMORY.md> add-after <text> <new line>
#
# Stages HEAD's version of the index with one edit, leaving the working tree
# alone. Use it when another session has uncommitted lines in the same index:
# staging the file, or filtering hunks, would sweep theirs in too. `remove` and
# `replace` find the line by its "(file.md)" link; `add-after` inserts the new
# line after the first line containing <text> (a heading or another entry).
# Prints the staged diff of the index.
set -euo pipefail
[ $# -ge 3 ] || { sed -n '2,4p' "$0" >&2; exit 64; }
idx=$1 op=$2 key=$3 new=${4-}
dir=$(cd -- "$(dirname "$idx")" && pwd -P)
top=$(git -C "$dir" rev-parse --show-toplevel)
rel=${dir#"$top"/}/$(basename "$idx")
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
case $op in
remove | replace)
	git -C "$top" show "HEAD:$rel" | awk -v key="($key)" -v op="$op" -v new="$new" '
		!done && index($0, key) { done = 1; if (op == "replace") print new; next }
		{ print }
		END { if (!done) exit 3 }' >"$tmp" || { echo "no index line links ($key)" >&2; exit 1; } ;;
add-after)
	git -C "$top" show "HEAD:$rel" | awk -v key="$key" -v new="$new" '
		{ print }
		!done && index($0, key) { done = 1; print new }
		END { if (!done) exit 3 }' >"$tmp" || { echo "no index line contains: $key" >&2; exit 1; } ;;
*) echo "unknown operation: $op" >&2; exit 64 ;;
esac
git -C "$top" update-index --cacheinfo "100644,$(git -C "$top" hash-object -w "$tmp"),$rel"
git -C "$top" diff --cached -U0 -- "$rel" | grep -E '^[-+]([^-+]|$)|^[-+]- ' || true
