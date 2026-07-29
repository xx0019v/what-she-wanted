#!/usr/bin/env python3
"""
Build 2.5-D character rigs from the ORIGINAL page artwork.

This does not draw a silhouette over the printed figure and it does not settle
for "light and shadow only". It cuts the painted figure out of the page, splits
it into rig parts (hair / body / skirt / legs), and produces:

  parts/<page>-<char>-<part>.webp   the actual painted pixels, feathered
  patch/<page>-<char>.webp          the figure's place, filled in from the
                                    surrounding art, so the animated parts can
                                    move without the printed original showing
                                    through underneath
  <page>-<char>.json                rig metadata: part rects + pivots, in
                                    anchor space, ready for Three.js

Part outlines are authored polygons (read off the artwork) rather than a guessed
automatic segmentation: it is the same thing a 2.5-D artist does by hand, and it
is reproducible because the coordinates live here in the source.

    python3 scripts/build-character-rig.py
"""
import json
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = os.getcwd()
OUT_PARTS = os.path.join(ROOT, 'public', 'rig', 'parts')
OUT_PATCH = os.path.join(ROOT, 'public', 'rig', 'patch')
OUT_META = os.path.join(ROOT, 'public', 'rig')
SRC_META = os.path.join(ROOT, 'assets', 'rig')
for d in (OUT_PARTS, OUT_PATCH, OUT_META, SRC_META):
    os.makedirs(d, exist_ok=True)

PAGE_ASPECT = 1080 / 1920

# ── rig definitions ───────────────────────────────────────────────
# Polygons are in FULL-IMAGE pixel coordinates of the 1920×1080 page art.
# `pivot` is the point the part rotates about (also full-image px).
# `z` orders the parts front-to-back within the character.

RIGS = {
    # ── page 4: the girl walking into the forest, seen from behind ──
    ('4', 'girl'): {
        'page_size': (1920, 1080),
        'parts': {
            'skirt': {
                'poly': [(920, 700), (975, 700), (1000, 795), (992, 818),
                         (947, 828), (902, 818), (895, 795)],
                'pivot': (947, 706), 'z': 0.000,
            },
            'legL': {
                'poly': [(929, 806), (947, 806), (949, 905), (936, 913), (925, 905)],
                'pivot': (938, 812), 'z': -0.002,
            },
            'legR': {
                'poly': [(950, 806), (968, 806), (966, 905), (955, 913), (944, 905)],
                'pivot': (957, 812), 'z': -0.002,
            },
            'body': {
                'poly': [(910, 638), (985, 638), (997, 668), (992, 712),
                         (975, 706), (920, 706), (901, 712), (896, 668)],
                'pivot': (947, 706), 'z': 0.002,
            },
            'armL': {
                'poly': [(896, 650), (912, 654), (906, 760), (893, 762), (888, 700)],
                'pivot': (902, 656), 'z': 0.004,
            },
            'armR': {
                'poly': [(983, 654), (999, 650), (1006, 700), (1001, 762), (988, 760)],
                'pivot': (992, 656), 'z': 0.004,
            },
            'hair': {
                'poly': [(910, 560), (984, 560), (992, 600), (986, 634),
                         (947, 642), (908, 634), (902, 600)],
                'pivot': (947, 636), 'z': 0.006,
            },
        },
        # the whole figure's footprint, used for the patch
        'figure_poly': [(888, 552), (1006, 552), (1012, 700), (1004, 830),
                        (975, 920), (920, 920), (890, 830), (882, 700)],
    },

    # ── page 5: the girl (left) facing the witch (right) ──
    # Coordinates measured off the artwork (1:1 crops), not estimated. The first
    # pass here was guessed and produced cut-outs of empty sky and ground, which
    # rendered as dark cards floating on the page.
    ('5', 'girl'): {
        'page_size': (1920, 1080),
        'parts': {
            'skirt': {
                'poly': [(797, 730), (842, 730), (872, 826), (860, 838),
                         (820, 842), (782, 836), (775, 824)],
                'pivot': (820, 734), 'z': 0.000,
            },
            'legL': {
                'poly': [(802, 828), (820, 828), (821, 928), (810, 936), (799, 928)],
                'pivot': (811, 832), 'z': -0.002,
            },
            'legR': {
                'poly': [(824, 828), (846, 828), (845, 928), (833, 936), (822, 928)],
                'pivot': (835, 832), 'z': -0.002,
            },
            'body': {
                'poly': [(793, 684), (848, 684), (858, 706), (854, 738),
                         (842, 732), (798, 732), (785, 738), (781, 706)],
                'pivot': (820, 734), 'z': 0.002,
            },
            'hair': {
                'poly': [(790, 620), (842, 620), (848, 646), (843, 674),
                         (816, 682), (789, 674), (784, 646)],
                'pivot': (816, 676), 'z': 0.006,
            },
        },
        'figure_poly': [(772, 612), (858, 612), (866, 700), (878, 830),
                        (852, 944), (798, 944), (770, 830), (766, 700)],
    },
    ('5', 'witch'): {
        'page_size': (1920, 1080),
        'parts': {
            # the cloak: the biggest, most legible thing she has, and the part the
            # magic can move
            'robe': {
                'poly': [(1160, 452), (1300, 452), (1352, 640), (1400, 830),
                         (1414, 902), (1330, 912), (1206, 900), (1152, 800),
                         (1140, 640)],
                'pivot': (1230, 468), 'z': -0.002,
            },
            'hair': {
                'poly': [(1178, 356), (1312, 356), (1320, 430), (1300, 506),
                         (1240, 516), (1184, 500), (1172, 430)],
                'pivot': (1245, 372), 'z': 0.004,
            },
            'hat': {
                'poly': [(1216, 302), (1240, 302), (1300, 344), (1328, 372),
                         (1250, 382), (1160, 378), (1132, 356), (1192, 320)],
                'pivot': (1230, 376), 'z': 0.008,
            },
            # a narrow quad hugging the staff so the key has a chance at it
            'staff': {
                'poly': [(1084, 312), (1100, 310), (1180, 892), (1164, 896)],
                'pivot': (1130, 572), 'z': 0.006,
            },
        },
        'figure_poly': [(1078, 296), (1336, 296), (1360, 520), (1420, 830),
                        (1424, 916), (1300, 924), (1160, 906), (1120, 700),
                        (1074, 400)],
    },
    # ── page 11: this page has NO figures. Its subjects are the moon and the
    # violet cloud banks, so those are what get decomposed and performed.
    ('11', 'sky'): {
        'page_size': (1920, 1080),
        'parts': {
            'cloudL': {
                'poly': [(0, 300), (120, 268), (250, 286), (330, 330), (360, 420),
                         (300, 520), (140, 560), (0, 545)],
                'pivot': (170, 420), 'z': 0.004,
            },
            'cloudR': {
                'poly': [(1240, 560), (1400, 520), (1600, 530), (1780, 500),
                         (1919, 520), (1919, 720), (1600, 760), (1300, 720)],
                'pivot': (1580, 620), 'z': 0.006,
            },
            'cloudFront': {
                'poly': [(700, 700), (900, 650), (1150, 660), (1400, 700),
                         (1620, 760), (1919, 800), (1919, 1079), (500, 1079), (420, 860)],
                'pivot': (1100, 860), 'z': 0.010,
            },
            'moon': {
                'poly': [(1233, 392), (1227, 449), (1207, 504), (1177, 553), (1136, 594), (1087, 624), (1032, 644), (975, 650), (918, 644), (863, 624), (814, 594), (773, 553), (743, 504), (723, 449), (717, 392), (723, 335), (743, 280), (773, 231), (814, 190), (863, 160), (918, 140), (975, 134), (1032, 140), (1087, 160), (1136, 190), (1177, 231), (1207, 280), (1227, 335)],
                'pivot': (975, 392), 'z': 0.002, 'exact': True,
            },
        },
        'figure_poly': [(0, 260), (1919, 260), (1919, 1079), (0, 1079)],
    },

    # ── page 17: the departing girl (far, small) and the one who stays ──
    ('17', 'girl'): {
        'page_size': (1920, 1080),
        'parts': {
            'legL': {
                'poly': [(950, 826), (962, 826), (962, 868), (951, 872), (946, 866)],
                'pivot': (955, 830), 'z': -0.002,
            },
            'legR': {
                'poly': [(963, 826), (976, 826), (978, 866), (968, 872), (962, 868)],
                'pivot': (969, 830), 'z': -0.002,
            },
            'body': {
                'poly': [(944, 750), (980, 750), (986, 790), (984, 828),
                         (938, 828), (936, 790)],
                'pivot': (961, 826), 'z': 0.002,
            },
            'hair': {
                'poly': [(948, 716), (978, 716), (982, 734), (978, 752),
                         (962, 757), (947, 752), (944, 734)],
                'pivot': (962, 754), 'z': 0.006,
            },
        },
        'figure_poly': [(930, 708), (992, 708), (996, 790), (992, 836),
                        (982, 878), (944, 878), (930, 836), (928, 790)],
    },
    ('17', 'witch'): {
        'page_size': (1920, 1080),
        'parts': {
            'cloak': {
                'poly': [(452, 492), (540, 492), (566, 600), (578, 740),
                         (576, 880), (560, 946), (446, 950), (420, 880),
                         (426, 740), (438, 600)],
                'pivot': (496, 500), 'z': -0.002,
            },
            'hair': {
                'poly': [(478, 424), (546, 424), (554, 470), (548, 540),
                         (516, 578), (480, 566), (470, 490)],
                'pivot': (512, 440), 'z': 0.006,
            },
            'hand': {
                'poly': [(556, 664), (582, 664), (584, 700), (572, 712), (556, 704)],
                'pivot': (566, 668), 'z': 0.008,
            },
        },
        'figure_poly': [(410, 412), (566, 412), (592, 600), (592, 880),
                        (570, 962), (436, 962), (408, 880), (404, 600)],
    },
}


def polygon_mask(size, poly, feather=2.5):
    """A soft-edged mask for one authored outline."""
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    if feather > 0:
        m = m.filter(ImageFilter.GaussianBlur(feather))
    return m


def inpaint(rgb, hole_mask, iterations=6):
    """
    Fill the figure's footprint from the surrounding artwork so the printed figure
    can be covered and replaced by the moving parts.

    These pages are built from horizontal bands — ground, mist, treeline — so the
    fill is done PER ROW, interpolating across the hole between the nearest known
    pixel on the left and on the right. That continues each band across the gap
    instead of averaging the whole neighbourhood into a bright smear. A short
    relaxation afterwards softens the seams.
    """
    arr = np.asarray(rgb).astype(np.float32)
    hole = (np.asarray(hole_mask).astype(np.float32) / 255.0) > 0.35
    filled = arr.copy()
    H, W, _ = arr.shape

    for y in range(H):
        row_hole = hole[y]
        if not row_hole.any():
            continue
        known = np.where(~row_hole)[0]
        if known.size < 2:
            continue
        for c in range(3):
            filled[y, row_hole, c] = np.interp(np.where(row_hole)[0], known, arr[y, known, c])

    # A SHORT, small-kernel relaxation only. A tall kernel iterated many times
    # drags the bright mist from the top of the frame down over the dark ground
    # and produces a glowing pillar — which is exactly what happened first.
    hole_f = hole.astype(np.float32)
    for _ in range(iterations):
        for c in range(3):
            sm = ndimage.uniform_filter(filled[:, :, c], size=(3, 3))
            filled[:, :, c] = arr[:, :, c] * (1 - hole_f) + sm * hole_f

    # Match the fill's brightness to a RING of real background just outside the
    # hole. Row interpolation spans the figure between whatever sits left and
    # right of her, which on these pages is bright mist — so the raw fill came
    # out lighter than the ground it replaces and read as a glowing column the
    # moment she moved off it. Correcting per row band fixes that at the source.
    ring = ndimage.binary_dilation(hole, iterations=14) & ~hole
    band = 24
    for y0 in range(0, H, band):
        y1 = min(H, y0 + band)
        hsel = hole[y0:y1]
        rsel = ring[y0:y1]
        if not hsel.any() or rsel.sum() < 40:
            continue
        for c in range(3):
            ref = float(np.median(arr[y0:y1, :, c][rsel]))
            cur = float(np.median(filled[y0:y1, :, c][hsel]))
            if cur > 1e-3:
                sub = filled[y0:y1, :, c]
                sub[hsel] = np.clip(sub[hsel] * (ref / cur), 0, 255)

    # the artwork is grainy; a flat fill reads as a smudge, so put the grain back
    rng = np.random.default_rng(7)
    grain = rng.normal(0, 2.2, size=arr.shape[:2])[:, :, None]
    filled = filled + grain * hole_f[:, :, None]
    return Image.fromarray(np.clip(filled, 0, 255).astype(np.uint8))


def refine_to_figure(rgb, poly, size, feather=1.6):
    """
    Tighten an authored outline onto the figure it contains.

    An authored polygon inevitably swallows some background, and the moment the
    part rotates that swallowed background travels with it and reads as a dark
    rectangle sliding over the page. So inside the polygon we keep only pixels
    that differ from the background — modelled from a ring just outside the
    outline — and drop the rest. This is what makes a rotated limb look like a
    limb instead of a card.
    """
    W, H = size
    poly_hard = Image.new('L', size, 0)
    ImageDraw.Draw(poly_hard).polygon(poly, fill=255)
    inside = np.asarray(poly_hard) > 127
    if not inside.any():
        return poly_hard

    ring = ndimage.binary_dilation(inside, iterations=10) & ~ndimage.binary_erosion(inside, iterations=1)
    arr = np.asarray(rgb).astype(np.float32)
    if ring.sum() < 30:
        return poly_hard.filter(ImageFilter.GaussianBlur(feather))

    bg = arr[ring]
    mu = bg.mean(axis=0)
    sd = bg.std(axis=0) + 6.0

    # distance from the background colour, in units of its own spread
    d = np.sqrt((((arr - mu) / sd) ** 2).sum(axis=2))
    # soft key: fully background below lo, fully figure above hi
    lo, hi = 0.55, 1.5
    alpha = np.clip((d - lo) / (hi - lo), 0, 1)
    alpha = np.where(inside, alpha, 0.0)

    # clean up speckle, close pinholes inside the body
    solid = alpha > 0.45
    solid = ndimage.binary_closing(solid, iterations=3)
    solid = ndimage.binary_opening(solid, iterations=1)
    lbl, n = ndimage.label(solid)
    if n > 1:  # keep only the largest blob — the limb itself
        sizes = ndimage.sum(solid, lbl, range(1, n + 1))
        solid = lbl == (int(np.argmax(sizes)) + 1)
    solid = ndimage.binary_fill_holes(solid)

    # When the key cannot separate the part — a dark staff against dark forest,
    # a thin pale leg against pale ground — DROP THE PART rather than falling
    # back to its outline. The outline carries the background inside it, and that
    # background renders as a dark rectangle sitting on the page: far worse than
    # simply leaving those pixels printed and still. Losing one limb's motion is
    # cheaper than putting a visible card on the artwork.
    if solid.sum() < inside.sum() * 0.30:
        return None

    alpha = np.maximum(alpha * solid, solid * 0.85)
    out = Image.fromarray((np.clip(alpha, 0, 1) * 255).astype(np.uint8))
    return out.filter(ImageFilter.GaussianBlur(feather))


def to_anchor(x, y, W, H):
    """Full-image pixels → MindAR anchor space (page width 1, +y up)."""
    return ((x / W) - 0.5, (0.5 - (y / H)) * PAGE_ASPECT)


def build(page, char, spec):
    src = Image.open(os.path.join(ROOT, 'public', 'pages', f'{page}.jpg')).convert('RGB')
    W, H = src.size
    assert (W, H) == spec['page_size'], f'{page}: expected {spec["page_size"]}, got {(W, H)}'

    meta = {'page': int(page), 'character': char, 'pageAspect': PAGE_ASPECT, 'parts': {}}

    # ── parts: the real painted pixels, cut to each outline ──
    for name, p in spec['parts'].items():
        # `exact` parts are already precise geometry (the moon is a circle), so
        # keying them only punches holes where the paint happens to match the
        # sky — use the outline as authored.
        mask = (polygon_mask((W, H), p['poly'], feather=2.0) if p.get('exact')
                else refine_to_figure(src, p['poly'], (W, H)))
        if mask is None:
            print(f'  - {name}: dropped (cannot be separated from its background)')
            continue
        bbox = mask.getbbox()
        if bbox is None:
            print(f'  - {name}: empty mask'); continue
        pad = 8
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad),
                min(W, bbox[2] + pad), min(H, bbox[3] + pad))
        part = Image.new('RGBA', (bbox[2] - bbox[0], bbox[3] - bbox[1]))
        part.paste(src.crop(bbox), (0, 0))
        part.putalpha(mask.crop(bbox))
        out = os.path.join(OUT_PARTS, f'{page}-{char}-{name}.webp')
        # LOSSLESS: lossy WebP degrades the alpha channel and leaves a visible
        # rectangular halo around the cut-out. These files are small.
        part.save(out, 'WEBP', lossless=True, method=5)

        # geometry in anchor space
        x0, y0 = to_anchor(bbox[0], bbox[1], W, H)
        x1, y1 = to_anchor(bbox[2], bbox[3], W, H)
        px, py = to_anchor(*p['pivot'], W, H)
        meta['parts'][name] = {
            'texture': f'rig/parts/{page}-{char}-{name}.webp',
            'x': (x0 + x1) / 2, 'y': (y0 + y1) / 2,
            'w': abs(x1 - x0), 'h': abs(y0 - y1),
            'pivotX': px, 'pivotY': py,
            'z': p['z'],
        }
        print(f'  {name}: {part.size[0]}×{part.size[1]}px')

    # ── patch: the figure's place, filled from the surrounding art ──
    # The patch is shaped from the UNION OF THE PARTS, not a coarse blob around
    # the figure: at rest the parts cover it exactly, so none of the fill shows,
    # and when they move only a sliver is exposed. A blob-shaped patch left a
    # faintly brighter rectangle hanging around her, which is worse than useless.
    union = Image.new('L', (W, H), 0)
    ud = ImageDraw.Draw(union)
    for _p in spec['parts'].values():
        ud.polygon(_p['poly'], fill=255)
    # HOLE: generously dilated + hard, so the figure's soft painted edges are
    # inside it and cannot be smeared across the gap by the row fill
    hole = union
    for _ in range(4):
        hole = hole.filter(ImageFilter.MaxFilter(9))
    hole = hole.point(lambda v: 255 if v > 40 else 0)
    patched = inpaint(src, hole)
    # ALPHA: EXACTLY her silhouette, barely feathered. Dilating this was the
    # mistake — it wrapped a ~20px ring of fill around her, and because the fill
    # is lighter than the treeline behind her head it read as a bright rectangle
    # hanging in the air. Kept tight, the parts cover the fill completely at rest
    # and the edge of the fill always falls inside her own printed outline.
    fig_mask = union.filter(ImageFilter.GaussianBlur(2.0))
    bbox = hole.getbbox()
    pad = 14
    bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad),
            min(W, bbox[2] + pad), min(H, bbox[3] + pad))
    patch = Image.new('RGBA', (bbox[2] - bbox[0], bbox[3] - bbox[1]))
    patch.paste(patched.crop(bbox), (0, 0))
    # feather the patch's own edge so it blends into the printed page
    edge = polygon_mask((W, H), spec['figure_poly'], feather=10.0).crop(bbox)
    patch.putalpha(edge)
    patch.save(os.path.join(OUT_PATCH, f'{page}-{char}.webp'), 'WEBP', lossless=True, method=5)
    x0, y0 = to_anchor(bbox[0], bbox[1], W, H)
    x1, y1 = to_anchor(bbox[2], bbox[3], W, H)
    meta['patch'] = {
        'texture': f'rig/patch/{page}-{char}.webp',
        'x': (x0 + x1) / 2, 'y': (y0 + y1) / 2,
        'w': abs(x1 - x0), 'h': abs(y0 - y1),
    }
    print(f'  patch: {patch.size[0]}×{patch.size[1]}px')
    return meta


def main():
    all_meta = {}
    for (page, char), spec in RIGS.items():
        print(f'{page} / {char}')
        all_meta[f'{page}-{char}'] = build(page, char, spec)
    out = os.path.join(OUT_META, 'rigs.json')
    with open(out, 'w') as f:
        json.dump(all_meta, f, indent=1)
    # keep an authoring copy of the outlines next to the generated assets
    with open(os.path.join(SRC_META, 'rig-outlines.json'), 'w') as f:
        json.dump({f'{p}-{c}': s for (p, c), s in RIGS.items()}, f, indent=1)
    print('\nwrote', out)


if __name__ == '__main__':
    main()
