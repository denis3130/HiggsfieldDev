"""«Il bunker», Episodio 1 — cose disegnate col codice solo per questa storia (monta.py le carica da sé).

- Timer a LED rossi sopra la porta: quattro cifre a sette segmenti con i due punti, alone rosso sul cemento che
  pulsa a ogni scatto. Parte da 60:00 sulla parola «Parte» e scende un secondo alla volta, a tempo col tic del suono.
- Bobine del registratore che girano (da quando premi PLAY), anche nella miniatura della carta B.
- Inchiostro blu sull'etichetta: la doppia riga sotto il tuo nome; il nome non si legge mai (pollice o troppo piccolo).
- Lampada che si accende tremando e ogni tanto trema; messa a fuoco del primo risveglio.

Le cifre, le bobine e l'inchiostro si disegnano sull'immagine PRIMA del movimento di camera (avvolgendo m.muovi),
così restano attaccati alla scena in ogni inquadratura, nello sfondo della scheda e nelle miniature.
Coordinate in pixel dell'immagine originale 576×1024."""
import sys

import cv2
import numpy as np

m = sys.modules["__main__"]                      # monta.py
K = m.SW / 576.0                                 # immagine originale → immagine grande di monta.py

# ---------- dove stanno le cose in ogni immagine (misurate guardando le immagini)
TIMER = {      # angoli del display (alto-sx, alto-dx, basso-dx, basso-sx)
    "s01_risveglio_timer.png": [[262, 174.5], [312, 174.5], [312, 204.5], [262, 204.5]],
    "s04_timer_frontale.png": [[191, 345], [392, 345], [392, 477], [191, 477]],
    "s11_porta_timer.png": [[235.5, 197.5], [352.5, 197.5], [354.5, 276.5], [233.5, 276.5]],
}
BOBINE = {     # centro e raggio delle bobine: [cx, cy, r]
    "s14_bobine.png": [[204, 550, 54], [395, 545, 52]],
}
ETICHETTA = {  # inchiostro blu: polilinee [punti, spessore] in pixel dell'immagine; il nome sta sotto il pollice e non si vede
    "s08_etichetta_pollice.png": {"linee": [[[[269.3, 665.7], [274.7, 661.6], [280.0, 657.5], [285.3, 653.4], [290.7, 649.3], [296.0, 645.1], [301.4, 641.0], [306.7, 637.0], [312.2, 633.0], [317.6, 629.0], [323.1, 625.2], [328.7, 621.3], [334.3, 617.6], [339.9, 613.8], [345.5, 610.1], [351.2, 606.4], [356.8, 602.7], [362.4, 598.9], [367.9, 595.1], [373.5, 591.3], [378.9, 587.3], [384.4, 583.4], [389.8, 579.3], [395.1, 575.2]], 3.8], [[[281.3, 665.3], [285.7, 661.9], [290.2, 658.6], [294.7, 655.4], [299.3, 652.2], [303.8, 649.0], [308.4, 645.8], [313.0, 642.7], [317.6, 639.6], [322.3, 636.5], [326.9, 633.4], [331.6, 630.3], [336.2, 627.2], [340.8, 624.1], [345.4, 621.0], [349.9, 617.8], [354.5, 614.6], [359.0, 611.3], [363.5, 608.0], [367.9, 604.7], [372.4, 601.3], [376.8, 598.0], [381.2, 594.6], [385.6, 591.2]], 3.3]],
                                  "pollice": [[150, 560], [180, 548], [230, 536], [280, 528], [315, 531], [340, 544], [352, 566], [349, 590], [333, 614], [303, 640], [268, 660], [232, 680], [190, 700], [150, 712]], "sfoca": 0.6, "forza": 0.85},
}
RITOCCHI = {   # zone da sistemare: [x0, y0, x1, y1] ricostruita dai bordi, [x0, y0, x1, y1, sigma] sfocata, [x0, y0, x1, y1, dx, dy] copiata da (dx, dy) più in là
    "s01_risveglio_timer.png": [[342, 422, 397, 530, 0, -112]],   # la porta blindata non ha maniglie
    "s04_timer_frontale.png": [[293, 664, 346, 724]],
    "s08_etichetta_pollice.png": [[526, 52, 576, 140], [425, 600, 576, 735, 2.2]],   # cifre rosse inventate dal modello; segni sul registratore sfocati
    "s11_porta_timer.png": [[355, 204, 388, 260, 1.6]],                              # segni sugli interruttori accanto al display sfocati
    "s14_bobine.png": [[36, 928, 224, 1024], [278, 886, 545, 924, 2.4], [248, 424, 302, 454, 1.6]],   # contatore inventato, scritte sfocate
}

# ---------- quale riga usa quale immagine e quando parte il timer
RIGA = {}
for i, r in enumerate(m.righe):
    if r.get("img"):
        RIGA.setdefault(r["img"], i)


def inizio_parola(i, parola):
    return next((w[0] for w in m.parole[i] if parola.lower() in w[2].lower()), m.T[i]["inizio"])


IDX = {r["id"]: i for i, r in enumerate(m.righe)}                 # id della riga → posizione
ID = lambda nome: m.righe[RIGA[nome]]["id"] if nome in RIGA else None
T_PARTE = inizio_parola(IDX[4], "Parte")                         # riga 4: il timer parte qui, 60:00 → 59:59
T_PLAY = inizio_parola(IDX[9], "PLAY") + 0.15                    # riga 9: le bobine cominciano a girare


def secondi_timer(nome, t):
    """Secondi che restano sul display all'istante t."""
    if ID(nome) == 1 or ID(nome) == 4 and t < T_PARTE:            # al risveglio è fermo a 60:00
        return 3600
    v = 3599 - int(np.floor(t - T_PARTE))
    if ID(nome) == 11:                                             # stacco in avanti: all'inizio della riga segna 59:12
        v0 = 3599 - int(np.floor(m.T[IDX[11]]["inizio"] - T_PARTE))
        v += 3552 - v0
    return max(0, v)


# ---------- display a sette segmenti
SEG = {"0": "abcdef", "1": "bc", "2": "abdeg", "3": "abcdg", "4": "bcfg", "5": "acdfg", "6": "acdefg", "7": "abc", "8": "abcdefg", "9": "abcdfg"}
DW, DH = 700, 230                                             # tela del display


def tela(testo):
    """Display (BGR float 0-255) e maschera dei segmenti accesi, per «MM:SS»."""
    acc = np.zeros((DH, DW), np.float32); spe = np.zeros((DH, DW), np.float32)
    cw, ch, sp, inc = 96, 164, 19, 0.08                       # larghezza e altezza della cifra, spessore segmento, corsivo
    y0 = (DH - ch) // 2; xs = [44, 186, 386, 528]; xc = 343      # quattro cifre e i due punti
    for d, cx in zip(testo.replace(":", ""), xs):
        on = SEG[d]; g = sp * 0.75                            # piccolo stacco tra un segmento e l'altro
        segs = {"a": [(g, 0), (cw - g, 0)], "d": [(g, ch), (cw - g, ch)], "g": [(g, ch / 2), (cw - g, ch / 2)],
                "f": [(0, g), (0, ch / 2 - g)], "e": [(0, ch / 2 + g), (0, ch - g)],
                "b": [(cw, g), (cw, ch / 2 - g)], "c": [(cw, ch / 2 + g), (cw, ch - g)]}
        for k, ((ax, ay), (bx, by)) in segs.items():
            sh = lambda x, y: (int(round(cx + x + inc * (ch - y))), int(round(y0 + y)))
            cv2.line(acc if k in on else spe, sh(ax, ay), sh(bx, by), 1.0, sp, cv2.LINE_AA)
    for yy in (y0 + ch * 0.3, y0 + ch * 0.72):
        cv2.circle(acc, (int(xc + inc * (ch - (yy - y0))), int(yy)), 11, 1.0, -1, cv2.LINE_AA)
    acc = cv2.GaussianBlur(acc, (0, 0), 1.0); spe = cv2.GaussianBlur(spe, (0, 0), 1.0)
    fondo = np.array([9, 8, 14], np.float32)
    img = fondo + spe[..., None] * np.array([10, 10, 38], np.float32) + acc[..., None] * np.array([28, 26, 225], np.float32)
    img += cv2.GaussianBlur(acc, (0, 0), 7)[..., None] * np.array([8, 10, 120], np.float32)        # bagliore dentro il vetro
    img += np.clip(acc - 0.6, 0, 1)[..., None] * np.array([40, 70, 75], np.float32)               # centro dei segmenti più acceso
    return np.clip(img, 0, 255), acc


_cache = {}


def display(nome, testo):
    """Strato del display già deformato sull'immagine grande: (y0, y1, x0, x1, colore, maschera, alone)."""
    key = (nome, testo)
    if key in _cache:
        return _cache[key]
    img, acc = tela(testo)
    q = np.float32(TIMER[nome]) * K
    wq = (np.linalg.norm(q[1] - q[0]) + np.linalg.norm(q[2] - q[3])) / 2; hq = (np.linalg.norm(q[3] - q[0]) + np.linalg.norm(q[2] - q[1])) / 2
    W2, H2 = int(DW * 1.12), int(DH * 1.25)                           # bordo scuro intorno alle cifre
    if W2 / H2 > wq / hq:
        H2 = int(W2 * hq / wq)                                          # schermo più alto delle cifre: le cifre stanno al centro
    else:
        W2 = int(H2 * wq / hq)
    fondo = np.zeros((H2, W2, 3), np.float32) + np.array([9, 8, 14], np.float32); a2 = np.zeros((H2, W2), np.float32)
    oy, ox = (H2 - DH) // 2, (W2 - DW) // 2
    fondo[oy:oy + DH, ox:ox + DW] = img; a2[oy:oy + DH, ox:ox + DW] = acc; img, acc = fondo, a2
    A = cv2.getPerspectiveTransform(np.float32([[0, 0], [W2, 0], [W2, H2], [0, H2]]), q)
    m_ = 70 * K                                                       # margine per l'alone
    x0, y0 = max(0, int(q[:, 0].min() - m_)), max(0, int(q[:, 1].min() - m_))
    x1, y1 = min(m.SW, int(q[:, 0].max() + m_)), min(m.SH, int(q[:, 1].max() + m_))
    A2 = np.float32([[1, 0, -x0], [0, 1, -y0], [0, 0, 1]]) @ A; w, h = x1 - x0, y1 - y0
    col = cv2.warpPerspective(img, A2, (w, h), flags=cv2.INTER_LINEAR)
    msk = cv2.warpPerspective(np.ones((H2, W2), np.float32), A2, (w, h), flags=cv2.INTER_LINEAR)
    msk = cv2.GaussianBlur(msk, (0, 0), 0.8)[..., None]
    luce = cv2.warpPerspective(acc, A2, (w, h), flags=cv2.INTER_LINEAR)
    alone = (cv2.GaussianBlur(luce, (0, 0), 9 * K) * 1.6 + cv2.GaussianBlur(luce, (0, 0), 28 * K) * 2.2)[..., None] * np.array([18, 22, 150], np.float32)
    _cache[key] = (y0, y1, x0, x1, col, msk, alone)
    return _cache[key]


def con_timer(big, nome, t):
    s = secondi_timer(nome, t); testo = f"{s // 60:02d}:{s % 60:02d}"
    y0, y1, x0, x1, col, msk, alone = display(nome, testo)
    scatto = t - T_PARTE - np.floor(t - T_PARTE) if t >= T_PARTE and ID(nome) != 1 else 9.0
    puls = 1.0 + 0.45 * np.exp(-scatto / 0.18)                         # il rosso pulsa sul muro a ogni scatto
    out = big.copy(); z = out[y0:y1, x0:x1].astype(np.float32)
    z = z * (1 - msk) + col * msk + alone * puls
    out[y0:y1, x0:x1] = np.clip(z, 0, 255).astype(np.uint8)
    return out


def con_bobine(big, nome, ang):
    out = big.copy()
    for cx, cy, r in BOBINE[nome]:
        cx, cy, R = cx * K, cy * K, r * K; x0, y0 = int(cx - R - 4), int(cy - R - 4); x1, y1 = int(cx + R + 4), int(cy + R + 4)
        reg = out[y0:y1, x0:x1].astype(np.float32)
        A = cv2.getRotationMatrix2D((cx - x0, cy - y0), -ang, 1.0)
        rot = cv2.warpAffine(reg, A, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        a = np.clip((R - np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)) / (0.12 * R), 0, 1)[..., None]
        out[y0:y1, x0:x1] = np.clip(reg * (1 - a) + rot * a, 0, 255).astype(np.uint8)
    return out


# ---------- inchiostro sull'etichetta: si disegna una volta sola nell'immagine
def inchiostro():
    for nome, cfg in ETICHETTA.items():
        if nome not in m.IMG:
            continue
        big, dep = m.IMG[nome]; big = big.astype(np.float32); h, w = big.shape[:2]; ink = np.zeros((h, w), np.float32)
        for linea, spess in cfg["linee"]:
            p = np.round(np.float32(linea) * K * 16).astype(np.int32)              # coordinate con 4 bit di frazione: tratto preciso
            cv2.polylines(ink, [p], False, 1.0, max(1, int(round(spess * K))), cv2.LINE_AA, shift=4)
        if cfg.get("pollice"):                                         # il pollice copre l'inchiostro
            pm = np.zeros((h, w), np.float32); cv2.fillPoly(pm, [(np.float32(cfg["pollice"]) * K).astype(np.int32)], 1.0)
            ink *= 1 - cv2.GaussianBlur(pm, (0, 0), 2)
        ink = cv2.GaussianBlur(ink, (0, 0), cfg.get("sfoca", 0.7))[..., None] * cfg.get("forza", 0.8)
        blu = np.array([235, 120, 55], np.float32)                      # penna blu (BGR), si moltiplica come inchiostro vero
        big = big * (1 - ink) + big * (blu / 255) * ink
        m.IMG[nome] = (np.clip(big, 0, 255).astype(np.uint8), dep)


def ritocchi():
    for nome, zone in RITOCCHI.items():
        if nome not in m.IMG:
            continue
        big, dep = m.IMG[nome]; big = big.copy()
        for z in zone:
            x0, y0, x1, y1 = [int(v * K) for v in z[:4]]
            if len(z) == 5:                                             # sfoca (segni che sembrano lettere)
                a = np.zeros(big.shape[:2], np.float32); a[y0:y1, x0:x1] = 1; a = cv2.GaussianBlur(a, (0, 0), 3 * K)[..., None]
                big = np.clip(big * (1 - a) + cv2.GaussianBlur(big, (0, 0), z[4] * K) * a, 0, 255).astype(np.uint8)
            elif len(z) == 6:                                             # copia da un'altra parte della stessa superficie, bordi sfumati
                dx, dy = int(z[4] * K), int(z[5] * K); a = np.zeros(big.shape[:2], np.float32); a[y0:y1, x0:x1] = 1
                a = cv2.GaussianBlur(a, (0, 0), 4 * K)[..., None]; src = np.roll(big, (-dy, -dx), axis=(0, 1)).astype(np.float32)
                fascia = (slice(y0, y1), slice(max(0, x0 - int(14 * K)), x0))          # stessa luce: si confronta la fascia a sinistra
                gain = big[fascia].reshape(-1, 3).mean(0) / (src[fascia].reshape(-1, 3).mean(0) + 1e-3)
                big = np.clip(big * (1 - a) + src * gain * a, 0, 255).astype(np.uint8)
            else:
                mask = np.zeros(big.shape[:2], np.uint8); mask[y0:y1, x0:x1] = 255
                big = cv2.inpaint(big, mask, 9, cv2.INPAINT_TELEA)
        m.IMG[nome] = (big, dep)


ritocchi()
inchiostro()

# ---------- avvolge il movimento di camera: prima disegna sull'immagine, poi muove
_muovi = m.muovi


def muovi(nome, mov, u, tau, seme, oltre=False):
    if nome not in TIMER and nome not in BOBINE:
        return _muovi(nome, mov, u, tau, seme, oltre)
    big, dep = m.IMG[nome]; i = RIGA.get(nome); t = (m.T[i]["inizio"] if i is not None else 0.0) + tau
    nuovo = big
    if nome in TIMER:
        nuovo = con_timer(nuovo, nome, t)
    if nome in BOBINE:
        giri = 0.55 * 360                                              # gradi al secondo
        ang = giri * max(0.0, t - T_PLAY) if ID(nome) == 9 else giri * (t if ID(nome) is not None else tau)
        nuovo = con_bobine(nuovo, nome, ang)
    m.IMG[nome] = (nuovo, dep)
    try:
        return _muovi(nome, mov, u, tau, seme, oltre)
    finally:
        m.IMG[nome] = (big, dep)


m.muovi = muovi


# ---------- ritocchi sul fotogramma già mosso (prima di nebbia e grana)
LAMPADA_TREMA = [(m.T[IDX[7]]["inizio"] + 1.3, 0.35), (m.T[IDX[10]]["inizio"] + 1.4, 0.25), (m.T[IDX[13]]["inizio"] + 2.6, 0.3)]   # (istante, forza)


def lampada(t):
    """1 = luce normale; ogni tanto la lampada perde un colpo."""
    f = 1.0 + 0.012 * np.sin(97 * t) * np.sin(13 * t)
    for t0, k in LAMPADA_TREMA:
        if 0 <= t - t0 < 0.32:
            x = (t - t0) / 0.32; f -= k * (np.sin(np.pi * x) * (0.6 + 0.4 * np.sign(np.sin(40 * x))))
    return f


def dopo(fr, r, tau, u, t, mm):
    if r["id"] == 1:                                                 # risveglio: tutto sfocato, poi le cifre vanno a fuoco
        s = 9.0 * (1 - m.ease(min(1.0, max(0.0, (tau - 0.3) / 1.6))))
        if s > 0.3:
            fr = cv2.GaussianBlur(fr, (0, 0), s)
        return fr
    if r["id"] == 2:                                                 # la lampada si accende tremando
        tl = tau + 0.0
        liv = np.interp(tl, [0, 0.38, 0.42, 0.55, 0.6, 0.78, 0.82, 0.9, 0.95, 1.2], [0.12, 0.12, 1.0, 0.95, 0.22, 0.25, 0.9, 0.5, 1.0, 1.0])
        return fr * liv
    if r["id"] in (5, 7, 10, 12, 13):                                # stanza illuminata dalla lampada: ogni tanto trema
        return fr * lampada(t)
    return fr
