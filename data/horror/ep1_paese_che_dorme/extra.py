"""Il paese che dorme, Ep. 1 — cose disegnate col codice solo per questa storia (vedi PRODUZIONE.md, «estensioni»).
Nessun testo viene dal modello delle immagini: lettera in stampatello tremante, manifesto della Notte dei Muti con l'angolo
dell'anno strappato, biglietto dell'oste in corsivo elegante, quadranti degli orologi (campanile alle nove meno cinque,
orologio dell'ingresso, lancette del campanile che scattano sulle nove) sono tutti disegnati qui.
Più: le finestre della via che si spengono una dopo l'altra (righe 9-10), fuoco e lume che tremano, stacco sul volto di legno.

Caratteri: Covered By Your Grace (stampatello a mano) e Pinyon Script (corsivo), licenza SIL OFL 1.1, in fonts/.
Le coordinate dei fogli e degli orologi sono quelle delle immagini generate (576x1024), misurate a mano."""
import math
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

QUI = Path(__file__).resolve().parent
F_STAMP = str(QUI / "fonts/CoveredByYourGrace-Regular.ttf")
F_CORS = str(QUI / "fonts/PinyonScript-Regular.ttf")
RNG = np.random.default_rng(612)


def _font(path, size):
    return ImageFont.truetype(path, int(size))


# ---------------------------------------------------------------- scritte a mano su un foglio (piano), poi in prospettiva
def stampatello(righe, larg, alt, size, x0, y0, passo=1.3, seme=1):
    """Stampatello tremante: ogni lettera un po' ruotata, spostata e di grandezza diversa; poi un tremito su tutto il tratto.
    Ritorna l'opacità dell'inchiostro (alt x larg, 0-1)."""
    r = np.random.default_rng(seme); im = Image.new("L", (larg, alt), 0)
    for k, riga in enumerate(righe):
        x = x0 + r.uniform(-0.12, 0.12) * size; y = y0 + k * passo * size; incl = r.uniform(-1.6, 1.6)
        for c in riga:
            s = size * r.uniform(0.93, 1.07); f = _font(F_STAMP, s)
            w = f.getlength(c)
            if c != " ":
                g = Image.new("L", (int(s * 2), int(s * 2)), 0)
                ImageDraw.Draw(g).text((s * 0.5, s * 0.25), c, font=f, fill=int(255 * r.uniform(0.8, 1.0)))
                g = g.rotate(r.uniform(-5, 5) + incl, resample=Image.BICUBIC, center=(s * 0.5 + w / 2, s))
                dy = r.uniform(-0.05, 0.05) * size + math.tan(math.radians(-incl)) * (x - x0)
                im.paste(255, (int(x - s * 0.5), int(y + dy - s * 0.25)), g)
            x += w * r.uniform(0.98, 1.12)
    a = np.asarray(im).astype(np.float32) / 255
    yy, xx = np.mgrid[0:alt, 0:larg].astype(np.float32)                       # tremito della mano
    tr = size * 0.022
    mx = xx + tr * np.sin(yy / (size * 0.11) + 1.3) + tr * 0.6 * np.sin(yy / (size * 0.047))
    my = yy + tr * np.sin(xx / (size * 0.13)) + tr * 0.5 * np.sin(xx / (size * 0.05) + 2)
    a = cv2.remap(a, mx, my, cv2.INTER_LINEAR)
    return np.clip(a * (0.78 + 0.22 * cv2.GaussianBlur(r.random((alt, larg)).astype(np.float32), (0, 0), size * 0.15) * 3), 0, 1)


def corsivo(righe, larg, alt, size, posizioni, seme=2):
    """Corsivo elegante, inchiostro con piccole variazioni di carico. posizioni: (x, y) di ogni riga."""
    r = np.random.default_rng(seme); im = Image.new("L", (larg, alt), 0); d = ImageDraw.Draw(im); f = _font(F_CORS, size)
    for riga, (x, y) in zip(righe, posizioni):
        d.text((x, y), riga, font=f, fill=255)
    a = np.asarray(im).astype(np.float32) / 255
    a = cv2.GaussianBlur(a, (0, 0), size * 0.006 + 0.3)
    car = 0.82 + 0.18 * cv2.GaussianBlur(r.random((alt, larg)).astype(np.float32), (0, 0), size * 0.4) * 3
    return np.clip(a * car, 0, 1)


def su_foglio(big, quad, alpha, tinta, K, sfoca=0.7):
    """Inchiostro (alpha, foglio piano) messo in prospettiva sul foglio dell'immagine: quad = 4 angoli (alto sx, alto dx,
    basso dx, basso sx) in coordinate dell'immagine generata. L'inchiostro scurisce la carta (moltiplica): la luce resta quella della scena."""
    h, w = alpha.shape
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]]); dst = np.float32(quad) * K
    P = cv2.getPerspectiveTransform(src, dst)
    a = cv2.warpPerspective(alpha, P, (big.shape[1], big.shape[0]), flags=cv2.INTER_AREA if K < 1 else cv2.INTER_LINEAR)
    if sfoca:
        a = cv2.GaussianBlur(a, (0, 0), sfoca)
    b = big.astype(np.float32); t = np.float32(tinta)
    out = b * (1 - a[..., None]) + b * t * a[..., None]
    return np.clip(out, 0, 255).astype(np.uint8)


def su_foglio_colore(big, quad, rgba, K):
    """Stampa a colori (manifesto): moltiplica la carta per l'immagine stampata (BGRA, 0-1, sfondo bianco/trasparente)."""
    h, w = rgba.shape[:2]
    P = cv2.getPerspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]), np.float32(quad) * K)
    st = cv2.warpPerspective(rgba, P, (big.shape[1], big.shape[0]), flags=cv2.INTER_LINEAR, borderValue=(1, 1, 1, 0))
    st = cv2.GaussianBlur(st, (0, 0), 0.6)
    b = big.astype(np.float32); a = st[..., 3:]
    out = b * (1 - a) + b * st[..., :3] * a
    return np.clip(out, 0, 255).astype(np.uint8), st[..., 3]


# ---------------------------------------------------------------- orologi
def quadrante(big, c, r, ore, minuti, K, colore=None, lancette=None, solo_lancette=False):
    """Ridisegna il quadrante di un orologio (cerchio bianco, 12 tacche, due lancette) sopra quello generato, così l'ora
    è quella giusta e non ci sono numeri inventati. c, r in coordinate dell'immagine generata."""
    cx, cy, R = c[0] * K, c[1] * K, r * K; S = 4; L = int(R * 2.6)
    x0, y0 = int(cx - L / 2), int(cy - L / 2); patch = big[y0:y0 + L, x0:x0 + L].astype(np.float32)
    yy, xx = np.mgrid[0:L, 0:L].astype(np.float32); dist = np.hypot(xx - (cx - x0), yy - (cy - y0))
    disco = np.clip((R * 0.97 - dist) / 1.5, 0, 1)
    if colore is None:                                                       # colore del quadrante generato (le parti chiare)
        v = patch[dist < R * 0.9]; lum = v.mean(1); colore = v[lum >= np.percentile(lum, 70)].mean(0)
    scuro = np.float32(colore) * 0.18
    im = Image.new("L", (L * S, L * S), 0); d = ImageDraw.Draw(im); C = ((cx - x0) * S, (cy - y0) * S)
    if not solo_lancette:
        for k in range(12):
            a = math.radians(k * 30); l0 = R * (0.70 if k % 3 == 0 else 0.76) * S; l1 = R * 0.90 * S
            d.line([(C[0] + l0 * math.sin(a), C[1] - l0 * math.cos(a)), (C[0] + l1 * math.sin(a), C[1] - l1 * math.cos(a))],
                   fill=255, width=max(2, int(R * (0.10 if k % 3 == 0 else 0.06) * S)))
    ang_o, ang_m = lancette if lancette else ((ore % 12 + minuti / 60) * 30, minuti * 6)
    for ang, lun, larg in ((ang_o, 0.50, 0.10), (ang_m, 0.80, 0.065)):
        a = math.radians(ang)
        d.line([(C[0] - 0.12 * R * S * math.sin(a), C[1] + 0.12 * R * S * math.cos(a)),
                (C[0] + lun * R * S * math.sin(a), C[1] - lun * R * S * math.cos(a))], fill=255, width=max(2, int(R * larg * S)))
    d.ellipse([C[0] - R * 0.08 * S, C[1] - R * 0.08 * S, C[0] + R * 0.08 * S, C[1] + R * 0.08 * S], fill=255)
    inch = np.asarray(im.resize((L, L), Image.LANCZOS)).astype(np.float32)[..., None] / 255
    luce = cv2.GaussianBlur(patch, (0, 0), R * 0.25)                         # la luce della scena sul quadrante (sfumature, nebbia)
    lum = luce.mean(2, keepdims=True); lum = lum / (lum[dist < R * 0.9].mean() + 1e-6)
    faccia = np.float32(colore) * np.clip(0.75 + 0.25 * lum, 0.6, 1.15)
    faccia = faccia * (1 - inch) + scuro * inch
    faccia = cv2.GaussianBlur(faccia, (0, 0), 0.6 + R * 0.01) + RNG.standard_normal(faccia.shape).astype(np.float32) * 3
    m_ = (disco if not solo_lancette else np.clip(inch[..., 0] * 1.2, 0, 1))[..., None]
    if solo_lancette:
        faccia = patch * (1 - inch) + scuro * inch
    big[y0:y0 + L, x0:x0 + L] = np.clip(patch * (1 - m_) + faccia * m_, 0, 255).astype(np.uint8)
    return colore


# ---------------------------------------------------------------- manifesto della Notte dei Muti (angolo dell'anno strappato)
def manifesto(w=600, h=760):
    """Stampa a due colori (rosso e nero) su carta: 12 NOVEMBRE / volto di legno / NOTTE DEI MUTI / PIETRASONNA.
    L'angolo in alto a destra, dove c'era l'anno, è strappato. Ritorna BGRA 0-1 e il poligono dello strappo."""
    S = 2; im = Image.new("RGBA", (w * S, h * S), (255, 255, 255, 0)); d = ImageDraw.Draw(im)
    nero, rosso = (22, 20, 20, 255), (168, 26, 22, 255)
    fb = lambda s: _font(str(QUI.parents[2] / "scripts/bivio/fonts/Roboto-Black.ttf"), s * S)
    fm = lambda s: _font(str(QUI.parents[2] / "scripts/bivio/fonts/Roboto-Bold.ttf"), s * S)

    def scritta(testo, y, f, col, cx=w / 2, stretta=0.78, sp=0):
        lg = sum(f.getlength(c) for c in testo) + sp * S * (len(testo) - 1)
        t = Image.new("RGBA", (int(lg) + 20, int(f.size * 1.4)), (0, 0, 0, 0)); dt = ImageDraw.Draw(t); x = 10
        for c in testo:
            dt.text((x, 0), c, font=f, fill=col); x += f.getlength(c) + sp * S
        t = t.resize((int(t.width * stretta), t.height), Image.LANCZOS)        # lettere strette da manifesto
        im.alpha_composite(t, (int(cx * S - t.width / 2), int(y * S)))
    d.rectangle([18 * S, 18 * S, (w - 18) * S, (h - 18) * S], outline=nero, width=5 * S)
    scritta("12 NOVEMBRE", 40, fb(70), rosso, cx=w * 0.40, sp=2)
    # un Muto, come una xilografia: cappuccio nero a punta e spalle, volto di legno chiaro (la carta), due fori, niente bocca
    ox, oy = w / 2, 300
    cappa = [(ox, oy - 150), (ox + 60, oy - 108), (ox + 92, oy - 20), (ox + 100, oy + 70), (ox + 168, oy + 110), (ox + 190, oy + 128),
             (ox - 190, oy + 128), (ox - 168, oy + 110), (ox - 100, oy + 70), (ox - 92, oy - 20), (ox - 60, oy - 108)]
    d.polygon([(x * S, y * S) for x, y in cappa], fill=nero)
    rx, ry = 58, 78
    d.ellipse([(ox - rx) * S, (oy - 8 - ry) * S, (ox + rx) * S, (oy - 8 + ry) * S], fill=(255, 255, 255, 0))
    d.ellipse([(ox - rx) * S, (oy - 8 - ry) * S, (ox + rx) * S, (oy - 8 + ry) * S], outline=nero, width=4 * S)
    for dx in (-24, 24):
        d.ellipse([(ox + dx - 11) * S, (oy - 30 - 11) * S, (ox + dx + 11) * S, (oy - 30 + 11) * S], fill=nero)
    for k in range(5):                                                       # venature del legno, appena accennate
        yv = oy - 60 + 26 * k
        d.arc([(ox - 40) * S, (yv - 6) * S, (ox + 40) * S, (yv + 6) * S], 200, 340, fill=(22, 20, 20, 110), width=2 * S)
    scritta("NOTTE", 448, fb(124), nero, stretta=0.74, sp=4)
    scritta("DEI MUTI", 574, fb(98), nero, stretta=0.70, sp=3)
    scritta("PIETRASONNA", 684, fm(28), rosso, cx=w * 0.34, stretta=0.85, sp=6)
    a = np.asarray(im.resize((w, h), Image.LANCZOS)).astype(np.float32) / 255
    rgb, al = a[..., 2::-1], a[..., 3:]
    st = np.dstack([rgb * al + (1 - al), al])                                 # BGRA: bianco dove non c'è stampa
    r = np.random.default_rng(7)                                              # stampa vecchia: inchiostro non uniforme
    usura = np.clip(0.72 + 0.28 * cv2.GaussianBlur(r.random((h, w)).astype(np.float32), (0, 0), 3) * 3.2, 0, 1)
    st[..., 3] *= usura
    # strappo: dall'alto (x 66%) giù fino al bordo destro (y 22%), bordo frastagliato
    pts = [(w * 0.66, -2)]
    for k in range(1, 14):
        f = k / 14; pts.append((w * (0.66 + 0.34 * f) + r.uniform(-9, 9), h * 0.22 * f ** 0.9 + r.uniform(-9, 9)))
    pts += [(w + 2, h * 0.22), (w + 2, -2)]
    return st, pts


def strappa(big, quad, pts, w, h, K, fondo):
    """Toglie dalla carta l'angolo strappato: lì si vede il muro (fondo = colore medio del muro intorno), con un orlo chiaro di fibre."""
    P = cv2.getPerspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]), np.float32(quad) * K)
    poly = cv2.perspectiveTransform(np.float32(pts)[None], P)[0]
    m_ = np.zeros(big.shape[:2], np.uint8); cv2.fillPoly(m_, [np.round(poly * 4).astype(np.int32)], 255, cv2.LINE_AA, shift=2)
    m_ = cv2.dilate(m_, np.ones((2, 2), np.uint8)).astype(np.float32) / 255
    orlo = np.clip(cv2.GaussianBlur(m_, (0, 0), 1.6) * 2 - m_ * 2, 0, 1)        # fibre chiare sul bordo dello strappo
    ombra = np.clip(cv2.GaussianBlur(m_, (0, 0), 3) - m_, 0, 1)
    b = big.astype(np.float32); r = np.random.default_rng(3)
    muro = np.float32(fondo) * (0.8 + 0.4 * cv2.GaussianBlur(r.random(big.shape[:2]).astype(np.float32), (0, 0), 2))[..., None]
    b = b * (1 - m_[..., None]) + muro * m_[..., None]
    b = b * (1 + 0.35 * orlo[..., None] * (1 - m_[..., None])) * (1 - 0.25 * ombra[..., None])
    return np.clip(b, 0, 255).astype(np.uint8)


def spegni_lampioni(im, lampioni, K, soglia=60):
    """Spegne i lampioni (luce bianca o azzurra) vicino ai punti dati (x, y, raggio, coordinate 576x1024): al posto della luce
    il colore della nebbia intorno, il vetro del lampione scuro. Le lanterne rosse restano accese."""
    B, G, R = im[..., 0], im[..., 1], im[..., 2]; lum = (B + G + R) / 3
    yy, xx = np.mgrid[0:im.shape[0], 0:im.shape[1]].astype(np.float32) / K
    vicino = np.clip(sum(np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (2 * r ** 2)) for x, y, r in lampioni) * 1.6, 0, 1)
    freddo = np.clip((G - 0.62 * R) / (0.2 * R + 10), 0, 1)
    w = np.clip((lum - soglia) / 70, 0, 1) * freddo * vicino
    w = np.clip(cv2.GaussianBlur(w, (0, 0), 1.5 * K) * 1.25, 0, 1); wc = (1 - w) ** 2
    bg = cv2.GaussianBlur(im * wc[..., None], (0, 0), 16 * K) / (cv2.GaussianBlur(wc, (0, 0), 16 * K)[..., None] + 1e-3)
    det = np.clip(lum / (cv2.GaussianBlur(lum, (0, 0), 3 * K) + 2), 0.6, 1.5)[..., None] ** 0.4
    nucleo = cv2.GaussianBlur((np.clip((lum - 185) / 40, 0, 1) * freddo * vicino), (0, 0), 1.2 * K)[..., None]
    return im * (1 - w[..., None]) + bg * det * (1 - 0.5 * nucleo) * w[..., None]


def ammorbidisci(big, zone, K):
    """Sfoca e scurisce piccole zone (x, y, semiasse x, semiasse y, sfocatura, luce; coordinate 576x1024): finte scritte
    generate dal modello (etichette, numeri di quadranti) che non devono leggersi."""
    im = big.astype(np.float32); yy, xx = np.mgrid[0:im.shape[0], 0:im.shape[1]].astype(np.float32) / K
    for cx, cy, ax, ay, sg, luce in zone:
        mk = np.clip(1.5 - np.sqrt(((xx - cx) / ax) ** 2 + ((yy - cy) / ay) ** 2) * 1.5, 0, 1)[..., None]
        im = im * (1 - mk) + cv2.GaussianBlur(im, (0, 0), sg * K) * luce * mk
    return np.clip(im, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------- preparazione delle immagini (una volta sola)
LETTERA = ["L'OROLOGIO", "DEL CAMPANILE", "SI FERMA SEMPRE", "ALLA STESSA ORA.", "VENGA LA SERA DEL 12.", "LA CHIAVE È", "ALLA LOCANDA."]
BIGLIETTO = ["Qualunque cosa senti,", "non uscire."]


def prepara(m):
    K = m.SW / 576
    m.MOV.setdefault("scala1", (1.0, 1.05, 0.0, 0, 0))                     # righe 13-14 sulla stessa immagine: la camera avanza
    m.MOV.setdefault("scala2", (1.05, 1.12, 0.0, 0, 0))                     # senza stacchi verso il portone (e la scheda prosegue)
    for r in m.righe:                                                         # immagini degli stacchi (non sono l'img di nessuna riga)
        n = r.get("stacco", {}).get("img")
        if n and n not in m.IMG and (m.D / "img" / n).exists():
            m.IMG[n] = m.carica(n)
    if "s01_via.png" in m.IMG:                                                # campanile alle nove meno cinque
        big, dep = m.IMG["s01_via.png"]; quadrante(big, (292.5, 271.3), 19.5, 8, 55, K)
    if "s02_lettera.png" in m.IMG:                                            # la lettera che ti ha chiamato: stampatello tremante
        big, dep = m.IMG["s02_lettera.png"]; w, h = 1020, 1260
        a = stampatello(LETTERA, w, h, 95, 58, 56, passo=1.24)
        m.IMG["s02_lettera.png"] = (su_foglio(big, [(137.5, 233.5), (474, 238.5), (478.5, 659), (127.5, 652.5)], a, (0.20, 0.17, 0.16), K, 0.8), dep)
    if "s03_ingresso.png" in m.IMG:                                           # manifesto e orologio dell'ingresso (21 meno 3)
        big, dep = m.IMG["s03_ingresso.png"]; quad = [(232.5, 350.5), (338, 350.5), (339, 483), (234.5, 482.5)]
        big = ammorbidisci(big, [(457, 285, 24, 50, 2.5, 0.8)], K)              # quadrante della pendola in alto a destra: niente numeri finti
        st, pts = manifesto(); big2, _ = su_foglio_colore(big, quad, st, K)
        fondo = big[int(360 * K):int(470 * K), int(342 * K):int(352 * K)].reshape(-1, 3).mean(0)
        big2 = strappa(big2, quad, pts, st.shape[1], st.shape[0], K, fondo)
        quadrante(big2, (214.25, 391.25), 14.2, 8, 57, K)
        m.IMG["s03_ingresso.png"] = (big2, dep)
    if "s04_bancone.png" in m.IMG:                                            # il biglietto legato alla chiave, già scritto
        big, dep = m.IMG["s04_bancone.png"]; w, h = 800, 600
        big = ammorbidisci(big, [(548, 85, 44, 88, 6.0, 0.5)], K)               # etichetta con finte scritte sul barattolo in alto a destra
        a = corsivo(BIGLIETTO, w, h, 78, [(150, 230), (330, 340)], seme=4)
        m.IMG["s04_bancone.png"] = (su_foglio(big, [(323.75, 485), (493.75, 527), (464.5, 656.25), (289.5, 613)], a, (0.16, 0.15, 0.17), K, 0.6), dep)
    if "s05_biglietto.png" in m.IMG:                                          # il biglietto da vicino: corsivo elegante, inchiostro nero
        big, dep = m.IMG["s05_biglietto.png"]; w, h = 1000, 1300
        yy, xx = np.mgrid[0:big.shape[0], 0:big.shape[1]].astype(np.float32) / K        # il pollice senza guanto in basso a destra: in ombra
        big = (big * (1 - 0.88 * np.exp(-(((xx - 548) / 42) ** 2 + ((yy - 728) / 52) ** 2)))[..., None]).astype(np.uint8)
        a = corsivo(BIGLIETTO, w, h, 104, [(70, 150), (300, 320)], seme=5)
        m.IMG["s05_biglietto.png"] = (su_foglio(big, [(60, 221.5), (546, 236.5), (561, 860), (124, 865)], a, (0.10, 0.10, 0.12), K, 0.9), dep)
    if "s12_volto_c.png" in m.IMG:                                            # volto di legno: tolto l'accenno di naso, resta liscio
        big, dep = m.IMG["s12_volto_c.png"]; im = big.astype(np.float32)
        yy, xx = np.mgrid[0:im.shape[0], 0:im.shape[1]].astype(np.float32) / K
        mk = np.clip(1.6 - np.sqrt(((xx - 298) / 56) ** 2 + ((yy - 540) / 34) ** 2) * 1.6, 0, 1)[..., None]
        m.IMG["s12_volto_c.png"] = ((im * (1 - mk) + np.roll(im, -int(52 * K), axis=0) * mk).astype(np.uint8), dep)
    if "s13_sotto_b.png" in m.IMG:                                            # il Muto sotto la finestra: maschera liscia sotto il naso,
        big, dep = m.IMG["s13_sotto_b.png"]; im = big.astype(np.float32)      # e il lumicino lontano a sinistra spento (ogni luce è spenta)
        yy, xx = np.mgrid[0:im.shape[0], 0:im.shape[1]].astype(np.float32) / K
        for (cx, cy, ax, ay, sg, scuro) in ((303, 437, 20, 11, 4.0, 1.0), (225, 342, 12, 12, 5.0, 0.55)):
            mk = np.clip(1.5 - np.sqrt(((xx - cx) / ax) ** 2 + ((yy - cy) / ay) ** 2) * 1.5, 0, 1)[..., None]
            im = im * (1 - mk) + cv2.GaussianBlur(im, (0, 0), sg * K) * scuro * mk
        m.IMG["s13_sotto_b.png"] = (im.astype(np.uint8), dep)
    if "s12_fila_b.png" in m.IMG:                                             # i Muti in fila: i lampioni generati vanno spenti (ogni luce è spenta)
        big, dep = m.IMG["s12_fila_b.png"]
        big = spegni_lampioni(big.astype(np.float32), [(150, 145, 60), (195, 274, 38), (282, 375, 34), (441, 385, 48)], K)
        m.IMG["s12_fila_b.png"] = (np.clip(big, 0, 255).astype(np.uint8), dep)
    if "s08_campanile.png" in m.IMG:                                          # quadrante pulito, le lancette si disegnano a ogni fotogramma
        big, dep = m.IMG["s08_campanile.png"]; base = big.copy()
        col = quadrante(base, OR8[0], OR8[1], 8, 59, K)
        OROLOGIO8.update(base=base, colore=col)
    if "s09_via_alto.png" in m.IMG:
        prepara_via(m, K)


# ---------------------------------------------------------------- riga 8: le lancette del campanile scattano sulle nove
OR8 = ((290.0, 349.3), 34.5)                                                 # centro e raggio del quadrante in s08
OROLOGIO8 = {}


def campanile_alle_nove(fr, r, tau, u, t, m):
    K = m.SW / 576; i = m.righe.index(r)
    t_scatto = _inizio_parola(m, r, "nove")
    t_scatto = (m.T[i]["inizio"] + 0.4) if t_scatto is None else t_scatto + 0.05
    x = (t - t_scatto) / 0.16                                                # scatto con un piccolo rimbalzo, come i vecchi orologi da torre
    salto = 0.0 if x <= 0 else 1.0 + 0.12 * math.exp(-3 * (x - 1)) * math.sin(9 * (x - 1)) if x >= 1 else x ** 2
    ang_m = 354 + 6 * salto; ang_o = 269.5 + 0.5 * min(1.0, max(0.0, salto))
    big = OROLOGIO8["base"].copy()
    quadrante(big, OR8[0], OR8[1], 0, 0, K, colore=OROLOGIO8["colore"], lancette=(ang_o, ang_m))
    return _con_immagine(m, "s08_campanile.png", big, r, u, tau)


# ---------------------------------------------------------------- righe 9-11: la via dall'alto, le luci si spengono, poi le luci rosse
# gruppi di luci (x, y, raggio) in s09, dal più vicino al più lontano: si spengono in quest'ordine
GRUPPI = [(515, 880, 120), (380, 650, 95), (300, 640, 110), (222, 500, 55), (270, 497, 50), (373, 400, 26), (322, 440, 50),
          (378, 310, 26), (260, 293, 16), (295, 325, 16)]
VIA = {}


def prepara_via(m, K):
    """Versione «spenta» della via (la luce calda sostituita dal colore freddo dei dintorni) e pesi di ogni gruppo di luci."""
    big, dep = m.IMG["s09_via_alto.png"]; im = big.astype(np.float32)
    B, G, R = im[..., 0], im[..., 1], im[..., 2]; lum = (B + G + R) / 3
    w = np.clip((R - B - 4) / 35, 0, 1); w = np.maximum(w, np.clip((lum - 140) / 60, 0, 1))
    w = np.clip(cv2.GaussianBlur(w, (0, 0), 1.5 * K) * 1.3, 0, 1); wc = (1 - w) ** 2
    bg = cv2.GaussianBlur(im * wc[..., None], (0, 0), 22 * K) / (cv2.GaussianBlur(wc, (0, 0), 22 * K)[..., None] + 1e-3)
    det = np.clip(lum / (cv2.GaussianBlur(lum, (0, 0), 3 * K) + 2), 0.55, 1.6)[..., None] ** 0.7
    off = im * (1 - w[..., None]) + np.minimum(bg * det * 0.92, 60) * w[..., None]
    h4, w4 = big.shape[0] // 4, big.shape[1] // 4                            # pesi a un quarto della risoluzione (sono morbidi)
    yy, xx = np.mgrid[0:h4, 0:w4].astype(np.float32) * (4 / K)
    pesi = [np.exp(-2.0 * (((xx - x) ** 2 + (yy - y) ** 2) / rr ** 2)) for x, y, rr in GRUPPI]
    VIA.update(on=im, off=off, pesi=pesi, tot=sum(pesi) + 0.03, dep=dep)


def _righe_via(m):
    """Indici delle tre righe sulla via (luci che si spengono, silenzio, luci rosse) e della riga dopo."""
    v = [i for i, r in enumerate(m.righe) if r.get("effetto") == "via"]
    return v[:3] + [v[2] + 1]


def _camera_via(m, t):
    """Camera continua sulle righe 9, 10 e 11 (stessa immagine): piccola salita lungo la via, attesa, poi avanza verso il fondo."""
    i9, i10, i11, i12 = _righe_via(m); T = m.T
    if t < T[i10]["inizio"]:
        e = m.ease(min(1.0, max(0.0, (t - T[i9]["inizio"]) / (T[i10]["inizio"] - T[i9]["inizio"]))))
        return 1.04 + 0.03 * e, 40 - 60 * e, 0.03 * e
    if t < T[i11]["inizio"]:
        u = (t - T[i10]["inizio"]) / (T[i11]["inizio"] - T[i10]["inizio"])
        return 1.07 + 0.004 * u, -20 - 2 * u, 0.03 + 0.003 * u
    e = m.ease(min(1.0, max(0.0, (t - T[i11]["inizio"]) / (T[i12]["inizio"] - T[i11]["inizio"]))))
    return 1.074 + 0.12 * e, -22 + 120 * e, 0.033 + 0.04 * e


def _spente(m, t):
    """Quanto è spento ogni gruppo di luci all'istante t: uno dopo l'altro durante la voce della riga 9."""
    i9 = _righe_via(m)[0]; r9 = m.T[i9]; t0 = r9["inizio"] + 0.45; t1 = r9["voce_fine"] - 0.25
    n = len(GRUPPI); return [min(1.0, max(0.0, (t - (t0 + (t1 - t0) * k / (n - 1))) / 0.12)) for k in range(n)]


LUCI_ROSSE = [(287.0, 543.0, 0.0), (300.0, 563.0, 2.1), (314.0, 587.0, 4.0)]   # in fila in fondo alla via (x, y, fase)


def _luci_rosse(img, m, t, K):
    """Tre lanterne rosse basse che escono dalla nebbia in fondo alla via e ondeggiano; riflesso sul selciato bagnato."""
    i11 = _righe_via(m)[2]; t11 = m.T[i11]["inizio"]
    if t < t11:
        return img
    tau = t - t11; comp = min(1.0, tau / 1.4) ** 1.5; avanti = 0.6 * tau   # compaiono piano e scendono la via verso di te
    H, W = img.shape[:2]; out = img
    for x, y, fase in LUCI_ROSSE:
        dx = 1.3 * math.sin(2 * math.pi * tau / 1.15 + fase); dy = 0.5 * abs(math.sin(2 * math.pi * tau / 1.15 + fase)) + avanti * 2
        cx, cy = (x + dx) * K, (y + dy) * K
        tr = 0.85 + 0.15 * math.sin(2 * math.pi * 5.3 * tau + fase * 3) * math.sin(2 * math.pi * 1.7 * tau + fase)
        x0, x1 = int(max(0, cx - 70 * K)), int(min(W, cx + 70 * K)); y0, y1 = int(max(0, cy - 60 * K)), int(min(H, cy + 90 * K))
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32); d2 = (xx - cx) ** 2 + (yy - cy) ** 2
        nucleo = np.exp(-d2 / (2 * (1.3 * K) ** 2)); alone = np.exp(-d2 / (2 * (4.8 * K) ** 2)); nebbia = np.exp(-d2 / (2 * (22 * K) ** 2))
        riflesso = np.exp(-((xx - cx) ** 2 / (2 * (2.6 * K) ** 2) + (yy - cy - 15 * K) ** 2 / (2 * (9 * K) ** 2)))
        luce = (nucleo[..., None] * np.float32([150, 175, 255]) + alone[..., None] * np.float32([25, 30, 210]) * 0.85
                + nebbia[..., None] * np.float32([12, 12, 95]) * 0.32 + riflesso[..., None] * np.float32([10, 14, 150]) * 0.40)
        out[y0:y1, x0:x1] += luce * comp * tr
    return out


def via(fr, r, tau, u, t, m):
    """Righe 9, 10, 11: la stessa via dall'alto con camera continua; le luci si spengono, silenzio, poi le luci rosse."""
    K = m.SW / 576; sp = _spente(m, t)
    f = sum(s * p for s, p in zip(sp, VIA["pesi"])) + (0.03 if min(sp) >= 1 else 0.0)
    f = cv2.resize(f / VIA["tot"], (m.SW, m.SH), interpolation=cv2.INTER_LINEAR)[..., None]
    img = VIA["on"] + (VIA["off"] - VIA["on"]) * f
    img = _luci_rosse(img, m, t, K)
    z, py, kd = _camera_via(m, t)
    k = (m.SW / m.W) / (m.M * z); dd = VIA["dep"] - 0.5
    mx = m.SW / 2 + m.GX * k * (1 - kd * dd); my = m.SH / 2 + m.GY * k * (1 - kd * dd) + py
    return cv2.remap(img, mx.astype(np.float32), my.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


_m = sys.modules.get("__main__")
if _m is not None and hasattr(_m, "IMG") and hasattr(_m, "SW"):
    prepara(_m)


# ---------------------------------------------------------------- ritocchi per ogni fotogramma
def _tremolio(t, forza, seme=0.0):
    return forza * (0.45 * math.sin(2 * math.pi * 7.3 * t + seme) + 0.33 * math.sin(2 * math.pi * 11.7 * t + 1.3 + seme)
                    + 0.22 * math.sin(2 * math.pi * 3.1 * t + 2.1 + seme) + 0.25 * math.sin(2 * math.pi * 17.9 * t + seme * 2))


def _caldo(fr):
    b, g, r = fr[..., 0], fr[..., 1], fr[..., 2]; lum = (b + g + r) / 3
    return (np.clip((r - b - 25) / 90, 0, 1) * np.clip((lum - 40) / 110, 0, 1))[..., None]


def _con_immagine(m, nome, big, r, u, tau, mov=None, seme=None):
    """Fotogramma della riga r calcolato da un'immagine grande modificata (stesso movimento di camera)."""
    vecchio = m.IMG[nome]; m.IMG[nome] = (big, vecchio[1])
    try:
        return m.muovi(nome, mov or r.get("mov", "avanza_lento"), u, tau, float(m.righe.index(r)) if seme is None else seme)
    finally:
        m.IMG[nome] = vecchio


def _inizio_parola(m, r, parola):
    i = m.righe.index(r)
    return next((w[0] for w in m.parole[i] if parola.lower() in w[2].lower()), None)


def dopo(fr, r, tau, u, t, m):
    eff = r.get("effetto")
    if eff == "fuoco":                                                        # il fuoco della stufa trema
        fr = fr * (1 + _tremolio(t, 0.16) * _caldo(fr)) * (1 + _tremolio(t, 0.02, 4.0))
    if eff == "lume":                                                         # il lume trema
        fr = fr * (1 + _tremolio(t, 0.22, 1.7) * _caldo(fr)) * (1 + _tremolio(t, 0.04, 0.4))
    if r.get("stacco"):                                                       # stacco stretto sul volto di legno
        st = r["stacco"]; i = m.righe.index(r); t0 = _inizio_parola(m, r, st["parola"])
        if t0 is not None and t >= t0 - 0.06:
            fine = m.T[i + 1]["inizio"] if i + 1 < len(m.T) else m.TOT; t0 -= 0.06
            fr = m.muovi(st["img"], st.get("mov", "avanza"), min(1.0, (t - t0) / max(fine - t0, 1e-3)), t - t0, float(i) + 0.5)
    if eff == "orologio" and OROLOGIO8:
        fr = campanile_alle_nove(fr, r, tau, u, t, m)
    if eff == "via" and VIA:
        fr = via(fr, r, tau, u, t, m)
    return fr
