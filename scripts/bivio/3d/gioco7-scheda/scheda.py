# Impagina la scheda dei sette (out/gioco7-scheda/stills, render di gioco7-scheda): per ognuno di fronte e di tre quarti, nome e ruolo.
# Va lanciato dalla cartella di lavoro (quella con out/). Uscita: out/gioco7-scheda/Scheda personaggi - Il gioco dei sette.png
from PIL import Image, ImageDraw, ImageFont
import os
B = os.path.dirname(os.path.realpath(__file__)); F = os.path.join(B, '..', '..', 'fonts')
ST = os.path.join(os.getcwd(), 'out', 'gioco7-scheda', 'stills')
fT = ImageFont.truetype(os.path.join(F, 'Roboto-Black.ttf'), 54); fN = ImageFont.truetype(os.path.join(F, 'Roboto-Bold.ttf'), 40); fR = ImageFont.truetype(os.path.join(F, 'Roboto-Regular.ttf'), 28)
SETTE = [('LEON', 'racconta la storia', 0), ('VICTOR', 'medico', 2), ('ELENA', 'avvocatessa', 4), ('MARCUS', 'ex poliziotto', 6),
         ('NORA', 'giornalista', 8), ('ADRIAN', 'imprenditore', 10), ('SOPHIE', 'la ragazza che fissa Leon', 12)]
CW, CH, G, LAB, TOP = 300, 400, 16, 92, 110
def vista(t):
    im = Image.open(os.path.join(ST, f't{t:.3f}_9x16.png')).convert('RGB')
    return im.crop((90, 120, 990, 1320)).resize((CW, CH), Image.LANCZOS)
cols = 2; rows = (len(SETTE) + 1) // 2
W = G + cols * (2 * CW + G + G); H = TOP + rows * (CH + LAB + G) + G
S = Image.new('RGB', (W, H), '#161B22'); d = ImageDraw.Draw(S)
d.text((G + 4, 26), 'IL GIOCO DEI SETTE · i sette invitati', font=fT, fill='#F2F4F7')
for i, (nome, ruolo, t) in enumerate(SETTE):
    r, c = divmod(i, cols); x = G + c * (2 * CW + 2 * G); y = TOP + r * (CH + LAB + G)
    S.paste(vista(t + 0.5), (x, y)); S.paste(vista(t + 1.5), (x + CW + 4, y))
    d.text((x + 2, y + CH + 10), nome, font=fN, fill='#F2F4F7'); d.text((x + 2, y + CH + 54), ruolo, font=fR, fill='#AEB8C4')
if len(SETTE) % 2:                                                 # l'ultima casella: il posto vuoto
    x = G + 1 * (2 * CW + 2 * G); y = TOP + (rows - 1) * (CH + LAB + G)
    d.rectangle((x, y, x + 2 * CW + 4, y + CH), outline='#3A4350', width=3)
    d.text((x + 2 * CW // 2 - 60, y + CH // 2 - 70), 'CLARA', font=fN, fill='#8C96A3'); d.text((x + 2 * CW // 2 - 150, y + CH // 2 - 20), "l'ottavo posto, vuoto", font=fR, fill='#6E7884')
out = os.path.join(os.getcwd(), 'out', 'gioco7-scheda', 'Scheda personaggi - Il gioco dei sette.png'); S.save(out); print(out, S.size)
