# Place `targets.mind` here

The compiled MindAR image-target file goes here as:

    public/targets/targets.mind

Compile it in ~1 minute with the official web tool (no install):
https://hiukim.github.io/mind-ar-js-doc/tools/compile

- Drag the page images from `public/pages/` in **numeric order 1 → 17**
  (the add-order becomes the recognition index; the app maps index 0 → page 1, etc.)
- Click **Start**, then **Download**, and save the result here as `targets.mind`.

When this file exists, the app enters camera-recognition mode automatically.
When it's absent, the app falls back to manual page selection (still fully usable).

See ../docs/CAMERA_TEST_TODAY.md for the full test runbook.
