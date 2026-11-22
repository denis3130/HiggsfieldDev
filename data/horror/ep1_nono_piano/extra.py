"""«Nono piano», Episodio 1: le cose che servono solo a questa storia, tutte disegnate col codice (caricato da scripts/bivio/monta.py).

Righe speciali (disegna):
  risveglio  righe 1-2: un'unica inquadratura dal letto che si apre dal nero mentre bussano (la voce parte dopo i tre colpi)
  sali       riga 4: la camera sale lungo la torre nella nebbia, fino all'unica finestra accesa
  messaggio  riga 12: lo schermo con la notifica, poi la camera si avvicina al messaggio e l'ombra del pollice trema sul vetro
  giro       riga 13: passo indietro dalla porta, poi ti giri di scatto verso il corridoio buio e la camera
Ritocchi delle inquadrature normali (dopo): scosse della camera sui colpi e sul grido, passi nel corridoio,
tuffo nello spioncino, neon che trema sul pianerottolo.
All'avvio: via la targhetta con numeri inventati dal modello sul pianerottolo e al suo posto il «9» rosso dipinto sul muro;
la porta di casa senza i vetri inventati nel corridoio e le tacche rosse e blu sullo stipite;
la notifica sullo schermo dei telefoni in mano (riga 11 e miniatura B); il telefono senza il vetro incrinato
(quello è della storia «La voce nel bosco»).
I tempi delle scosse e del neon vengono dai suoni in episodio.json: "scuoti" (secondi dall'inizio del suono, o [secondi, forza]),
"trema" ([da, a] secondi in cui la camera vibra), "lampi" ([da, durata, quanto si abbassa la luce])."""
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw

m = sys.modules["__main__"]
W, H = m.W, m.H
R = {r["id"]: x for r, x in zip(m.righe, m.T)}
PAR = {r["id"]: w for r, w in zip(m.righe, m.parole)}
FINE = {r["id"]: (m.T[i + 1]["inizio"] if i + 1 < len(m.T) else m.TOT) for i, r in enumerate(m.righe)}


def quando(s):
    """Come quando() di monta.py: istante in cui parte un suono di episodio.json."""
    t = R[s["riga"]]["inizio"]
    if s.get("parola"):
        t = next((w[0] for w in PAR[s["riga"]] if s["parola"].lower() in w[2].lower()), t)
    return max(0.0, t + s.get("dopo", 0.0))


# ---------- scosse, tremori e lampi del neon, agganciati ai suoni
SCOSSE, TREMORI, LAMPI = [], [], []
for s in m.ep.get("suoni", []):
    t0 = quando(s)
    for x in s.get("scuoti", []):
        a, f = (x, 7.0) if not isinstance(x, list) else x
        SCOSSE.append((t0 + a, f))
    for a, b in s.get("trema", []):
        TREMORI.append((t0 + a, t0 + b))
    for a, d, p in s.get("lampi", []):
        LAMPI.append((t0 + a, d, p))
for r, tr in zip(m.righe, m.T):
    for p in tr.get("pezzi", []):
        if p["tipo"] == "grido":
            SCOSSE.append((p["inizio"] + 0.04, 9.0))


def scuoti(fr, t):
    dx = dy = 0.0; z = 1.0
    for tk, f in SCOSSE:
        d = t - tk
        if 0 <= d < 0.6:
            e = np.exp(-d / 0.09)
            dx += f * e * np.cos(2 * np.pi * 8.5 * d + tk); dy += f * 0.8 * e * np.cos(2 * np.pi * 6.5 * d + 2 * tk); z += 0.0018 * f * e
    for a, b in TREMORI:
        if a <= t < b:
            q = int(t * 30); dx += 2.6 * np.sin(q * 2.399); dy += 2.2 * np.sin(q * 1.618 + 1)
    if abs(dx) < 0.1 and abs(dy) < 0.1 and z < 1.0005:
        return fr
    A = np.float32([[z, 0, (1 - z) * W / 2 + dx], [0, z, (1 - z) * H / 2 + dy]])
    return cv2.warpAffine(fr, A, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


# ---------- telefono senza il vetro incrinato (schermo() comune lo disegna per «La voce nel bosco»)
_schermo = m.schermo
_crepa = np.zeros((H, W), np.uint8)
for p in ([(1080, 150), (930, 60), (860, 0)], [(930, 60), (990, 0)], [(1080, 150), (1010, 210), (1080, 300)]):
    cv2.polylines(_crepa, [np.array(p, np.int32)], False, 255, 9)
_cy, _cx = np.nonzero(_crepa)
_fondo = np.where((_cy % 4 == 0)[:, None], np.stack([10 + _cy // 200, 7 + _cy // 240, 4 + _cy // 320], 1), [[8, 6, 4]]).astype(np.float32)


def schermo(messaggio, slide=1.0):
    fr = _schermo(messaggio, slide)
    fr[_cy, _cx] = _fondo                     # stesso sfondo a righe dello schermo comune, senza crepa
    return fr


m.schermo = schermo
if hasattr(m, "S_BLOCCO"):
    m.S_BLOCCO = schermo(False); m.S_MSG = schermo(True)


# ---------- ritocchi delle immagini all'avvio (sull'immagine grande 1296x2304, così la camera li muove insieme alla scena)
K = m.SW / 576                                   # le coordinate qui sotto sono quelle dell'immagine generata (576x1024)


def dipingi_nove(nome, cx, cy, alto, incl=0.0):
    """Un grande «9» dipinto in rosso scuro sul muro: prende la luce e la grana del muro (vernice, non scritta incollata)."""
    if nome not in m.IMG:
        return
    big, dep = m.IMG[nome]; s = 4; hh = int(alto * K * 1.25)
    im = Image.new("L", (hh * s, hh * s), 0)
    ImageDraw.Draw(im).text((hh * s // 2, hh * s // 2), "9", font=m.font("Black", int(alto * K * s)), fill=255, anchor="mm")
    im = im.rotate(incl, resample=Image.BICUBIC)
    a = np.asarray(im.resize((hh, hh), Image.LANCZOS)).astype(np.float32) / 255
    rng = np.random.default_rng(9); macchie = cv2.GaussianBlur(rng.random((hh, hh)).astype(np.float32), (0, 0), 2.5)
    a = a * np.clip(0.75 + 0.6 * (macchie - macchie.mean()) * 4, 0.45, 0.95)          # vernice vecchia, un po' consumata
    x0, y0 = int(cx * K - hh / 2), int(cy * K - hh / 2)
    z = big[y0:y0 + hh, x0:x0 + hh].astype(np.float32)
    vernice = z * np.array([0.10, 0.11, 0.62], np.float32) * 1.15                       # BGR: rosso scuro sotto la stessa luce
    big[y0:y0 + hh, x0:x0 + hh] = np.clip(z * (1 - a[..., None]) + vernice * a[..., None], 0, 255).astype(np.uint8)


def togli_scritta(nome, x0, y0, x1, y1):
    """Cancella una scritta finta inventata dal modello (es. una targhetta con numeri a caso) ricostruendo il muro intorno."""
    big, dep = m.IMG[nome]; msk = np.zeros(big.shape[:2], np.uint8)
    msk[int(y0 * K):int(y1 * K), int(x0 * K):int(x1 * K)] = 255
    rif = cv2.inpaint(big, msk, 9, cv2.INPAINT_NS).astype(np.float32)
    liscio = cv2.GaussianBlur(rif, (0, 0), 9)                              # il muro è liscio: niente strisce lasciate dalla ricostruzione
    a = cv2.GaussianBlur(cv2.dilate(msk, np.ones((15, 15), np.uint8)).astype(np.float32) / 255, (0, 0), 6)[..., None]
    big[:] = np.clip(big * (1 - a) + liscio * a, 0, 255).astype(np.uint8)


def schermo_messaggio(nome, angoli, sh=936):
    """Lo schermo di blocco con la notifica «Lo so che sei sveglio. Apri.» sul telefono dell'immagine generata
    (angoli dello schermo: alto-sx, alto-dx, basso-dx, basso-sx). Le dita davanti allo schermo restano sopra."""
    big, dep = m.IMG[nome]; tel = m.TEL; sw = 600
    im = Image.new("RGB", (sw, sh), (10, 12, 16)); d = ImageDraw.Draw(im)
    for i in range(0, sh, 3):
        d.line([(0, i), (sw, i)], fill=(10 + i // 90, 13 + i // 70, 18 + i // 55))
    d.text((sw // 2, 150), tel["ora"], font=m.font("Thin", 150), fill=(238, 242, 246), anchor="mm")
    d.text((sw // 2, 250), tel["data"], font=m.font("Light", 32), fill=(190, 198, 205), anchor="mm")
    d.rounded_rectangle([24, 320, sw - 24, 330 + 92 + 58 * len(tel["messaggio"])], 30, fill=(40, 44, 51))
    d.ellipse([46, 344, 90, 388], fill=(90, 98, 108))
    d.text((106, 366), tel["mittente"], font=m.font("Medium", 30), fill=(240, 242, 245), anchor="lm")
    for k, riga in enumerate(tel["messaggio"]):
        d.text((46, 438 + 58 * k), riga, font=m.font("Regular", 44), fill=(255, 255, 255), anchor="lm")
    src = np.float32([[0, 0], [sw, 0], [sw, sh], [0, sh]]); dst = np.float32(angoli) * K
    P = cv2.getPerspectiveTransform(src, dst)
    scr = cv2.warpPerspective(cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR), P, (big.shape[1], big.shape[0])).astype(np.float32)
    dentro = cv2.warpPerspective(np.ones((sh, sw), np.float32), P, (big.shape[1], big.shape[0]))
    b = big.astype(np.float32); acceso = cv2.GaussianBlur((b.mean(2) > 170).astype(np.float32), (0, 0), 1.0)
    msk = (dentro * acceso)[..., None]
    big[:] = np.clip(b * (1 - msk) + scr * msk, 0, 255).astype(np.uint8)


def porta_piena(nome, vetri, pannelli):
    """La porta di casa è di legno pieno (c'è lo spioncino): al posto dei vetri inventati dal modello si mettono
    due pannelli di legno presi dalla metà sinistra della parte bassa della stessa porta (lì non c'è la maniglia)
    e ribaltati a specchio per fare la metà destra. Riquadri (x0, y0, x1, y1) in coordinate 576x1024."""
    big, dep = m.IMG[nome]; v = [int(c * K) for c in vetri]; q = [int(c * K) for c in pannelli]
    meta = big[q[1]:q[3], q[0]:(q[0] + q[2]) // 2]
    legno = cv2.resize(np.concatenate([meta, meta[:, ::-1]], 1), (v[2] - v[0], v[3] - v[1]), interpolation=cv2.INTER_CUBIC).astype(np.float32)
    msk = np.zeros(big.shape[:2], np.float32); msk[v[1]:v[3] - 12, v[0]:v[2]] = 1
    msk = cv2.GaussianBlur(msk, (0, 0), 7)[v[1]:v[3], v[0]:v[2], None]
    z = big[v[1]:v[3], v[0]:v[2]].astype(np.float32)
    big[v[1]:v[3], v[0]:v[2]] = np.clip(z * (1 - msk) + legno * msk, 0, 255).astype(np.uint8)


def tacche(nome, x0, x1, rosse, blu):
    """Le tacche di matita sullo stipite: rosse le tue, blu quelle di Leo (altezze y in coordinate 576x1024)."""
    big, dep = m.IMG[nome]; rng = np.random.default_rng(7)
    for ys, col in ((rosse, (0.30, 0.32, 1.25)), (blu, (1.30, 0.62, 0.36))):          # BGR: matita rossa e blu sulla vernice chiara
        for y in ys:
            a = np.zeros(big.shape[:2], np.float32); yy = int(y * K); xa = x0 * K + rng.uniform(-3, 4); xb = x1 * K - rng.uniform(0, 12)
            cv2.line(a, (int(xa), yy), (int(xb), yy + int(rng.uniform(-3, 3))), float(rng.uniform(0.5, 0.75)), 2, cv2.LINE_AA)
            a = cv2.GaussianBlur(a, (0, 0), 0.6)[..., None]; b = big.astype(np.float32)
            big[:] = np.clip(b * (1 - a) + b * np.array(col, np.float32) * 0.6 * a, 0, 255).astype(np.uint8)


# coordinate nell'immagine generata (576x1024), prese guardando le immagini
togli_scritta("s07_pianerottolo.png", 241, 268, 310, 310)            # targhetta «2705» inventata sopra la porta sigillata
dipingi_nove("s07_pianerottolo.png", 276, 287, 44)                  # al suo posto il «9» del nono piano, dipinto sul muro
porta_piena("s05_corridoio.png", (229, 300, 363, 446), (229, 496, 363, 617))   # niente vetri sulla porta di casa
tacche("s05_corridoio.png", 448, 466, (500, 484, 469, 455), (540, 526, 512))      # le tacche sullo stipite a destra
schermo_messaggio("s10_telefono_mano.png", [[176, 281], [374, 281], [374, 590], [176, 590]])     # riga 11
schermo_messaggio("sB_telefono.png", [[164, 126], [393, 130], [357, 561], [126, 556]], 1140)       # miniatura B


# ---------- ritocchi delle inquadrature normali
def cammina(fr, tau):
    """Camera a mano che cammina: un piccolo affondo a ogni passo (i passi scalzi cadono circa ogni 0,53 s)."""
    f = 1 / 0.53; ph = np.pi * f * (tau - 0.15)
    dy = 7 * abs(np.cos(ph)) - 3.5; dx = 5 * np.sin(ph); ang = 0.35 * np.sin(ph)
    A = cv2.getRotationMatrix2D((W / 2, H / 2), ang, 1.015); A[0, 2] += dx; A[1, 2] += dy
    return cv2.warpAffine(fr, A, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


TUFFO = (0.65, 0.50)   # il punto di luce dello spioncino nell'inquadratura (frazioni di W e H)


def tuffo(fr, u):
    """Negli ultimi istanti la camera entra nello spioncino e la luce gialla riempie l'inquadratura."""
    k = float(np.clip((u - 0.45) / 0.55, 0, 1))
    if k <= 0:
        return fr
    cx, cy = TUFFO[0] * W, TUFFO[1] * H; z = 1 + 2.4 * k ** 2
    fr = cv2.warpAffine(fr, np.float32([[z, 0, (1 - z) * cx], [0, z, (1 - z) * cy]]), (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    sg = 40 + 1100 * k ** 2.2
    g = np.exp(-((m.XX - cx) ** 2 + (m.YY - cy) ** 2) / (2 * sg * sg))[..., None] * (0.95 * k ** 1.6)
    return fr * (1 - g) + np.array([120, 215, 255], np.float32) * g


def neon(fr, t):
    """Il neon del pianerottolo trema: cali di luce brevi e irregolari, agganciati allo sfarfallio che si sente."""
    v = 1.0 + 0.025 * np.sin(2 * np.pi * 2.3 * t)
    for a, d, p in LAMPI:
        if a <= t < a + d:
            q = np.random.default_rng(int(t * 30)).uniform(0.35, 1.0); v = min(v, 1 - p * q)
    return fr * v


def dopo(fr, r, tau, u, t, m):
    if r.get("passi"):
        fr = cammina(fr, tau)
    if r.get("tuffo"):
        fr = tuffo(fr, u)
    if r.get("neon"):
        fr = neon(fr, t)
    if r.get("schiarisci"):                                          # immagine molto scura: si schiarisce un po' (sul telefono si legge meglio)
        fr = 255 * (np.clip(fr, 0, 255) / 255) ** 0.82 * r["schiarisci"]
    return scuoti(fr, t)


# ---------- righe speciali
def risveglio(r, tau, u, t):
    fine = max(FINE[x["id"]] for x in m.righe if x.get("speciale") == "risveglio")
    tt = max(0.0, t - 0.3)                                              # il primo colpo arriva ancora a occhi chiusi
    fr = m.muovi(r["img"], "apri_occhi", min(1.0, t / fine), tt, 0.0)
    fr = m.atmosfera(scuoti(fr, t), t)
    return m.palpebre(fr, tt)


def sali(r, tau, u, t, z=1.12):
    """Gru che sale lungo la facciata: dal cassone e dai lampioni all'ultimo piano."""
    big, dep = m.IMG[r["img"]]; uu = m.ease(u)
    k = (m.SW / W) / (m.M * z); corsa = (m.SH - H * k) / 2 * 0.92; dd = dep - 0.5
    mx = m.SW / 2 + m.GX * k * (1 - 0.03 * dd * uu)
    my = m.SH / 2 + m.GY * k * (1 - 0.03 * dd * uu) + corsa * (1 - 2 * uu) + 20 * dd * (1 - 2 * uu)
    fr = cv2.remap(big, mx.astype(np.float32), my.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT).astype(np.float32)
    return m.atmosfera(fr, t, 0.17)


_POLLICE = None


def messaggio(r, tau, u, t):
    global _POLLICE
    fr = m.telefono(m.S_MSG, t, 0.7)                                   # la notifica è già arrivata (si vede nella riga 11)
    pz = {p["tipo"]: p for p in R[r["id"]]["pezzi"]}
    c0 = pz.get("citazione", pz["voce"])["inizio"] - 0.35; c1 = FINE[r["id"]]
    k = m.ease(float(np.clip((t - c0) / max(c1 - c0, 1e-3), 0, 1)))
    cx, cy = W / 2, H / 2 + (1130 - H / 2) * 0.86                        # centro della notifica sul telefono
    z = 1 + 0.22 * k; ty = cy + (H * 0.47 - cy) * k                     # il messaggio resta tutto dentro l'inquadratura
    fr = cv2.warpAffine(fr, np.float32([[z, 0, cx - z * cx], [0, z, ty - z * cy]]), (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    if _POLLICE is None:                                                 # ombra morbida del pollice che entra dal basso a destra
        p = np.zeros((H, W), np.float32)
        cv2.ellipse(p, (int(W * 0.86), int(H * 0.93)), (190, 520), -28, 0, 360, 1.0, -1)
        _POLLICE = cv2.GaussianBlur(p, (0, 0), 70)
    a = 0.55 * k
    if a > 0.01:
        sx = 7 * np.sin(2 * np.pi * 1.3 * t) + 3 * np.sin(2 * np.pi * 4.1 * t); sy = 6 * np.sin(2 * np.pi * 0.9 * t + 1) + 2 * np.sin(2 * np.pi * 3.3 * t)
        ombra = cv2.warpAffine(_POLLICE, np.float32([[1, 0, sx], [0, 1, sy]]), (W, H))
        fr = fr * (1 - a * ombra[..., None])
    return np.clip(fr * m.VIGN + m.rng.standard_normal((H, W, 1)).astype(np.float32) * 3, 0, 255)


def giro(r, tau, u, t):
    i = m.righe.index(r); dur = FINE[r["id"]] - R[r["id"]]["inizio"]
    tg = next((w[0] for w in PAR[r["id"]] if w[2].strip(".,:!?").lower() == r.get("giro_parola", "Non").lower()), R[r["id"]]["inizio"] + dur * 0.6) - R[r["id"]]["inizio"] - 0.15
    dg = 0.55
    if tau < tg:
        fr = m.muovi(r["prima"], "arretra", min(1.0, tau / max(tg, 1e-3)), tau, float(i))
    else:
        p = min(1.0, (tau - tg) / dg)
        b = m.muovi(r["img"], "avanza_lento", min(1.0, (tau - tg) / max(dur - tg, 1e-3)), tau, float(i))
        if p < 1:                                                        # ti giri di scatto: frusta da una scena all'altra
            a = m.muovi(r["prima"], "arretra", 1.0, tau, float(i))
            e = m.ease(p); x = int(e * W); strip = np.concatenate([a, b], 1)
            fr = strip[:, x:x + W].copy()
            L = int(1 + 220 * np.sin(np.pi * p) ** 1.5)
            if L > 2:
                fr = cv2.blur(fr, (L, 1))
        else:
            fr = b
    return m.atmosfera(scuoti(fr, t), t)


def disegna(r, tau, u, t, m_):
    s = r["speciale"]
    if s == "risveglio":
        return risveglio(r, tau, u, t)
    if s == "sali":
        return sali(r, tau, u, t)
    if s == "messaggio":
        return messaggio(r, tau, u, t)
    if s == "giro":
        return giro(r, tau, u, t)
    raise ValueError(f"riga speciale sconosciuta: {s}")
