"""Estensioni di «Segnale» per monta.py (gli script comuni non si toccano). Tutto disegnato col codice, mai testo generato:
  - display degli orologi a sette segmenti (LED rossi a muro, cristalli liquidi al polso);
  - ago della radio che sussulta con la voce;
  - scritta incisa sulla targhetta;
  - neve della bufera, faro rosso che lampeggia, inizio dal nero.
Le coordinate in episodio.json sono in pixel dell'immagine generata (576x1024), così restano attaccate all'immagine mentre la camera si muove.

Righe con "speciale": "sovrapposto" → disegna(); dentro la riga, uno o più di:
  "display": {"tipo": "led" | "lcd", "testo": "03:00", "quad": [[x, y] x4 da in alto a sinistra in senso orario], "tremola": true}
  "ago":     {"perno": [x, y], "lung": px, "ang": [riposo, massimo] in gradi (0 = in su, negativo = a sinistra), "cancella": [[x, y], [x, y]], "colore": [b, g, r]}
  "targa":   {"quad": [...], "righe": ["...", "..."]}
  "strumento": {"quad": [...], "ang": [riposo, massimo], "segue": true}   quadrante della radio ridisegnato per intero (scala senza numeri + ago)
  "ruota":   {"centro": [x, y], "assi": [a, b], "gradi_al_s": 14}          bobina del registratore che gira piano (ellisse vista di sbieco)
Su ogni riga (anche normale): "neve": forza 0-1, "faro": {"pos": [x, y], "r": px, "periodo": s}, "dal_nero": secondi."""
import cv2
import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFont

K = 2.25                      # da 576x1024 all'immagine ingrandita di monta.py (1296x2304)
_mem = {}


# ---------- sette segmenti
SEG = {"0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abfgcd"}


def _segmenti(x, y, w, h, s):
    """Poligoni dei sette segmenti di una cifra larga w e alta h con spessore s (coordinate dell'angolo in alto a sinistra)."""
    g = s * 0.18; m = y + h / 2
    oriz = lambda cy: [(x + s / 2 + g, cy), (x + s + g, cy - s / 2), (x + w - s - g, cy - s / 2), (x + w - s / 2 - g, cy), (x + w - s - g, cy + s / 2), (x + s + g, cy + s / 2)]
    vert = lambda cx, y0, y1: [(cx, y0 + s / 2 + g), (cx + s / 2, y0 + s + g), (cx + s / 2, y1 - s - g), (cx, y1 - s / 2 - g), (cx - s / 2, y1 - s - g), (cx - s / 2, y0 + s + g)]
    return {"a": oriz(y + s / 2), "g": oriz(m), "d": oriz(y + h - s / 2), "f": vert(x + s / 2, y, m + s / 2), "b": vert(x + w - s / 2, y, m + s / 2),
            "e": vert(x + s / 2, m - s / 2, y + h), "c": vert(x + w - s / 2, m - s / 2, y + h)}


def _cifre(testo, larg=960, alt=360):
    """Due maschere 0-1 (segmenti accesi, tutti i segmenti) per un testo tipo «23:10», inclinate come nei display veri."""
    S = 2; W_, H_ = larg * S, alt * S
    acc = Image.new("L", (W_, H_), 0); tut = Image.new("L", (W_, H_), 0); da, dt = ImageDraw.Draw(acc), ImageDraw.Draw(tut)
    h = H_ * 0.70; w = h * 0.52; largo = lambda w: sum(w * 0.62 if c == ":" else w * 1.30 for c in testo) - w * 0.30
    if largo(w) > W_ * 0.84:                                                 # display quasi quadrato: le cifre si misurano sulla larghezza
        w *= W_ * 0.84 / largo(w); h = w / 0.52
    s = h * 0.115; passo = w * 1.30; due = w * 0.62; tot = largo(w); x = (W_ - tot) / 2; y = (H_ - h) / 2
    for c in testo:
        if c == ":":
            for cy in (y + h * 0.32, y + h * 0.68):
                for d in (da, dt):
                    d.ellipse([x + due / 2 - passo * 0.15 - s * 0.55, cy - s * 0.55, x + due / 2 - passo * 0.15 + s * 0.55, cy + s * 0.55], fill=255)
            x += due; continue
        segs = _segmenti(x, y, w, h, s)
        for k, pol in segs.items():
            dt.polygon(pol, fill=255)
            if k in SEG[c]:
                da.polygon(pol, fill=255)
        x += passo
    f = lambda im: cv2.warpAffine(cv2.resize(np.asarray(im), (larg, alt), interpolation=cv2.INTER_AREA), np.float32([[1, -0.10, 0.05 * alt], [0, 1, 0]]), (larg, alt)).astype(np.float32) / 255
    return f(acc), f(tut)


def _display(tipo, testo, aspetto=2.67):
    """Immagine BGR float 0-255 del display (larga 960, alta secondo l'aspetto del vetro)."""
    acc, tut = _cifre(testo, 960, int(960 / aspetto)); h, w = acc.shape
    if tipo == "led":
        fondo = np.zeros((h, w, 3), np.float32) + np.array([7, 5, 9], np.float32)
        rosso = np.array([36, 30, 255], np.float32)
        im = fondo + tut[..., None] * np.array([5, 3, 34], np.float32) + acc[..., None] * rosso
        im += cv2.GaussianBlur(acc, (0, 0), 14)[..., None] * rosso * 0.55 + cv2.GaussianBlur(acc, (0, 0), 3)[..., None] * np.array([70, 70, 60], np.float32)
        return np.clip(im, 0, 255)
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None]; xx = np.linspace(0, 1, w, dtype=np.float32)[None]
    luce = 0.80 + 0.28 * np.exp(-(((xx - 0.2) / 0.5) ** 2 + ((yy - 0.9) / 0.7) ** 2))             # retroilluminazione verde, più forte da un angolo
    fondo = luce[..., None] * np.array([92, 178, 128], np.float32)
    ombra = cv2.warpAffine(acc, np.float32([[1, 0, 5], [0, 1, 5]]), (w, h))
    im = fondo * (1 - 0.10 * tut[..., None]) * (1 - 0.25 * cv2.GaussianBlur(ombra, (0, 0), 3)[..., None])
    return np.clip(im * (1 - acc[..., None]) + acc[..., None] * np.array([16, 26, 18], np.float32), 0, 255)


def _quad(q):
    return np.float32(q) * K


def _stendi(tex, quad, dim):
    """Porta una texture rettangolare sul quadrilatero (coordinate dell'immagine ingrandita). Ritorna (immagine, maschera 0-1)."""
    h, w = tex.shape[:2]; P = cv2.getPerspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]), quad)
    out = cv2.warpPerspective(tex, P, dim, flags=cv2.INTER_AREA)
    mk = cv2.warpPerspective(np.ones((h, w), np.float32), P, dim, flags=cv2.INTER_LINEAR)
    return out, cv2.GaussianBlur(mk, (0, 0), 1.2)


def _riquadro(quad, marg, dim):
    x0, y0 = np.floor(quad.min(0) - marg).astype(int); x1, y1 = np.ceil(quad.max(0) + marg).astype(int)
    return max(0, x0), max(0, y0), min(dim[0], x1), min(dim[1], y1)


def _inviluppo(m):
    """Volume della voce nel tempo (0-1), con la balistica di un ago: sale subito, ricade piano."""
    if "env" not in _mem:
        a, sr = sf.read(str(m.D / "voce.wav"), dtype="float32"); passo = sr // 100
        e = np.sqrt(np.convolve(a ** 2, np.ones(passo * 3) / (passo * 3), mode="same"))[::passo]
        out = np.zeros_like(e); v = 0.0
        for i, x in enumerate(e):
            v = x if x > v else v * 0.90 + x * 0.10
            out[i] = v
        _mem["env"] = out
    return _mem["env"]


def _livello(m, t, i):
    """Volume della voce all'istante t, rapportato al massimo della riga i (così l'ago si muove bene anche con la voce lontana)."""
    e = _inviluppo(m); a = int(m.T[i]["inizio"] * 100); b = int((m.T[i + 1]["inizio"] if i + 1 < len(m.T) else m.TOT) * 100)
    radio = [p for p in m.T[i].get("pezzi", []) if p["tipo"] == "lontana"]
    if radio:                                                                # l'ago segue solo la voce che esce dalla radio, non il narratore
        if not any(p["inizio"] - 0.05 <= t <= p["fine"] + 0.4 for p in radio):
            return 0.0
        a, b = int(min(p["inizio"] for p in radio) * 100), int(max(p["fine"] for p in radio) * 100)
    mx = max(float(e[a:b].max()) if b > a else 0.0, 1e-4)
    return float(np.clip(e[min(len(e) - 1, int(t * 100))] / mx, 0, 1))


def _scritta(righe, larg=1200, alt=420):
    """Scritta incisa (maschera 0-1) centrata, su più righe, tutta dentro la targhetta."""
    S = 2; im = Image.new("L", (larg * S, alt * S), 0); d = ImageDraw.Draw(im)
    from glob import glob
    f0 = (glob("/usr/share/fonts/**/DejaVuSansCondensed-Bold.ttf", recursive=True) or glob("/usr/share/fonts/**/DejaVuSans-Bold.ttf", recursive=True))[0]
    n = len(righe); passo = alt * S * 0.74 / n; y = alt * S * 0.5 - passo * (n - 1) / 2
    for k, x in enumerate(righe):
        size = int(passo * (0.80 if k == 0 else 0.58))
        while size > 10 and ImageFont.truetype(f0, size).getlength(x) > larg * S * 0.86:
            size -= 2
        d.text((larg * S / 2, y + passo * k), x, font=ImageFont.truetype(f0, size), fill=255, anchor="mm")
    return cv2.resize(np.asarray(im), (larg, alt), interpolation=cv2.INTER_AREA).astype(np.float32) / 255


FW, FH, PERNO, RAG = 900, 640, (450.0, 800.0), 600.0          # quadrante «in piano»: il perno dell'ago sta sotto il bordo, come negli strumenti veri


def _polare(ang, r):
    a = np.radians(ang); return (PERNO[0] + r * np.sin(a), PERNO[1] - r * np.cos(a))


def _scala():
    """Segni fissi del quadrante (0-1): arco, tacche senza numeri, coprimozzo; e la zona rossa in fondo scala."""
    S = 2; nero = np.zeros((FH * S, FW * S), np.uint8); rosso = np.zeros_like(nero); P = lambda q: (int(q[0] * S), int(q[1] * S))
    arco = lambda im, a0, a1, r, sp: cv2.polylines(im, [np.int32([P(_polare(a, r)) for a in np.linspace(a0, a1, 80)])], False, 255, sp * S, cv2.LINE_AA)
    arco(nero, -40, 18, RAG, 7); arco(rosso, 18, 40, RAG - 6, 20)
    for k, a in enumerate(np.linspace(-40, 40, 21)):
        lungo = k % 5 == 0
        cv2.line(rosso if a > 18.5 else nero, P(_polare(a, RAG + 4)), P(_polare(a, RAG + (62 if lungo else 34))), 255, (9 if lungo else 5) * S, cv2.LINE_AA)
    cv2.ellipse(nero, P((PERNO[0], FH + 30)), (170 * S, 120 * S), 0, 180, 360, 255, -1, cv2.LINE_AA)
    f = lambda im: cv2.resize(im, (FW, FH), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    return f(nero), f(rosso)


def _ago_piano(ang):
    """Ago (e la sua ombra sul fondo) nel quadrante in piano, 0-1."""
    im = np.zeros((FH, FW), np.uint8); om = np.zeros((FH, FW), np.uint8)
    a, b = _polare(ang, 60), _polare(ang, RAG + 22)
    cv2.line(im, (int(a[0]), int(a[1])), (int(b[0]), int(b[1])), 255, 9, cv2.LINE_AA)
    cv2.line(om, (int(a[0] + 12), int(a[1] + 16)), (int(b[0] + 12), int(b[1] + 16)), 255, 11, cv2.LINE_AA)
    return im.astype(np.float32) / 255, cv2.GaussianBlur(om, (0, 0), 7).astype(np.float32) / 255


def _base(r, m):
    """Immagine ingrandita della riga con le parti fisse già disegnate (ago vecchio cancellato, scritta della targhetta)."""
    ch = ("base", r["id"])
    if ch in _mem:
        return _mem[ch]
    big = m.IMG[r["img"]][0].copy(); dim = (big.shape[1], big.shape[0])
    if r.get("ago") and r["ago"].get("cancella"):
        mk = np.zeros(big.shape[:2], np.uint8)
        pts = [tuple(int(round(v * K)) for v in p) for p in r["ago"]["cancella"]]
        for a, b in zip(pts[:-1], pts[1:]):
            cv2.line(mk, a, b, 255, int(r["ago"].get("largo", 5) * K))
        x0, y0, x1, y1 = _riquadro(np.float32(pts), 40, dim)
        big[y0:y1, x0:x1] = cv2.inpaint(big[y0:y1, x0:x1], mk[y0:y1, x0:x1], 7, cv2.INPAINT_TELEA)
    if r.get("strumento"):                                                   # via numeri, tacche e ago generati: resta il fondo ambrato con la sua luce
        q = _quad(r["strumento"]["quad"]); x0, y0, x1, y1 = _riquadro(q, 40, dim); roi = big[y0:y1, x0:x1]
        rk = int(r["strumento"].get("pulisci", 26) * K)
        liscio = cv2.GaussianBlur(cv2.morphologyEx(roi, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * rk + 1, 2 * rk + 1))), (0, 0), 5 * K).astype(np.float32)
        mk = np.zeros(big.shape[:2], np.uint8); cv2.fillPoly(mk, [np.int32(_quad(r["strumento"].get("bordo", r["strumento"]["quad"])))], 255, cv2.LINE_AA)   # "bordo": contorno del vetrino, se non è un quadrilatero
        mk = cv2.GaussianBlur(cv2.erode(mk, np.ones((5, 5), np.uint8)), (0, 0), 1.5 * K)[y0:y1, x0:x1, None].astype(np.float32) / 255
        nero, rosso = _scala(); sf_ = r["strumento"].get("sfoca", 0.9) * K
        n_, _ = _stendi(nero, q, dim); r_, _ = _stendi(rosso, q, dim)
        n_ = cv2.GaussianBlur(n_, (0, 0), sf_)[y0:y1, x0:x1, None]; r_ = cv2.GaussianBlur(r_, (0, 0), sf_)[y0:y1, x0:x1, None]
        z = roi.astype(np.float32) * (1 - mk) + liscio * mk
        z = z * (1 - 0.90 * n_ * mk) * (1 - r_ * mk * np.array([0.88, 0.86, 0.38], np.float32))        # i segni scuriscono il fondo; la zona rossa resta rossa
        big[y0:y1, x0:x1] = np.clip(z, 0, 255).astype(np.uint8)
        _mem[("strum", r["id"])] = (cv2.getPerspectiveTransform(np.float32([[0, 0], [FW, 0], [FW, FH], [0, FH]]), q - np.float32([x0, y0])), mk, (x0, y0, x1, y1), sf_)
    if r.get("targa"):
        q = _quad(r["targa"]["quad"]); tx = _scritta(r["targa"]["righe"])
        inc, _ = _stendi(tx, q, dim); luce, _ = _stendi(np.roll(tx, 2, axis=0), q, dim)
        x0, y0, x1, y1 = _riquadro(q, 4, dim); z = big[y0:y1, x0:x1].astype(np.float32)
        z = z * (1 - 0.80 * inc[y0:y1, x0:x1, None]) + 26 * np.clip(luce - inc, 0, 1)[y0:y1, x0:x1, None]       # incisa: scura, con un filo di luce sotto
        big[y0:y1, x0:x1] = np.clip(z, 0, 255).astype(np.uint8)
    _mem[ch] = big
    return big


def _componi(r, tau, t, m, i):
    """Immagine ingrandita di questo fotogramma: display acceso (che può tremolare) e ago nella posizione giusta."""
    big = _base(r, m).copy(); dim = (big.shape[1], big.shape[0])
    if r.get("display"):
        d = r["display"]; ch = ("disp", r["id"])
        if ch not in _mem:
            q = _quad(d["quad"]); n = lambda a, b: float(np.linalg.norm(q[a] - q[b]))
            tex = _display(d["tipo"], d["testo"], (n(0, 1) + n(3, 2)) / (n(0, 3) + n(1, 2))); lay, mk = _stendi(tex, q, dim)
            x0, y0, x1, y1 = _riquadro(q, 60, dim)                            # la luce del display esce un po' dal vetro (rossa per i LED, verde per i cristalli liquidi)
            alone = cv2.GaussianBlur(lay[y0:y1, x0:x1], (0, 0), 22) * (0.35 if d["tipo"] == "led" else 0.16) * (1 - mk[y0:y1, x0:x1, None])
            _mem[ch] = (lay[y0:y1, x0:x1].copy(), mk[y0:y1, x0:x1, None].copy(), alone, (x0, y0, x1, y1))
        lay, mk, alone, (x0, y0, x1, y1) = _mem[ch]
        f = 1.0
        if d.get("tremola"):                                                  # LED che tremolano: cali brevi e irregolari, sempre gli stessi a ogni montaggio
            g = np.random.default_rng(int(t * 30) + 77 * r["id"]); n = np.sin(37 * t) * np.sin(11.3 * t + 1)
            f = 1.0 - (0.75 if n > 0.62 else 0.0) - 0.12 * g.random()
        z = big[y0:y1, x0:x1].astype(np.float32) * (1 - mk) + lay * f * mk
        if alone is not None:
            z += alone * f
        big[y0:y1, x0:x1] = np.clip(z, 0, 255).astype(np.uint8)
    if r.get("ruota"):
        ru = r["ruota"]; cx, cy = ru["centro"][0] * K, ru["centro"][1] * K; ax, ay = ru["assi"][0] * K, ru["assi"][1] * K
        x0, y0, x1, y1 = _riquadro(np.float32([[cx - ax, cy - ay], [cx + ax, cy + ay]]), 6, dim); roi = big[y0:y1, x0:x1]
        th = np.radians(ru.get("gradi_al_s", 14) * tau); c, s_ = np.cos(th), np.sin(th); e = ay / ax
        A = np.array([[c, -s_ / e], [s_ * e, c]], np.float64)                  # rotazione nel piano della bobina: si allarga a cerchio, si ruota, si restringe
        ox, oy = cx - x0, cy - y0; M2 = np.hstack([A, [[ox - A[0, 0] * ox - A[0, 1] * oy], [oy - A[1, 0] * ox - A[1, 1] * oy]]]).astype(np.float32)
        gir = cv2.warpAffine(roi, M2, (roi.shape[1], roi.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        yy, xx = np.mgrid[0:roi.shape[0], 0:roi.shape[1]].astype(np.float32)
        d = np.sqrt(((xx - ox) / ax) ** 2 + ((yy - oy) / ay) ** 2); mk_ = np.clip((ru.get("fin", 0.97) - d) / 0.03, 0, 1)[..., None]
        big[y0:y1, x0:x1] = (roi * (1 - mk_) + gir * mk_).astype(np.uint8)
    if r.get("strumento"):
        st = r["strumento"]; P, mk, (x0, y0, x1, y1), sf_ = _mem[("strum", r["id"])]
        liv = _livello(m, t, i) if st.get("segue", True) else 0.0
        g = np.random.default_rng(int(t * 30) + 13 * r["id"]); a0, a1 = st["ang"]
        ang = a0 + (a1 - a0) * (liv ** 0.7) + 1.4 * (g.random() - 0.5) * (0.25 + liv)
        ago, ombra = _ago_piano(ang); dimr = (x1 - x0, y1 - y0)
        ago = cv2.GaussianBlur(cv2.warpPerspective(ago, P, dimr, flags=cv2.INTER_AREA), (0, 0), sf_)[..., None]
        ombra = cv2.warpPerspective(ombra, P, dimr, flags=cv2.INTER_AREA)[..., None]
        z = big[y0:y1, x0:x1].astype(np.float32) * (1 - 0.30 * ombra * mk) * (1 - 0.93 * ago * mk)
        big[y0:y1, x0:x1] = np.clip(z, 0, 255).astype(np.uint8)
    if r.get("ago"):
        a = r["ago"]; liv = _livello(m, t, i)
        g = np.random.default_rng(int(t * 30) + 13 * r["id"]); a0, a1 = a["ang"]
        ang = np.radians(a0 + (a1 - a0) * (liv ** 0.7) + 1.2 * (g.random() - 0.5) * (0.3 + liv))
        px, py = a["perno"][0] * K, a["perno"][1] * K; L = a["lung"] * K; S = 4
        x1, y1 = px + L * np.sin(ang), py - L * np.cos(ang); qx, qy = px - a.get("coda", 0) * K * np.sin(ang), py + a.get("coda", 0) * K * np.cos(ang)
        bx0, by0, bx1, by1 = _riquadro(np.float32([[x1, y1], [qx, qy]]), 14, dim)
        roi = big[by0:by1, bx0:bx1]; up = cv2.resize(roi, None, fx=S, fy=S, interpolation=cv2.INTER_LINEAR); P = lambda x, y: (int((x - bx0) * S), int((y - by0) * S))
        ombra = up.copy(); cv2.line(ombra, P(qx + 3, qy + 4), P(x1 + 3, y1 + 4), (0, 0, 0), int(a.get("spessore", 1.6) * K * S), cv2.LINE_AA)
        up = cv2.addWeighted(up, 0.72, cv2.GaussianBlur(ombra, (0, 0), 2 * S), 0.28, 0)
        cv2.line(up, P(qx, qy), P(x1, y1), tuple(a.get("colore", [12, 12, 16])), int(a.get("spessore", 1.6) * K * S), cv2.LINE_AA)
        big[by0:by1, bx0:bx1] = cv2.resize(up, (bx1 - bx0, by1 - by0), interpolation=cv2.INTER_AREA)
    return big


# ---------- neve nella bufera (strati di fiocchi tirati dal vento, da sinistra a destra)
def _strato_neve(m, seme, quanti, lung, sfoca, alt_scala=1.0):
    g = np.random.default_rng(seme); h, w = m.H, m.W * 2
    tex = np.zeros((h, w), np.float32); ys = g.integers(0, h, quanti); xs = g.integers(0, w, quanti); tex[ys, xs] = g.uniform(0.5, 1.0, quanti).astype(np.float32)
    k = np.zeros((lung // 3 * 2 + 1, lung), np.float32); cv2.line(k, (0, k.shape[0] - 1), (lung - 1, 0), 1.0, max(1, int(sfoca)))
    tex = cv2.filter2D(tex, -1, k / k.sum() * lung * 0.5)
    tex = cv2.GaussianBlur(tex, (0, 0), sfoca) if sfoca > 0.5 else tex
    return np.concatenate([tex, tex[:, : m.W]], axis=1)                       # si ripete senza salti


def _neve(fr, t, forza, m):
    if "neve" not in _mem:
        _mem["neve"] = [(_strato_neve(m, 3, 5200, 22, 0.8), 900.0, 150.0, 0.55), (_strato_neve(m, 4, 1700, 54, 1.6), 1700.0, 260.0, 0.80),
                        (_strato_neve(m, 5, 380, 130, 4.0), 3100.0, 420.0, 1.0)]
    raffica = 0.75 + 0.25 * np.sin(0.9 * t) * np.sin(2.3 * t + 1.0)
    for tex, vx, vy, op in _mem["neve"]:
        ox = int(m.W * 2 - (vx * t) % (m.W * 2)); oy = int((vy * t) % m.H)
        lay = np.roll(tex[:, ox:ox + m.W], -oy, axis=0)
        fr = fr + lay[..., None] * (np.array([255, 240, 225], np.float32) * op * forza * raffica)
    return fr


def _a_schermo(m, x, y, mov, u):
    """Dove finisce sullo schermo un punto dell'immagine generata (senza parallasse)."""
    z0, z1, *_ = m.MOV[mov]; uu = 1 - (1 - u) ** 2 if mov == "arretra" else m.ease(u); k = (m.SW / m.W) / (m.M * (z0 + (z1 - z0) * uu))
    return m.W / 2 + (x * K - m.SW / 2) / k, m.H / 2 + (y * K - m.SH / 2) / k


def dopo(fr, r, tau, u, t, m):
    """Ritocchi sullo schermo per ogni inquadratura: faro rosso, neve, inizio dal nero."""
    if r.get("faro"):
        f = r["faro"]; cx, cy = _a_schermo(m, f["pos"][0], f["pos"][1], r.get("mov", "avanza_lento"), u); rr = f.get("r", 60) * 2.0
        fase = (t % f.get("periodo", 2.0)) / f.get("periodo", 2.0); acc = np.exp(-((fase - 0.12) / 0.10) ** 2)
        d2 = ((m.XX - cx) ** 2 + (m.YY - cy) ** 2) / rr ** 2
        fr = fr + (np.exp(-d2) * 0.9 + np.exp(-d2 / 14) * 0.22)[..., None] * (np.array([40, 30, 255], np.float32) * acc * f.get("forza", 1.0))
    if r.get("neve"):
        fr = _neve(fr, t, float(r["neve"]), m)
    if r.get("dal_nero"):                                                    # la prima riga parte da t = 0 (prima della voce), le altre dal loro inizio
        fr = fr * min(1.0, ((t if r["id"] == m.righe[0]["id"] else tau) / r["dal_nero"]) ** 1.5)
    return fr


def disegna(r, tau, u, t, m):
    """Inquadratura con disegni attaccati all'immagine: stessi passaggi di un'inquadratura normale di monta.py."""
    i = next(k for k, x in enumerate(m.righe) if x["id"] == r["id"]); nome = "#" + r["img"]
    m.IMG[nome] = (_componi(r, tau, t, m, i), m.IMG[r["img"]][1])
    fr = m.muovi(nome, r.get("mov", "avanza_lento"), u, tau, float(i))
    fr = dopo(fr, r, tau, u, t, m)
    fr = m.atmosfera(fr, t, 0.05 if r.get("mov") == "fermo" else 0.13)
    return m.palpebre(fr, tau) if r.get("mov") == "apri_occhi" else fr
