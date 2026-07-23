#!/usr/bin/env python3
"""Generate title/section/end cards (1920x1080) for the concept-preview video."""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'video', 'cards')
os.makedirs(OUT, exist_ok=True)

def font(sz):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
              '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

def moon(im, cx, cy, R):
    g = Image.new('RGBA', im.size, (0,0,0,0))
    d = ImageDraw.Draw(g)
    for rr, a in [(R*3.2, 16),(R*2,24),(R,255)]:
        d.ellipse([cx-rr,cy-rr,cx+rr,cy+rr], fill=(222,231,251,a))
    g = g.filter(ImageFilter.GaussianBlur(26))
    return Image.alpha_composite(im.convert('RGBA'), g).convert('RGB')

def card(name, lines, sub=None, with_moon=False, accent=(169,195,230)):
    w, h = 1920, 1080
    im = Image.new('RGB', (w, h), (6, 9, 15))
    if with_moon:
        im = moon(im, w*0.5, h*0.34, 120)
    d = ImageDraw.Draw(im)
    y = h*0.5 - len(lines)*38
    for ln in lines:
        big = font(64)
        d.text((w*0.5, y), ln, anchor='mm', font=big, fill=(238,244,251))
        y += 92
    if sub:
        d.text((w*0.5, y+30), sub, anchor='mm', font=font(30), fill=accent)
    im.save(os.path.join(OUT, name), quality=92)

card('01_title.jpg', ['WHAT SHE WANTED'], 'A story beyond the printed page', with_moon=True)
card('02_shows.jpg', ['The printed page shows', 'what happened.'])
card('03_reveals.jpg', ['The camera reveals', 'what remained inside her.'], accent=(154,124,216))
card('04_enter.jpg', ['ENTER THIS WORLD?'], 'a story does not end at the edge of the page', with_moon=True)
card('05_theme1.jpg', ['Memories are not meant', 'to be erased.'], accent=(154,124,216))
card('06_theme2.jpg', ['They are meant', 'to be overcome.'], accent=(154,124,216))
card('07_cycle.jpg', ['And the girl who once suffered', 'had become the witch.'])
card('08_end.jpg', ['WHAT SHE WANTED'], 'ISCA 2026  ·  Digital Content', with_moon=True)
print('cards written to', OUT)
