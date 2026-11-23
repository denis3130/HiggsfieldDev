"""«L'ultima corsa», episodio 1 — cose che servono solo a questa storia (monta.py lo carica da solo, gli script comuni non si toccano).

Tutto disegnato col codice, niente testo generato dal modello:
  - display della banchina «ULTIMA CORSA 00:47» e mappa a LED sopra la porta (matrice di punti), dipinti DENTRO le immagini
    prima del movimento di camera, così si muovono con l'inquadratura;
  - la lucina della mappa che lampeggia a metà di un tratto vuoto;
  - le luci della galleria che scorrono nel finestrino, rallentano e si fermano (riga con "galleria");
  - il neon della fermata senza nome che trema (righe con "neon": forza 0-1) esattamente quando crepita la registrazione
    sfx/neon.mp3 messa nel copione; nelle inquadrature dal vagone trema solo la luce di fuori (la banchina, presa dalla profondità);
  - le due ante della porta che scorrono e si aprono sulla banchina (riga con "porte": "aprono");
  - l'uomo che sparisce nel buio: la banchina si spegne e la sua sagoma svanisce (riga con "sparisce"); la scheda finale,
    che prosegue la stessa inquadratura, resta al buio;
  - il giornale del vecchio che si alza «un po' di più» (riga con "alza");
  - scritte e cifre finte uscite nelle immagini generate: coperte o cancellate (elenco in RITOCCHI).

Chiavi nuove nelle righe di episodio.json: "galleria": true · "lampeggia": true · "neon": 0.6 · "alza": true · "corsa": true
· "porte": "aprono" · "sparisce": true
"""
import subprocess
import sys

import cv2
import numpy as np

m = sys.modules["__main__"]                      # monta.py, che sta girando come programma: da qui IMG, muovi, W, H, righe…
K = m.SW / 576                                   # da pixel dell'immagine generata (576×1024) a pixel dell'immagine ingrandita
AMBRA = (40, 170, 255)                           # BGR

# ---------- caratteri a matrice di punti 5×7 (solo quelli che servono)
_G = {
    "A": ".###. #...# #...# ##### #...# #...# #...#", "B": "####. #...# #...# ####. #...# #...# ####.",
    "C": ".###. #...# #.... #.... #.... #...# .###.", "F": "##### #.... #.... ####. #.... #.... #....",
    "I": ".###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.", "L": "#.... #.... #.... #.... #.... #.... #####",
    "M": "#...# ##.## #.#.# #.#.# #...# #...# #...#", "N": "#...# ##..# #.#.# #..## #...# #...# #...#",
    "O": ".###. #...# #...# #...# #...# #...# .###.", "R": "####. #...# #...# ####. #.#.. #..#. #...#",
    "S": ".#### #.... #.... .###. ....# ....# ####.", "T": "##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..",
    "U": "#...# #...# #...# #...# #...# #...# .###.", "0": ".###. #...# #..## #.#.# ##..# #...# .###.",
    "4": "...#. ..##. .#.#. #..#. ##### ...#. ...#.", "7": "##### ....# ...#. ..#.. .#... .#... .#...",
    ":": "... .#. ... ... ... .#. ...", " ": "... ... ... ... ... ... ...",
}


def matrice(testo):
    """Testo → matrice 7×n di 0/1 (una colonna vuota tra le lettere)."""
    col = []
    for i, c in enumerate(testo):
        g = _G[c].split(); a = np.array([[x == "#" for x in riga] for riga in g], np.uint8)
        col.append(a)
        if i < len(testo) - 1:
            col.append(np.zeros((7, 1), np.uint8))
    return np.hstack(col)


def led(dst, testo, cx, cy, passo, colore=AMBRA, spenti=0.07, forza=1.0):
    """Scrive `testo` a punti luminosi su dst (BGR float32), centrato in (cx, cy), con i punti a `passo` pixel. Ritorna il rettangolo occupato."""
    M_ = matrice(testo); h, w = M_.shape; x0 = cx - (w - 1) * passo / 2; y0 = cy - (h - 1) * passo / 2
    strato = np.zeros(dst.shape[:2], np.float32); r = max(1.2, passo * 0.36)
    for j in range(h):
        for i in range(w):
            v = 1.0 if M_[j, i] else spenti
            if v > 0:
                cv2.circle(strato, (int(round((x0 + i * passo) * 8)), int(round((y0 + j * passo) * 8))), int(r * 8), float(v), -1, cv2.LINE_AA, 3)
    alone = cv2.GaussianBlur(np.where(strato > 0.5, strato, 0), (0, 0), passo * 1.6) * 0.55 + cv2.GaussianBlur(np.where(strato > 0.5, strato, 0), (0, 0), passo * 5) * 0.35
    luce = (np.clip(strato * 1.15, 0, 1.15) + alone)[..., None] * forza
    dst += luce * np.array(colore, np.float32)
    dst += (np.clip(strato - 0.75, 0, 1) * 2.2)[..., None] * forza * 70          # cuore più chiaro dei punti accesi
    return x0 - passo, y0 - passo, x0 + w * passo, y0 + h * passo


def pannello(dst, x0, y0, x1, y1, colore=(9, 8, 6), bordo=(34, 36, 30), raggio=6):
    """Pannello scuro opaco (copre quello generato, con eventuali segni finti) con un filo di bordo."""
    cv2.rectangle(dst, (int(x0), int(y0)), (int(x1), int(y1)), bordo, -1, cv2.LINE_AA)
    cv2.rectangle(dst, (int(x0) + raggio // 2, int(y0) + raggio // 2), (int(x1) - raggio // 2, int(y1) - raggio // 2), colore, -1, cv2.LINE_AA)


def punto(dst, x, y, r, forza=1.0, colore=AMBRA):
    s = np.zeros(dst.shape[:2], np.float32); cv2.circle(s, (int(x * 8), int(y * 8)), int(r * 8), 1.0, -1, cv2.LINE_AA, 3)
    s = s + cv2.GaussianBlur(s, (0, 0), r * 1.5) * 0.8 + cv2.GaussianBlur(s, (0, 0), r * 5) * 0.5
    dst += (s * forza)[..., None] * np.array(colore, np.float32)
    dst += (np.clip(s - 0.9, 0, 1) * forza)[..., None] * 90


def copri(big, x0, y0, x1, y1, sfuma=6):
    """Cancella un pezzo d'immagine (scritte o cifre finte) riempiendolo con la media sfumata di quello che ha intorno.
    Coordinate in pixel dell'immagine generata."""
    x0, y0, x1, y1 = [int(v * K) for v in (x0, y0, x1, y1)]; w, h = x1 - x0, y1 - y0; p = int(max(w, h) * 0.9) + 24
    a, b, c, d = max(0, y0 - p), min(big.shape[0], y1 + p), max(0, x0 - p), min(big.shape[1], x1 + p)
    zona = big[a:b, c:d].astype(np.float32); buco = np.zeros(zona.shape[:2], np.float32); buco[y0 - a:y1 - a, x0 - c:x1 - c] = 1
    largo = cv2.dilate(buco, np.ones((2 * sfuma + 1, 2 * sfuma + 1), np.uint8)); peso = 1 - largo
    sx, sy = max(8.0, 0.35 * w), max(8.0, 0.35 * h)
    pieno = cv2.GaussianBlur(zona * peso[..., None], (0, 0), sx, sigmaY=sy) / (cv2.GaussianBlur(peso, (0, 0), sx, sigmaY=sy)[..., None] + 1e-4)
    morbida = cv2.GaussianBlur(largo, (0, 0), sfuma / 1.5)[..., None]
    big[a:b, c:d] = np.clip(zona * (1 - morbida) + pieno * morbida, 0, 255).astype(np.uint8)


def sfoca(big, x0, y0, x1, y1, sigma=4.0, sfuma=8):
    """Sfoca una zona (stampa del giornale, cartellini) finché non ci si legge più niente."""
    x0, y0, x1, y1 = [int(v * K) for v in (x0, y0, x1, y1)]
    zona = big[y0:y1, x0:x1].astype(np.float32); mk = np.zeros(zona.shape[:2], np.float32)
    mk[sfuma:-sfuma, sfuma:-sfuma] = 1; mk = cv2.GaussianBlur(mk, (0, 0), sfuma / 2)[..., None]
    big[y0:y1, x0:x1] = (zona * (1 - mk) + cv2.GaussianBlur(zona, (0, 0), sigma * K / 2.25) * mk).astype(np.uint8)


# ---------- ritocchi dentro le immagini (coordinate in pixel dell'immagine generata, 576×1024)
def _f(big):
    return big.astype(np.float32)


def _u8(a):
    return np.clip(a, 0, 255).astype(np.uint8)


def display_banchina(big):
    """s01: il tabellone nero appeso sopra la banchina diventa il display «ULTIMA CORSA 00:47»."""
    a = _f(big); pannello(a, 126 * K, 316 * K, 330 * K, 392 * K)
    led(a, "ULTIMA CORSA", 228 * K, 338 * K, 2.67 * K)
    led(a, "00:47", 228 * K, 368 * K, 4.0 * K)
    return _u8(a)


MAPPA_Y, MAPPA_X = 468, {"prima": 62, "bastioni": 175, "treno": 290, "conca": 405, "dopo": 518}      # entro 50-526: resta in quadro anche con lo zoom


def mappa_led(big, treno):
    """s06: la fascia nera sopra la porta diventa la mappa della linea. Le fermate passate sono accese, le prossime spente;
    `treno` = quanto è accesa (0-1) la lucina del treno, ferma a metà del tratto vuoto tra Bastioni e Conca Fallata."""
    a = _f(big); y = MAPPA_Y * K
    for x in range(13, 577, 12):                                             # la riga di puntini della linea
        if min(abs(x - v) for v in MAPPA_X.values()) < 9:
            continue
        acceso = x <= MAPPA_X["treno"] - 8
        punto(a, x * K, y, 1.25 * K, 0.8 if acceso else 0.16)
    for nome, forza in (("prima", 0.95), ("bastioni", 1.0), ("conca", 0.2), ("dopo", 0.2)):
        punto(a, MAPPA_X[nome] * K, y, 3.6 * K, forza)
    led(a, "BASTIONI", MAPPA_X["bastioni"] * K, 518 * K, 3.0 * K, forza=0.95)
    led(a, "CONCA FALLATA", MAPPA_X["conca"] * K, 518 * K, 3.0 * K, forza=0.42, spenti=0.05)
    if treno > 0:
        punto(a, MAPPA_X["treno"] * K, y, 4.6 * K, 1.2 * treno, colore=(70, 205, 255))
    return _u8(a)


def giornale(big):
    """s12: via i titoli finti del giornale (al loro posto macchie di stampa sfocata) e stampa ammorbidita: non si deve leggere niente."""
    for x0, y0, x1, y1 in ((112, 368, 172, 392), (168, 368, 282, 400), (284, 358, 452, 393), (204, 404, 284, 432), (286, 397, 352, 413), (206, 430, 268, 449)):
        copri(big, x0, y0, x1, y1, sfuma=4)
    a = _f(big); rg = np.random.default_rng(12)
    macchie = np.zeros(a.shape[:2], np.float32)
    for x0, y0, x1, y1 in ((120, 376, 276, 392), (292, 366, 444, 384), (212, 411, 278, 425)):      # «parole» senza lettere: barre morbide
        x = x0
        while x < x1 - 8:
            w = int(rg.integers(14, 40)); cv2.rectangle(macchie, (int(x * K), int((y0 + 2) * K)), (int(min(x + w, x1) * K), int((y1 - 2) * K)), 1.0, -1); x += w + int(rg.integers(5, 9))
    macchie = cv2.GaussianBlur(macchie, (0, 0), 3.2 * K)[..., None]
    a = a * (1 - 0.5 * macchie)
    big[:] = _u8(a)
    # stampa minuta: una sfocatura leggera su tutta la carta tranne i guanti
    mk = np.zeros(big.shape[:2], np.float32); cv2.rectangle(mk, (int(4 * K), int(350 * K)), (int(572 * K), int(722 * K)), 1.0, -1)
    for poli in (((85, 395), (165, 388), (182, 450), (192, 560), (182, 628), (118, 632), (98, 560), (52, 470), (58, 420)),
                 ((430, 392), (505, 388), (548, 440), (542, 520), (502, 602), (428, 607), (403, 560), (413, 470), (423, 420))):
        cv2.fillPoly(mk, [(np.array(poli) * K).astype(np.int32)], 0.0)
    mk = cv2.GaussianBlur(mk, (0, 0), 7)[..., None]
    morbida = cv2.GaussianBlur(big, (0, 0), 3.4).astype(np.float32)
    return _u8(big * (1 - mk) + morbida * mk)


def maschera(poligoni, sfuma, pieno=None):
    """Maschera (come immagine BGR ingrandita) da usare con muovi(): così segue la camera come l'immagine a cui si riferisce."""
    mk = np.zeros((m.SH, m.SW), np.float32)
    if pieno is not None:
        mk[:] = pieno
    for poli in poligoni:
        cv2.fillPoly(mk, [(np.array(poli) * K).astype(np.int32)], 1.0)
    mk = cv2.GaussianBlur(mk, (0, 0), sfuma * K)
    return cv2.merge([_u8(mk * 255)] * 3)


def maschera_giornale():
    """Fascia del giornale e dei guanti (piena tra y 326 e 690), che sfuma in alto sul cappello e in basso sul cappotto."""
    y = np.arange(m.SH, dtype=np.float32) / K
    su = np.clip((y - 190) / (326 - 190), 0, 1); giu = np.clip((860 - y) / (860 - 690), 0, 1)
    v = (su * su * (3 - 2 * su)) * (giu * giu * (3 - 2 * giu))
    x = np.arange(m.SW, dtype=np.float32) / K
    o = np.clip(np.minimum(x, 576 - x) / 18, 0, 1)
    mk = v[:, None] * o[None, :]
    return cv2.merge([_u8(mk * 255)] * 3)


NEON_FUORI = ("s07_banchina.png", "s09_soglia.png", "s14_sagoma.png")         # inquadrature dal vagone: trema solo la luce della banchina
UOMO14 = ((262, 386), (304, 386), (326, 414), (346, 444), (352, 520), (336, 548), (326, 602), (250, 602), (246, 528), (250, 446))
PORTA7 = (139, 232, 437, 813)                                                  # vano della porta in s07: x0, y0, x1, y1


def maschera_fuori(dep, soglia=0.48, morbido=0.2):
    """Dove c'è la banchina (lontano) in un'inquadratura presa dal vagone, dalla profondità; ingrandita come l'immagine,
    così con muovi() segue la camera."""
    d = cv2.resize(dep, (m.SW, m.SH), interpolation=cv2.INTER_LINEAR)
    return cv2.merge([_u8(np.clip((soglia - d) / morbido, 0, 1) * 255)] * 3)


def senza_uomo(big):
    """s14 senza l'uomo: la sua sagoma riempita con quello che ha intorno (muro buio sopra, pavimento sotto)."""
    mk = np.zeros(big.shape[:2], np.uint8); cv2.fillPoly(mk, [(np.array(UOMO14) * K).astype(np.int32)], 255)
    mk = cv2.dilate(mk, np.ones((11, 11), np.uint8))
    ys, xs = np.where(mk > 0); y0, y1, x0, x1 = ys.min() - 40, ys.max() + 40, xs.min() - 40, xs.max() + 40
    out = big.copy(); out[y0:y1, x0:x1] = cv2.inpaint(big[y0:y1, x0:x1], mk[y0:y1, x0:x1], 9, cv2.INPAINT_TELEA)
    return out


FINESTRINI = [((0, 72), (322, 60), (366, 84), (386, 130), (392, 760), (376, 820), (332, 856), (0, 922)),
              ((478, 190), (502, 152), (576, 136), (576, 772), (520, 790), (482, 760))]


def prepara():
    """Applica i ritocchi alle immagini già caricate da monta.py e aggiunge quelle derivate (mappa con la lucina accesa, maschere)."""
    I = m.IMG

    def ritocca(nome, fn):
        if nome in I:
            big, dep = I[nome]; I[nome] = (fn(big.copy()), dep)

    def copri_tutti(zone):
        def fn(big):
            for z in zone:
                copri(big, *z)
            return big
        return fn

    ritocca("s01_scala.png", display_banchina)
    if "s06_mappa.png" in I:
        big, dep = I["s06_mappa.png"]
        I["s06_mappa.png"] = (mappa_led(big.copy(), 0.0), dep); I["s06_mappa_on"] = (mappa_led(big.copy(), 1.0), dep)

    def giornale_lontano(big):                                                # s04: titolo finto del giornale e cartello giallo in fondo
        copri(big, 26, 414, 92, 448, sfuma=3)
        sfoca(big, 22, 404, 136, 612, sigma=1.7); sfoca(big, 327, 453, 355, 490, sigma=3.0, sfuma=4)       # il cartello sta tra due pali: solo sfocato
        return big

    ritocca("s03_uomo_c.png", copri_tutti([(38, 314, 114, 400)]))                                    # adesivo con righe di testo finto sulla porta
    ritocca("s04_vagone_b.png", giornale_lontano)
    ritocca("s09_soglia.png", copri_tutti([(212, 205, 236, 221), (330, 279, 353, 303)]))            # cartellini con segni finti
    ritocca("s11_passeggeri.png", copri_tutti([(536, 200, 562, 219)]))                              # cifre rosse sul display della porta
    ritocca("s12_giornale.png", giornale)
    ritocca("s13_ombrello_appeso.png", copri_tutti([(312, 119, 572, 164), (222, 122, 256, 162)]))   # scritte e «217» sopra la porta
    ritocca("s14_sagoma.png", copri_tutti([(236, 62, 324, 88)]))                                    # cifre sopra la porta
    if "s05_finestrino.png" in I:
        I["s05_maschera"] = (maschera(FINESTRINI, 5), I["s05_finestrino.png"][1])
    if "s12_giornale.png" in I:
        I["s12_maschera"] = (maschera_giornale(), I["s12_giornale.png"][1])
    for nome in NEON_FUORI:
        if nome in I:
            I[nome[:-4] + "_fuori"] = (maschera_fuori(I[nome][1]), I[nome][1])
    if "s14_sagoma.png" in I:
        big, dep = I["s14_sagoma.png"]
        I["s14_vuota"] = (senza_uomo(big), dep); I["s14_uomo"] = (maschera([UOMO14], 7), dep)
    m.MOV["corsa"] = (1.0, 1.20, 0.08, 0, 0)                                  # discesa di corsa: spinta in avanti più forte di «scendi»


prepara()

# ---------- effetti nel tempo
def _crepitii(nome, fps=30):
    """Quanto crepita il suono `nome`, fotogramma per fotogramma (0-1): i colpi sopra il suo ronzio di fondo."""
    p = next((c for c in (m.D / "sfx" / nome, m.B / "sfx" / nome) if c.exists()), None)
    if p is None:
        return np.zeros(1, np.float32)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).astype(np.float64); w = 16000 // fps; n = len(x) // w
    db = 20 * np.log10(np.sqrt((x[:n * w].reshape(n, w) ** 2).mean(1)) + 1e-9)
    return np.clip((db - np.median(db) - 4) / 10, 0, 1).astype(np.float32)


ZAP = _crepitii("neon.mp3")
_ID = {r["id"]: k for k, r in enumerate(m.righe)}
NEON_POSTI = [(m.T[_ID[s["riga"]]]["inizio"] + s.get("dopo", 0.0), s.get("da", 0.0), None if s.get("fino_alla_fine") else s.get("dur"))
              for s in m.ep.get("suoni", []) if s["file"] == "neon.mp3" and not s.get("parola")]


def luce_neon(t):
    """1 = neon acceso. Quando nella registrazione del neon c'è un crepitio, la luce cala e balbetta nello stesso istante."""
    z = 0.0
    for t0, da, dur in NEON_POSTI:
        if t0 <= t and (dur is None or t < t0 + dur):
            f = int(round((t - t0 + da) * 30))
            if f < len(ZAP):
                z = max(z, float(ZAP[f]))
    return 1.0 if z <= 0 else 1 - 0.85 * z * (0.55 + 0.45 * np.sin(91.7 * t) ** 2)


def _durata(i):
    return (m.T[i + 1]["inizio"] if i + 1 < len(m.T) else m.TOT) - m.T[i]["inizio"]


def _sposta(fr, dx, dy):
    A = np.float32([[1, 0, dx], [0, 1, dy]])
    return cv2.warpAffine(fr, A, (m.W, m.H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def galleria(fr, r, tau, u, i, mov):
    """Nel finestrino scorrono la parete e le lampade della galleria, da destra a sinistra, sempre più piano, poi si fermano: il treno frena."""
    ts = 0.80 * _durata(i); v0, p = 2700.0, 1.7                               # px al secondo all'inizio, curva della frenata
    q = max(0.0, 1 - tau / ts); v = v0 * q ** p; resto = v0 * ts / (p + 1) * q ** (p + 1)      # velocità e strada che manca
    mk = m.muovi("s05_maschera", mov, u, tau, float(i))[..., :1] / 255.0
    o = int(3 * m.W - resto) % (3 * m.W); muro = m.FOG[:, o:o + m.W]          # la parete: una trama scura che scorre e si sfoca con la velocità
    kx = int(min(241, 1 + v * 0.06)) | 1
    if kx > 1:
        muro = cv2.blur(muro, (kx, 1))
    luce = np.zeros((m.H, m.W), np.float32); passaggio = 0.0
    for riga_y, passo, x_fine, alto, forza in ((610, 430, 250, 15, 1.0), (1210, 310, 470, 5, 0.3)):      # lampade, e più giù il riflesso sui cavi
        lung = max(34.0, v * 0.07)
        for k in range(-3, 12):
            x = x_fine + k * passo + resto
            if -lung < x < m.W + lung:
                cv2.rectangle(luce, (int(x), riga_y - alto), (int(x + lung), riga_y + alto), forza * min(1.0, (70 / lung) ** 0.3), -1)
                if alto > 10:
                    passaggio += float(np.exp(-((x + lung / 2 - m.W / 2) / 420) ** 2))
    luce = cv2.GaussianBlur(luce, (0, 0), 7) + cv2.GaussianBlur(luce, (0, 0), 50) * 0.55
    fr = fr * (1.12 + 0.42 * min(passaggio, 1.3))                             # ogni lampada che passa rischiara il vagone
    fr = fr + (muro[..., None] * mk) * np.array([50, 58, 46], np.float32) + luce[..., None] * mk * np.array([105, 190, 255], np.float32) * 1.05
    if tau < ts:                                                              # il vagone vibra finché corre…
        fr = _sposta(fr, 2.6 * q * np.sin(41 * tau), 2.0 * q * np.sin(33 * tau + 1))
    else:                                                                     # …e dà uno strattone quando si ferma
        d = tau - ts; fr = _sposta(fr, 16 * np.exp(-5.5 * d) * np.sin(2 * np.pi * 2.6 * d), 0)
    return fr


def alza(fr, r, tau, u, i, mov):
    """Il giornale sale di qualche centimetro quando il narratore dice «alza»."""
    t0 = next((w[0] - m.T[i]["inizio"] for w in m.parole[i] if "alza" in w[2].lower()), 0.6)
    k = float(np.clip((tau - t0 + 0.1) / 1.2, 0, 1)); k = k * k * (3 - 2 * k)
    if k <= 0:
        return fr
    mk = m.muovi("s12_maschera", mov, u, tau, float(i))[..., 0] / 255.0
    return cv2.remap(fr, m.XX, (m.YY + 44.0 * k * mk).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def _anta(w, h, seme):
    """Un'anta della porta vista da dentro (pixel dell'immagine ingrandita), con la guarnizione sul bordo destro:
    pannello grigio-petrolio illuminato dall'alto dal neon del vagone, finestrino di vetro scuro, gomma nera. Ritorna colore e opacità."""
    rg = np.random.default_rng(seme); y = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    col = np.array([30, 37, 8], np.float32) * (1.35 - 0.95 * y) * (1 + 0.05 * cv2.GaussianBlur(rg.standard_normal((h, w)).astype(np.float32), (0, 0), 3)[..., None])
    al = np.ones((h, w), np.float32)
    vx0, vx1, vy0, vy1, rr = int(0.2 * w), int(0.84 * w), int(0.09 * h), int(0.47 * h), int(0.12 * w)
    vetro = np.zeros((h, w), np.uint8)
    cv2.rectangle(vetro, (vx0 + rr, vy0), (vx1 - rr, vy1), 255, -1); cv2.rectangle(vetro, (vx0, vy0 + rr), (vx1, vy1 - rr), 255, -1)
    for cx, cy in ((vx0 + rr, vy0 + rr), (vx1 - rr, vy0 + rr), (vx0 + rr, vy1 - rr), (vx1 - rr, vy1 - rr)):
        cv2.circle(vetro, (cx, cy), rr, 255, -1, cv2.LINE_AA)
    gomma = cv2.dilate(vetro, np.ones((15, 15), np.uint8)) > 0
    col[gomma] = (5, 6, 2)
    v = vetro > 127
    riflesso = np.clip(1 - np.abs((np.arange(w)[None, :] - 0.55 * w) + 0.35 * (np.arange(h)[:, None] - vy0)) / (0.09 * w), 0, 1)
    col[v] = (np.array([9, 12, 3], np.float32) + riflesso[v][:, None] * np.array([26, 34, 8], np.float32))
    al[v] = 0.8                                                               # dal vetro scuro si intravede la banchina
    col[:, w - 14:] = (4, 5, 2); col[:, w - 14:w - 11] = (40, 50, 12)       # guarnizione di gomma dove le ante si toccano
    col[:, :6] *= 0.55
    return col, al


_ANTE = {}


def _apertura(tau, t0, durata):
    s = float(np.clip((tau - t0) / durata, 0, 1))
    return s * s * (3 - 2 * s)


def porte(fr, r, tau, u, i, mov, t0=0.12, durata=0.95):
    """Le due ante scorrono dentro le pareti e scoprono la banchina (disegnate sull'immagine ingrandita, così seguono la camera)."""
    s = _apertura(tau, t0, durata)
    if s >= 1:
        return fr
    x0, y0, x1, y1 = [int(v * K) for v in PORTA7]; lw = (x1 - x0) // 2; h = y1 - y0
    if not _ANTE:
        c, a = _anta(lw, h, 3); _ANTE["sx"] = (c, a); _ANTE["dx"] = (c[:, ::-1].copy(), a[:, ::-1].copy())
    big, dep = m.IMG[r["img"]]
    C = np.zeros(big.shape, np.float32); A = np.zeros(big.shape[:2], np.float32); off = int(round(s * lw))
    if off < lw:
        c, a = _ANTE["sx"]; C[y0:y1, x0:x0 + lw - off] = c[:, off:]; A[y0:y1, x0:x0 + lw - off] = a[:, off:]
        c, a = _ANTE["dx"]; C[y0:y1, x0 + lw + off:x0 + 2 * lw] = c[:, :lw - off]; A[y0:y1, x0 + lw + off:x0 + 2 * lw] = a[:, :lw - off]
    C *= A[..., None]                                                         # colore premoltiplicato: il mosso non scurisce i bordi
    kx = int(abs(s - _apertura(tau - 1 / 30, t0, durata)) * lw) | 1        # pixel fatti in un fotogramma: le ante a metà corsa sono mosse
    if kx > 1:
        C = cv2.blur(C, (kx, 1)); A = cv2.blur(A, (kx, 1))
    m.IMG["_ante"] = (_u8(C), dep); m.IMG["_ante_a"] = (cv2.merge([_u8(A * 255)] * 3), dep)
    Cm = MUOVI("_ante", mov, u, tau, float(i)); Am = MUOVI("_ante_a", mov, u, tau, float(i))[..., :1] / 255.0
    return fr * (1 - Am) + Cm


def sparisce(fr, mov, u, tau, seme, oltre=False, k_uomo=None, k_buio=None):
    """s14: l'uomo svanisce nel buio e la banchina si spegne; le porte restano aperte sul nero (l'ombrello, vicino, resta)."""
    if k_uomo is None:
        k_uomo = float(np.clip((tau - 0.55) / 1.9, 0, 1)); k_uomo = k_uomo * k_uomo * (3 - 2 * k_uomo)
        k_buio = float(np.clip((tau - 0.35) / 2.7, 0, 1)); k_buio = k_buio * k_buio * (3 - 2 * k_buio)
    if k_uomo > 0:
        U = MUOVI("s14_uomo", mov, u, tau, seme, oltre)[..., :1] / 255.0 * k_uomo
        fr = fr * (1 - U) + MUOVI("s14_vuota", mov, u, tau, seme, oltre) * U
    if k_buio > 0:
        F = MUOVI("s14_sagoma_fuori", mov, u, tau, seme, oltre)[..., :1] / 255.0
        fr = fr * (1 - 0.9 * k_buio * F)
    return fr


MUOVI = m.muovi                                                               # quello vero di monta.py


def _muovi_scheda(nome, mov, u, tau, seme, oltre=False):
    """La scheda finale prosegue l'inquadratura di s14 (oltre=True): lì l'uomo è già sparito e la banchina è buia."""
    fr = MUOVI(nome, mov, u, tau, seme, oltre)
    if oltre and nome == "s14_sagoma.png":
        fr = sparisce(fr, mov, u, tau, seme, True, 1.0, 1.0)
    return fr


m.muovi = _muovi_scheda


def dopo(fr, r, tau, u, t, mm):
    i = mm.righe.index(r); mov = r.get("mov", "avanza_lento")
    if r.get("lampeggia"):                                                    # la lucina del treno sulla mappa
        a = float(np.clip(0.5 + 2.6 * np.sin(2 * np.pi * 1.35 * tau - 0.6), 0, 1))
        if a > 0:
            fr = fr * (1 - a) + mm.muovi(r["img"][:-4] + "_on", mov, u, tau, float(i)) * a
    if r.get("galleria"):
        fr = galleria(fr, r, tau, u, i, mov)
    if r.get("alza"):
        fr = alza(fr, r, tau, u, i, mov)
    if r.get("corsa"):                                                        # si scende di corsa: la camera sobbalza a ogni gradino
        fr = _sposta(fr, 6 * np.sin(2 * np.pi * 1.5 * tau), 11 * abs(np.sin(2 * np.pi * 1.5 * tau)) - 5)      # tre gradini al secondo
    if r.get("porte") == "aprono":
        fr = porte(fr, r, tau, u, i, mov)
    if r.get("sparisce"):
        fr = sparisce(fr, mov, u, tau, float(i))
    if r.get("neon"):
        l = luce_neon(t)
        if l < 1:
            fuori = r["img"][:-4] + "_fuori"                                  # dal vagone trema solo la luce di fuori
            peso = MUOVI(fuori, mov, u, tau, float(i))[..., :1] / 255.0 if fuori in mm.IMG else 1.0
            fr = fr * (1 - float(r["neon"]) * (1 - l) * peso)
    return fr
