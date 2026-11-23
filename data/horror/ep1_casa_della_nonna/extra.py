"""«La casa della nonna», Episodio 1: le cose che servono solo a questa storia, disegnate col codice (monta.py le chiama da sé).
- SCRITTE: testi scritti sulle immagini prima del movimento di camera, così si muovono con loro
  (la didascalia a penna stilografica blu sotto la foto, nome e data sulla tessera);
- "fascio": il fascio della torcia scorre sulla didascalia da sinistra a destra mentre il narratore la legge;
- "rosso_su": la foto è in bianco e nero; sulla parola indicata la bicicletta torna rossa per mezzo secondo
  (l'immagine è generata a colori: qui si toglie il colore e lo si ridà solo al rosso);
- "scatto": sulla parola indicata (+ "scatto_dopo" secondi) la serratura passa al fotogramma "img_dopo"
  (chiave girata) con una piccola scossa, insieme al suono della mandata.
Il corsivo è La Belle Aurore di Kimberly Geswein (SIL Open Font License 1.1, in fonts/)."""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

QUI = Path(__file__).resolve().parent
INCHIOSTRO = (20, 38, 120)                     # blu della stilografica (RGB)
STAMPA = (34, 36, 44)                          # inchiostro della tessera (RGB)

# Didascalia: (x, y) centro della scritta in frazioni dell'immagine, size in pixel dell'immagine grande (1296x2304), angolo in gradi.
# striscia [y0, y1, yc, f0, f1]: la fascia y0-y1 dell'immagine (la striscia bianca, generata in fondo al quadro) si sposta col centro
# in yc, su un fondo fatto col cartoncino nero tra f0 e f1: così la scritta sta al centro, lontano dai sottotitoli.
DIDASCALIE = {
    "s02_didascalia.png": {"testo": "Elio, agosto 1964", "x": 0.5, "y": 0.5, "size": 140, "angolo": -2.5,
                           "striscia": [0.712, 0.928, 0.5, 0.15, 0.6]},
}
# Tessera: i quattro angoli della faccia della carta (alto-sx, alto-dx, basso-dx, basso-sx) in frazioni dell'immagine;
# le righe si scrivono su una carta piatta 856x540 (x, y, peso del carattere, corpo) e poi si piegano in prospettiva.
TESSERE = {
    "s03_tessera.png": {"angoli": [[0.264, 0.553], [0.917, 0.527], [0.951, 0.750], [0.285, 0.777]],
                        "righe": [(110, 82, "Medium", 40, "CARTA D'IDENTITÀ"), (110, 178, "Bold", 80, "SESTINI ELIO"),
                                  (110, 278, "Regular", 62, "nato il 12.03.1996")]},       # tutto in alto: sotto passano i sottotitoli
}
# Scritte finte generate dal modello da cancellare (rettangoli x0, y0, x1, y1 in frazioni dell'immagine): si ricostruiscono dai dintorni.
# Con un quinto valore "chiari" si toglie solo ciò che nel rettangolo è chiaro e poco colorato (la scritta, non il tubo rosso).
TOGLI = {
    "s10_serratura.png": [[0.392, 0.286, 0.568, 0.322]],          # lettere incise sulla placca della serratura
    "s06_bicicletta.png": [[0.564, 0.542, 0.639, 0.604, "chiari"]],  # finta marca sul tubo della bicicletta
}
_pronto = False


def _indice(m, r):
    return next(k for k, x in enumerate(m.righe) if x is r)


def _parola(m, r, parola):
    """Inizio e fine (secondi assoluti) della prima parola della riga che contiene `parola`."""
    for a, b, w in m.parole[_indice(m, r)]:
        if parola.lower() in w.lower():
            return a, b
    return m.T[_indice(m, r)]["inizio"], m.T[_indice(m, r)]["inizio"]


def _inchiostra(big, strato, colore, forza):
    """Scrive sullo sfondo come inchiostro vero: moltiplica (la carta e la luce si vedono attraverso). strato: alpha 0-1 HxW."""
    a = (strato * forza)[..., None]
    ink = np.array(colore[::-1], np.float32) / 255                        # BGR
    out = big.astype(np.float32) * (1 - a + a * ink)
    return np.clip(out, 0, 255).astype(np.uint8)


def _sposta(a, st):
    """Sposta la fascia [y0, y1] col centro in yc, sopra un fondo ottenuto allungando la fascia [f0, f1]; bordi sfumati."""
    y0, y1, yc, f0, f1 = st; h = a.shape[0]
    fondo = cv2.resize(a[int(f0 * h):int(f1 * h)], (a.shape[1], h), interpolation=cv2.INTER_LINEAR).astype(np.float32)
    pezzo = a[int(y0 * h):int(y1 * h)].astype(np.float32); n = len(pezzo); t = int(yc * h - n / 2); k = max(2, n // 12)
    al = np.ones(n, np.float32); al[:k] = np.linspace(0, 1, k); al[-k:] = np.linspace(1, 0, k)
    al = al.reshape((n,) + (1,) * (a.ndim - 1))
    fondo[t:t + n] = fondo[t:t + n] * (1 - al) + pezzo * al
    return fondo.astype(a.dtype)


def _didascalia(big, d):
    H, W = big.shape[:2]; s = 2
    im = Image.new("L", (W * s, H * s), 0); dr = ImageDraw.Draw(im)
    f = ImageFont.truetype(str(QUI / "fonts" / "LaBelleAurore.ttf"), d["size"] * s)
    dr.text((d["x"] * W * s, d["y"] * H * s), d["testo"], font=f, fill=255, anchor="mm")
    im = im.rotate(d["angolo"], resample=Image.BICUBIC, center=(d["x"] * W * s, d["y"] * H * s))
    im = im.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.7))     # penna stilografica: bordo morbido
    a = np.asarray(im).astype(np.float32) / 255
    rng = np.random.default_rng(3)                                          # inchiostro non uniforme
    var = cv2.GaussianBlur(rng.random((H // 8, W // 8)).astype(np.float32), (0, 0), 2)
    a = a * (0.8 + 0.35 * cv2.resize(var, (W, H)))
    return _inchiostra(big, np.clip(a, 0, 1), INCHIOSTRO, 0.92)


def _tessera(big, d, m):
    H, W = big.shape[:2]; cw, ch = 856, 540; s = 2
    im = Image.new("L", (cw * s, ch * s), 0); dr = ImageDraw.Draw(im)
    for x, y, peso, corpo, testo in d["righe"]:
        dr.text((x * s, y * s), testo, font=m.font(peso, corpo * s), fill=255, anchor="lm")
    a = np.asarray(im.resize((cw, ch), Image.LANCZOS)).astype(np.float32) / 255
    src = np.float32([[0, 0], [cw, 0], [cw, ch], [0, ch]])
    dst = np.float32([[x * W, y * H] for x, y in d["angoli"]])
    a = cv2.warpPerspective(a, cv2.getPerspectiveTransform(src, dst), (W, H), flags=cv2.INTER_LINEAR)
    return _inchiostra(big, cv2.GaussianBlur(a, (0, 0), 0.6), STAMPA, 0.9)


def _prepara(m):
    for nome, rett in TOGLI.items():
        if nome in m.IMG:
            big, dep = m.IMG[nome]; H, W = big.shape[:2]; mk = np.zeros((H, W), np.uint8)
            hsv = cv2.cvtColor(big, cv2.COLOR_BGR2HSV)
            for x0, y0, x1, y1, *modo in rett:
                ys, xs = slice(int(y0 * H), int(y1 * H)), slice(int(x0 * W), int(x1 * W))
                if modo:
                    mk[ys, xs] = 255 * ((hsv[ys, xs, 1] < 160) & (hsv[ys, xs, 2] > 150))
                else:
                    mk[ys, xs] = 255
            mk = cv2.dilate(mk, np.ones((5, 5), np.uint8))
            m.IMG[nome] = (cv2.inpaint(big, mk, 9, cv2.INPAINT_TELEA), dep)
    for r in m.righe:
        if r.get("rosso_su") and r["img"] in m.IMG:
            big, dep = m.IMG[r["img"]]; m.IMG["_rosso_" + r["img"]] = (_maschera_rosso(big, r.get("rosso_no", [])), dep)
    for nome, d in DIDASCALIE.items():
        if nome in m.IMG:
            big, dep = m.IMG[nome]
            if d.get("striscia"):
                big, dep = _sposta(big, d["striscia"]), _sposta(dep, d["striscia"])
            m.IMG[nome] = (_didascalia(big, d), dep)
    for nome, d in TESSERE.items():
        if nome in m.IMG:
            big, dep = m.IMG[nome]; m.IMG[nome] = (_tessera(big, d, m), dep)


def _fascio(fr, r, t, m):
    """La torcia legge la didascalia: entra da sinistra, scorre sulla scritta mentre il narratore la dice, esce a destra."""
    i = _indice(m, r); T = m.T[i]; pz = {p["tipo"]: p for p in T["pezzi"]}; c = pz.get("citazione", T["pezzi"][-1])
    fine = m.T[i + 1]["inizio"] if i + 1 < len(m.T) else m.TOT
    xc = np.interp(t, [T["inizio"], c["inizio"], c["fine"], fine], [-0.15, 0.18, 0.82, 1.0])
    yc = r.get("fascio_y", 0.5)
    blob = np.exp(-(((m.XN - xc) / 0.22) ** 2 + ((m.YN - yc) / 0.16) ** 2))[..., None]
    luce = 0.42 + 0.78 * blob
    return fr * luce * np.array([0.94, 1.0, 1.08], np.float32) ** blob


def _maschera_rosso(big, escludi):
    """Dove l'immagine è rosso acceso (la bicicletta), 0-255 su tre canali; `escludi`: ellissi [cx, cy, rx, ry] da lasciare grigie (l'orecchio)."""
    hsv = cv2.cvtColor(big, cv2.COLOR_BGR2HSV).astype(np.float32); h, s_, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    k = ((h <= 9) | (h >= 168)) * np.clip((s_ - 70) / 60, 0, 1) * np.clip((v - 25) / 30, 0, 1)
    H, W = k.shape; yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    for cx, cy, rx, ry in escludi:
        k = k * (((xx / W - cx) / rx) ** 2 + ((yy / H - cy) / ry) ** 2 > 1)
    k = cv2.GaussianBlur(k.astype(np.float32), (0, 0), 3.0)
    return np.repeat((k * 255).astype(np.uint8)[..., None], 3, axis=2)


def _rosso(fr, r, tau, u, t, m):
    """Bianco e nero; sulla parola la bicicletta (il rosso dell'immagine) torna a colori per mezzo secondo.
    La maschera del rosso è un'immagine in più (con la stessa profondità): si muove con la camera come la foto."""
    a, _ = _parola(m, r, r["rosso_su"])
    k = float(np.interp(t, [a - 0.05, a + 0.1, a + 0.55, a + 0.85], [0, 1, 1, 0]))
    g = fr[..., 0] * 0.114 + fr[..., 1] * 0.587 + fr[..., 2] * 0.299
    grigio = g[..., None] * np.array([0.75, 0.8, 0.84], np.float32)       # carta un po' calda e in penombra, come il resto
    if k <= 0:
        return grigio
    rosso = m.muovi("_rosso_" + r["img"], r.get("mov", "avanza_lento"), u, tau, float(_indice(m, r)))[..., :1] / 255
    vivo = fr * np.array([0.7, 0.7, 0.98], np.float32)                     # rosso vivo
    return grigio * (1 - k * rosso) + vivo * (k * rosso)


def _scatto(fr, r, tau, u, t, m):
    a, _ = _parola(m, r, r["scatto"]); tc = a + r.get("scatto_dopo", 0.35)
    if t < tc:
        return fr
    nome = r["img_dopo"]
    if nome not in m.IMG:
        m.IMG[nome] = m.carica(nome)
    fr = m.muovi(nome, r.get("mov", "fermo"), u, tau, float(_indice(m, r)))
    dt = t - tc; amp = 16 * np.exp(-dt / 0.08)
    if amp > 0.3:
        dx = amp * np.sin(2 * np.pi * 21 * dt); dy = 0.7 * amp * np.cos(2 * np.pi * 17 * dt); z = 1.02
        A = np.float32([[z, 0, (1 - z) * m.W / 2 + dx], [0, z, (1 - z) * m.H / 2 + dy]])
        fr = cv2.warpAffine(fr, A, (m.W, m.H), borderMode=cv2.BORDER_REFLECT)
    return fr


def dopo(fr, r, tau, u, t, m):
    global _pronto
    if not _pronto:
        _prepara(m); _pronto = True
        if r.get("img") in DIDASCALIE or r.get("img") in TESSERE or r.get("img") in TOGLI:                 # questo fotogramma era stato fatto senza scritte
            fr = m.muovi(r["img"], r.get("mov", "avanza_lento"), u, tau, float(_indice(m, r)))
    if r.get("fascio"):
        fr = _fascio(fr, r, t, m)
    if r.get("rosso_su"):
        fr = _rosso(fr, r, tau, u, t, m)
    if r.get("scatto"):
        fr = _scatto(fr, r, tau, u, t, m)
    return fr
