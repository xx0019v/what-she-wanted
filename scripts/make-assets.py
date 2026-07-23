#!/usr/bin/env python3
"""Asset pipeline: derive WebP page textures (kept alongside the JPG originals)
and render representative PAGE-ALIVE stills + a title card for the submission.
Run: python3 scripts/make-assets.py"""
import os, math, random
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = os.path.join(ROOT, 'public', 'pages')
SHOTS = os.path.join(ROOT, 'docs', 'screenshots')
os.makedirs(SHOTS, exist_ok=True)

def webp_all():
    total_j = total_w = 0
    for n in range(1, 18):
        src = os.path.join(PAGES, f'{n}.jpg')
        im = Image.open(src).convert('RGB')
        out = os.path.join(PAGES, f'{n}.webp')
        im.save(out, 'WEBP', quality=82, method=6)
        total_j += os.path.getsize(src); total_w += os.path.getsize(out)
    print(f'WebP derivatives written. JPG {total_j//1024}KB -> WebP {total_w//1024}KB '
          f'({100*(1-total_w/total_j):.0f}% smaller)')

def vignette(im, strength=0.55):
    w, h = im.size
    mask = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse([-w*0.15, -h*0.15, w*1.15, h*1.15], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(w*0.09))
    dark = Image.new('RGB', (w, h), (6, 9, 15))
    return Image.composite(im, Image.blend(im, dark, strength), mask)

def fog_particles(im, hue=(205,221,242), n=90, glow=(150,180,230)):
    w, h = im.size
    layer = Image.new('RGBA', (w, h), (0,0,0,0))
    d = ImageDraw.Draw(layer)
    # low fog band
    for i in range(3):
        band = Image.new('RGBA', (w, h), (0,0,0,0))
        bd = ImageDraw.Draw(band)
        cy = int(h*(0.72 - i*0.08))
        bd.ellipse([-w*0.2, cy-h*0.18, w*1.2, cy+h*0.18], fill=(hue[0],hue[1],hue[2], 26))
        band = band.filter(ImageFilter.GaussianBlur(60))
        layer = Image.alpha_composite(layer, band)
    # particles
    random.seed(7)
    for _ in range(n):
        x, y = random.uniform(0,w), random.uniform(h*0.25,h)
        r = random.uniform(1.5, 4.5)
        a = int(random.uniform(40, 150))
        dd = ImageDraw.Draw(layer)
        dd.ellipse([x-r,y-r,x+r,y+r], fill=(glow[0],glow[1],glow[2],a))
    layer = layer.filter(ImageFilter.GaussianBlur(1.2))
    base = im.convert('RGBA')
    return Image.alpha_composite(base, layer).convert('RGB')

def still(n, name, glow=(150,180,230), hue=(205,221,242)):
    im = Image.open(os.path.join(PAGES, f'{n}.jpg')).convert('RGB')
    im = vignette(im, 0.5)
    im = fog_particles(im, hue=hue, glow=glow)
    im.save(os.path.join(SHOTS, f'representative-{name}.jpg'), quality=88)
    print('still:', name)

def title_card():
    w, h = 1920, 1080
    im = Image.new('RGB', (w, h), (6, 9, 15))
    d = ImageDraw.Draw(im)
    # moon glow
    moon = Image.new('RGBA', (w, h), (0,0,0,0))
    md = ImageDraw.Draw(moon)
    cx, cy, R = w*0.5, h*0.42, 150
    for rr, a in [(R*3, 18),(R*2,26),(R,255)]:
        md.ellipse([cx-rr,cy-rr,cx+rr,cy+rr], fill=(220,230,250, a))
    moon = moon.filter(ImageFilter.GaussianBlur(30))
    im = Image.alpha_composite(im.convert('RGBA'), moon).convert('RGB')
    d = ImageDraw.Draw(im)
    d.text((cx, cy+260), 'WHAT SHE WANTED', anchor='mm', fill=(238,244,251))
    d.text((cx, cy+300), 'A story beyond the printed page', anchor='mm', fill=(169,195,230))
    im.save(os.path.join(SHOTS, 'title-card.jpg'), quality=90)
    print('title card')

if __name__ == '__main__':
    webp_all()
    still(4, 'S04-into-the-forest')
    still(5, 'S05-first-meeting', glow=(160,140,220), hue=(190,180,230))
    still(11, 'S11-violet-moon', glow=(170,150,230), hue=(180,160,225))
    still(16, 'S16-her-own-dream', glow=(200,190,240), hue=(200,200,240))
    title_card()
