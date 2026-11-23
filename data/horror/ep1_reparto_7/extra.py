"""Reparto 7, Ep. 1 — cose che servono solo a questa storia, disegnate col codice (vedi «estensioni» in scripts/bivio/monta.py).
Parametri nelle righe di episodio.json; coordinate in frazioni dell'immagine (x su larghezza, y su altezza).
  etichetta   la stampa del braccialetto («VENTURI ALDO…») dipinta sulla fascia bianca, curva come la fascia
  orologio    l'orologio a cifre rosse in fondo al corridoio
  accendi     una luce che si accende su una parola (spia rossa sopra la porta, luce della porta in fondo che si apre)
  trema       la camera che trema mentre il narratore grida (segue la forza della voce)
  suoni con "luce": il neon che sfarfalla insieme al suono vero del neon (dove la registrazione tace, la luce cala)
Le scritte e le luci si dipingono sull'immagine sorgente quando monta.py carica questo file: così seguono il movimento di camera."""
import subprocess, sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

SEG = {"0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg"}


def curva(pts, k):
    """Parabola per 3 punti [x, y] (frazioni) → funzione di x in pixel dell'immagine grande."""
    xs = [p[0] * k[0] for p in pts]; ys = [p[1] * k[1] for p in pts]; c = np.polyfit(xs, ys, 2)
    return lambda x: np.polyval(c, x)


def testo_etichetta(m, righe, tw, th):
    """Texture della stampa (alfa 0-1): righe [[testo, peso, quota dell'altezza], ...], centrate."""
    s = 4; im = Image.new("L", (tw * s, th * s), 0); d = ImageDraw.Draw(im)
    tot = sum(r[2] for r in righe); y = (1 - tot) / 2 * th * s
    for txt, peso, q in righe:
        size = int(q * th * s * 0.95)
        while size > 6 and m.font(peso, size).getlength(txt) > tw * s * 0.94:
            size -= 1
        f = m.font(peso, size); y += q * th * s / 2
        d.text((tw * s / 2, y), txt, font=f, fill=255, anchor="mm"); y += q * th * s / 2
    return np.asarray(im.resize((tw, th), Image.LANCZOS)).astype(np.float32) / 255


def etichetta(m, nome, e):
    """La stampa segue la fascia come un cilindro: in orizzontale si stringe verso i bordi, in verticale sta tra due curve."""
    big, dep = m.IMG[nome]; Hb, Wb = big.shape[:2]; k = (Wb, Hb)
    cx, R = e["cx"] * Wb, e["r"] * Wb; a0, a1 = np.radians(e["ang"]); alto, basso = curva(e["alto"], k), curva(e["basso"], k)
    x0, x1 = int(cx + R * np.sin(a0)) - 2, int(cx + R * np.sin(a1)) + 2
    xs = np.arange(x0, x1); y0 = int(min(alto(xs).min(), basso(xs).min())) - 2; y1 = int(max(alto(xs).max(), basso(xs).max())) + 2
    tw = int(R * (a1 - a0)); th = int(np.mean(basso(xs) - alto(xs)))
    tex = testo_etichetta(m, e["righe"], tw, th)
    X, Y = np.meshgrid(np.arange(x0, x1, dtype=np.float32), np.arange(y0, y1, dtype=np.float32))
    th_ = np.arcsin(np.clip((X - cx) / R, -1, 1)); u = (th_ - a0) / (a1 - a0); v = (Y - alto(X)) / (basso(X) - alto(X))
    a = cv2.remap(tex, (u * (tw - 1)).astype(np.float32), (v * (th - 1)).astype(np.float32), cv2.INTER_LINEAR, borderValue=0)
    a = cv2.GaussianBlur(a, (0, 0), e.get("sfoca", 0.9)) * e.get("inchiostro", 0.8)
    zona = big[y0:y1, x0:x1].astype(np.float32); inch = np.array(e.get("colore", [30, 28, 26]), np.float32)        # BGR
    big = big.copy(); big[y0:y1, x0:x1] = np.clip(zona * (1 - a[..., None]) + inch * a[..., None], 0, 255).astype(np.uint8)
    m.IMG[nome] = (big, dep)


def pulisci(m, nome, zone):
    """Toglie le scritte finte che il modello a volte disegna (lettere chiare su fondo scuro): si riempiono col fondo intorno."""
    big, dep = m.IMG[nome]; Hb, Wb = big.shape[:2]; big = big.copy()
    for x0, y0, x1, y1, *soglia in zone:
        X0, Y0, X1, Y1 = int(x0 * Wb), int(y0 * Hb), int(x1 * Wb), int(y1 * Hb); c = big[Y0:Y1, X0:X1]
        g = cv2.cvtColor(c, cv2.COLOR_BGR2GRAY).astype(np.float32); fondo = cv2.medianBlur(c, 31)
        sel = ((g - cv2.cvtColor(fondo, cv2.COLOR_BGR2GRAY).astype(np.float32)) > (soglia[0] if soglia else 12)).astype(np.uint8) * 255
        sel = cv2.dilate(sel, np.ones((7, 7), np.uint8))
        big[Y0:Y1, X0:X1] = cv2.inpaint(c, sel, 7, cv2.INPAINT_TELEA)
    m.IMG[nome] = (big, dep)


def ritocchi(m, nome, lista):
    """Piccoli ritocchi dell'immagine: "sfoca" (scritte finte troppo piccole per toglierle: diventano una luce sfocata) e
    "scurisci" (una finestra col giorno che deve sembrare notte). box in frazioni, bordi sfumati."""
    big, dep = m.IMG[nome]; Hb, Wb = big.shape[:2]; f = big.astype(np.float32)
    for o in lista:
        x0, y0, x1, y1 = o["box"]; mk = np.zeros((Hb, Wb), np.float32); mk[int(y0 * Hb):int(y1 * Hb), int(x0 * Wb):int(x1 * Wb)] = 1
        mk = cv2.GaussianBlur(mk, (0, 0), o.get("bordo", 0.006) * Wb)[..., None]
        if o["tipo"] == "sfoca":
            alt = cv2.GaussianBlur(f, (0, 0), o.get("sigma", 4) * Wb / 576)
        elif o["tipo"] == "meno_rosso":                                     # un rosso troppo acceso (sembra una macchia) torna luce riflessa
            k = o.get("forza", 0.8); rosso = np.clip((f[..., 2:3] - (f[..., 0:1] + f[..., 1:2]) / 2) / 40, 0, 1) * k
            lum = f.mean(axis=2, keepdims=True) * np.array(o.get("tinta", [1.05, 1.0, 0.62]), np.float32) * o.get("luce", 0.8)
            alt = f * (1 - rosso) + lum * rosso
        else:
            alt = f * (1 - o.get("forza", 0.6)) * np.array(o.get("tinta", [1.0, 0.95, 0.8]), np.float32)
        f = f * (1 - mk) + alt * mk
    m.IMG[nome] = (np.clip(f, 0, 255).astype(np.uint8), dep)


def cifre(testo, h, s=4):
    """Cifre a sette segmenti (alfa), altezza h pixel: l'orologio digitale rosso."""
    H = h * s; Wd = int(H * 0.56); sp = int(H * 0.16); t = int(H * 0.13); col = int(H * 0.3)
    lw = sum(col if c == ":" else Wd for c in testo) + sp * (len(testo) - 1)
    im = Image.new("L", (lw + 2 * t, H + 2 * t), 0); d = ImageDraw.Draw(im); x = t; inc = 0.08
    def seg(p0, p1):
        (xa, ya), (xb, yb) = p0, p1; n = t / 2
        if ya == yb:
            pts = [(xa + n, ya), (xa + 2 * n, ya - n), (xb - 2 * n, yb - n), (xb - n, yb), (xb - 2 * n, yb + n), (xa + 2 * n, ya + n)]
        else:
            pts = [(xa, ya + n), (xa + n, ya + 2 * n), (xb + n, yb - 2 * n), (xb, yb - n), (xb - n, yb - 2 * n), (xa - n, ya + 2 * n)]
        d.polygon([(px + (H + t - py) * inc, py) for px, py in pts], fill=255)
    for c in testo:
        if c == ":":
            for yy in (0.32, 0.68):
                cxx, cyy = x + col / 2 + (H + t - (t + H * yy)) * inc, t + H * yy; d.ellipse([cxx - t * 0.6, cyy - t * 0.6, cxx + t * 0.6, cyy + t * 0.6], fill=255)
            x += col + sp; continue
        L, Rr, T0, M0, B0 = x + t / 2, x + Wd - t / 2, t + t / 2, t + H / 2, t + H - t / 2
        P = {"a": ((L, T0), (Rr, T0)), "b": ((Rr, T0), (Rr, M0)), "c": ((Rr, M0), (Rr, B0)), "d": ((L, B0), (Rr, B0)),
             "e": ((L, M0), (L, B0)), "f": ((L, T0), (L, M0)), "g": ((L, M0), (Rr, M0))}
        for sg in SEG[c]:
            seg(*P[sg])
        x += Wd + sp
    return np.asarray(im.resize((im.width // s, im.height // s), Image.LANCZOS)).astype(np.float32) / 255


def orologio(m, nome, o):
    """Scatola nera con le cifre rosse e il loro alone, in fondo al corridoio (un po' sfocata, come tutto il fondo)."""
    big, dep = m.IMG[nome]; Hb, Wb = big.shape[:2]; h = int(o["h"] * Hb); cx, cy = o["xy"][0] * Wb, o["xy"][1] * Hb
    a = cifre(o.get("testo", "02:10"), h); bh, bw = int(h * 1.9), int(a.shape[1] + h * 0.9)
    box = np.zeros((bh, bw), np.float32); x0, y0 = int(cx - bw / 2), int(cy - bh / 2)
    frame = big[y0:y0 + bh, x0:x0 + bw].astype(np.float32)
    corpo = np.full_like(frame, np.array([14, 13, 12], np.float32)); corpo[:max(1, bh // 12)] += 26                    # bordo alto che prende la luce del neon
    corpo[:, :max(1, bw // 40)] += 10; corpo[:, -max(1, bw // 40):] += 10
    ay, ax = (bh - a.shape[0]) // 2, (bw - a.shape[1]) // 2; box[ay:ay + a.shape[0], ax:ax + a.shape[1]] = a
    rosso = np.array([40, 46, 255], np.float32)
    lay = corpo * (1 - box[..., None]) + rosso * box[..., None]
    m_ = np.ones((bh, bw), np.float32); s = o.get("sfoca", 1.2)
    out = big.astype(np.float32); out[y0:y0 + bh, x0:x0 + bw] = lay
    out = cv2.GaussianBlur(out, (0, 0), s) * 1.0
    full = np.zeros(big.shape[:2], np.float32); full[y0:y0 + bh, x0:x0 + bw] = box
    mk = np.zeros(big.shape[:2], np.float32); mk[y0:y0 + bh, x0:x0 + bw] = m_; mk = cv2.GaussianBlur(mk, (0, 0), s)[..., None]
    res = big.astype(np.float32) * (1 - mk) + out * mk
    alone = cv2.GaussianBlur(full, (0, 0), h * 0.5) * 1.4 + cv2.GaussianBlur(full, (0, 0), h * 2.2) * 1.2      # la luce rossa sul muro intorno
    res = res + alone[..., None] * np.array([20, 25, 150], np.float32) * o.get("alone", 1.0)
    m.IMG[nome] = (np.clip(res, 0, 255).astype(np.uint8), dep)


def maschera(shape, a):
    """Maschera morbida 0-1: cerchio ("xy", "r") oppure poligono ("poligono") sfumato di "sfuma"."""
    Hb, Wb = shape[:2]
    if "poligono" in a:
        mk = np.zeros((Hb, Wb), np.uint8); cv2.fillPoly(mk, [np.int32([[x * Wb, y * Hb] for x, y in a["poligono"]])], 255)
        return cv2.GaussianBlur(mk.astype(np.float32) / 255, (0, 0), a.get("sfuma", 0.01) * Wb)
    YY, XX = np.mgrid[0:Hb, 0:Wb].astype(np.float32); cx, cy, r = a["xy"][0] * Wb, a["xy"][1] * Hb, a["r"] * Wb
    return np.exp(-((XX - cx) ** 2 + (YY - cy) ** 2) / (2 * r * r))


def spento(m, nome, a):
    """Versione dell'immagine con quella luce spenta. Spia rossa ("xy", "r", "lente"): i pixel rossi e quelli bianchissimi del nucleo
    si riempiono col muro intorno (inpaint) e al centro resta il vetrino spento. Luce bianca ("poligono"): la zona si scurisce di "forza"."""
    big, dep = m.IMG[nome]; Hb, Wb = big.shape[:2]; f = big.astype(np.float32); mk = maschera(big.shape, a) if "zone" not in a else None
    if "zone" in a:                                                             # luce bianca: si spengono le parti più chiare dentro le zone
        mk = np.zeros((Hb, Wb), np.float32); lum = f.mean(axis=2)
        for x0, y0, x1, y1 in a["zone"]:
            X0, Y0, X1, Y1 = int(x0 * Wb), int(y0 * Hb), int(x1 * Wb), int(y1 * Hb)
            mk[Y0:Y1, X0:X1] = np.clip((lum[Y0:Y1, X0:X1] - a.get("soglia", 60)) / 50, 0, 1)
        mk = cv2.GaussianBlur(mk, (0, 0), 0.008 * Wb)
        off = f * (1 - mk[..., None] * a.get("forza", 0.8))
        gb = (f[..., 0] + f[..., 1]) / 2 + 1; fuori = (mk < 0.02) & (lum > 8)             # spenta, la zona prende il colore del pavimento intorno
        q = float(np.median(f[..., 2][fuori] / gb[fuori])) if fuori.any() else 0.5
        off[..., 2] = off[..., 2] * (1 - mk) + np.minimum(off[..., 2], (off[..., 0] + off[..., 1]) / 2 * q) * mk
    elif "poligono" in a:
        off = f * (1 - mk[..., None] * a.get("forza", 0.8))
    else:
        cx, cy = a["xy"][0] * Wb, a["xy"][1] * Hb; R = a["r"] * Wb * 2.6
        x0, x1, y0, y1 = int(max(0, cx - R)), int(min(Wb, cx + R)), int(max(0, cy - R)), int(min(Hb, cy + R))
        c = big[y0:y1, x0:x1]; cf = c.astype(np.float32); lum = cf.mean(axis=2)
        rosso = cf[..., 2] - (cf[..., 0] + cf[..., 1]) / 2
        sel = (((rosso > 5) | (lum > 175)) & (mk[y0:y1, x0:x1] > 0.03)).astype(np.uint8) * 255
        sel = cv2.dilate(sel, np.ones((9, 9), np.uint8))
        pul = cv2.inpaint(c, sel, 9, cv2.INPAINT_TELEA).astype(np.float32)
        w = cv2.GaussianBlur(sel.astype(np.float32) / 255, (0, 0), 4)[..., None]
        z = cf * (1 - w) + pul * w
        mz = np.clip(mk[y0:y1, x0:x1] * 3, 0, 1)                                  # e intorno nessun riflesso rosso: il rosso torna al livello del muro
        gb = (cf[..., 0] + cf[..., 1]) / 2 + 1; fuori = sel == 0
        q = float(np.median(cf[..., 2][fuori] / gb[fuori])) * 1.1 if fuori.any() else 0.9   # quanto rosso ha il muro lontano dalla spia
        z[..., 2] = z[..., 2] * (1 - mz) + np.minimum(z[..., 2], (z[..., 0] + z[..., 1]) / 2 * q) * mz
        YY, XX = np.mgrid[y0:y1, x0:x1].astype(np.float32); rl = a.get("lente", 0.02) * Wb
        lente = np.clip((rl - np.sqrt((XX - cx) ** 2 + (YY - cy) ** 2)) / 3 + 0.5, 0, 1)[..., None] * 0.9
        z = z * (1 - lente) + np.array([30, 30, 58], np.float32) * lente                 # il vetrino della spia, spento
        off = f.copy(); off[y0:y1, x0:x1] = z
    m.IMG[nome + "#spento"] = (np.clip(off, 0, 255).astype(np.uint8), dep)


def inviluppo(m, nome, da, dur):
    """Forza (0-1) di una registrazione nel tempo, a passi di 10 ms: dove è forte la luce è accesa."""
    p = next(c for c in (m.D / "sfx" / nome, m.B / "sfx" / nome) if c.exists())
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(da), "-t", str(dur), "-i", str(p), "-ac", "1", "-ar", "8000", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32); n = 80; e = np.sqrt(np.convolve(x ** 2, np.ones(n) / n, mode="same"))[::n]
    db = 20 * np.log10(e / (e.max() + 1e-9) + 1e-9)
    return np.clip((db + 34) / 14, 0, 1)                                                       # sotto −34 dB spento, sopra −20 dB acceso


def quando(m, s):
    """Come monta.quando: inizio della riga (+ dopo) o l'attimo in cui si dice la parola."""
    i = next(k for k, r in enumerate(m.righe) if r["id"] == s["riga"]); t = m.T[i]["inizio"]
    if s.get("parola"):
        t = next((w[0] for w in m.parole[i] if s["parola"].lower() in w[2].lower()), t)
    return max(0.0, t + s.get("dopo", 0.0))


LAMPI = []           # (inizio, fine, luce minima, inviluppo)
VOCE = None


def prepara(m):
    global VOCE
    if hasattr(m, "MOV"):
        m.MOV.setdefault("dettaglio", (1.5, 1.62, 0.02, 0, 0))          # stacco ravvicinato sulla stampa del braccialetto (stessa immagine)
    for r in m.righe:
        if r.get("pulisci"):
            pulisci(m, r["img"], r["pulisci"])
        if r.get("ritocchi"):
            ritocchi(m, r["img"], r["ritocchi"])
        if r.get("etichetta"):
            etichetta(m, r["img"], r["etichetta"])
        if r.get("orologio"):
            orologio(m, r["img"], r["orologio"])
        for a in r.get("accendi", []):
            spento(m, r["img"], a)
        for o in r.get("opzioni", {}).values():                              # miniature della scheda finale
            if o.get("ritocchi"):
                ritocchi(m, o["img"], o["ritocchi"])
    if hasattr(m, "T"):
        for s in m.ep.get("suoni", []):
            if "luce" in s:
                t0 = quando(m, s); LAMPI.append((t0, t0 + s["dur"], s["luce"], inviluppo(m, s["file"], s.get("da", 0.0), s["dur"])))
        if any(r.get("trema") for r in m.righe) and (m.D / "voce.wav").exists():
            raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(m.D / "voce.wav"), "-ac", "1", "-ar", "8000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
            x = np.frombuffer(raw, np.float32); VOCE = np.sqrt(np.convolve(x ** 2, np.ones(400) / 400, mode="same"))[::80]


def dopo(fr, r, tau, u, t, m):
    i = m.righe.index(r)
    for a in r.get("accendi", []):                                                # luce che si accende sulla parola
        w = next((x[0] for x in m.parole[i] if a["parola"].lower() in x[2].lower()), m.T[i]["inizio"]) + a.get("dopo", 0.0)
        su = a.get("su", 0.12); lam = float(np.clip((t - w) / su, 0, 1))
        if lam < 1 and t > w - 0.001 and a.get("tremola", True):
            lam *= 0.55 + 0.45 * (np.sin(90 * (t - w)) > -0.3)                     # si accende con un piccolo tremolio
        if lam < 1:
            off = m.muovi(r["img"] + "#spento", r.get("mov", "avanza_lento"), u, tau, float(i))
            fr = off * (1 - lam) + fr * lam
    for t0, t1, lo, env in LAMPI:                                                 # neon che sfarfalla col suo suono
        if t0 <= t < t1:
            k = env[min(len(env) - 1, int((t - t0) * 100))]; fr = fr * (lo + (1 - lo) * k)
    if r.get("trema") and VOCE is not None:                                       # la camera trema con il grido
        p = next((q for q in m.T[i]["pezzi"] if q["tipo"] == "grido"), None)
        if p and p["inizio"] - 0.05 <= t <= p["fine"] + 0.6:
            f = VOCE[min(len(VOCE) - 1, int(t * 100))] / (VOCE.max() + 1e-9); A = r["trema"] if isinstance(r["trema"], (int, float)) and r["trema"] is not True else 16
            A *= min(1.0, f * 2.2) if t <= p["fine"] else max(0.0, 1 - (t - p["fine"]) / 0.6) * 0.5
            dx = A * (np.sin(37 * t) + 0.6 * np.sin(71 * t + 1.3)); dy = A * (np.cos(43 * t) + 0.5 * np.sin(89 * t + 2.1)); sc = 1 + 0.008 * A / 16
            M_ = np.float32([[sc, 0, dx + (1 - sc) * m.W / 2], [0, sc, dy + (1 - sc) * m.H / 2]])
            fr = cv2.warpAffine(fr, M_, (m.W, m.H), borderMode=cv2.BORDER_REFLECT)
    return fr


prepara(sys.modules["__main__"]) if hasattr(sys.modules["__main__"], "IMG") else None
