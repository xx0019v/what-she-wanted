#!/usr/bin/env python3
# Generate the physical AR test kit: one A4 print per target page (ratio kept,
# no crop, no recolour) + a one-sheet guide with QR and a record grid.
#   python3 scripts/make-print-kit.py
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.getcwd()
OUT = [os.path.join(ROOT, 'print'), os.path.join(ROOT, 'public', 'print')]
for d in OUT:
    os.makedirs(d, exist_ok=True)

URL = 'https://xx0019v.github.io/what-she-wanted/'
DPI = 300
A4_L = (3508, 2480)   # landscape px @300dpi
A4_P = (2480, 3508)   # portrait
BG = (5, 7, 13)
INK = (232, 240, 251)
MUTE = (150, 175, 210)

PAGES = [
    (4,  'PAGE 04', 'Into the Forest',   'page-04-forest-a4'),
    (5,  'PAGE 05', 'First Meeting',     'page-05-witch-meeting-a4'),
    (11, 'PAGE 11', 'Violet Moon',       'page-11-violet-moon-a4'),
    (17, 'PAGE 17', 'The Cycle',         'page-17-cycle-a4'),
]

def font(sz, bold=False):
    for p in (
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
    ):
        try:
            return ImageFont.truetype(p, sz)
        except Exception:
            continue
    return ImageFont.load_default()

def save_pdf(img, name, png=False):
    for d in OUT:
        img.convert('RGB').save(os.path.join(d, name + '.pdf'), 'PDF', resolution=DPI)
        if png:
            img.convert('RGB').save(os.path.join(d, name + '.png'))

# ── per-page prints ────────────────────────────────────────────────
MARGIN = 110
for num, code, title, fname in PAGES:
    src = Image.open(os.path.join(ROOT, 'public', 'pages', f'{num}.jpg')).convert('RGB')
    canvas = Image.new('RGB', A4_L, BG)
    maxw = A4_L[0] - MARGIN * 2
    maxh = A4_L[1] - MARGIN * 2 - 70
    scale = min(maxw / src.width, maxh / src.height)
    w, h = int(src.width * scale), int(src.height * scale)
    img = src.resize((w, h), Image.LANCZOS)
    x = (A4_L[0] - w) // 2
    y = (A4_L[1] - h) // 2 - 24
    canvas.paste(img, (x, y))
    d = ImageDraw.Draw(canvas)
    label = f'{code}   ·   {title}'
    d.text((A4_L[0] // 2, y + h + 40), label, font=font(38), fill=MUTE, anchor='mm')
    save_pdf(canvas, fname, png=True)
    print(f'wrote {fname}.pdf/.png ({w}x{h})')

# ── guide sheet ────────────────────────────────────────────────────
g = Image.new('RGB', A4_P, BG)
d = ImageDraw.Draw(g)
M = 150
d.text((M, 150), 'WHAT SHE WANTED', font=font(84, True), fill=INK)
d.text((M, 260), 'AR TEST KIT  ·  printed-page recognition', font=font(40), fill=MUTE)
d.line((M, 340, A4_P[0] - M, 340), fill=(40, 52, 78), width=2)

# QR
try:
    qr = Image.open(os.path.join(ROOT, 'public', 'print', 'qr.png')).convert('RGB').resize((520, 520))
    g.paste(qr, (A4_P[0] - M - 520, 150))
    d.text((A4_P[0] - M - 520, 690), 'scan → open in Safari', font=font(30), fill=MUTE)
except Exception as e:
    print('qr skip', e)

# steps
steps = [
    '1.  Print each page (matte / plain paper, not glossy). Keep it flat.',
    '2.  On iPhone, open the URL in Safari  →  “Begin AR”  →  allow camera.',
    '3.  Frame the WHOLE page, ~30–60 cm away, in even light.',
    '4.  Each page shows its own scene. Add ?debug=1 for live diagnostics.',
    '5.  Tap COPY LOG in debug and paste it back with the grid below.',
]
y = 470
d.text((M, y), 'HOW TO TEST', font=font(40, True), fill=INK); y += 78
for s in steps:
    d.text((M, y), s, font=font(34), fill=(206, 220, 244)); y += 62

# page list
y += 30
d.text((M, y), 'PAGES  (print files)', font=font(40, True), fill=INK); y += 74
for num, code, title, fname in PAGES:
    thumb = Image.open(os.path.join(ROOT, 'public', 'pages', f'{num}.jpg')).convert('RGB').resize((300, 169))
    g.paste(thumb, (M, y))
    d.text((M + 340, y + 20), f'{code}  ·  {title}', font=font(36, True), fill=INK)
    d.text((M + 340, y + 78), f'{fname}.pdf', font=font(30), fill=MUTE)
    y += 200

# record grid
y += 20
d.line((M, y, A4_P[0] - M, y), fill=(40, 52, 78), width=2); y += 40
d.text((M, y), 'RECORD  (per page)', font=font(40, True), fill=INK); y += 70
fields = 'first-found sec · distance cm · front stable? · ~15° tilt? · jitter? · re-acquire sec · scene shown? · error'
d.text((M, y), fields, font=font(28), fill=(196, 210, 236)); y += 70
d.text((M, y), 'URL: ' + URL, font=font(28), fill=MUTE)
save_pdf(g, 'AR_TEST_PRINT_GUIDE')
g.convert('RGB').save('/tmp/wsw_guide_preview.png')
print('wrote AR_TEST_PRINT_GUIDE.pdf')
