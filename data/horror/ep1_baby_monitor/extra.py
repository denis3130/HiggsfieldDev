"""Baby Monitor ep. 1 — le cose che servono solo a questa storia, disegnate col codice
(vedi «estensioni» in scripts/bivio/monta.py). Nessuna scritta è generata dal modello di immagini.

Righe con "speciale" in episodio.json:
  "monitor"   il ricevitore del baby monitor (immagine generata) con i cinque led verdi che seguono davvero il canto che si sente,
              la spia verde e, sullo schermino, la cameretta in piccolo. Nella riga: "led": {"punti", "r", "spia", "schermo", "forza"}
              (coordinate dell'immagine 576×1024).
  "schermo"   lo schermino a tutto quadro: immagine notturna verdastra, righe di scansione, disturbi, ora e misuratore del suono.
              "respiro": [cx, cy, raggio] fa alzare e abbassare la coperta; "luce": {"x", "y", "r", "parola" | "accesa"} accende
              la luce notturna accanto al lettino nell'attimo in cui il narratore dice quella parola.
  "chiamata"  lo schermo del telefono durante le due chiamate: la madre squilla a vuoto, il padre non è raggiungibile.

I led e il misuratore leggono il volume vero del file della ninna nanna (i suoni di episodio.json con "led": true)
e le parole «lontane» dette dal narratore: quando la voce tace, si spengono."""
import subprocess

import cv2
import numpy as np
from PIL import Image, ImageDraw

_C = {}
VERDE = np.float32([110, 255, 120])                       # BGR dei led accesi
FOSFORO = np.float32([0.62, 1.0, 0.70])                   # BGR dell'immagine notturna


# ---------- tempi: righe, parole, suoni
def _i(r, m):
    return next(k for k, x in enumerate(m.righe) if x is r)


def _parola(i, testo, m, n=0):
    """Inizio dell'n-esima parola della riga i che contiene `testo` (None se non c'è)."""
    ws = [w for w in m.parole[i] if testo.lower() in w[2].lower()]
    return ws[n][0] if len(ws) > n else None


def _quando(s, m):
    """Come monta.quando: inizio della riga (+ dopo) oppure l'attimo di una sua parola."""
    i = next(k for k, x in enumerate(m.righe) if x["id"] == s["riga"]); t = m.T[i]["inizio"]
    if s.get("parola"):
        t = next((w[0] for w in m.parole[i] if s["parola"].lower() in w[2].lower()), t)
    return max(0.0, t + s.get("dopo", 0.0))


def _livello(t, m):
    """Quanti led sono accesi (0-5) all'istante t: segue il canto vero e le parole dette dalla voce nel monitor."""
    if "liv" not in _C:
        canto = []
        for s in m.ep.get("suoni", []):
            if not s.get("led"):
                continue
            p = next(c for c in (m.D / "sfx" / s["file"], m.B / "sfx" / s["file"]) if c.exists())
            if p not in _C:
                raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar", "8000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
                e = np.convolve(np.abs(np.frombuffer(raw, np.float32)), np.ones(480) / 480, mode="same")[::80]      # 100 valori al secondo
                _C[p] = e / (np.percentile(e, 97) + 1e-9)
            t0 = _quando(s, m)
            canto.append((t0, t0 + (s.get("dur") or m.TOT - t0), s.get("da", 0.0), _C[p]))
        parole = []
        for i, tr in enumerate(m.T):
            for pz in tr.get("pezzi", []):
                if pz["tipo"] == "lontana":
                    parole += [(a, b) for a, b, _ in m.parole[i] if pz["inizio"] - 0.01 <= a <= pz["fine"] + 0.01]
        _C["liv"] = (canto, parole)
    canto, parole = _C["liv"]; L = 0.0
    for t0, t1, da, env in canto:
        if t0 <= t < t1:
            k = int((t - t0 + da) * 100)
            if k < len(env):
                L = max(L, 5.2 * float(env[k]) ** 0.8)
    for a, b in parole:
        if a - 0.03 <= t <= b + 0.25:
            x = (t - a) / max(b - a, 0.08)
            L = max(L, 3.0 + 2.0 * np.exp(-2.5 * max(x - 0.25, 0)) * (0.8 + 0.2 * np.sin(38 * t)))
    return float(np.clip(L, 0, 5))


# ---------- il ricevitore con i led («monitor»)
def _feed_piccolo(m, w, h, ritaglio=None):
    """La cameretta come si vede sullo schermino del ricevitore."""
    c = m.ep.get("monitor", {}); nome = c.get("feed", "s06_culla.png")
    big = m.IMG[nome][0] if nome in m.IMG else m.carica(nome)[0]
    x0, y0, x1, y1 = [int(v * m.SW / 576) for v in (ritaglio or c.get("ritaglio", [0, 256, 576, 768]))]
    g = cv2.cvtColor(cv2.resize(big[y0:y1, x0:x1], (w, h), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32)
    g = 255 * (g / 255) ** 0.85 * (0.78 + 0.22 * ((np.arange(h) // 2) % 2))[:, None]
    return g[..., None] * FOSFORO


def _metti_schermo(base, poly, m, forza, ritaglio=None):
    s = m.SW / 576; dst = np.float32(poly) * s
    w = int(max(np.linalg.norm(dst[1] - dst[0]), np.linalg.norm(dst[2] - dst[3]))); h = int(max(np.linalg.norm(dst[3] - dst[0]), np.linalg.norm(dst[2] - dst[1])))
    P = cv2.getPerspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]), dst)
    feed = cv2.warpPerspective(_feed_piccolo(m, w, h, ritaglio), P, (m.SW, m.SH))
    mk = cv2.GaussianBlur(cv2.warpPerspective(np.ones((h, w), np.float32), P, (m.SW, m.SH)), (0, 0), 2.5)
    base = base * (1 - mk[..., None]) + feed * forza * mk[..., None]
    return base + cv2.GaussianBlur(mk, (0, 0), 30)[..., None] * np.float32([35, 100, 50]) * 0.45 * forza        # riverbero verde intorno


def _varianti(r, m):
    """Sei copie dell'immagine, con 0…5 led accesi: passano tutte dallo stesso movimento di camera, così i led restano al loro posto."""
    nome = r["img"]
    if nome + "#led0" in m.IMG:
        return
    big, dep = m.IMG[nome]; s = m.SW / 576; c = r["led"]; base = big.astype(np.float32)
    if c.get("schermo"):
        base = _metti_schermo(base, c["schermo"], m, c.get("forza", 0.9), c.get("ritaglio"))
    pts = [(int(round(x * s)), int(round(y * s))) for x, y in c["punti"]]; rad = c.get("r", 3.2) * s
    for p in pts:                                                                  # lenti spente
        cv2.circle(base, p, int(rad), (16, 30, 18), -1, cv2.LINE_AA); cv2.circle(base, p, int(rad), (44, 66, 48), 1, cv2.LINE_AA)
    if c.get("spia"):
        sp = np.zeros(base.shape[:2], np.float32)
        cv2.circle(sp, (int(c["spia"][0] * s), int(c["spia"][1] * s)), max(2, int(rad * 0.6)), 1.0, -1, cv2.LINE_AA)
        base += (cv2.GaussianBlur(sp, (0, 0), rad * 1.3) * 1.8 + sp)[..., None] * VERDE
    for k in range(6):
        v = base.copy()
        if k:
            a = np.zeros(base.shape[:2], np.float32)
            for p in pts[:k]:
                cv2.circle(a, p, int(rad), 1.0, -1, cv2.LINE_AA)
            v += (cv2.GaussianBlur(a, (0, 0), rad * 2.6) * 3.0 + a)[..., None] * VERDE + (cv2.GaussianBlur(a, (0, 0), rad * 0.5) ** 2)[..., None] * 110
        m.IMG[f"{nome}#led{k}"] = (np.clip(v, 0, 255).astype(np.uint8), dep)


def _monitor(r, tau, u, t, m):
    _varianti(r, m); i = _i(r, m); nome, mov = r["img"], r.get("mov", "avanza_lento")
    L = _livello(t, m); k = min(4, int(L)); f = L - k
    fr = m.muovi(f"{nome}#led{k}", mov, u, tau, float(i))
    if f > 0.02:
        fr = fr * (1 - f) + m.muovi(f"{nome}#led{k + 1}", mov, u, tau, float(i)) * f
    return m.atmosfera(fr, t, 0.05 if mov == "fermo" else 0.09)


# ---------- lo schermino a tutto quadro («schermo»)
def _buio(nome, m):
    """La cameretta come la vede la telecamera di notte: un po' scura, così quando la luce si accende lo scatto si vede."""
    key = nome + "#buio"
    if key not in m.IMG:
        big, dep = m.IMG[nome]; m.IMG[key] = (np.clip(big.astype(np.float32) * 0.72, 0, 255).astype(np.uint8), dep)
    return key


def _luce(nome, lu, m):
    """Copia dell'immagine con la luce notturna accesa nel punto (x, y): la stanza si schiarisce e la lampada ha il suo alone."""
    key = nome + "#luce"
    if key not in m.IMG:
        big, dep = m.IMG[nome]; s = m.SW / 576; x, y, R = lu["x"] * s, lu["y"] * s, lu.get("r", 55) * s
        yy, xx = np.mgrid[0:m.SH, 0:m.SW].astype(np.float32); d2 = (xx - x) ** 2 + (yy - y) ** 2
        v = big.astype(np.float32) * 0.72 * (1.18 + 0.38 * np.exp(-d2 / (2 * (R * 3.0) ** 2)))[..., None]
        v += (255 * np.exp(-d2 / (2 * (R * 0.5) ** 2)) + 120 * np.exp(-d2 / (2 * (R * 1.5) ** 2))                  # cuore e alone della luce
              + 110 * np.exp(-((yy - y) / (R * 0.09)) ** 2 - ((xx - x) / (R * 4.5)) ** 2))[..., None]              # riga di riflesso, come nelle telecamere notturne
        m.IMG[key] = (np.clip(v, 0, 255).astype(np.uint8), dep)
    return key


def _respira(g, r, mov, u, t, m):
    cx, cy, rr = r["respiro"]; z0, z1 = m.MOV[mov][:2]; s = m.SW / 576
    k = (m.SW / m.W) / (m.M * (z0 + (z1 - z0) * m.ease(u)))
    X = m.W / 2 + (cx * s - m.SW / 2) / k; Y = m.H / 2 + (cy * s - m.SH / 2) / k; R = rr * s / k
    G = np.exp(-((m.XX - X) ** 2 + (m.YY - Y) ** 2) / (2 * R * R)) * float(0.022 * np.sin(2 * np.pi * t / 3.6))
    return cv2.remap(g, (m.XX - (m.XX - X) * G).astype(np.float32), (m.YY - (m.YY - Y) * G).astype(np.float32), cv2.INTER_LINEAR)


def _scritte(m, ora):
    key = "osd" + ora
    if key not in _C:
        s = 2; im = Image.new("RGBA", (m.W * s, 330 * s), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.text((92 * s, 236 * s), "CAM 1", font=m.font("Bold", 46 * s), fill=(215, 255, 222, 235), anchor="lm")
        d.text((92 * s + m.font("Bold", 46 * s).getlength("CAM 1  "), 236 * s), ora, font=m.font("Medium", 46 * s), fill=(215, 255, 222, 200), anchor="lm")
        d.text((92 * s, 294 * s), "CAMERETTA", font=m.font("Medium", 32 * s), fill=(215, 255, 222, 165), anchor="lm")
        a = np.asarray(im.resize((m.W, 330), Image.LANCZOS)).astype(np.float32) / 255
        _C[key] = (a[..., 2::-1] * a[..., 3:] * 255, a[..., 3:])
    return _C[key]


def _notturna(g, t, m, ora):
    H, W = m.H, m.W
    if "nv" not in _C:
        im = Image.new("L", (W, H), 0); ImageDraw.Draw(im).rounded_rectangle([16, 16, W - 17, H - 17], 84, fill=255)
        _C["nv"] = ((0.80 + 0.20 * ((np.arange(H) // 3) % 2)).astype(np.float32)[:, None] * m.VIGN[..., 0] ** 1.25,
                    np.arange(H, dtype=np.float32)[:, None], cv2.GaussianBlur(np.asarray(im).astype(np.float32) / 255, (0, 0), 5)[..., None])
    righe, yy, cornice = _C["nv"]
    g = 255 * np.clip(g / 255, 0, 1) ** 0.9 + cv2.resize(m.rng.standard_normal((H // 3, W // 3)).astype(np.float32), (W, H)) * 11
    g = g * (1 + 0.10 * np.exp(-((yy - ((t * 0.21) % 1.35 - 0.17) * H) / 110) ** 2))                              # banda chiara che scende
    q = t % 3.3
    if q < 0.13:                                                                                                    # strappo orizzontale ogni tanto
        y0 = int((np.sin(int(t / 3.3) * 12.9898) * 0.5 + 0.5) * (H - 260)); g[y0:y0 + 150] = np.roll(g[y0:y0 + 150], int(18 * np.sin(q * 90)), axis=1)
    bianco = np.clip((g - 196) / 50, 0, 1)[..., None] * 0.92                                                       # le luci forti bruciano in bianco, come nei monitor veri
    fr = np.ascontiguousarray((g * righe)[..., None] * (FOSFORO + (1 - FOSFORO) * bianco))
    col, a = _scritte(m, ora); fr[:330] = fr[:330] * (1 - a) + col
    L = _livello(t, m)
    for k in range(5):                                                                                              # misuratore del suono
        x0, y1, hh, on = 92 + k * 54, 392, 16 + 7 * k, L > k + 0.35
        cv2.rectangle(fr, (x0, y1 - hh), (x0 + 40, y1), (150.0, 255.0, 165.0) if on else (40.0, 72.0, 46.0), -1 if on else 2, cv2.LINE_AA)
    return fr * cornice


def _schermo(r, tau, u, t, m):
    i = _i(r, m); nome, mov = r["img"], r.get("mov", "avanza_lento")
    fr = m.muovi(_buio(nome, m), mov, u, tau, float(i)); lu = r.get("luce")
    if lu:
        t0 = -1e9 if lu.get("accesa") else (_parola(i, lu.get("parola", ""), m) or m.T[i]["inizio"]) + lu.get("dopo", 0.0)
        if t >= t0:
            dt = t - t0
            a = 1.0 if dt > 0.5 else float((0.25 + 0.75 * (np.sin(70 * dt) > -0.2)) * min(1.0, dt / 0.06))         # si accende tremando
            fr = fr * (1 - a) + m.muovi(_luce(nome, lu, m), mov, u, tau, float(i)) * (a * float(1 + 0.03 * np.sin(23 * t)))
    g = fr.mean(axis=2).astype(np.float32)
    if r.get("respiro"):
        g = _respira(g, r, mov, u, t, m)
    return _notturna(g, t, m, r.get("ora", "21:31"))


# ---------- le due chiamate («chiamata»)
def _tel(m, nome, iniziale, stato, col, ora, bat=71):
    W, H = m.W, m.H; im = Image.new("RGB", (W, H), (4, 6, 8)); d = ImageDraw.Draw(im)
    for y in range(0, H, 4):
        d.line([(0, y), (W, y)], fill=(4 + y // 320, 7 + y // 240, 10 + y // 200))
    d.text((90, 116), ora, font=m.font("Medium", 40), fill=(225, 230, 235), anchor="lm")
    d.rounded_rectangle([842, 96, 930, 136], 9, outline=(200, 205, 210), width=3); d.rectangle([932, 108, 938, 124], fill=(200, 205, 210))
    d.rectangle([848, 102, 848 + int(76 * bat / 100), 130], fill=(225, 230, 235))
    d.text((828, 116), f"{bat}%", font=m.font("Medium", 40), fill=(225, 230, 235), anchor="rm")
    cx, cy, R = W // 2, 520, 150
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(46, 52, 60))
    d.text((cx, cy - 6), iniziale, font=m.font("Light", 170), fill=(225, 230, 236), anchor="mm")
    d.text((cx, 790), nome, font=m.font("Medium", 92), fill=(245, 247, 250), anchor="mm")
    d.text((cx, 900), stato, font=m.font("Regular", 52), fill=col, anchor="mm")
    d.ellipse([cx - 92, 1058, cx + 92, 1242], fill=(226, 54, 48))                                                  # tasto rosso «chiudi»
    d.arc([cx - 54, 1128, cx + 54, 1216], 205, 335, fill=(255, 255, 255), width=20)
    return cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR).astype(np.float32), cx + m.font("Regular", 52).getlength(stato) / 2 + 16


def _chiamata(r, tau, u, t, m):
    i = _i(r, m); W, H = m.W, m.H; tr = m.T[i]
    if "tel" not in _C:
        bianco, grigio, rosso = (236, 240, 244), (160, 166, 174), (240, 96, 86); ora = r.get("ora", "21:32")
        _C["tel"] = {"sfondo": cv2.GaussianBlur(cv2.resize(m.IMG[r.get("sfondo", "s05_monitor_mano.png")][0], (W, H)), (0, 0), 30).astype(np.float32) * 0.30,
                     0: _tel(m, "Mamma di Elia", "M", "Sta squillando", bianco, ora), 1: _tel(m, "Mamma di Elia", "M", "Nessuna risposta", grigio, ora),
                     2: _tel(m, "Papà di Elia", "P", "Chiamata in corso", bianco, ora), 3: _tel(m, "Papà di Elia", "P", "Utente non raggiungibile", rosso, ora)}
    c = _C["tel"]; fine = tr["voce_fine"]
    t1 = (_parola(i, "vuoto", m) or tr["inizio"] + 0.45 * (fine - tr["inizio"])) + 0.30                           # «squilla a vuoto.» → nessuna risposta
    t2 = (_parola(i, "Chiami", m, 1) or tr["inizio"] + 0.55 * (fine - tr["inizio"])) - 0.10                      # «Chiami il padre»
    t3 = (_parola(i, "spento", m) or tr["inizio"] + 0.85 * (fine - tr["inizio"])) - 0.05                          # «spento.»
    k = 0 if t < t1 else 1 if t < t2 else 2 if t < t3 else 3
    scr, xp = c[k]; scr = scr.copy()
    if k in (0, 2):                                                                                                 # puntini che camminano e anello che pulsa
        for n in range(1 + int(t * 2.4) % 3):
            cv2.circle(scr, (int(xp + 22 * n), 912), 6, (244, 240, 236), -1, cv2.LINE_AA)
        ph = (t * 0.9) % 1.0
        cv2.circle(scr, (W // 2, 520), int(160 + 60 * ph), tuple(float(v) * (1 - ph) for v in (120, 110, 100)), 4, cv2.LINE_AA)
    if k == 2 and t - t2 < 0.22:                                                                                   # cambio di contatto
        scr = c[1][0] + (scr - c[1][0]) * ((t - t2) / 0.22)
    ang = 1.1 * np.sin(0.9 * t + 0.7); s = 0.86 + 0.012 * np.sin(1.3 * t)                                           # telefono in mano, come negli altri episodi
    A = cv2.getRotationMatrix2D((W / 2, H / 2), ang, s); A[0, 2] += 6 * np.sin(2 * t + 0.7); A[1, 2] += 5 * np.sin(1.6 * t)
    ph = cv2.warpAffine(scr, A, (W, H), borderValue=(0, 0, 0))
    mk = cv2.GaussianBlur(cv2.warpAffine(np.ones((H, W), np.float32), A, (W, H)), (0, 0), 3)[..., None]
    out = c["sfondo"] * (1 - mk) + ph * mk + cv2.GaussianBlur(ph, (0, 0), 40) * 0.35
    return np.clip(out * m.VIGN + m.rng.standard_normal((H, W, 1)).astype(np.float32) * 3, 0, 255)


def disegna(r, tau, u, t, m):
    return {"monitor": _monitor, "schermo": _schermo, "chiamata": _chiamata}[r["speciale"]](r, tau, u, t, m)
