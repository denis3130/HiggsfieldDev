# Compone la scheda dei personaggi adulti dai fotogrammi di cast2 (out/cast2/stills).
from PIL import Image, ImageDraw, ImageFont
import os, sys
B = os.path.dirname(os.path.abspath(__file__)); ST = os.path.join(B, 'out/cast2/stills')
f1 = ImageFont.truetype(os.path.join(B, 'cast2/fonts/display.ttf'), 44); f2 = ImageFont.truetype(os.path.join(B, 'cast2/fonts/ui.ttf'), 26)
CH = 560; G = 14; TOP = 84; LAB = 50
def cella(t, w, crop=None):
    im = Image.open(os.path.join(ST, f't{t:.3f}_9x16.png')).convert('RGB')
    if crop: im = im.crop(crop)
    return im.resize((w, CH), Image.LANCZOS)
V = (0, 240, 1080, 1680)          # 3:4
W1 = round(CH * 9 / 16); W2 = round(CH * 3 / 4)
RIGHE = [
  ('TU, IL TESTIMONE', [(0.5, W1, None, 'figura intera'), (1.5, W2, V, 'tranquillo'), (2.5, W2, V, 'spaventato'), (3.5, W2, V, 'preoccupato'), (9.5, W2, V, 'a confronto')]),
  ("L'ISPETTORE DARIO RIVA", [(4.5, W1, None, 'figura intera'), (5.5, W2, V, 'freddo'), (6.5, W2, V, 'gentile (finto)'), (7.5, W2, V, 'minaccioso'), (8.5, W2, V, 'col distintivo')]),
]
W = G + sum(c[1] + G for c in RIGHE[0][1]); H = len(RIGHE) * (TOP + CH + LAB) + G
S = Image.new('RGB', (W, H), '#1B222B'); d = ImageDraw.Draw(S)
for r, (tit, celle) in enumerate(RIGHE):
    y = r * (TOP + CH + LAB); d.text((G, y + 22), tit, font=f1, fill='#EEF2F6'); x = G
    for t, w, crop, lab in celle:
        S.paste(cella(t, w, crop), (x, y + TOP)); d.text((x + 2, y + TOP + CH + 8), lab, font=f2, fill='#B9C2CC'); x += w + G
out = os.path.join(B, 'out/cast2/Scheda personaggi - Il testimone.png'); S.save(out); print(out, S.size)
