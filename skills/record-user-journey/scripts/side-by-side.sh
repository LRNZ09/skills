#!/usr/bin/env bash
# Compose two recordings of the same journey into one before/after comparison, plus a
# markdown summary of what changed.
#
#   side-by-side.sh <before.mp4> <after.mp4> <out-dir> <TICKET> [before-label] [after-label] [paneW]
#
# Writes, all into <out-dir>:
#   <TICKET>-before-after-side-by-side.mp4   the two runs side by side, aligned on captions
#   <TICKET>-before-after.md                 summary + a table of every differing fact
#
# paneW defaults to `native`: the panes keep the resolution they were captured at, so a
# 1920x1080 TV capture composes to 3844x1080. Downscaling to fit some other target throws
# away half the detail of a capture that was verified pixel-exact -- pass an explicit width
# only when something downstream needs a smaller file.
#
# The markdown is generated from <TICKET>-before-facts.json / <TICKET>-after-facts.json (the
# driver's journey.json for each run, renamed to the standard). Put those in <out-dir> first
# and the table writes itself; skip them and only the video is produced. Those files also
# carry the caption timeline the alignment needs.
#
# The labels are floating badges in each pane's top-left corner, over the video rather than
# in a header bar above it: a bar steals height from both panes and pushes the app's own
# top-of-screen UI (where a search field or a caption usually lives) away from the frame
# edge it was designed against. The badge sits in a corner the app leaves empty.
set -euo pipefail

before_file=${1:?usage: side-by-side.sh <before.mp4> <after.mp4> <out-dir> <TICKET> [before-label] [after-label] [paneW]}
after_file=${2:?missing after.mp4}
out_dir=${3:?missing out-dir}
ticket=${4:?missing TICKET}
before_label=${5:-BEFORE}
after_label=${6:-AFTER}
pane_w=${7:-native}

# Pastel red for the old behaviour, pastel green for the new one: the colour carries
# "bad/good" so a viewer reads the panes correctly before parsing a word. The ink is a deep
# tint of the same hue, not white -- white on either pastel measures under 2:1 and is simply
# unreadable, while these land at 7.1:1 and 7.3:1.
BEFORE_FILL='#F2A6A6'; BEFORE_INK='#5A1111'
AFTER_FILL='#A8DCB0';  AFTER_INK='#14431F'
SEPARATOR='#0D0616'
# Badge geometry, measured against a 1280-wide pane and scaled to whatever the pane is.
REF_W=1280; BADGE_X=17; BADGE_Y=20; BADGE_H=50; BADGE_PT=30; BADGE_PAD=26

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
command -v ffmpeg >/dev/null || { echo "ERROR: ffmpeg not found" >&2; exit 1; }
command -v magick >/dev/null || { echo "ERROR: ImageMagick (magick) not found -- needed for the badges, because most ffmpeg builds ship without libfreetype and so have no drawtext filter" >&2; exit 1; }

font=""
for candidate in \
  "/System/Library/Fonts/Supplemental/Arial Bold.ttf" \
  "/System/Library/Fonts/Supplemental/Arial.ttf" \
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" \
  "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf"; do
  [ -f "$candidate" ] && { font=$candidate; break; }
done
[ -n "$font" ] || { echo "ERROR: no bold TrueType font found; pass one by editing \$font" >&2; exit 1; }

mkdir -p "$out_dir"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

probe() { ffprobe -v error -select_streams v:0 -show_entries "stream=$2" -of csv=p=0 "$1"; }
before_dur=$(probe "$before_file" duration)
after_dur=$(probe "$after_file" duration)
src_w=$(probe "$before_file" width)

if [ "$pane_w" = "native" ]; then eff_w=$src_w; else eff_w=$pane_w; fi
f=$(awk -v a="$eff_w" -v b="$REF_W" 'BEGIN { printf "%.6f", a / b }')
sc() { awk -v v="$1" -v f="$f" 'BEGIN { printf "%d", (v * f) + 0.5 }'; }
bx=$(sc $BADGE_X); by=$(sc $BADGE_Y); bh=$(sc $BADGE_H); bpt=$(sc $BADGE_PT); bpad=$(sc $BADGE_PAD)

badge() {  # badge <text> <fill> <ink> <out.png>
  local text=$1 fill=$2 ink=$3 out=$4 tw bw
  # Size the pill to the text rather than guessing a width, so a longer label than BEFORE
  # or AFTER still gets even padding instead of clipping.
  tw=$(magick -font "$font" -pointsize "$bpt" label:"$text" -format '%w' info:)
  bw=$(( tw + 2 * bpad ))
  magick -size "${bw}x${bh}" xc:none \
    -fill "$fill" -draw "roundrectangle 0,0,$((bw - 1)),$((bh - 1)),$(sc 8),$(sc 8)" \
    -font "$font" -pointsize "$bpt" -fill "$ink" -gravity center -annotate +0+0 "$text" \
    "$out"
}
badge "$before_label" "$BEFORE_FILL" "$BEFORE_INK" "$work/b.png"
badge "$after_label"  "$AFTER_FILL"  "$AFTER_INK"  "$work/a.png"

before_facts="$out_dir/${ticket}-before-facts.json"
after_facts="$out_dir/${ticket}-after-facts.json"
filter_out=$("$here/build-stack-filter.mjs" "$before_facts" "$after_facts" \
  "$before_dur" "$after_dur" "$pane_w" "$bx" "$by" "$SEPARATOR")
filter=$(printf '%s\n' "$filter_out" | sed -n '1p')

out="$out_dir/${ticket}-before-after-side-by-side.mp4"
ffmpeg -v error -y -i "$before_file" -i "$after_file" -i "$work/b.png" -i "$work/a.png" \
  -filter_complex "$filter" -map "[out]" \
  -c:v libx264 -preset slow -crf 20 -fps_mode cfr -r 30 -movflags +faststart "$out"

ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,avg_frame_rate,sample_aspect_ratio,pix_fmt,duration \
  -of default=nw=1 "$out" | sed 's/^/  /'
echo "wrote $out"

# --- markdown summary -------------------------------------------------------
if [ -f "$before_facts" ] && [ -f "$after_facts" ]; then
  md="$out_dir/${ticket}-before-after.md"
  journey_name=$(jq -r '.journey // "journey"' "$before_facts")
  {
    printf '# %s before / after\n\n' "$ticket"
    printf '%s, recorded twice against the same journey and the same fixture data.\n' "$journey_name"
    printf 'Left pane %s, right pane %s.\n\n' "$before_label" "$after_label"
    printf -- '- Video: `%s-before-after-side-by-side.mp4`\n' "$ticket"
    printf -- '- Single runs: `%s-before.mp4`, `%s-after.mp4`\n' "$ticket" "$ticket"
    printf -- '- The panes are cut at each caption and the shorter side of every beat is padded, so both are always showing the same step.\n'
    printf -- '- Every number below was read out of the live page during the run, not measured afterwards.\n\n'
    printf '## What changed\n\n'
    printf '| measurement | %s | %s |\n| --- | --- | --- |\n' "$before_label" "$after_label"
    # Facts are stored as JSON-encoded strings by the driver. Flatten each into
    # fact.field rows and emit only the fields whose value actually moved: a table of
    # rows that all say "same" hides the two or three that matter.
    jq -rn --slurpfile b "$before_facts" --slurpfile a "$after_facts" '
      def facts: (.facts // {}) | with_entries(select(.key | IN("probe","summary","viewportVerification") | not));
      def flat: to_entries | map(
          (.key) as $k | (.value) as $v |
          ($v | if type == "string" then (try fromjson catch null) else null end) as $parsed |
          if ($parsed | type) == "object"
          then ($parsed | to_entries | map({ k: ($k + "." + .key), leaf: .key, v: (.value | tostring) }))
          else [{ k: $k, leaf: $k, v: ($v | tostring) }] end
        ) | add // [];
      ($b[0].summaryExclude // []) as $ex |
      ($b[0] | facts | flat) as $bf | ($a[0] | facts | flat) as $af |
      ($bf | map(.k)) as $keys |
      ($keys | map(. as $k
        | ($bf[] | select(.k == $k)) as $row
        | (([$af[] | select(.k == $k) | .v] | first) // "n/a") as $av
        | select($row.v != $av)
        | { k: $k, leaf: $row.leaf, before: $row.v, after: $av })) as $changed |
      ($changed | map(select((.leaf | IN($ex[])) or (.k | IN($ex[])) | not))) as $shown |
      ($changed | length - ($shown | length)) as $hidden |
      ($shown | map("| `\(.k)` | \(.before) | \(.after) |") | .[]),
      (if $hidden > 0 then "\n_\($hidden) further measurement\(if $hidden == 1 then "" else "s" end) moved but are left out as implementation detail (\($ex | join(", "))); every value is in the facts files._" else empty end)
    '
    printf '\nRows whose value is identical on both sides are omitted.\n'
  } > "$md"
  echo "wrote $md"
else
  echo "note: no ${ticket}-before-facts.json / -after-facts.json in $out_dir, so no markdown summary was written"
fi
