# Compone la scheda «corpo, vestiti e scarpe modellati» dai fotogrammi di cast4 (out/cast4/stills): prima e dopo, figure intere e particolari.
from PIL import Image, ImageDraw, ImageFont
import os
B = os.path.dirname(os.path.abspath(__file__)); ST = os.path.join(B, 'out/cast4/stills')
f1 = ImageFont.truetype(os.path.join(B, 'cast2/fonts/display.ttf'), 44); f2 = ImageFont.truetype(os.path.join(B, 'cast2/fonts/ui.ttf'), 26); f3 = ImageFont.truetype(os.path.join(B, 'cast2/fonts/display.ttf'), 30)
CH = 620; G = 14; TOP = 84; LAB = 50
def cella(t, w, crop=None):
    im = Image.open(os.path.join(ST, f't{t:.3f}_9x16.png')).convert('RGB')
    if crop: im = im.crop(crop)
    return im.resize((w, CH), Image.LANCZOS)
V = (0, 240, 1080, 1680); F = (140, 120, 940, 1800)          # 3:4 e figura intera stretta
W1 = round(CH * 800 / 1680); W2 = round(CH * 3 / 4)
RIGHE = [
  ('TU, IL TESTIMONE', [(0.5, W1, F, 'PRIMA'), (1.5, W1, F, 'ADESSO'), (2.5, W1, F, 'di spalle'), (3.5, W2, V, 'maglietta e braccia'), (4.5, W2, V, 'scarpe e jeans'), (5.5, W2, V, 'mano e avambraccio')]),
  ("L'ISPETTORE DARIO RIVA", [(6.5, W1, F, 'PRIMA'), (7.5, W1, F, 'ADESSO'), (8.5, W1, F, 'di spalle'), (9.5, W2, V, 'cappotto, camicia, cravatta'), (10.5, W2, V, 'scarpe e fondo del cappotto'), (11.5, W2, V, 'col distintivo')]),
  ('ELENA MARCHI', [(14.5, W1, F, 'PRIMA'), (15.5, W1, F, 'ADESSO'), (16.5, W1, F, 'di spalle'), (17.5, W2, V, 'cappotto, maglia, cinghia'), (18.5, W2, V, 'borsa a tracolla'), (19.5, W2, V, 'scarpe e fondo del cappotto')]),
]
W = G + sum(c[1] + G for c in RIGHE[0][1]); H = len(RIGHE) * (TOP + CH + LAB) + G
S = Image.new('RGB', (W, H), '#1B222B'); d = ImageDraw.Draw(S)
for r, (tit, celle) in enumerate(RIGHE):
    y = r * (TOP + CH + LAB); d.text((G, y + 22), tit, font=f1, fill='#EEF2F6'); x = G
    for t, w, crop, lab in celle:
        S.paste(cella(t, w, crop), (x, y + TOP))
        if lab in ('PRIMA', 'ADESSO'): d.rectangle([x, y + TOP, x + 150, y + TOP + 46], fill='#F2B63C' if lab == 'ADESSO' else '#3A4350'); d.text((x + 12, y + TOP + 6), lab, font=f3, fill='#0D1016' if lab == 'ADESSO' else '#C9D1DA')
        else: d.text((x + 2, y + TOP + CH + 8), lab, font=f2, fill='#B9C2CC')
        x += w + G
out = os.path.join(B, os.environ.get('SCHEDA') or 'Scheda personaggi - Il testimone (corpo, vestiti e scarpe nuovi).png'); S.save(out); print(out, S.size)
