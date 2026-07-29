# Evidence

Offline renders of the character rigs, produced by `scripts/render-evidence.py`.

They composite the same parts from `public/rig/`, on the same pivots, with the
same phase timings from `pageStories.ts` and the same performance curves as
`src/story/rig.ts`. They are **not** screen captures — what the live runtime does
with these parts is verified separately in `?view=storytest`.

| file | page | what to watch |
|---|---|---|
| `p04-she-steps.mp4` | 4 | she leans from the waist and her legs swing from the hip; peak motion at 9.2 s, the step |
| `p05-the-bargain.mp4` | 5 | the witch's staff lifts, the girl dims as her memory leaves; peak at 7.1 s, the taking |
| `p11-moon.mp4` | 11 | the painted moon draws inward before it releases; peak at 6.5 s, the contraction |
| `p17-transformation.mp4` | 17 | the girl recedes toward the vanishing point while the cloak reshapes and the hand rises; peak at 10.8 s |

Frame-difference check (mean |Δ| per frame, greyscale):

```
p04-she-steps        288 frames   0.031/frame   peak 0.085 @ f222 (9.2s)
p05-the-bargain      288 frames   0.061/frame   peak 0.200 @ f170 (7.1s)
p17-transformation   336 frames   0.029/frame   peak 0.111 @ f260 (10.8s)
p11-moon             264 frames   0.129/frame   peak 0.426 @ f156 (6.5s)
```
