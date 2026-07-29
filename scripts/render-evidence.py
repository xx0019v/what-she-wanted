#!/usr/bin/env python3
"""
Render evidence videos of the character rigs.

This is an OFFLINE render, not a screen capture: it composites the same rig parts
from `public/rig/` using the same pivots, the same phase timings from
`pageStories.ts` and the same performance curves as `src/story/rig.ts`, then
encodes the frames with ffmpeg. It exists so the motion can be checked frame by
frame — what the runtime does with these parts is verified separately in the
browser harness.

    python3 scripts/render-evidence.py
"""
import json
import math
import os
import subprocess
import sys
from PIL import Image

ROOT = os.getcwd()
OUT = os.path.join(ROOT, 'evidence')
TMP = os.path.join(OUT, '_frames')
os.makedirs(OUT, exist_ok=True)

PA = 1080 / 1920
W, H = 1920, 1080
FPS = 24

RIGS = json.load(open(os.path.join(ROOT, 'public', 'rig', 'rigs.json')))


def ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def phase(t, start, dur):
    return ease((t - start) / dur)


# ── the same performance maths as src/story/rig.ts ────────────────
def part_transform(name, t, lv, face=1):
    on = lv.get('presence', 0)
    br = lv.get('breathe', 0); ln = lv.get('lean', 0); sw = lv.get('sway', 0)
    stp = lv.get('step', 0); lk = lv.get('look', 0); rc = lv.get('reach', 0)
    dr = lv.get('drain', 0); con = lv.get('contract', 0)
    rec = lv.get('recede', 0); bec = lv.get('becoming', 0)

    breath = math.sin(t * 0.85) * 0.0022 * (0.35 + br)
    lean = ln * 0.06 * face
    forward = ln * 0.003 * face
    stride = math.sin(t * 1.05) * stp
    sag = dr * 0.035
    rs = 1 - rec * 0.28
    lift = rec * 0.022

    rot, dx, dy, sx, sy = 0.0, forward, breath + lift, rs, rs

    if name == 'hair':
        rot = lean * 1.15 + math.sin(t * 0.7) * 0.05 * (0.2 + sw) + lk * 0.10 * face - sag * 0.6
        dy = breath * 1.3 + lift
    elif name == 'body':
        rot = (lean - sag) * 0.6
        sy = rs * (1 + breath * 3.0 + br * 0.005)
    elif name == 'armL':
        rot = lean * 0.9 + math.sin(t * 0.6) * 0.03 * (0.2 + sw) - stride * 0.12
    elif name == 'armR':
        rot = lean * 0.9 - math.sin(t * 0.6) * 0.03 * (0.2 + sw) + stride * 0.12 - rc * 0.5 * face
    elif name == 'skirt':
        rot = lean * 0.7 + math.sin(t * 0.55 + 0.8) * 0.055 * (0.2 + sw) + stride * 0.06
        sx = rs * (1 + sw * 0.03 + ln * 0.015)
    elif name == 'robe':
        rot = lean * 0.3 + math.sin(t * 0.5 + 0.8) * 0.014 * (0.2 + sw)
        sx = rs * (1 + sw * 0.02 + rc * 0.02); sy = rs * (1 + sw * 0.012)
    elif name == 'cloak':
        rot = math.sin(t * 0.4 + 0.6) * 0.012 * (0.2 + sw) - bec * 0.02
        sx = rs * (1 + bec * 0.07 + sw * 0.015); sy = rs * (1 + bec * 0.035)
    elif name == 'hand':
        rot = -rc * 0.55
        dy = breath + rc * 0.055 + bec * 0.012 + lift
        dx = forward + rc * 0.03
    elif name == 'moon':
        sx = sy = (1 - con * 0.09) * (1 + math.sin(t * 0.35) * 0.008)
        dy = breath * 1.4
    elif name == 'legL':
        rot = stride * 0.30 + lean * 0.4
    elif name == 'legR':
        rot = -stride * 0.30 + lean * 0.4
    elif name == 'staff':
        rot = -rc * 0.10 * face + math.sin(t * 0.5) * 0.010
        dy = breath + rc * 0.012 + lift
    elif name == 'hat':
        rot = lean * 0.5 + lk * 0.05 * face
        dy = breath * 1.2 + lift

    dim = 1 - dr * 0.35 - rec * 0.25
    alpha = on * (1 - rec * 0.35)
    return rot, dx, dy, sx, sy, dim, alpha


def compose(page, actors, t, base):
    canvas = base.copy()
    layers = []
    for key, lv_fn, face in actors:
        meta = RIGS.get(key)
        if not meta:
            continue
        lv = lv_fn(t)
        for name, p in meta['parts'].items():
            layers.append((p['z'], name, p, lv, face))
    for _z, name, p, lv, face in sorted(layers, key=lambda x: x[0]):
        im = Image.open(os.path.join(ROOT, 'public', p['texture'])).convert('RGBA')
        rot, dx, dy, sx, sy, dim, alpha = part_transform(name, t, lv, face)
        if alpha <= 0.01:
            continue
        if abs(sx - 1) > 0.002 or abs(sy - 1) > 0.002:
            im = im.resize((max(1, int(im.width * sx)), max(1, int(im.height * sy))), Image.LANCZOS)
        if dim < 0.999 or alpha < 0.999:
            r, g, b, a = im.split()
            r = r.point(lambda v: int(v * dim)); g = g.point(lambda v: int(v * dim)); b = b.point(lambda v: int(v * dim))
            a = a.point(lambda v: int(v * alpha))
            im = Image.merge('RGBA', (r, g, b, a))
        pivx = (p['pivotX'] + 0.5) * W; pivy = (0.5 - p['pivotY'] / PA) * H
        px = (p['x'] + 0.5) * W;        py = (0.5 - p['y'] / PA) * H
        ox, oy = (px - pivx) * sx, (py - pivy) * sy
        c, s2 = math.cos(-rot), math.sin(-rot)
        nx, ny = ox * c - oy * s2, ox * s2 + oy * c
        fx = pivx + nx + dx * W
        fy = pivy + ny - dy / PA * H
        r = im.rotate(math.degrees(rot), resample=Image.BICUBIC, expand=True)
        canvas.alpha_composite(r, (int(fx - r.width / 2), int(fy - r.height / 2)))
    return canvas


# ── the timelines, taken from pageStories.ts ──────────────────────
def p17_girl(t):
    return {
        'presence': phase(t, 0, 3), 'breathe': phase(t, 0, 3), 'lean': phase(t, 0, 3),
        'step': phase(t, 0, 3), 'sway': phase(t, 7, 3), 'glow': phase(t, 0, 3),
        'drain': phase(t, 5, 4), 'recede': phase(t, 10, 3),
    }


def p17_witch(t):
    return {
        'presence': phase(t, 0, 3), 'breathe': phase(t, 0, 3), 'sway': phase(t, 7, 3),
        'reach': phase(t, 10, 3), 'glow': phase(t, 5, 4), 'becoming': phase(t, 5, 4),
    }


def p11_sky(t):
    return {
        'presence': phase(t, 0, 2), 'breathe': phase(t, 0, 2),
        'contract': phase(t, 6, 3), 'glow': phase(t, 2, 4),
    }


JOBS = [
    ('p17-transformation', 17, [('17-girl', p17_girl, 1), ('17-witch', p17_witch, 1)], 14),
    ('p11-moon', 11, [('11-sky', p11_sky, 1)], 11),
    ('p04-she-steps', 4, [('4-girl', lambda t: {
        'presence': phase(t, 0.9, 1.6), 'breathe': phase(t, 0.9, 1.6),
        'sway': phase(t, 2.4, 2.2), 'lean': phase(t, 6.6, 2.6),
        'step': phase(t, 6.6, 2.6), 'glow': phase(t, 7.4, 2.6), 'look': phase(t, 8.6, 1.8),
    }, 1)], 12),
    ('p05-the-bargain', 5, [
        ('5-girl', lambda t: {
            'presence': phase(t, 0.8, 1.6), 'breathe': phase(t, 0.8, 1.6),
            'lean': phase(t, 3.0, 1.8), 'sway': phase(t, 2.2, 2.2),
            'glow': phase(t, 3.0, 1.8), 'drain': phase(t, 5.4, 3.4),
        }, 1),
        ('5-witch', lambda t: {
            'presence': phase(t, 1.6, 1.8), 'breathe': phase(t, 1.6, 1.8),
            'sway': phase(t, 2.2, 2.2), 'reach': phase(t, 4.2, 2.2), 'glow': phase(t, 4.2, 2.2),
        }, -1),
    ], 12),
]


def main():
    for name, page, actors, dur in JOBS:
        base = Image.open(os.path.join(ROOT, 'public', 'pages', f'{page}.jpg')).convert('RGBA')
        frames = os.path.join(TMP, name)
        os.makedirs(frames, exist_ok=True)
        n = int(dur * FPS)
        for i in range(n):
            t = i / FPS
            img = compose(page, actors, t, base)
            img.convert('RGB').resize((1280, 720), Image.LANCZOS).save(
                os.path.join(frames, f'{i:04d}.jpg'), quality=88)
            if i % 24 == 0:
                print(f'  {name}: {i}/{n}', flush=True)
        out = os.path.join(OUT, f'{name}.mp4')
        subprocess.run([
            'ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS),
            '-i', os.path.join(frames, '%04d.jpg'),
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', out,
        ], check=True)
        size = os.path.getsize(out) / 1024
        print(f'✓ {out}  ({size:.0f} KB, {dur}s)')


if __name__ == '__main__':
    sys.exit(main())
