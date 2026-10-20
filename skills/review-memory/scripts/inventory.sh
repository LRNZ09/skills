#!/usr/bin/env bash
# inventory.sh [--order] <memory folder>...
#
# Per folder: index size against the load cap, memory files, files the index
# does not list, index lines pointing at missing files, and uncommitted changes
# when the folder is in a git repo. With --order, print instead every memory
# file in index order, one path per line (for batching review cards).
#
# Override the cap with CAP_LINES / CAP_BYTES; check your Claude Code version.
set -euo pipefail
CAP_LINES=${CAP_LINES:-200}
CAP_BYTES=${CAP_BYTES:-25000}
order=0
if [ "${1:-}" = --order ]; then order=1; shift; fi
[ $# -gt 0 ] || { echo "usage: inventory.sh [--order] <memory folder>..." >&2; exit 64; }

# Index links are "](file.md)"; parentheses inside descriptions are not links.
index_links() { grep -o '](\([^)/]*\.md\))' "$1" | sed 's/^](//; s/)$//'; }

for dir in "$@"; do
	dir=$(cd -- "$dir" && pwd -P)
	idx=$dir/MEMORY.md
	if [ "$order" = 1 ]; then
		[ -f "$idx" ] && index_links "$idx" | while IFS= read -r f; do printf '%s/%s\n' "$dir" "$f"; done
		continue
	fi
	echo "== $dir"
	if [ -f "$idx" ]; then
		lines=$(wc -l <"$idx" | tr -d ' ')
		bytes=$(wc -c <"$idx" | tr -d ' ')
		echo "index: $lines lines ($((lines * 100 / CAP_LINES))% of $CAP_LINES), $bytes bytes ($((bytes * 100 / CAP_BYTES))% of $CAP_BYTES)"
	else
		echo "index: none"
	fi
	files=$(find "$dir" -maxdepth 1 -name '*.md' ! -name MEMORY.md | wc -l | tr -d ' ')
	echo "memory files: $files"
	if [ -f "$idx" ]; then
		for f in "$dir"/*.md; do
			b=$(basename "$f")
			[ "$b" = MEMORY.md ] && continue
			grep -qF "]($b)" "$idx" || echo "unindexed: $b"
		done
		index_links "$idx" | while IFS= read -r f; do
			[ -e "$dir/$f" ] || echo "index points at a missing file: $f"
		done
	fi
	if top=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null); then
		pending=$(git -C "$dir" status --porcelain -- . 2>/dev/null)
		if [ -n "$pending" ]; then
			echo "uncommitted in $top:"
			printf '%s\n' "$pending" | sed 's/^/  /'
		fi
	fi
done
