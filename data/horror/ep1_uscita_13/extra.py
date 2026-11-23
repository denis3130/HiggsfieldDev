"""USCITA 13 — Episodio 1: tutto quello che serve solo a questa storia, disegnato col codice (monta.py carica questo file da sé).

1. Al caricamento si «cuociono» nelle immagini le scritte (mai generate dal modello): il cartello «USCITA 13 · Valdifosca · 4 km»,
   il cartoncino con l'elenco delle uscite (manca la 13), il biglietto giallo scritto a mano; si spengono o si sfocano le cifre
   e le insegne che il modello ha inventato per sbaglio (prezzi, marchi, display), e i fari della berlina (deve avere i fari spenti).
2. Per ogni inquadratura gli effetti scelti in episodio.json con la chiave "effetti":
   gocce (sul vetro, rifrangono quello che c'è dietro), tergi (un passaggio del tergicristallo che le pulisce), crepa (parabrezza),
   telo (brandelli di plastica nera che sbattono sul bordo del cartello), pioggia (che cade, visibile nelle luci), lampo,
   stop (le luci rosse si accendono), neon (uno che tremola), colpi (tre nocche sul vetro: il quadro sobbalza),
   fuoco (passa dalla mano alla berlina sullo sfondo), vibra (vibrazione del motore).
3. Righe speciali: "camera" (salita o discesa verticale della camera) e "tachimetro" (disegnato da zero, la lancetta segue la voce).
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

m = sys.modules["__main__"]                      # monta.py: IMG, muovi, atmosfera, font, MOV… sono già pronti
QUI = Path(__file__).resolve().parent
W, H, SW, SH = m.W, m.H, m.SW, m.SH
RIGHE = m.righe
CAVEAT = str(QUI / "fonts" / "Caveat-SemiBold.woff")      # scrittura a mano (SIL OFL 1.1, vedi fonts/OFL_Caveat.txt)
VERDE_AUTOSTRADA = (12, 140, 88)                           # RGB
smooth = lambda x, a, b: np.clip((x - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((x - a) / (b - a), 0, 1))


def manoscritto(size):
    return ImageFont.truetype(CAVEAT, size)


def big_xy(x, y):
    """Coordinate dell'immagine generata (576×1024) → coordinate dell'immagine ingrandita di monta.py (SW×SH)."""
    return x * SW / 576, y * SH / 1024


def quad_big(q):
    return np.float32([big_xy(x, y) for x, y in q])


# ---------------------------------------------------------------- 1. scritte e ritocchi cotti nelle immagini
def in_prospettiva(strato, q):
    """strato: PIL RGBA (anche sovracampionato) → float32 RGBA 0-1 grande come l'immagine, messo sul quadrilatero q (TL, TR, BR, BL)."""
    dst = quad_big(q)
    lw = int(max(np.linalg.norm(dst[1] - dst[0]), np.linalg.norm(dst[2] - dst[3])))
    lh = int(max(np.linalg.norm(dst[3] - dst[0]), np.linalg.norm(dst[2] - dst[1])))
    s = strato.resize((lw, lh), Image.LANCZOS)
    a = np.asarray(s).astype(np.float32) / 255
    a = np.dstack([a[..., 2::-1], a[..., 3:]])                                  # RGBA → BGRA
    P = cv2.getPerspectiveTransform(np.float32([[0, 0], [lw, 0], [lw, lh], [0, lh]]), dst)
    return cv2.warpPerspective(a, P, (SW, SH), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))


def maschera_quad(q, sfuma=1.5):
    mk = np.zeros((SH, SW), np.float32)
    cv2.fillConvexPoly(mk, quad_big(q).astype(np.int32), 1.0, cv2.LINE_AA)
    return cv2.GaussianBlur(mk, (0, 0), sfuma)


def ritocca(nome, ops):
    """Spegne, sfoca o ripara zone dell'immagine (coordinate 576×1024): ("sfoca", box, sigma), ("spegni", box, BGR),
    ("ripara", box, soglia) = toglie le luci più forti di soglia ricostruendo dai bordi (fari della berlina)."""
    big, dep = m.IMG[nome]; big = big.copy()
    for op in ops:
        tipo, (x0, y0, x1, y1) = op[0], op[1]
        X0, Y0 = map(int, big_xy(x0, y0)); X1, Y1 = map(int, big_xy(x1, y1))
        zona = big[Y0:Y1, X0:X1].astype(np.float32)
        mk = np.zeros((SH, SW), np.float32); mk[Y0:Y1, X0:X1] = 1
        mk = cv2.GaussianBlur(mk, (0, 0), 6)[..., None]
        if tipo == "sfoca":
            nuovo = cv2.GaussianBlur(big.astype(np.float32), (0, 0), op[2])
        elif tipo == "spegni":                                                   # pannello spento: colore uniforme con un filo di luce
            nuovo = big.astype(np.float32).copy(); g = np.linspace(1.08, 0.9, Y1 - Y0)[:, None, None]
            nuovo[Y0:Y1, X0:X1] = np.array(op[2], np.float32) * g + cv2.GaussianBlur(zona, (0, 0), 12) * 0.12
        else:                                                                    # ripara: inpaint delle luci troppo forti (o solo di quelle verdi)
            z = big[Y0:Y1, X0:X1]
            if len(op) > 3 and op[3] == "verde":
                zi = z.astype(np.int16); luce = (zi[..., 1] > zi[..., 2] + 35) & (zi[..., 1] > zi[..., 0] + 5) & (zi[..., 1] > op[2])
            elif len(op) > 3 and op[3] == "rosso":
                zi = z.astype(np.int16); luce = (zi[..., 2] > zi[..., 1] + 50) & (zi[..., 2] > zi[..., 0] + 40) & (zi[..., 2] > op[2])
            else:
                luce = zona.mean(2) > op[2]
            luce = cv2.dilate(luce.astype(np.uint8) * 255, np.ones((7, 7), np.uint8))
            pezzo = cv2.inpaint(z.copy(), luce, 9, cv2.INPAINT_TELEA).astype(np.float32)
            ml = cv2.GaussianBlur(luce.astype(np.float32) / 255, (0, 0), 2)[..., None]
            nuovo = big.astype(np.float32).copy(); nuovo[Y0:Y1, X0:X1] = zona * (1 - ml) + pezzo * (1 - 0.15 * ml) * ml
        big = np.clip(big * (1 - mk) + nuovo * mk, 0, 255).astype(np.uint8)
    m.IMG[nome] = (big, dep)


def cuoci_cartello(nome, q, righe_txt):
    """Cartello verde autostradale: la faccia diventa del verde vero (tenendo la luce dei fari) e si scrive col codice."""
    big, dep = m.IMG[nome]; b = big.astype(np.float32)
    faccia = maschera_quad(q, 2.0)
    verde = ((b[..., 1] > 90) & (b[..., 1] > b[..., 0] + 30) & (b[..., 1] > b[..., 2] + 60)).astype(np.float32)
    verde = cv2.GaussianBlur(cv2.erode(verde, np.ones((3, 3), np.uint8)), (0, 0), 1.2) * faccia
    luce = cv2.GaussianBlur(b[..., 1], (0, 0), 6) / 199.0
    ys = np.linspace(0, 1, SH, dtype=np.float32)[:, None]
    y0, y1 = quad_big(q)[:, 1].min(), quad_big(q)[:, 1].max()
    grad = 0.82 + 0.3 * np.clip((ys * SH - y0) / (y1 - y0), 0, 1)                # i fari la illuminano più in basso
    rum = cv2.GaussianBlur(np.random.default_rng(3).standard_normal((SH, SW)).astype(np.float32), (0, 0), 1.0) * 0.035
    col = np.array(VERDE_AUTOSTRADA[::-1], np.float32) * (np.clip(luce, 0.5, 1.15) * grad + rum)[..., None]
    b = b * (1 - verde[..., None]) + col * verde[..., None]
    # scritte: si disegnano su un rettangolo sovracampionato e si mettono in prospettiva sulla faccia
    S = 4; dst = quad_big(q); lw = int(np.linalg.norm(dst[1] - dst[0])); lh = int(np.linalg.norm(dst[3] - dst[0]))
    BI = (238, 244, 238, 255)
    st = Image.new("RGBA", (lw * S, lh * S), BI[:3] + (0,)); d = ImageDraw.Draw(st)        # fondo bianco trasparente: niente aloni scuri
    k1 = 1.0
    while True:                                                                  # la prima riga (USCITA [13]) deve stare nell'82% della larghezza
        f1 = m.font("Bold", int(lh * S * 0.15 * k1)); f13 = m.font("Black", int(lh * S * 0.21 * k1))
        w1 = f1.getlength(righe_txt[0]); bw = f13.getlength(righe_txt[1]) + lh * S * 0.11 * k1; gap = lh * S * 0.06 * k1
        if w1 + gap + bw <= lw * S * 0.82 or k1 < 0.5:
            break
        k1 -= 0.04
    f2 = m.font("Medium", int(lh * S * 0.16)); f3 = m.font("Bold", int(lh * S * 0.16))
    while f2.getlength(righe_txt[2]) > lw * S * 0.84:
        f2 = m.font("Medium", int(f2.size * 0.95))
    # riga 1: USCITA [13]
    x = (lw * S - (w1 + gap + bw)) / 2; yc = lh * S * 0.25
    d.text((x, yc), righe_txt[0], font=f1, fill=BI, anchor="lm")
    bx0 = x + w1 + gap
    bh = lh * S * 0.26 * k1
    d.rounded_rectangle([bx0, yc - bh / 2, bx0 + bw, yc + bh / 2], int(lh * S * 0.04), fill=BI)
    d.text((bx0 + bw / 2, yc + lh * S * 0.005), righe_txt[1], font=f13, fill=VERDE_AUTOSTRADA + (255,), anchor="mm")
    d.text((lw * S / 2, lh * S * 0.55), righe_txt[2], font=f2, fill=BI, anchor="mm")
    d.text((lw * S / 2, lh * S * 0.80), righe_txt[3], font=f3, fill=BI, anchor="mm")
    st = st.filter(ImageFilter.GaussianBlur(0.9 * S))                         # morbide come il resto della foto
    t = in_prospettiva(st, q)
    a = t[..., 3:] * faccia[..., None]
    lumf = np.clip(cv2.GaussianBlur(luce, (0, 0), 20), 0.65, 1.1)[..., None]
    b = b * (1 - a) + t[..., :3] * 255 * lumf * grad[..., None] * a
    alone = cv2.GaussianBlur(a[..., 0] * (t[..., 1] > 0.8), (0, 0), 7)[..., None]      # le lettere bianche rifrangenti brillano
    b = b + alone * np.array([200, 215, 200], np.float32) * 0.22
    m.IMG[nome] = (np.clip(b, 0, 255).astype(np.uint8), dep)


def cuoci_inchiostro(nome, q, disegna_su, soglia=None):
    """Scrive su una superficie chiara (cartoncino, biglietto) con l'inchiostro: moltiplica, così prende la luce della scena.
    disegna_su(d, lw, lh, S): disegna in nero/colore su fondo bianco. soglia=(a, b): scrive solo dove la superficie è chiara
    (il bordo della tasca davanti al cartoncino resta sopra la scritta)."""
    big, dep = m.IMG[nome]; b = big.astype(np.float32)
    S = 3; dst = quad_big(q); lw = int(np.linalg.norm(dst[1] - dst[0])); lh = int(np.linalg.norm(dst[3] - dst[0]))
    st = Image.new("RGBA", (lw * S, lh * S), (255, 255, 255, 0)); d = ImageDraw.Draw(st)
    disegna_su(d, lw * S, lh * S, S)
    st = st.filter(ImageFilter.GaussianBlur(0.6 * S))
    t = in_prospettiva(st, q)
    a = t[..., 3:] * maschera_quad(q, 1.0)[..., None]
    if soglia:
        lum = cv2.GaussianBlur(b.mean(2), (0, 0), 3)
        a = a * smooth(lum, *soglia)[..., None]
    fattore = 1 - a * (1 - t[..., :3])                                          # inchiostro: moltiplica il colore della carta
    m.IMG[nome] = (np.clip(b * fattore, 0, 255).astype(np.uint8), dep)


def testo_cartoncino(voci):
    def disegna(d, lw, lh, S):
        f0 = m.font("Bold", int(lh * 0.085)); fn = m.font("Black", int(lh * 0.135)); x0 = lw * 0.09; bw, bh = lw * 0.21, lh * 0.13
        spazio = lw * 0.9 - (x0 + bw + lw * 0.05); fs = m.font("Bold", int(lh * 0.092))
        while max(fs.getlength(nm) for _, nm in voci) > spazio:
            fs = m.font("Bold", int(fs.size * 0.95))
        d.text((x0, lh * 0.12), "USCITE", font=f0, fill=(20, 22, 26, 235), anchor="lm")
        d.line([(x0, lh * 0.19), (lw * 0.91, lh * 0.19)], fill=(20, 22, 26, 200), width=int(S * 2.2))
        for k, (num, nome) in enumerate(voci):
            yc = lh * (0.33 + 0.19 * k)
            d.rounded_rectangle([x0, yc - bh / 2, x0 + bw, yc + bh / 2], int(lh * 0.02), fill=VERDE_AUTOSTRADA + (245,))
            d.text((x0 + bw / 2, yc + lh * 0.004), num, font=fn, fill=(255, 255, 255, 255), anchor="mm")     # bianco = carta: il numero «buca» il verde
            d.text((x0 + bw + lw * 0.05, yc), nome, font=fs, fill=(20, 22, 26, 240), anchor="lm")
    return disegna


def testo_biglietto(righe_txt, sottolinea):
    def disegna(d, lw, lh, S):
        inch = (28, 36, 92, 238)
        f = manoscritto(int(lh * 0.125)); passo = lh * 0.142; y = lh * 0.13
        g = np.random.default_rng(7)
        for k, r in enumerate(righe_txt):
            x = lw * (0.08 + 0.025 * g.random()); yy = y + passo * k + g.normal(0, lh * 0.004)
            d.text((x, yy), r, font=f, fill=inch, anchor="lm")
            if k == sottolinea:                                                  # «Esci alla 13.» sottolineato due volte, a mano
                L = f.getlength(r)
                for j, dy in enumerate((lh * 0.055, lh * 0.075)):
                    pts = [(x + L * s, yy + dy + lh * 0.006 * np.sin(9 * s + j) - lh * 0.01 * s) for s in np.linspace(0, 1, 30)]
                    d.line(pts, fill=inch, width=int(S * 3.2), joint="curve")
    return disegna


# ---------------------------------------------------------------- 2. effetti per inquadratura
_LUM = {}


def luce_locale(fr):
    """Luminosità media intorno a ogni punto (0-255), calcolata in piccolo: serve a far vedere pioggia e riflessi solo dove c'è luce."""
    p = cv2.resize(fr.mean(2), (W // 8, H // 8), interpolation=cv2.INTER_AREA)
    return cv2.resize(cv2.GaussianBlur(p, (0, 0), 3), (W, H), interpolation=cv2.INTER_LINEAR)


def proietta(nome, mov, u, tau, seme, xb, yb):
    """Dove finisce sullo schermo un punto dell'immagine (coordinate SW×SH) col movimento di camera di monta.py; anche la scala."""
    big, dep = m.IMG[nome]
    z0, z1, kd, pan, par = m.MOV[mov]
    uu = 1 - (1 - u) ** 2 if mov == "arretra" else m.ease(u)
    z = z0 + (z1 - z0) * uu
    px = pan * (2 * min(uu, 1.0) - 1); py = 0.0
    if mov == "mano":
        px += 7 * np.sin(2.1 * tau + seme) + 4 * np.sin(5.3 * tau + 2 * seme); py += 6 * np.sin(1.7 * tau + 3 * seme) + 3 * np.sin(4.4 * tau + seme)
    k = (SW / W) / (m.M * z)
    xo, yo = int(np.clip(xb * W / SW, 0, W - 1)), int(np.clip(yb * H / SH, 0, H - 1))
    dd = dep[yo, xo] - 0.5; osc = (2 * min(uu, 1.0) - 1) if pan else np.sin(1.3 * tau + seme)
    sc = k * (1 - kd * dd * uu)
    return W / 2 + (xb - SW / 2 - px - par * dd * osc) / sc, H / 2 + (yb - SH / 2 - py) / sc, 1 / sc


# --- gocce sul vetro: ognuna è una lentina che mostra, capovolto e sfocato, quello che c'è dietro
_SPR = {}


def sprite(r, e):
    k = (round(r * 2) / 2, round(e, 2))
    if k not in _SPR:
        r = k[0]; R = int(np.ceil(r * e * 1.2)) + 2
        yy, xx = np.mgrid[-R:R + 1, -R:R + 1].astype(np.float32)
        rho = np.sqrt((xx / r) ** 2 + (yy / (r * e)) ** 2)
        a = np.clip((1.0 - rho) / 0.22, 0, 1)
        ox, oy = -xx * 2.4, -yy * 2.4 - r * 0.8
        sh = 1 - 0.55 * np.clip((rho - 0.5) / 0.5, 0, 1) ** 1.6
        hl = 0.95 * np.exp(-(((xx + 0.3 * r) / (0.2 * r)) ** 2 + ((yy + 0.36 * r * e) / (0.15 * r * e)) ** 2))
        hl += 0.35 * np.exp(-((rho - 0.74) / 0.1) ** 2) * (yy > 0.2 * r)
        _SPR[k] = (R, a, ox, oy, sh, hl * a)
    return _SPR[k]


class Gocce:
    """Gocce con nascita, morte (tergicristallo) e velocità (quelle che colano)."""

    def __init__(self, seme, n, rmin, rmax, allung, nascita=(-1.0, -1.0), zona=(0, 0, 1, 1), espo=2.6):
        g = np.random.default_rng(seme); self.g = g
        self.x = g.uniform(zona[0], zona[2], n) * W; self.y = g.uniform(zona[1], zona[3], n) * H
        self.r = rmin + (rmax - rmin) * g.random(n) ** espo
        self.e = allung * (1 + 0.15 * g.random(n)); self.t0 = g.uniform(nascita[0], nascita[1], n)
        self.t1 = np.full(n, 1e9); self.vx = np.zeros(n); self.vy = np.zeros(n)

    def aggiungi(self, x, y, r, e, t0, t1=1e9, vx=0.0, vy=0.0):
        n = np.size(x)
        for nm, v in (("x", x), ("y", y), ("r", r), ("e", e), ("t0", t0), ("t1", t1), ("vx", vx), ("vy", vy)):
            setattr(self, nm, np.append(getattr(self, nm), np.broadcast_to(np.asarray(v, float), (n,)) if np.ndim(v) == 0 else v))

    def colate(self, seme, n, tmin, tmax, vmin=60, vmax=180, rmin=4.5, rmax=8.0, zona=(0.05, 0.0, 0.95, 0.55)):
        """Gocce che colano giù lasciando dietro una scia di goccioline ferme."""
        g = np.random.default_rng(seme)
        for _ in range(n):
            x, y = g.uniform(zona[0], zona[2]) * W, g.uniform(zona[1], zona[3]) * H
            r = g.uniform(rmin, rmax); v = g.uniform(vmin, vmax); t0 = g.uniform(tmin, tmax); vx = g.normal(0, 6)
            self.aggiungi(x, y, r, 1.35, t0, 1e9, vx, v)
            for j in range(1, 40):                                              # scia
                tj = t0 + j * 22 / v
                self.aggiungi(x + vx * (tj - t0) + g.normal(0, 1.2), y + v * (tj - t0), r * g.uniform(0.25, 0.45), 1.1, tj)

    def disegna(self, fr, t, lum, forza=1.0, maschera=None):
        vis = (self.t0 <= t) & (self.t1 > t)
        if not vis.any():
            return fr
        A = np.zeros((H, W), np.float32); OX = np.zeros_like(A); OY = np.zeros_like(A); SHD = np.ones_like(A); HL = np.zeros_like(A)
        idx = np.nonzero(vis)[0]; idx = idx[np.argsort(self.r[idx])]
        for i in idx:
            R, a, ox, oy, sh, hl = sprite(self.r[i], self.e[i])
            cx = int(self.x[i] + self.vx[i] * (t - self.t0[i])); cy = int(self.y[i] + self.vy[i] * (t - self.t0[i]))
            x0, y0 = cx - R, cy - R; n = 2 * R + 1
            X0, Y0, X1, Y1 = max(0, x0), max(0, y0), min(W, x0 + n), min(H, y0 + n)
            if X1 <= X0 or Y1 <= Y0:
                continue
            sl = (slice(Y0 - y0, Y1 - y0), slice(X0 - x0, X1 - x0)); dl = (slice(Y0, Y1), slice(X0, X1))
            nuova = np.clip((t - self.t0[i]) / 0.12, 0, 1)                      # appena caduta: compare in un attimo
            aa = a[sl] * nuova; sel = aa > A[dl]
            A[dl] = np.where(sel, aa, A[dl]); OX[dl] = np.where(sel, ox[sl], OX[dl]); OY[dl] = np.where(sel, oy[sl], OY[dl])
            SHD[dl] = np.where(sel, sh[sl], SHD[dl]); HL[dl] = np.where(sel, hl[sl] * nuova, HL[dl])
        if maschera is not None:
            A *= maschera
        A *= forza
        sf = cv2.GaussianBlur(fr, (0, 0), 3.0)
        ref = cv2.remap(sf, m.XX + OX, m.YY + OY, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        Aa = A[..., None]
        return fr * (1 - Aa) + (ref * SHD[..., None] * 1.1 + (HL * (40 + 1.1 * lum))[..., None]) * Aa


# --- tergicristallo: una spazzola scura che passa davanti alla camera (mossa e fuori fuoco) e pulisce le gocce
class Tergi:
    def __init__(self, perno, r0, r1, a_riposo, a_max, inizio, t_su, t_giu):
        self.P = np.float32(perno); self.r0, self.r1 = r0, r1
        self.ar, self.am, self.ti, self.tu, self.tg = a_riposo, a_max, inizio, t_su, t_giu
        u = np.linspace(0, 1, 401); self._u, self._e = u, u * u * (3 - 2 * u)

    def angolo(self, tau):
        if tau < self.ti:
            return self.ar
        if tau < self.ti + self.tu:
            return self.ar + (self.am - self.ar) * m.ease((tau - self.ti) / self.tu)
        if tau < self.ti + self.tu + self.tg:
            return self.am + (self.ar - self.am) * m.ease((tau - self.ti - self.tu) / self.tg)
        return self.ar

    def passaggi(self, x, y):
        """Istanti in cui la spazzola passa sul punto (andata, ritorno); None se il punto è fuori dalla sua corsa."""
        dx, dy = x - self.P[0], self.P[1] - y; rho = np.hypot(dx, dy); phi = np.degrees(np.arctan2(dy, dx))
        s = (phi - self.ar) / (self.am - self.ar)
        ok = (rho >= self.r0) & (rho <= self.r1) & (s >= 0) & (s <= 1)
        uu = np.interp(np.clip(s, 0, 1), self._e, self._u)
        return ok, self.ti + self.tu * uu, self.ti + self.tu + self.tg * (1 - uu)

    def pulisci(self, gocce, seme):
        """Le gocce che la spazzola incontra muoiono all'andata; dopo il ritorno ne ricadono di nuove, piano piano."""
        ok, su, giu = self.passaggi(gocce.x, gocce.y)
        gocce.t1 = np.where(ok & (gocce.t0 < su), su, gocce.t1)
        g = np.random.default_rng(seme); n = int(ok.sum())
        nx, ny = gocce.x[ok] + g.normal(0, 30, n), gocce.y[ok] + g.normal(0, 30, n)
        gocce.aggiungi(nx, ny, gocce.r[ok] * g.uniform(0.6, 1.0, n), gocce.e[ok], giu[ok] + g.uniform(0.15, 4.5, n))

    def disegna(self, fr, tau, maschera):
        n = 9; dt = 0.5 / m.FPS; acc = np.zeros((H // 2, W // 2), np.float32)                   # otturatore a 180°: mezzo fotogramma di mosso
        angs = [self.angolo(tau - dt / 2 + dt * k / (n - 1)) for k in range(n)]
        if max(abs(a - self.ar) for a in angs) < 0.5:
            return fr
        for a in angs:
            c, s = np.cos(np.radians(a)), -np.sin(np.radians(a)); lay = np.zeros_like(acc)
            p0 = self.P + np.float32([c, s]) * self.r0; p1 = self.P + np.float32([c, s]) * self.r1
            q0 = self.P + np.float32([c, s]) * (self.r0 * 0.4)
            cv2.line(lay, tuple(int(v) for v in p0 / 2), tuple(int(v) for v in p1 / 2), 1.0, 15, cv2.LINE_AA)    # spazzola (vicina alla camera: larga)
            cv2.line(lay, tuple(int(v) for v in q0 / 2), tuple(int(v) for v in (p0 + p1) / 4), 1.0, 8, cv2.LINE_AA)  # braccio
            acc += lay / n
        a = cv2.resize(cv2.GaussianBlur(acc, (0, 0), 2.2), (W, H))[..., None] * maschera[..., None]
        return fr * (1 - 0.93 * a) + a * np.float32([9, 9, 10])


def disegna_crepa(cx, cy, seme=4):
    """Crepa a stella sul parabrezza: righe sottili che prendono un po' di luce. Ritorna (alpha, colore) a tutto schermo."""
    lay = np.zeros((H, W), np.uint8); g = np.random.default_rng(seme)
    for k in range(9):
        a = g.uniform(0, 2 * np.pi); L = g.uniform(35, 170); x, y = cx, cy; pts = [(x, y)]
        for j in range(6):
            a += g.normal(0, 0.25); x += np.cos(a) * L / 6; y += np.sin(a) * L / 6; pts.append((x, y))
        cv2.polylines(lay, [np.int32(pts)], False, 255, 2 if k < 4 else 1, cv2.LINE_AA)
    cv2.circle(lay, (int(cx), int(cy)), 7, 255, 2, cv2.LINE_AA)
    a = cv2.GaussianBlur(lay.astype(np.float32) / 255, (0, 0), 0.7)
    return a


# --- brandelli di telo nero sul bordo sinistro del cartello
def disegna_telo(fr, nome, mov, u, tau, t, seme, bordo):
    """bordo: [x, y_alto, y_basso] del bordo sinistro del cartello (coordinate 576×1024). I brandelli sbattono nel vento."""
    xb, ya, yb = bordo; g = np.random.default_rng(11)
    col = np.zeros((H, W, 3), np.uint8); alfa = np.zeros((H, W), np.uint8)
    for j in range(6):
        yy = ya + (yb - ya) * (j / 5) ** 1.3 + g.normal(0, 2)
        X, Y = big_xy(xb + g.normal(0, 1.5), yy); ox, oy, sc = proietta(nome, mov, u, tau, seme, X, Y)
        L = sc * big_xy(g.uniform(22, 52), 0)[0]; larg = sc * big_xy(g.uniform(9, 17), 0)[0]
        base = np.radians(g.uniform(150, 215)); om = g.uniform(9, 15); fase = g.uniform(0, 6.3); amp = g.uniform(0.35, 0.6)
        N = 14; prev = None
        for i in range(N + 1):
            s = i / N
            ang = base + amp * s * np.sin(om * t - 5.5 * s + fase) + 0.25 * np.sin(2.3 * t + j)
            if i == 0:
                px, py = ox, oy
            else:
                px, py = prev[0] + np.cos(ang) * L / N, prev[1] + np.sin(ang) * L / N
            w = larg * (1 - 0.65 * s) * (0.8 + 0.4 * np.sin(13 * s + j)); nx, ny = -np.sin(ang) * w / 2, np.cos(ang) * w / 2
            if prev is not None:
                lum = 0.5 + 0.5 * np.cos(om * t - 5.5 * s + fase)                # dove la plastica gira verso i fari luccica
                c = tuple(int(v) for v in (np.float32([9, 9, 10]) * (1 - lum) + np.float32([58, 64, 66]) * lum * 0.7))
                poly = np.int32([[prev[0] + pn[0], prev[1] + pn[1]], [px + nx, py + ny], [px - nx, py - ny], [prev[0] - pn[0], prev[1] - pn[1]]])
                cv2.fillConvexPoly(col, poly, c, cv2.LINE_AA); cv2.fillConvexPoly(alfa, poly, 245, cv2.LINE_AA)
            prev, pn = (px, py), (nx, ny)
    a = cv2.GaussianBlur(alfa.astype(np.float32) / 255, (0, 0), 1.3)[..., None]
    c = cv2.GaussianBlur(col.astype(np.float32), (0, 0), 1.3)
    return fr * (1 - a) + c * a


# --- pioggia che cade: due strati di righe sottili che scorrono, visibili solo dove c'è luce
def tessitura_pioggia(seme, n, lmin, lmax, spess, ang):
    g = np.random.default_rng(seme); t = np.zeros((H, W), np.uint8)
    for _ in range(n):
        x, y = g.uniform(-40, W), g.uniform(0, H); L = g.uniform(lmin, lmax); a = np.radians(ang + g.normal(0, 1.2))
        cv2.line(t, (int(x), int(y)), (int(x + L * np.sin(a)), int(y + L * np.cos(a))), int(g.uniform(80, 255)), spess, cv2.LINE_AA)
    t = cv2.GaussianBlur(t.astype(np.float32) / 255, (0, 0), 0.9)
    return np.vstack([t, t])


PIOGGIA = None


def pioggia(fr, t, lum, forza):
    global PIOGGIA
    if PIOGGIA is None:
        PIOGGIA = (tessitura_pioggia(21, 700, 70, 150, 2, 9), tessitura_pioggia(22, 1800, 25, 60, 1, 9))
    out = fr
    for tex, vel, peso in ((PIOGGIA[0], 2300, 0.55), (PIOGGIA[1], 1350, 0.4)):
        o = int(t * vel) % H; strato = tex[H - o:2 * H - o]
        out = out + (strato * peso * forza * (18 + 0.75 * lum))[..., None] * np.float32([1.0, 0.97, 0.9])
    return out


def tremolio(t, seme=5):
    """Neon che tremola: quasi sempre acceso, ogni tanto una raffica di cali rapidi."""
    raffica = np.random.default_rng(seme * 7919 + int(t * 1.6)).random() < 0.5
    g = np.random.default_rng(seme * 100003 + int(t * 22))
    return (0.15 + 0.55 * g.random()) if raffica and g.random() < 0.45 else 1.0 - 0.04 * g.random()


def sobbalzo(tau, colpi, amp=7.0):
    dy = dx = 0.0
    for c in colpi:
        if tau >= c:
            e = np.exp(-(tau - c) / 0.07); dy += amp * e * np.sin(2 * np.pi * 17 * (tau - c) + 1.2); dx += amp * 0.35 * e * np.sin(2 * np.pi * 11 * (tau - c))
    return dx, dy


def sposta(fr, dx, dy, ang=0.0):
    if abs(dx) < 0.05 and abs(dy) < 0.05 and abs(ang) < 0.01:
        return fr
    A = cv2.getRotationMatrix2D((W / 2, H / 2), ang, 1.0); A[0, 2] += dx; A[1, 2] += dy
    return cv2.warpAffine(fr, A, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


# --- stato preparato una volta per riga (gocce, tergicristallo, crepa…)
_STATO = {}


def stato(r):
    k = id(r)
    if k in _STATO:
        return _STATO[k]
    e = r.get("effetti", {}); s = {}
    if "gocce" in e:
        c = e["gocce"]; g = Gocce(c.get("seme", 1), c.get("n", 220), c.get("rmin", 2.2), c.get("rmax", 11), c.get("allung", 1.1),
                                  zona=c.get("zona", (0, 0, 1, 1)))
        if c.get("colano"):
            g.colate(c.get("seme", 1) + 50, c["colano"], -3.0, 6.0, zona=c.get("zona_colano", (0.05, 0.0, 0.95, 0.6)))
        s["gocce"] = g
    if "tergi" in e:
        c = e["tergi"]; tg = Tergi((c["perno"][0] * W, c["perno"][1] * H), c["r"][0] * W, c["r"][1] * W, c["angoli"][0], c["angoli"][1],
                                   c["inizio"], c["su"], c["giu"])
        if "gocce" in s:
            tg.pulisci(s["gocce"], 77)
        s["tergi"] = tg
    if "crepa" in e:
        s["crepa"] = disegna_crepa(e["crepa"][0] * W, e["crepa"][1] * H)
    _STATO[k] = s
    return s


def linea_cruscotto(r, u, tau, seme):
    """Maschera del vetro: sopra il bordo del cruscotto (che sta davanti a gocce e tergicristallo)."""
    yb = r["effetti"].get("cruscotto")
    if yb is None:
        return np.ones((H, W), np.float32)
    _, yo, _ = proietta(r["img"], r.get("mov", "avanza_lento"), u, tau, seme, SW / 2, big_xy(0, yb)[1])
    return np.repeat(np.clip((yo - m.YY[:, :1]) / 6, 0, 1), W, 1)


def parola(r, testo):
    i = next(k for k, x in enumerate(RIGHE) if x is r)
    return next((w for w in m.parole[i] if testo.lower() in w[2].lower()), None)


def applica(fr, r, tau, u, t, seme):
    e = r.get("effetti", {}); s = stato(r); lum = None
    if "telo" in e:
        fr = disegna_telo(fr, r["img"], r.get("mov", "avanza_lento"), u, tau, t, seme, e["telo"])
    if "stop" in e:                                                              # le luci rosse dei freni si accendono
        c = e["stop"]; k = smooth(tau, c[0], c[0] + 0.25)
        rosso = np.clip((fr[..., 2] - np.maximum(fr[..., 0], fr[..., 1]) - 25) / 90, 0, 1)
        fr = fr * (1 - (1 - (c[1] + (1 - c[1]) * k)) * rosso[..., None] * np.float32([0.3, 0.6, 1.0]))
    if "lampo" in e:                                                             # buio, poi un lampo che accende la scena per un istante
        c = e["lampo"]; w = parola(r, c["parola"]) if "parola" in c else None
        tl = (w[0] - m.T[next(k for k, x in enumerate(RIGHE) if x is r)]["inizio"] + c.get("dopo", 0)) if w else c.get("a", 0.6)
        x = tau - tl; fl = 0.0
        for d0, a0, dec in ((0.0, 2.6, 0.06), (0.14, 1.5, 0.05), (0.34, 0.7, 0.12)):
            if x >= d0:
                fl += a0 * np.exp(-(x - d0) / dec)
        base = c.get("base", 0.4)
        fr = fr * (base + fl * (1 - base)) * np.float32([1.0 + 0.12 * min(fl, 1), 1.0, 1.0 - 0.05 * min(fl, 1)])
        if "buio" in c:                                                          # il fulmine dell'immagine resta al buio fino al lampo
            cx, cy, rx, ry = c["buio"]["zona"]; mk = np.exp(-(((m.XN - cx) / rx) ** 2 + ((m.YN - cy) / ry) ** 2))[..., None]
            fr = fr * (1 - mk * c["buio"].get("forza", 0.8) * (1 - min(fl, 1.0)))
    if "neon" in e:
        c = e["neon"]; f = tremolio(t, c.get("seme", 5)); cx, cy, rx, ry = c["zona"]
        mk = np.exp(-(((m.XN - cx) / rx) ** 2 + ((m.YN - cy) / ry) ** 2))[..., None]
        fr = fr * (1 - mk * (1 - f) * c.get("forza", 0.7)) * (1 - (1 - f) * c.get("globale", 0.12))
    if "pioggia" in e:
        lum = luce_locale(fr); fr = pioggia(fr, t, lum, e["pioggia"])
    if "gocce" in s:
        lum = luce_locale(fr) if lum is None else lum
        vetro = linea_cruscotto(r, u, tau, seme) if "cruscotto" in e else None
        rif = e["gocce"].get("rif_riga")                                         # stesso vetro su due righe: l'orologio delle gocce prosegue
        tg = t - m.T[next(k for k, x in enumerate(RIGHE) if x.get("id") == rif)]["inizio"] if rif else tau
        fr = s["gocce"].disegna(fr, tg, lum, e["gocce"].get("forza", 1.0), vetro)
    if "tergi" in s:
        fr = s["tergi"].disegna(fr, tau, linea_cruscotto(r, u, tau, seme))
    if "crepa" in s:
        a = s["crepa"][..., None] * 0.5; lum = luce_locale(fr) if lum is None else lum
        fr = fr * (1 - a * 0.35) + a * (60 + 0.8 * lum)[..., None] * np.float32([0.95, 1.0, 0.95])
    if "fuoco" in e:                                                             # il fuoco passa dalla mano (vicina) alla berlina (lontana)
        c = e["fuoco"]; f = smooth(u, c[0], c[1]); dep = m.IMG[r["img"]][1]
        vicino = smooth(dep, c[2] if len(c) > 2 else 0.5, c[3] if len(c) > 3 else 0.72)[..., None]
        sf = cv2.GaussianBlur(fr, (0, 0), 11); nitido = fr + (fr - cv2.GaussianBlur(fr, (0, 0), 2.5)) * 1.1
        v = fr * (1 - f) + sf * f * 0.8                                          # vicino: da nitido a sfocato (e un po' più scuro)
        l = (sf * 0.6 + fr * 0.4) * (1 - f) + nitido * f                         # lontano: da sfocato a più netto
        fr = v * vicino + l * (1 - vicino)
    if "vibra" in e:
        a = e["vibra"]; fr = sposta(fr, a * (0.8 * np.sin(2 * np.pi * 13 * t) + 0.5 * np.sin(2 * np.pi * 21.7 * t + 1)),
                                    a * (1.0 * np.sin(2 * np.pi * 15.3 * t + 2) + 0.4 * np.sin(2 * np.pi * 27 * t)))
    if "colpi" in e:
        dx, dy = sobbalzo(tau, e["colpi"]); fr = sposta(fr, dx, dy)
    return fr


def dopo(fr, r, tau, u, t, m_):
    if not r.get("effetti"):
        return fr
    i = next(k for k, x in enumerate(RIGHE) if x is r)
    return applica(fr, r, tau, u, t, float(i))


# ---------------------------------------------------------------- 3. righe speciali
def camera(nome, z, py, kd, u, tau, seme):
    """Come muovi() di monta.py ma con la camera che sale (py da + a −) o scende: py in pixel dell'immagine grande."""
    big, dep = m.IMG[nome]; uu = m.ease(u)
    zz = z[0] + (z[1] - z[0]) * uu; k = (SW / W) / (m.M * zz); dd = dep - 0.5
    yy = py[0] + (py[1] - py[0]) * uu
    mx = SW / 2 + m.GX * k * (1 - kd * dd * uu); my = SH / 2 + m.GY * k * (1 - kd * dd * uu) + yy
    return cv2.remap(big, mx.astype(np.float32), my.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT).astype(np.float32)


TACH = {}


def tachimetro_fisso():
    """Quadrante (senza lancetta) disegnato una volta, sovracampionato: fondo nero, tacche e numeri verdi retroilluminati."""
    S = 2; R = 430; D = 2 * (R + 70); im = Image.new("RGBA", (D * S, D * S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    c = D * S / 2; VE = (150, 255, 190)
    d.ellipse([c - (R + 46) * S, c - (R + 46) * S, c + (R + 46) * S, c + (R + 46) * S], fill=(26, 30, 31, 255))
    d.ellipse([c - (R + 30) * S, c - (R + 30) * S, c + (R + 30) * S, c + (R + 30) * S], fill=(6, 8, 8, 255))
    for v in range(0, 241, 5):
        a = np.radians(225 - v * 270 / 240); maj = v % 20 == 0; med = v % 10 == 0
        l = 46 if maj else 26 if med else 14; w = 7 if maj else 4 if med else 2
        r0, r1 = R - l, R
        d.line([(c + np.cos(a) * r0 * S, c - np.sin(a) * r0 * S), (c + np.cos(a) * r1 * S, c - np.sin(a) * r1 * S)], fill=VE + (255,), width=w * S)
        if maj:
            rr = R - 100
            d.text((c + np.cos(a) * rr * S, c - np.sin(a) * rr * S), str(v), font=m.font("Medium", 58 * S), fill=VE + (255,), anchor="mm")
    d.text((c, c + 150 * S), "km/h", font=m.font("Regular", 40 * S), fill=(110, 200, 150, 230), anchor="mm")
    im = im.resize((D, D), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255
    return np.dstack([a[..., 2::-1] * a[..., 3:], a[..., 3:]]), R, D                # BGR premoltiplicato + alpha


def lancetta(v, R, D):
    S = 2; im = Image.new("RGBA", (D * S, D * S), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = D * S / 2
    a = np.radians(225 - v * 270 / 240); ux, uy = np.cos(a), -np.sin(a); nx, ny = -uy, ux
    pt = lambda r, w: (c + (ux * r + nx * w) * S, c + (uy * r + ny * w) * S)
    d.polygon([pt(-42, 9), pt(R - 22, 2.5), pt(R - 22, -2.5), pt(-42, -9)], fill=(255, 84, 34, 255))
    d.polygon([pt(-36, 3), pt(R - 30, 0.8), pt(R - 30, -0.8), pt(-36, -3)], fill=(255, 190, 140, 255))
    d.ellipse([c - 50 * S, c - 50 * S, c + 50 * S, c + 50 * S], fill=(20, 22, 24, 255), outline=(70, 76, 80, 255), width=3 * S)
    im = im.resize((D, D), Image.LANCZOS); a = np.asarray(im).astype(np.float32) / 255
    return np.dstack([a[..., 2::-1] * a[..., 3:], a[..., 3:]])


def tachimetro(r, tau, u, t):
    if not TACH:
        TACH["fisso"], TACH["R"], TACH["D"] = tachimetro_fisso()
        sp = r.get("specchio")
        if sp:                                                                   # striscia dello specchietto in alto, fuori fuoco
            big = m.IMG[sp["img"]][0].astype(np.float32); x0, y0, x1, y1 = sp["ritaglio"]
            X0, Y0 = map(int, big_xy(x0, y0)); X1, Y1 = map(int, big_xy(x1, y1))
            TACH["specchio"] = cv2.resize(big[Y0:Y1, X0:X1], (860, int(860 * (Y1 - Y0) / (X1 - X0))), interpolation=cv2.INTER_AREA)
            if sp.get("specchia"):                                               # nello specchietto l'immagine è rovesciata
                TACH["specchio"] = TACH["specchio"][:, ::-1].copy()
    fisso, R, D = TACH["fisso"], TACH["R"], TACH["D"]
    w = [x for x in m.parole[next(k for k, x in enumerate(RIGHE) if x is r)]]
    su = smooth(t, w[0][0] - 0.1, w[1][1]) if len(w) >= 2 else smooth(u, 0.05, 0.45)
    giu = smooth(t, w[2][0] - 0.05, w[3][1] + 0.2) if len(w) >= 4 else smooth(u, 0.55, 0.95)
    v = 110 + 20 * su - 20 * giu + 0.5 * np.sin(2 * np.pi * 7 * t) + 0.3 * np.sin(2 * np.pi * 3.1 * t)
    strato = fisso.copy(); lc = lancetta(v, R, D)
    strato = lc + strato * (1 - lc[..., 3:])
    glow = cv2.GaussianBlur(strato[..., :3], (0, 0), 14) * 0.9 + cv2.GaussianBlur(strato[..., :3], (0, 0), 4) * 0.35
    # in prospettiva: lo guardi dall'alto, un po' di lato
    cx, cy, sc = W / 2 + 10, 1010, 1.0 + 0.04 * m.ease(u)
    src = np.float32([[0, 0], [D, 0], [D, D], [0, D]]); h = D * sc
    dst = np.float32([[cx - h * 0.47, cy - h * 0.44], [cx + h * 0.5, cy - h * 0.46], [cx + h * 0.53, cy + h * 0.5], [cx - h * 0.5, cy + h * 0.52]])
    P = cv2.getPerspectiveTransform(src, dst)
    st = cv2.warpPerspective(strato, P, (W, H), flags=cv2.INTER_LINEAR); gl = cv2.warpPerspective(glow, P, (W, H), flags=cv2.INTER_LINEAR)
    if "fondo" not in TACH:                                                      # cruscotto: palpebra scura sopra il quadrante con un filo di luce sul bordo
        fondo = np.zeros((H, W, 3), np.float32) + np.float32([9, 12, 11]) * (1 - m.YN[..., None] * 0.5)
        pal = np.zeros((H, W), np.float32); cv2.ellipse(pal, (int(cx), int(cy - 40)), (640, 590), 0, 180, 360, 1.0, -1, cv2.LINE_AA)
        pal = cv2.GaussianBlur(pal, (0, 0), 3); bordo = np.zeros((H, W), np.float32)
        cv2.ellipse(bordo, (int(cx), int(cy - 40)), (640, 590), 0, 200, 340, 1.0, 5, cv2.LINE_AA)
        fondo = fondo * (1 - pal[..., None] * 0.6) + cv2.GaussianBlur(bordo, (0, 0), 4)[..., None] * np.float32([40, 58, 48])
        rifl = np.clip(1 - np.abs((m.XN * 0.8 + m.YN * 0.45) - 0.62) / 0.05, 0, 1) * np.exp(-((m.XX - cx) ** 2 + (m.YY - cy) ** 2) / (2 * 430 ** 2))
        TACH["fondo"] = fondo; TACH["rifl"] = cv2.GaussianBlur(rifl.astype(np.float32), (0, 0), 18)[..., None]
    fr = TACH["fondo"].copy()
    fr = fr * (1 - st[..., 3:4]) + st[..., :3] * 255 + gl * 255 * 0.8
    fr = fr + TACH["rifl"] * np.float32([22, 26, 24])                            # riflesso sul vetro del quadrante
    # fuori fuoco ai bordi (lunghezza focale corta): nitido intorno alla lancetta
    d2 = ((m.XX - cx) / 520) ** 2 + ((m.YY - cy) / 560) ** 2
    k = np.clip((d2 - 0.35) / 0.55, 0, 1)[..., None]
    fr = fr * (1 - k) + cv2.GaussianBlur(fr, (0, 0), 10) * k
    if "specchio" in TACH:
        sp = TACH["specchio"]; hh, ww = sp.shape[:2]; x0, y0 = (W - ww) // 2, -int(hh * 0.18)
        def tondo(img, x0, y0, x1, y1, r, v, spess=-1):
            p = Image.new("L", (W, H), 0); ImageDraw.Draw(p).rounded_rectangle([x0, y0, x1, y1], r, fill=None if spess > 0 else 255,
                                                                              outline=255 if spess > 0 else None, width=max(spess, 1))
            return np.asarray(p).astype(np.float32) / 255 * v
        mk = cv2.GaussianBlur(tondo(None, x0, y0, x0 + ww, y0 + hh, 70, 1.0), (0, 0), 7)
        tela = np.zeros((H, W, 3), np.float32); ya, yb_ = max(0, y0), min(H, y0 + hh)
        tela[ya:yb_, x0:x0 + ww] = sp[ya - y0:yb_ - y0]
        tela = cv2.GaussianBlur(tela, (0, 0), 7) * 0.85
        cornice = cv2.GaussianBlur(tondo(None, x0 - 16, y0 - 16, x0 + ww + 16, y0 + hh + 16, 84, 1.0, 30), (0, 0), 7)[..., None]
        fr = fr * (1 - mk[..., None]) + tela * mk[..., None]
        fr = fr * (1 - cornice * 0.9) + cornice * np.float32([14, 15, 16])
    fr = sposta(fr, 1.2 * np.sin(2 * np.pi * 13 * t), 1.4 * np.sin(2 * np.pi * 15.3 * t + 2))
    return fr


def disegna(r, tau, u, t, m_):
    i = next(k for k, x in enumerate(RIGHE) if x is r)
    if r["speciale"] == "tachimetro":
        fr = tachimetro(r, tau, u, t)
        return m.atmosfera(fr, t, 0.06)
    c = r["camera"]                                                              # "camera": salita o discesa verticale
    fr = camera(r["img"], c["z"], c["py"], c.get("kd", 0.04), u, tau, float(i))
    fr = applica(fr, r, tau, u, t, float(i))
    return m.atmosfera(fr, t, 0.13)


# ---------------------------------------------------------------- 4. scheda finale: lo sfondo prosegue con gli stessi effetti
_muovi = m.muovi


def _muovi_con_effetti(nome, mov, u, tau, seme, oltre=False):
    fr = _muovi(nome, mov, u, tau, seme, oltre)
    if oltre:
        r = next((x for x in RIGHE if x.get("img") == nome and x.get("effetti") and not x.get("speciale")), None)
        if r is not None:
            i = next(k for k, x in enumerate(RIGHE) if x is r)
            fr = applica(fr, r, tau, 1.0, m.T[i]["inizio"] + tau, float(i))
    return fr


m.muovi = _muovi_con_effetti


def cuoci_lucchetto(nome, centro, lato):
    """Pulsante della chiusura centralizzata acceso: lucchetto verde disegnato (al posto delle scritte inventate dal modello)."""
    big, dep = m.IMG[nome]; b = big.astype(np.float32); S = 4
    L = int(big_xy(lato, 0)[0]); im = Image.new("L", (L * S, L * S), 0); d = ImageDraw.Draw(im)
    w = L * S
    d.rounded_rectangle([w * 0.22, w * 0.45, w * 0.78, w * 0.9], int(w * 0.08), fill=255)                 # corpo
    d.arc([w * 0.32, w * 0.12, w * 0.68, w * 0.62], 180, 360, fill=255, width=int(w * 0.09))              # arco
    d.line([(w * 0.32 + w * 0.045, w * 0.37), (w * 0.32 + w * 0.045, w * 0.47)], fill=255, width=int(w * 0.09))
    d.line([(w * 0.68 - w * 0.045, w * 0.37), (w * 0.68 - w * 0.045, w * 0.47)], fill=255, width=int(w * 0.09))
    d.ellipse([w * 0.45, w * 0.58, w * 0.55, w * 0.68], fill=0)
    a = np.asarray(im.resize((L, L), Image.LANCZOS)).astype(np.float32) / 255
    cx, cy = map(int, big_xy(*centro)); x0, y0 = cx - L // 2, cy - L // 2
    tela = np.zeros((SH, SW), np.float32); tela[y0:y0 + L, x0:x0 + L] = a
    glow = cv2.GaussianBlur(tela, (0, 0), L * 0.12) * 1.6 + cv2.GaussianBlur(tela, (0, 0), L * 0.4) * 0.8
    VE = np.float32([120, 255, 110])                                           # BGR: verde acceso
    b = b * (1 - tela[..., None]) + tela[..., None] * VE + glow[..., None] * VE * 0.45
    m.IMG[nome] = (np.clip(b, 0, 255).astype(np.uint8), dep)


# ---------------------------------------------------------------- cottura (una volta, al caricamento)
_CUOCI = [(r["img"], r["cuoci"]) for r in RIGHE if r.get("cuoci")] + [(n, c) for n, c in m.ep.get("cuoci_extra", {}).items() if n in m.IMG]
for n, c in _CUOCI:
    if c.get("ritocchi"):
        ritocca(n, [tuple(x) for x in c["ritocchi"]])
    if c.get("cartello"):
        cuoci_cartello(n, c["cartello"]["quad"], c["cartello"]["testo"])
    if c.get("cartoncino"):
        sg = c["cartoncino"].get("soglia")
        cuoci_inchiostro(n, c["cartoncino"]["quad"], testo_cartoncino(c["cartoncino"]["voci"]), tuple(sg) if sg else None)
    if c.get("biglietto"):
        cuoci_inchiostro(n, c["biglietto"]["quad"], testo_biglietto(c["biglietto"]["righe"], c["biglietto"].get("sottolinea", -1)))
    if c.get("lucchetto"):
        cuoci_lucchetto(n, c["lucchetto"]["centro"], c["lucchetto"]["lato"])

