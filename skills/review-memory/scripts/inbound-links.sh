#!/usr/bin/env bash
# inbound-links.sh <memory file> <memory folder>...
#
# Lists every [[link]] to the given memory, by its `name:` or its file stem,
# in the given folders, as file:line: text. Exit 1 if there are none.
set -euo pipefail
[ $# -ge 2 ] || { echo "usage: inbound-links.sh <memory file> <memory folder>..." >&2; exit 64; }
target=$1
shift
stem=$(basename "$target" .md)
name=$(sed -n '2,/^---$/{s/^name: *//p;}' "$target" | sed 's/^"\(.*\)"$/\1/')
found=1
for dir in "$@"; do
	for f in "$dir"/*.md; do
		[ "$(cd -- "$(dirname "$f")" && pwd -P)/$(basename "$f")" = "$(cd -- "$(dirname "$target")" && pwd -P)/$(basename "$target")" ] && continue
		[ "$(basename "$f")" = MEMORY.md ] && continue
		if grep -nF -e "[[$stem]]" ${name:+-e "[[$name]]"} "$f" | sed "s|^|$f:|"; then
			found=0
		fi
	done
done
exit "$found"
