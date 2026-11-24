"""Monta un episodio de «Il Bivio» (Short 1080x1920) da immagini fisse, tutto col codice e gratis:
movimento di camera 2,5D con la profondità, nebbia che scorre, fiato dalle cavità, grana, palpebre che si aprono,
schermo del telefono disegnato, sottotitoli parola per parola, mix con suoni reali registrati.
Scheda finale: due carte (miniatura, lettera A/B, testo); il narratore legge le due opzioni, la frase detta compare
in alto e si illumina la carta di cui sta parlando (oro per la A, azzurro per la B).

Uso: python monta.py cartella_episodio      (dentro: episodio.json, tempi.json, parole.json, voce.wav, img/)
  RIUSA=1            non rifà i fotogrammi: solo sottotitoli, audio e file finale
  ANTEPRIMA=3.5,52   salva solo i fotogrammi a quei secondi in cartella_episodio/anteprima/ (con i sottotitoli) ed esce

episodio.json: serie, storia, episodio, titolo, righe[], e facoltativi telefono{}, ambiente[], silenzi[], suoni[].
Ogni riga: id, voce (+ grido, citazione, lontana), img, mov (vedi MOV), e facoltativi scurisci [cx, cy, rx, ry],
vapore (true o [cx, cy, r]), schermo ("blocco" | "messaggio") con schermo_dopo, silenzio (secondi senza voce).
Ultima riga: voce "Cosa fai?", opzioni {a, b} ognuna con voce, testo (2 righe con \\n), img, ritaglio [cx, cy, lato];
chiusura, sfondo. I tempi li scrive voce.py.
Le cose che servono a una storia sola (display, monitor, cartelli, pioggia…) vanno in cartella_episodio/extra.py: vedi «estensioni» più sotto."""
import glob, json, os, re, subprocess, sys
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
import soundfile as sf
from PIL import Image, ImageDraw, ImageFilter, ImageFont

D = Path(sys.argv[1]); B = Path(__file__).resolve().parent
W, H, FPS = 1080, 1920, 30
SW, SH, M = 1296, 2304, 1.06
ep = json.loads((D / "episodio.json").read_text()); tm = json.loads((D / "tempi.json").read_text())
parole = json.loads((D / "parole.json").read_text()); righe = ep["righe"]; T = tm["righe"]; TOT = tm["totale"]
rng = np.random.default_rng(5)
ORO, AZZ, ROSSO = (255, 196, 64), (96, 190, 255), (255, 60, 60)          # RGB


FONTS = B / "fonts"                                      # Roboto (Apache 2.0) accanto agli script: stesso aspetto su ogni macchina


def font(peso, size):
    for pat in (str(FONTS / f"Roboto-{peso}.ttf"), f"/usr/share/fonts/**/Roboto-{peso}.ttf", "/usr/share/fonts/**/DejaVuSans-Bold.ttf"):
        f = glob.glob(pat, recursive=True)
        if f:
            return ImageFont.truetype(f[0], size)
    return ImageFont.load_default(size)


# ---------- profondità e immagini
mod = B / "modelli/depth_small.onnx"
if not mod.exists():
    from huggingface_hub import hf_hub_download
    mod = hf_hub_download("onnx-community/depth-anything-v2-small", "onnx/model.onnx")
sess = ort.InferenceSession(str(mod), providers=["CPUExecutionProvider"])


def carica(nome):
    im = cv2.imread(str(D / "img" / nome))
    big = cv2.resize(im, (SW, SH), interpolation=cv2.INTER_LANCZOS4)
    big = cv2.addWeighted(big, 1.35, cv2.GaussianBlur(big, (0, 0), 2.0), -0.35, 0)
    x = cv2.cvtColor(cv2.resize(im, (294, 518)), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    x = ((x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]).transpose(2, 0, 1)[None].astype(np.float32)
    d = sess.run(None, {sess.get_inputs()[0].name: x})[0][0]
    d = (d - d.min()) / (d.max() - d.min() + 1e-6)
    return big, cv2.GaussianBlur(cv2.resize(d, (W, H)), (0, 0), 6)


TEL = {"ora": "03:17", "data": "domenica 22 novembre", "batteria": 3, "rete": "Nessun servizio", "mittente": "Numero sconosciuto",
       "messaggio": ["Non rispondere", "a chi ti chiama."], **ep.get("telefono", {})}
nomi = [r["img"] for r in righe if r.get("img")]
for r in righe:
    if r.get("opzioni"):
        nomi += [r["opzioni"]["a"]["img"], r["opzioni"]["b"]["img"], r.get("sfondo", r["opzioni"]["a"]["img"])]
if any(r.get("schermo") for r in righe):
    nomi.append(TEL.get("sfondo") or next(r["img"] for r in righe if r.get("img")))
IMG = {n: carica(n) for n in dict.fromkeys(nomi)}
GX, GY = np.meshgrid(np.arange(W, dtype=np.float32) - W / 2, np.arange(H, dtype=np.float32) - H / 2)
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32); XN, YN = XX / W, YY / H
VIGN = (1 - 0.55 * np.clip(((XN - .5) ** 2 + (YN - .5) ** 2) * 2.2, 0, 1) ** 1.4)[..., None].astype(np.float32)


def rumore(h, w, s):
    n = rng.standard_normal((h // 8, w // 8)).astype(np.float32)
    n = cv2.GaussianBlur(np.tile(n, (1, 2)), (0, 0), s)[:, : w // 8]
    n = cv2.resize(n, (w, h), interpolation=cv2.INTER_CUBIC)
    return (n - n.min()) / (n.max() - n.min())


FOG = rumore(H, W * 4, 9) ** 1.8
PUFF = rumore(H * 2, W, 5)
# movimento: (zoom iniziale, zoom finale, parallasse di profondità, panoramica in px, oscillazione di parallasse)
MOV = {"avanza": (1.0, 1.10, 0.07, 0, 0), "avanza_lento": (1.0, 1.06, 0.05, 0, 0), "apri_occhi": (1.0, 1.07, 0.05, 0, 0),
       "arretra": (1.13, 1.0, -0.07, 0, 0), "scendi": (1.0, 1.09, 0.06, 0, 0), "panoramica": (1.04, 1.04, 0, 60, 26),
       "mano": (1.03, 1.06, 0.03, 0, 10), "fermo": (1.02, 1.02, 0, 0, 0)}
ease = lambda u: u * u * (3 - 2 * u)
esce = lambda u: 1 - (1 - min(1.0, max(0.0, u))) ** 3


def muovi(nome, mov, u, tau, seme, oltre=False, taglio=None):
    """Fotogramma dell'immagine col movimento di camera. oltre=True: prosegue il movimento dopo la sua fine (per lo sfondo della scheda).
    taglio=(zoom, cx, cy): un'altra inquadratura della stessa immagine (più stretta, centrata in cx, cy normalizzati)."""
    big, dep = IMG[nome]
    z0, z1, kd, pan, par = MOV[mov]
    uu = 1 - (1 - u) ** 2 if mov == "arretra" else ease(u)
    z = z0 + (z1 - z0) * uu
    if oltre:
        z = z1 + 0.05 * ease(u); uu = 1 + 0.6 * ease(u)
    px = pan * (2 * min(uu, 1.0) - 1); py = 0.0
    if mov == "mano":
        px += 7 * np.sin(2.1 * tau + seme) + 4 * np.sin(5.3 * tau + 2 * seme); py += 6 * np.sin(1.7 * tau + 3 * seme) + 3 * np.sin(4.4 * tau + seme)
    k = (SW / W) / (M * z); ox = oy = 0.0
    if taglio:
        zz, cx, cy = taglio; k /= zz
        ox = float(np.clip((cx - 0.5) * SW, -(SW - W * k) / 2, (SW - W * k) / 2)); oy = float(np.clip((cy - 0.5) * SH, -(SH - H * k) / 2, (SH - H * k) / 2))
    dd = dep - 0.5
    mx = SW / 2 + ox + GX * k * (1 - kd * dd * uu) + px + par * dd * (2 * min(uu, 1.0) - 1 if pan else np.sin(1.3 * tau + seme))
    my = SH / 2 + oy + GY * k * (1 - kd * dd * uu) + py
    return cv2.remap(big, mx.astype(np.float32), my.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT).astype(np.float32)


def atmosfera(fr, t, nebbia=0.13, grana=6.5):
    o1 = int(t * 14) % (W * 3); o2 = int(W * 3 - (t * 8) % (W * 3))
    fog = (FOG[:, o1:o1 + W] * 0.6 + FOG[:, o2:o2 + W] * 0.4)[..., None]
    fr = fr + fog * nebbia * np.array([150, 140, 105], np.float32)
    if grana:
        fr = fr + cv2.resize(rng.standard_normal((H // 2, W // 2)).astype(np.float32), (W, H))[..., None] * grana
    return np.clip(fr * VIGN * (1 + 0.012 * np.sin(31 * t)), 0, 255)


FASE1 = (rumore(H, W, 6) * 2 * np.pi).astype(np.float32); FASE2 = (rumore(H, W, 4) * 2 * np.pi).astype(np.float32)
_g = np.random.default_rng(11); LUCE = cv2.GaussianBlur(_g.standard_normal((1, int(TOT * 24) + 48)).astype(np.float32), (0, 0), 1.2)[0]
POLV = _g.random((140, 6)).astype(np.float32)          # x, y, velocità, dimensione, luminosità, fase


def anima(fr, r, tau, t, seme):
    """Movimenti dentro l'inquadratura (riga «anima» di episodio.json):
    vento {forza, zona: alto|basso|tutto|vicino} = rami ed erba che ondeggiano; respiro [cx, cy, raggio, ampiezza] = petto che si alza e abbassa;
    luce ampiezza = la luce trema; polvere n = pulviscolo che fluttua; pioggia n = gocce che cadono."""
    a = r.get("anima") or {}
    dx = dy = None
    if a.get("vento"):
        v = a["vento"] if isinstance(a["vento"], dict) else {"forza": a["vento"]}; A = float(v.get("forza", 4)); z = v.get("zona", "tutto")
        w = {"alto": np.clip(1 - YN * 1.4, 0, 1) ** 1.3, "basso": np.clip((YN - 0.35) / 0.65, 0, 1), "tutto": np.ones_like(YN),
             "vicino": np.clip((IMG[r["img"]][1] - 0.45) * 2.2, 0, 1)}[z]
        dx = A * w * (np.sin(2 * np.pi * 0.33 * t + FASE1) + 0.45 * np.sin(2 * np.pi * 0.87 * t + FASE2))
        dy = 0.35 * A * w * np.sin(2 * np.pi * 0.52 * t + FASE2)
    if a.get("respiro"):
        cx, cy, rr, amp = a["respiro"]; sc = amp * np.sin(2 * np.pi * tau / 3.4)
        g = np.exp(-(((XN - cx) / rr) ** 2 + ((YN - cy) * H / W / rr) ** 2)) * sc
        bx, by = -(XX - cx * W) * g, -(YY - cy * H) * g
        dx = bx if dx is None else dx + bx; dy = by if dy is None else dy + by
    if dx is not None:
        fr = cv2.remap(fr, (XX + dx).astype(np.float32), (YY + dy).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    if a.get("luce"):
        i = min(len(LUCE) - 1, int(t * 24)); fr = fr * (1 + float(a["luce"]) * float(np.clip(LUCE[i], -1.5, 1.5)))
    if a.get("polvere") or a.get("pioggia"):
        ov = np.zeros((H // 2, W // 2), np.float32)
        for k in range(int(a.get("polvere", 0))):
            x0, y0, vel, dim, lum, ph = POLV[k % len(POLV)]
            x = ((x0 + 0.012 * np.sin(0.7 * t + ph * 6) + 0.004 * t * (vel - 0.5)) % 1) * W / 2
            y = ((y0 - 0.01 * t * (0.3 + vel)) % 1) * H / 2
            cv2.circle(ov, (int(x), int(y)), 1 + int(dim * 2.5), float(40 + 90 * lum * (0.6 + 0.4 * np.sin(2 * t + ph * 9))), -1, cv2.LINE_AA)
        for k in range(int(a.get("pioggia", 0))):
            x0, y0, vel, dim, lum, ph = POLV[k % len(POLV)]
            y = ((y0 + t * (1.4 + vel)) % 1.1 - 0.05) * H / 2; x = ((x0 + 0.08 * t) % 1) * W / 2; L = 14 + 18 * dim
            cv2.line(ov, (int(x), int(y)), (int(x - 0.18 * L), int(y - L)), float(30 + 60 * lum), 1, cv2.LINE_AA)
        ov = cv2.resize(cv2.GaussianBlur(ov, (0, 0), 0.8), (W, H))[..., None]
        fr = fr + ov * np.array([1.0, 1.0, 0.95], np.float32)
    return fr


def vapore(fr, tau, cx=0.5, cy=0.62, r=0.2):
    o = int(tau * 90) % H
    tex = PUFF[o:o + H]
    m = np.exp(-(((XN - cx) / r) ** 2 + ((YN - cy + 0.06 * tau / 3) / (r * 1.5)) ** 2))
    a = (m * tex * (0.55 + 0.45 * np.sin(2 * np.pi * tau / 2.3 - 1.2)))[..., None]
    return fr + a * 150


def palpebre(fr, tau):
    o = np.interp(tau, [0, 0.35, 0.6, 0.75, 1.5], [0.0, 0.34, 0.08, 0.3, 1.7])
    r = np.sqrt(((XN - .5) / (0.9 + o)) ** 2 + ((YN - .5) / max(o * 0.9, 1e-3)) ** 2)
    return fr * np.clip((1 - r) / 0.3, 0, 1)[..., None]


# ---------- schermo del telefono (i testi vengono da episodio.json → telefono)
def schermo(messaggio, slide=1.0):
    im = Image.new("RGB", (W, H), (4, 6, 8)); d = ImageDraw.Draw(im)
    for i in range(0, H, 4):
        d.line([(0, i), (W, i)], fill=(4 + i // 320, 7 + i // 240, 10 + i // 200))
    d.text((W // 2, 560), TEL["ora"], font=font("Thin", 300), fill=(235, 240, 245), anchor="mm")
    d.text((W // 2, 760), TEL["data"], font=font("Light", 52), fill=(190, 198, 205), anchor="mm")
    bat = TEL["batteria"]; rosso = bat <= 15
    d.rounded_rectangle([842, 96, 930, 136], 9, outline=(200, 205, 210), width=3); d.rectangle([932, 108, 938, 124], fill=(200, 205, 210))
    d.rectangle([848, 102, 848 + max(6, int(76 * bat / 100)), 130], fill=(235, 60, 50) if rosso else (225, 230, 235))
    d.text((828, 116), f"{bat}%", font=font("Medium", 40), fill=(235, 80, 70) if rosso else (225, 230, 235), anchor="rm")
    d.text((90, 116), TEL["rete"], font=font("Regular", 36), fill=(150, 158, 165), anchor="lm")
    if messaggio:
        y = int(980 + (1 - slide) * 260); card = Image.new("RGBA", (W, H), (0, 0, 0, 0)); c = ImageDraw.Draw(card)
        a = int(255 * min(1, slide * 1.4)); nr = len(TEL["messaggio"])
        c.rounded_rectangle([60, y, W - 60, y + 152 + 74 * nr], 44, fill=(38, 42, 48, a))
        c.ellipse([100, y + 44, 172, y + 116], fill=(90, 98, 108, a))
        c.text((200, y + 60), TEL["mittente"], font=font("Medium", 46), fill=(240, 242, 245, a), anchor="lm")
        c.text((W - 100, y + 60), "adesso", font=font("Regular", 36), fill=(150, 156, 164, a), anchor="rm")
        for k, riga in enumerate(TEL["messaggio"]):
            c.text((100, y + 170 + 74 * k), riga, font=font("Regular", 58), fill=(255, 255, 255, a), anchor="lm")
        im.paste(card, (0, 0), card)
    for p in ([(1080, 150), (930, 60), (860, 0)], [(930, 60), (990, 0)], [(1080, 150), (1010, 210), (1080, 300)]):
        d.line(p, fill=(120, 128, 135), width=3)                            # vetro incrinato nell'angolo
    return cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR).astype(np.float32)


if any(r.get("schermo") for r in righe):
    S_BLOCCO = schermo(False); S_MSG = schermo(True)
    SFONDO = cv2.GaussianBlur(cv2.resize(IMG[nomi[-1]][0], (W, H)), (0, 0), 30).astype(np.float32) * 0.35


def telefono(scr, tau, seme):
    ang = 1.1 * np.sin(0.9 * tau + seme); s = 0.86 + 0.012 * np.sin(1.3 * tau)
    A = cv2.getRotationMatrix2D((W / 2, H / 2), ang, s); A[0, 2] += 6 * np.sin(2 * tau + seme); A[1, 2] += 5 * np.sin(1.6 * tau)
    ph = cv2.warpAffine(scr, A, (W, H), borderValue=(0, 0, 0)); mk = cv2.warpAffine(np.ones((H, W), np.float32), A, (W, H))
    mk = cv2.GaussianBlur(mk, (0, 0), 3)[..., None]
    out = SFONDO * (1 - mk) + ph * mk
    return out + cv2.GaussianBlur(ph, (0, 0), 40) * 0.35


# ---------- scheda finale: due carte, si illumina quella di cui parla il narratore
CX0, CX1, CH, MG, TH, S2 = 54, 1026, 320, 76, 248, 2          # bordi carta, altezza, margine per alone/ombra, lato miniatura, sovracampionamento
CY = {"a": 520, "b": 880}; COL = {"a": ORO, "b": AZZ}
TX = CX0 + 36                                                  # x della miniatura
BX = TX + TH + 30 + 46                                         # centro del bollo con la lettera
XT, XT_MAX = BX + 46 + 30, 940                                 # colonna del testo (a destra di 940 ci sono i pulsanti di YouTube)
IFIN = next((i for i, r in enumerate(righe) if r.get("opzioni")), None)


def premolt(im):
    """Immagine PIL RGBA (sovracampionata) → float32 BGRA premoltiplicato a grandezza reale."""
    a = np.asarray(im.resize((im.width // S2, im.height // S2), Image.LANCZOS)).astype(np.float32) / 255
    return np.dstack([a[..., 2::-1] * a[..., 3:], a[..., 3:]])


def sopra(sotto, su):
    return su + sotto * (1 - su[..., 3:])


def disegna_carta(k, opz, acceso):
    col = COL[k]; hh = CH + 2 * MG; s = S2
    im = Image.new("RGBA", (W * s, hh * s), (0, 0, 0, 0))
    om = Image.new("L", (W * s, hh * s), 0)                                 # ombra morbida sotto la carta
    ImageDraw.Draw(om).rounded_rectangle([CX0 * s, (MG + 14) * s, CX1 * s, (MG + CH + 14) * s], 44 * s, fill=150)
    im.putalpha(om.filter(ImageFilter.GaussianBlur(20 * s)))
    d = ImageDraw.Draw(im)
    corpo = tuple(int(c * 0.10 + b) for c, b in zip(col, (20, 22, 27))) if acceso else (17, 19, 24)
    d.rounded_rectangle([CX0 * s, MG * s, CX1 * s, (MG + CH) * s], 44 * s, fill=corpo + (236,),
                        outline=col + (255,) if acceso else (255, 255, 255, 44), width=(6 if acceso else 2) * s)
    d.ellipse([(BX - 46) * s, (MG + CH // 2 - 46) * s, (BX + 46) * s, (MG + CH // 2 + 46) * s], fill=col + (255,) if acceso else (12, 13, 17, 255),
              outline=col + (255,), width=6 * s)
    d.text((BX * s, (MG + CH // 2 - 2) * s), k.upper(), font=font("Black", 60 * s), fill=(14, 15, 19, 255) if acceso else (255, 255, 255, 255), anchor="mm")
    righe_t = opz["testo"].split("\n"); size = 64
    while size > 34 and max(font("Bold", size).getlength(x) for x in righe_t) > XT_MAX - XT:
        size -= 2
    f = font("Bold", size * s); passo = int(size * 1.2); y0 = MG + CH // 2 - passo * (len(righe_t) - 1) // 2
    for n, x in enumerate(righe_t):
        d.text((XT * s, (y0 + passo * n) * s), x, font=f, fill=(255, 255, 255, 255), anchor="lm")
    return premolt(im)


def disegna_alone(k):
    hh = CH + 2 * MG; s = S2; im = Image.new("L", (W * s, hh * s), 0)
    ImageDraw.Draw(im).rounded_rectangle([CX0 * s, MG * s, CX1 * s, (MG + CH) * s], 44 * s, outline=255, width=10 * s)
    a = np.asarray(im.resize((W, hh), Image.LANCZOS)).astype(np.float32) / 255
    g = cv2.GaussianBlur(a, (0, 0), 22) * 1.7 + cv2.GaussianBlur(a, (0, 0), 7) * 0.7
    return np.clip(g, 0, 1)[..., None] * np.array(COL[k][::-1], np.float32)        # BGR, da sommare


def maschera_miniatura():
    s = 4; im = Image.new("L", (TH * s, TH * s), 0); ImageDraw.Draw(im).rounded_rectangle([0, 0, TH * s - 1, TH * s - 1], 30 * s, fill=255)
    m = np.asarray(im.resize((TH, TH), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    an = Image.new("RGBA", (TH * s, TH * s), (0, 0, 0, 0))
    ImageDraw.Draw(an).rounded_rectangle([s, s, TH * s - s - 1, TH * s - s - 1], 29 * s, outline=(255, 255, 255, 60), width=2 * s)
    a = np.asarray(an.resize((TH, TH), Image.LANCZOS)).astype(np.float32) / 255
    return m, np.dstack([a[..., 2::-1] * a[..., 3:], a[..., 3:]])


def disegna_invito():
    """Pillola «Scrivi A o B nei commenti» e nome della serie sotto le carte."""
    s = S2; hh = 220; im = Image.new("RGBA", (W * s, hh * s), (0, 0, 0, 0)); d = ImageDraw.Draw(im); f = font("Bold", 50 * s)
    pezzi = [("Scrivi ", (255, 255, 255)), ("A", ORO), (" o ", (255, 255, 255)), ("B", AZZ), (" nei commenti", (255, 255, 255))]
    larg = sum(f.getlength(x) for x, _ in pezzi); x = (W * s - larg) / 2; pad = 44 * s
    d.rounded_rectangle([x - pad, 16 * s, x + larg + pad, 112 * s], 48 * s, fill=(255, 255, 255, 26), outline=(255, 255, 255, 150), width=2 * s)
    for txt, col in pezzi:
        d.text((x, 64 * s), txt, font=f, fill=col + (255,), anchor="lm"); x += f.getlength(txt)
    return premolt(im)


def disegna_marchio():
    s = S2; im = Image.new("RGBA", (W * s, 80 * s), (0, 0, 0, 0)); d = ImageDraw.Draw(im); f = font("Medium", 30 * s)
    txt = f"{ep['serie']}  ·  EP. {ep['episodio']}"; sp = 9 * s; larg = sum(f.getlength(c) + sp for c in txt) - sp; x = (W * s - larg) / 2
    for c in txt:
        d.text((x, 40 * s), c, font=f, fill=(255, 255, 255, 120), anchor="lm"); x += f.getlength(c) + sp
    return premolt(im)


if IFIN is not None:
    RF = righe[IFIN]; PZ = {p["tipo"]: p for p in T[IFIN]["pezzi"]}
    CARTE = {k: {"spenta": disegna_carta(k, RF["opzioni"][k], False), "accesa": disegna_carta(k, RF["opzioni"][k], True), "alone": disegna_alone(k)} for k in "ab"}
    M_TH, ANELLO = maschera_miniatura(); INVITO = disegna_invito(); MARCHIO = disegna_marchio()
    Y_INVITO, Y_MARCHIO = 1252, 1396


def rampa(t, t0, t1, su=0.18, giu=0.25):
    return float(np.clip((t - t0) / su, 0, 1) * np.clip((t1 - t) / giu, 0, 1))


def miniatura(opz, u, tau, seme):
    cx, cy, lato = opz.get("ritaglio", [0.5, 0.5, 0.8])
    fr = muovi(opz["img"], "avanza_lento", u, tau, seme); L = int(lato * W)
    x0 = int(np.clip(cx * W - L / 2, 0, W - L)); y0 = int(np.clip(cy * H - L / 2, 0, H - L))
    th = cv2.resize(fr[y0:y0 + L, x0:x0 + L], (TH, TH), interpolation=cv2.INTER_AREA)
    return np.clip(255 * (th / 255) ** 0.78 * 1.25, 0, 255)                # in piccolo le immagini scure si leggono male: si schiariscono


def metti_carta(fr, k, u, tau, pres, att, luce, scuro):
    """att: quanto la carta è «accesa» (bordo e bollo colorati, un po' più grande); luce: forza dell'alone; scuro: quanto è in ombra."""
    c = CARTE[k]; y0 = CY[k] - MG; hh = CH + 2 * MG
    lay = c["spenta"] * (1 - att) + c["accesa"] * att
    th = miniatura(RF["opzioni"][k], u, tau, 1.0 if k == "a" else 2.0)
    th = th * (1 - ANELLO[..., 3:]) + ANELLO[..., :3] * 255
    reg = lay[MG + 36:MG + 36 + TH, TX:TX + TH]
    reg[..., :3] = reg[..., :3] * (1 - M_TH) + th / 255 * M_TH; reg[..., 3:] = reg[..., 3:] * (1 - M_TH) + M_TH
    lay[..., :3] *= 1 - 0.5 * scuro
    sc = 1 + 0.03 * att * (0.4 + 0.6 * luce); A = np.float32([[sc, 0, (1 - sc) * W / 2], [0, sc, (1 - sc) * hh / 2 + (1 - esce(pres)) * 70]])
    alone = c["alone"] * luce
    if sc != 1 or pres < 1:
        lay = cv2.warpAffine(lay, A, (W, hh), flags=cv2.INTER_LINEAR); alone = cv2.warpAffine(alone, A, (W, hh), flags=cv2.INTER_LINEAR)
    op = min(1.0, pres * 1.3)
    z = fr[y0:y0 + hh]
    z[:] = z * (1 - lay[..., 3:] * op) + lay[..., :3] * (255 * op) + alone * op


def metti_strato(fr, strato, y, op, dy=0.0):
    hh = strato.shape[0]; y = int(y + dy)
    z = fr[y:y + hh]; z[:] = z * (1 - strato[..., 3:] * op) + strato[..., :3] * (255 * op)


def scheda(i, t):
    r, tr = righe[i], T[i]; tau = t - tr["inizio"]; u = min(1.0, tau / max(TOT - tr["inizio"], 1e-3))
    prec = righe[i - 1] if i else {}
    if prec.get("img") == r.get("sfondo") and not prec.get("schermo") and not prec.get("speciale"):      # stessa immagine del quadro prima: la camera prosegue senza stacco
        fr = muovi(prec["img"], prec.get("mov", "avanza_lento"), u, t - T[i - 1]["inizio"], float(i - 1), oltre=True)
    else:
        fr = muovi(r.get("sfondo", r["opzioni"]["a"]["img"]), "avanza_lento", u, tau, float(i))
    k = ease(min(1.0, tau / 0.6))                                           # lo sfondo va fuori fuoco e si scurisce
    sm = cv2.GaussianBlur(cv2.resize(fr, (W // 4, H // 4), interpolation=cv2.INTER_AREA), (0, 0), 1.5 + 7.5 * k)
    fr = (fr * (1 - k) + cv2.resize(sm, (W, H), interpolation=cv2.INTER_LINEAR) * k) * (1 - 0.6 * k)
    fr = atmosfera(fr, t, 0.07, grana=0)
    a, b, c = PZ["a"], PZ["b"], PZ["chiusura"]
    att_a = rampa(t, a["inizio"] - 0.08, a["fine"] + 0.15); att_b = rampa(t, b["inizio"] - 0.08, b["fine"] + 0.15)
    fin = float(np.clip((t - c["inizio"]) / 0.35, 0, 1)); onda = np.sin(2 * np.pi * 0.75 * (t - c["inizio"]))
    luce_a = max(att_a, fin * (0.6 + 0.4 * onda)); luce_b = max(att_b, fin * (0.6 - 0.4 * onda))         # alla fine restano accese e l'alone passa dall'una all'altra
    metti_carta(fr, "a", u, tau, float(np.clip((tau - 0.12) / 0.45, 0, 1)), max(att_a, fin), luce_a, att_b * (1 - fin))
    metti_carta(fr, "b", u, tau, float(np.clip((tau - 0.27) / 0.45, 0, 1)), max(att_b, fin), luce_b, att_a * (1 - fin))
    metti_strato(fr, MARCHIO, Y_MARCHIO, float(np.clip((tau - 0.5) / 0.5, 0, 1)))
    if fin > 0:
        metti_strato(fr, INVITO, Y_INVITO, fin * (0.88 + 0.12 * np.sin(2 * np.pi * 1.1 * (t - c["inizio"]))), (1 - esce(fin)) * 40)
    return np.clip(fr + rng.standard_normal((H, W, 1)).astype(np.float32) * 2.5, 0, 255)


# ---------- estensioni della singola storia: cartella_episodio/extra.py (facoltativo), così gli script comuni non si toccano
#   disegna(r, tau, u, t, m) → fotogramma finito (BGR float32 0-255, HxWx3) per le righe con "speciale": "..." (display, monitor, cartelli, titoli…)
#   dopo(fr, r, tau, u, t, m) → fotogramma: ritocco di ogni inquadratura normale prima di nebbia e grana (pioggia, luce che trema, scritta sovrapposta…)
#   m è questo modulo: m.muovi, m.atmosfera, m.font, m.carica, m.IMG, m.W, m.H, m.VIGN, m.XN, m.YN, m.rng, m.telefono…
#   r è la riga di episodio.json, tau i secondi dall'inizio della riga, u il suo avanzamento 0-1, t il tempo assoluto.
EXTRA = None
if (D / "extra.py").exists():
    import importlib.util
    _sp = importlib.util.spec_from_file_location("extra", D / "extra.py"); EXTRA = importlib.util.module_from_spec(_sp); _sp.loader.exec_module(EXTRA)
QUESTO = sys.modules[__name__]


# ---------- fotogrammi
def fotogramma(t):
    i = max(k for k in range(len(T)) if T[k]["inizio"] <= t or k == 0)
    r, tr = righe[i], T[i]; fine = T[i + 1]["inizio"] if i + 1 < len(T) else TOT
    tau = max(0.0, t - tr["inizio"]); u = min(1.0, tau / max(fine - tr["inizio"], 1e-3))
    if r.get("opzioni"):
        fr = scheda(i, t)
    elif r.get("speciale"):
        fr = np.clip(EXTRA.disegna(r, tau, u, t, QUESTO), 0, 255)
    elif r.get("schermo") and tau >= r.get("schermo_dopo", 0):
        if r["schermo"] == "messaggio":
            sl = min(1.0, tau / 0.4); scr = S_MSG if sl >= 1 else schermo(True, 1 - (1 - sl) ** 3)
        else:
            scr = S_BLOCCO
        fr = np.clip(telefono(scr, t, 0.7) * VIGN + rng.standard_normal((H, W, 1)).astype(np.float32) * 3, 0, 255)
    else:
        tg = None
        for tl in r.get("tagli", []):                                 # [da_frazione, zoom, cx, cy]: stacco su un'altra inquadratura della stessa immagine
            if u >= tl[0]:
                tg = tuple(tl[1:])
        fr = muovi(r["img"], r.get("mov", "avanza_lento"), u, tau, float(i), taglio=tg)
        if r.get("anima"):
            fr = anima(fr, r, tau, t, float(i))
        if r.get("scurisci"):
            cx, cy, rx, ry = r["scurisci"]; fr = fr * (1 - 0.85 * np.exp(-(((XN - cx) / rx) ** 2 + ((YN - cy) / ry) ** 2)))[..., None]
        if r.get("vapore"):
            fr = vapore(fr, tau, *(r["vapore"] if isinstance(r["vapore"], list) else []))
        if EXTRA is not None and hasattr(EXTRA, "dopo"):
            fr = EXTRA.dopo(fr, r, tau, u, t, QUESTO)
        fr = atmosfera(fr, t, 0.05 if r.get("mov") == "fermo" else 0.13)
        if r.get("mov") == "apri_occhi":
            fr = palpebre(fr, tau)
    return fr.astype(np.uint8)


# ---------- sottotitoli
ts = lambda t: f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"
esc = lambda s: s.replace("{", "(").replace("}", ")")
ass_col = lambda rgb: "&H{:02X}{:02X}{:02X}&".format(rgb[2], rgb[1], rgb[0])
BIANCO = "&HFFFFFF&"
ass = [f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Roboto,84,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,6,3,5,60,60,0,1
Style: Grido,Roboto,108,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,7,3,5,40,40,0,1
Style: Lontana,Roboto,76,&H00F0E6DC,&H00FFFFFF,&H00000000,&H96000000,1,1,0,0,100,100,2,0,1,5,3,5,60,60,0,1
Style: Serie,Roboto,58,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,14,0,1,3,0,8,60,60,170,1
Style: Sotto,Roboto,40,&H00C8C8C8,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,6,0,1,2,0,8,60,60,250,1
Style: Domanda,Roboto,112,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,6,3,5,60,60,0,1
Style: Frase,Roboto,84,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,6,3,5,70,70,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""]
REEL = ep.get("sottotitoli") == "reel"
if not REEL:
    ass.append(f"Dialogue: 3,{ts(0.3)},{ts(3.4)},Serie,,0,0,0,,{{\\fad(500,600)}}{esc(ep['serie'])}")
    ass.append(f"Dialogue: 3,{ts(0.6)},{ts(3.4)},Sotto,,0,0,0,,{{\\fad(500,600)}}DECIDI TU COME CONTINUA")
ass[0] = ass[0].replace("\n\n[Events]", "\nStyle: Reel,Roboto,72,&H00FFFFFF,&H00FFFFFF,&H64000000,&H00000000,0,0,0,0,100,100,0,0,1,2.5,2,8,90,90,0,1\n\n[Events]")
STILE = {"grido": ("Grido", ROSSO), "lontana": ("Lontana", AZZ)}
Y_CAP, Y_ALTO = int(H * 0.74), 318


def gruppi(ws, n=3):
    """Parole a gruppi di n che si chiudono alla fine di una frase («APRI GLI OCCHI.» / «È NOTTE.»); una parola rimasta sola
    in fondo alla frase si unisce al gruppo prima («MENTRE PROVI AD ALZARTI.»)."""
    fine = lambda w: w[2][-1:] in ".!?:…"; g = [[]]
    for w in ws:
        g[-1].append(w)
        if len(g[-1]) == n or fine(w):
            g.append([])
    g = [x for x in g if x]; out = []
    for x in g:
        if out and len(x) == 1 and len(out[-1]) <= n and not fine(out[-1][-1]):
            out[-1] = out[-1] + x
        else:
            out.append(x)
    return out


def corpo(testo, base, larg=W - 110):
    """Corpo del carattere perché il gruppo stia su una riga (non sotto l'80% del normale: oltre va a capo da solo)."""
    lung = font("Bold", round(base * 0.752)).getlength(testo)
    return base if lung <= larg else max(round(base * 0.8), int(base * larg / lung))


def evidenzia(g, wi, col, maiuscolo=True, capo=()):
    """Il gruppo di parole con quella detta adesso colorata. capo: indici dopo cui andare a capo."""
    f = (lambda s: esc(s.upper())) if maiuscolo else esc
    ps = [f"{{\\c{ass_col(col)}}}{f(x[2])}{{\\c{BIANCO}}}" if k == wi else f(x[2]) for k, x in enumerate(g)]
    return "".join(x + ("" if k == len(ps) - 1 else "\\N" if k + 1 in capo else " ") for k, x in enumerate(ps))


CORTE = set("a ad al alla alle ai agli allo che chi ci con da dal dalla dei del della delle di e ed fra gli i il in la le lo ma mi ne nei nel nella non o per se si su sul sulla ti tra tu tuo tua un una uno vi".split())


def spezza(ws, corpo, larg):
    """Dove andare a capo (indici di parola) perché una frase stia in larg pixel: righe bilanciate, che non finiscono
    con una parolina (articolo, preposizione) e, se si può, dopo una virgola. corpo = Fontsize dello stile ASS."""
    f = font("Bold", round(corpo * 0.752)); wd = [f.getlength(w + " ") for w in ws]; n = len(ws)        # 0,752: libass misura il corpo sull'altezza di riga
    if sum(wd) <= larg:
        return ()
    cand = [(i,) for i in range(1, n)] + ([(i, j) for i in range(1, n) for j in range(i + 1, n)] if sum(wd) > 1.8 * larg else [])
    def costo(c):
        b = (0,) + c + (n,); righe_ = [sum(wd[b[k]:b[k + 1]]) for k in range(len(b) - 1)]
        return ((max(righe_) > larg) * 10 + len(c) + (max(righe_) - min(righe_)) / larg
                + sum(0.6 * (re.sub(r"\W", "", ws[i - 1].lower()) in CORTE) - 0.25 * (ws[i - 1][-1] in ",.:;!?") for i in c))
    return min(cand, key=costo)


def frasi_reel(ws, tipo, mx=6):
    """Pezzi di frase come nel reel: si chiudono a punto, virgola o due punti, al massimo mx parole."""
    g = [[]]
    for w in ws:
        g[-1].append(w)
        if len(g[-1]) >= mx or w[2][-1:] in ".!?:;,…":
            g.append([])
    g = [x for x in g if x]; out = []
    for x in g:
        if out and len(x) == 1 and len(out[-1]) < mx:
            out[-1] = out[-1] + x
        else:
            out.append(x)
    return out


def parole_reel(g, wi, maiuscolo=False):
    """Parole già dette in grigio chiaro, quella detta adesso in grassetto bianco, quelle che arrivano appena accennate."""
    f = (lambda s: esc(s.upper())) if maiuscolo else esc; out = []
    for k, x in enumerate(g):
        if k < wi:
            out.append(f"{{\\b0\\alpha&H00&\\c&HD8D8D8&}}{f(x[2])}")
        elif k == wi:
            out.append(f"{{\\b1\\alpha&H00&\\c&HFFFFFF&}}{f(x[2])}")
        else:
            out.append(f"{{\\b0\\alpha&HC0&\\c&HFFFFFF&}}{f(x[2])}")
    return " ".join(out)


CAP = []
for i, (r, tr, ws) in enumerate(zip(righe, T, parole)):
    n0 = 0
    for p in tr.get("pezzi", []):
        wp = ws[n0:n0 + p["n"]]; n0 += p["n"]
        if not wp:
            continue
        if r.get("opzioni"):                                               # scheda finale: la frase intera in alto, parola detta colorata
            stile, col = ("Domanda", ROSSO) if p["tipo"] == "voce" else ("Frase", {"a": ORO, "b": AZZ}.get(p["tipo"], ROSSO))
            succ = [q["inizio"] for q in tr["pezzi"] if q["inizio"] > p["inizio"]]; fine_p = min(succ) if succ else TOT
            capo = () if stile == "Domanda" else spezza([w[2] for w in wp], 84, W - 140)
            for wi, (a, b, _) in enumerate(wp):
                a2 = p["inizio"] if wi == 0 else a; b2 = wp[wi + 1][0] if wi + 1 < len(wp) else fine_p
                fad = "\\fad(120,0)" if wi == 0 else ""
                ass.append(f"Dialogue: 2,{ts(a2)},{ts(b2)},{stile},,0,0,0,,{{\\an5\\q2\\pos({W // 2},{Y_ALTO}){fad}}}{evidenzia(wp, wi, col, p['tipo'] == 'voce', capo)}")
            continue
        if REEL:
            for g in frasi_reel(wp, p["tipo"]):
                for wi, (a, b, _) in enumerate(g):
                    b2 = g[wi + 1][0] if wi + 1 < len(g) else min(g[-1][1] + 0.35, p["fine"] + 0.35)
                    CAP.append((a, b2, "Reel", f"{{\\an8\\pos({W // 2},{int(H * 0.145)}){'\\i1' if p['tipo'] == 'lontana' else ''}}}{parole_reel(g, wi, p['tipo'] == 'grido')}"))
            continue
        stile, col = STILE.get(p["tipo"], ("Cap", ROSSO)); gr = gruppi(wp); base = {"Cap": 84, "Grido": 108, "Lontana": 76}[stile]
        for gi, g in enumerate(gr):
            gfine = gr[gi + 1][0][0] if gi + 1 < len(gr) else min(g[-1][1] + 0.3, p["fine"] + 0.3)
            fs = corpo(" ".join(x[2] for x in g).upper(), base)
            for wi, (a, b, _) in enumerate(g):
                b2 = g[wi + 1][0] if wi + 1 < len(g) else gfine
                CAP.append((a, b2, stile, f"{{\\pos({W // 2},{Y_CAP})\\fs{fs}}}{evidenzia(g, wi, col)}"))
CAP.sort(key=lambda c: c[0])                                               # un sottotitolo finisce sempre prima che inizi il successivo (niente scritte sovrapposte)
for k, (a, b, stile, txt) in enumerate(CAP):
    b = min(b, CAP[k + 1][0]) if k + 1 < len(CAP) else b
    if b > a:
        ass.append(f"Dialogue: 1,{ts(a)},{ts(b)},{stile},,0,0,0,,{txt}")
(D / "sub.ass").write_text("\n".join(ass) + "\n", encoding="utf-8")
filtro = lambda p: str(Path(p).resolve()).replace(":", "\\:").replace("'", "\\'")
SUB = f"subtitles='{filtro(D / 'sub.ass')}'" + (f":fontsdir='{filtro(FONTS)}'" if FONTS.exists() else "")

if os.environ.get("ANTEPRIMA"):
    (D / "anteprima").mkdir(exist_ok=True)
    for x in os.environ["ANTEPRIMA"].split(","):
        t = float(x); fr = fotogramma(t)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-i", "-", "-vf", f"setpts=PTS+{t}/TB,{SUB}",
                        "-frames:v", "1", "-q:v", "3", str(D / "anteprima" / f"t{t:06.2f}.jpg")], input=fr.tobytes(), check=True)
    print("anteprime in", D / "anteprima"); sys.exit()

RIUSA = bool(os.environ.get("RIUSA")) and (D / "_muto.mp4").exists()
if not RIUSA:
    out = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-c:v", "libx264", "-preset", "veryfast", "-crf", "15", "-pix_fmt", "yuv420p", str(D / "_muto.mp4")], stdin=subprocess.PIPE)
    for f in range(int(TOT * FPS)):
        out.stdin.write(fotogramma(f / FPS).tobytes())
    out.stdin.close(); out.wait()

# ---------- audio: voce + ambiente + suoni reali (tutto descritto in episodio.json)
SR = 48000


def suono(path, da=0.0, dur=None):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(da)] + (["-t", str(dur)] if dur else []) + ["-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def sfx(nome, da=0.0, dur=None):
    p = next((c for c in (D / "sfx" / nome, B / "sfx" / nome) if c.exists()), None)
    if p is None:
        sys.exit(f"manca il suono {nome} (cercato in {D / 'sfx'} e {B / 'sfx'})")
    x = suono(p, da, dur)
    return x / (np.abs(x).max() + 1e-9)


n = int(TOT * SR); voce = suono(D / "voce.wav"); voce = np.pad(voce, (0, max(0, n - len(voce))))[:n]
fx = np.zeros(n, np.float32); R = {r["id"]: x for r, x in zip(righe, T)}; PAR = {r["id"]: w for r, w in zip(righe, parole)}


def quando(s):
    """Istante di un suono: inizio della riga (+ dopo), oppure l'attimo in cui si dice una parola di quella riga."""
    t = R[s["riga"]]["inizio"]
    if s.get("parola"):
        t = next((w[0] for w in PAR[s["riga"]] if s["parola"].lower() in w[2].lower()), t)
    return max(0.0, t + s.get("dopo", 0.0))


for s in ep.get("suoni", []):
    t = quando(s); dur = TOT - t if s.get("fino_alla_fine") else s.get("dur")
    x = sfx(s["file"], s.get("da", 0.0), dur); x = x[: max(0, n - int(t * SR))]
    if s.get("cresce"):
        x = x * np.linspace(s["cresce"][0], s["cresce"][1], len(x))
    k = int(s.get("sfuma", 0.05) * SR)
    if len(x) > 2 * k:
        x[:k] *= np.linspace(0, 1, k); x[-k:] *= np.linspace(1, 0, k)
    i0 = int(t * SR); fx[i0:i0 + len(x)] += x * s.get("vol", 0.4)
amb = np.zeros(n, np.float32)
for s in ep.get("ambiente", []):
    v = s.get("vol", 0.2); amb += np.resize(sfx(s["file"], s.get("da", 0.0)), n) * (np.linspace(v[0], v[1], n) if isinstance(v, list) else v)
for s in ep.get("silenzi", []):                                            # silenzio totale tra due righe (es. dopo un grido)
    a, b = int(R[s["da_riga"]]["voce_fine"] * SR), int(R[s["a_riga"]]["inizio"] * SR); k = SR // 20
    amb[max(0, a - k):a] *= np.linspace(1, 0, a - max(0, a - k)); amb[a:b] = 0; amb[b:b + SR] *= np.linspace(0, 1, len(amb[b:b + SR]))
env = np.convolve(np.abs(voce), np.ones(4800) / 4800, mode="same"); duck = 1 - 0.4 * np.clip(env / 0.05, 0, 1)
mix = voce * 0.95 + (fx + amb) * duck
sf.write(D / "mix.wav", np.clip(mix / (np.abs(mix).max() + 1e-9) * 0.97, -1, 1), SR)
finale = D / f"il_bivio_ep{ep['episodio']}.mp4"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(D / "_muto.mp4"), "-i", str(D / "mix.wav"), "-vf", f"{SUB},format=yuv420p",
                "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-maxrate", "8M", "-bufsize", "16M",
                "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-shortest", str(finale)], check=True)
print("ok", finale, round(TOT, 1), "s")
