#!/usr/bin/env bash
# commit.sh -s <subject> -b <body> [--rm <path>]... [--staged <path>]... [<path>]...
#
# One memory change, one commit. Stages exactly the given paths in the git repo
# that holds the first path: plain paths with `git add`, --rm paths with
# `git rm`, --staged paths as already staged (by stage-index.sh). Refuses to
# commit if the staged set differs from the request, so another session's
# pending edits never ride along. Wraps the body at 72 columns.
set -euo pipefail
subject= body=
want=()
rms=()
adds=()
while [ $# -gt 0 ]; do
	case $1 in
	-s) subject=$2; shift 2 ;;
	-b) body=$2; shift 2 ;;
	--rm) rms+=("$2"); want+=("$2"); shift 2 ;;
	--staged) want+=("$2"); shift 2 ;;
	*) adds+=("$1"); want+=("$1"); shift ;;
	esac
done
[ -n "$subject" ] && [ ${#want[@]} -gt 0 ] || { sed -n '2p' "$0" >&2; exit 64; }
first=${want[0]}
probe=$(dirname -- "$first")
until [ -d "$probe" ]; do probe=$(dirname -- "$probe"); done
top=$(git -C "$probe" rev-parse --show-toplevel)
abs() { case $1 in /*) printf '%s\n' "$1" ;; *) printf '%s/%s\n' "$PWD" "$1" ;; esac; }
rel() { local a; a=$(abs "$1"); a=${a#"$(cd -- "$top" && pwd -P)"/}; printf '%s\n' "${a#"$top"/}"; }
for p in ${rms[@]+"${rms[@]}"}; do git -C "$top" rm -q -- "$(rel "$p")"; done
for p in ${adds[@]+"${adds[@]}"}; do git -C "$top" add -A -- "$(rel "$p")"; done
staged=$(git -C "$top" diff --cached --name-only --no-renames | sort)
expected=$(for p in "${want[@]}"; do rel "$p"; done | sort -u)
if [ "$staged" != "$expected" ]; then
	echo "staged set differs from the request; nothing committed" >&2
	diff <(printf '%s\n' "$expected") <(printf '%s\n' "$staged") >&2 || true
	exit 1
fi
msg=$(mktemp)
trap 'rm -f "$msg"' EXIT
{ printf '%s\n' "$subject"; [ -z "$body" ] || { printf '\n'; printf '%s\n' "$body" | fold -s -w 72 | sed 's/ *$//'; }; } >"$msg"
git -C "$top" commit -q -F "$msg"
git -C "$top" log -1 --format='%h %G? %s'
