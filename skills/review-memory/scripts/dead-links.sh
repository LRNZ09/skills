#!/usr/bin/env bash
# dead-links.sh <global memory folder> [<project memory folder>...]
#
# Prints every [[link]] in a memory file that matches no memory's `name:` or
# file stem in its own folder or in the global folder (a global memory cannot
# reach project memories). Fenced code blocks are skipped. Exit 1 if any.
set -euo pipefail
[ $# -gt 0 ] || { echo "usage: dead-links.sh <global folder> [<project folder>...]" >&2; exit 64; }

# names_of <folder>: every memory's name: value (quotes stripped) and file stem.
names_of() {
	for f in "$1"/*.md; do
		[ "$(basename "$f")" = MEMORY.md ] && continue
		sed -n '2,/^---$/{s/^name: *//p;}' "$f" | sed 's/^"\(.*\)"$/\1/'
		basename "$f" .md
	done
}
# links_in <file>: [[...]] targets outside fenced code blocks.
links_in() {
	awk '/^[[:space:]]*```/ { code = !code; next } !code' "$1" |
		grep -o '\[\[[^]]*\]\]' | sed 's/^\[\[//; s/\]\]$//' | sort -u
}

global=$(cd -- "$1" && pwd -P)
global_names=$(names_of "$global")
found=0
for dir in "$@"; do
	dir=$(cd -- "$dir" && pwd -P)
	names=$global_names
	[ "$dir" = "$global" ] || names=$(printf '%s\n%s' "$global_names" "$(names_of "$dir")")
	for f in "$dir"/*.md; do
		[ "$(basename "$f")" = MEMORY.md ] && continue
		while IFS= read -r l; do
			[ -n "$l" ] || continue
			printf '%s\n' "$names" | grep -qxF -- "$l" && continue
			echo "$f: [[$l]]"
			found=1
		done < <(links_in "$f")
	done
done
exit "$found"
