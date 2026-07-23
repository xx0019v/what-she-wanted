#!/usr/bin/env bash
# Concept-preview render (offline, silent, 1920x1080) from the real page art +
# title/theme cards. Resumable: re-run until it prints "wrote ...". The full
# jury video that also captures the live 360° world → scripts/capture-video.mjs.
set -e
cd "$(dirname "$0")/.."
OUT=docs/video; CARDS=$OUT/cards
TMP="${WSW_TMP:-$HOME/wsw_vid}"; mkdir -p "$TMP" "$OUT"
FPS=30

# ordered manifest: "source|duration"
manifest=(
  "$CARDS/01_title.jpg|4"
  "$CARDS/02_shows.jpg|3"
  "public/pages/3.jpg|3.5"
  "docs/screenshots/representative-S04-into-the-forest.jpg|3.5"
  "$CARDS/03_reveals.jpg|3"
  "public/pages/5.jpg|3.5"
  "public/pages/6.jpg|3.5"
  "public/pages/7.jpg|3.5"
  "public/pages/8.jpg|3.5"
  "$CARDS/04_enter.jpg|3.5"
  "public/pages/11.jpg|3.5"
  "public/pages/12.jpg|3.5"
  "public/pages/14.jpg|3.5"
  "$CARDS/05_theme1.jpg|3"
  "$CARDS/06_theme2.jpg|3"
  "public/pages/15.jpg|3.5"
  "public/pages/16.jpg|3.5"
  "public/pages/17.jpg|3.5"
  "$CARDS/07_cycle.jpg|3"
  "$CARDS/08_end.jpg|4"
)

idx=0
for entry in "${manifest[@]}"; do
  src="${entry%%|*}"; d="${entry##*|}"
  out="$TMP/$(printf '%03d' $idx).mp4"
  if [ ! -f "$out" ]; then
    fo=$(awk "BEGIN{print $d-0.5}")
    ffmpeg -y -loglevel error -loop 1 -t "$d" -i "$src" \
      -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,format=yuv420p,fade=t=in:st=0:d=0.5,fade=t=out:st=${fo}:d=0.5" \
      -c:v libx264 -preset ultrafast -crf 30 -r $FPS "$out"
    echo "encoded $out"
  fi
  idx=$((idx+1))
done

# all clips present → concat
list="$TMP/list.txt"; : > "$list"
for ((k=0;k<${#manifest[@]};k++)); do printf "file '%03d.mp4'\n" $k >> "$list"; done
ffmpeg -y -loglevel error -f concat -safe 0 -i "$list" -c copy "$OUT/what-she-wanted-concept.mp4"
echo "wrote $OUT/what-she-wanted-concept.mp4"
