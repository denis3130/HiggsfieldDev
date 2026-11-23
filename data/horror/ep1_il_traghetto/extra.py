"""Il traghetto, Ep. 1 «Un'altra nave»: le cose che servono solo a questa storia (vedi «estensioni» in scripts/bivio/monta.py).

  python data/horror/ep1_il_traghetto/extra.py
      scrive in img/ le immagini *_scritte.png (1296x2304, la grandezza a cui lavora monta.py) con le scritte disegnate
      col codice: i due biglietti (FENU DARIO sopra, FENU EFISIO sotto), la tessera e le targhette «512»; cancella le
      finte scritte che il modello lascia a volte su fiancate e camion. Il testo non lo genera mai il modello.

  monta.py lo carica da solo e chiama dopo() su ogni inquadratura (campi in più nelle righe di episodio.json):
      rollio        la cabina rolla piano col mare
      sparisce      la poppa della nave spenta si scioglie nella nebbia; i fari sfarfallano e diventano verdi
      led           il led della serratura diventa rosso coi due bip (suono bip_errore.mp3 della stessa riga)
      colpi         la camera sobbalza a ogni pugno (suono pugni_porta.mp3 della stessa riga)
      sfarfalla     la luce d'emergenza del corridoio sfarfalla
      altoparlante  la griglia vibra mentre parla l'annuncio

  Voce dell'altoparlante: al caricamento mette un filtro da altoparlante (banda stretta, saturazione, eco di corridoio)
  sulla citazione della riga con "altoparlante" in voce.wav. La voce pulita resta in voce_pulita.wav; se voce.py rifà
  voce.wav, il filtro si riapplica da solo."""
import hashlib, json, shutil, sys
from pathlib import Path

import cv2
import numpy as np

D = Path(__file__).resolve().parent
EP = json.loads((D / "episodio.json").read_text())
SW, SH = 1296, 2304                       # grandezza delle immagini dentro monta.py
K = SW / 576                              # dalle coordinate dell'immagine generata (576x1024) a quelle grandi


# ---------------------------------------------------------------- voce dell'altoparlante
def _filtro_altoparlante(x, sr):
    """Voce del narratore come esce da una tromba d'altoparlante in un corridoio di metallo."""
    n = len(x); X = np.fft.rfft(x, 2 * n); f = np.fft.rfftfreq(2 * n, 1 / sr)
    banda = 1 / np.sqrt(1 + (420 / np.maximum(f, 1)) ** 6) / np.sqrt(1 + (f / 3300) ** 8) * (1 + 0.6 * np.exp(-((f - 1700) / 500) ** 2))
    y = np.fft.irfft(X * banda, 2 * n)[:n]
    y = np.tanh(y / (np.abs(y).max() + 1e-9) * 2.4)                     # tromba piccola e tirata: un po' saturata
    out = y.copy()
    for ritardo, g in ((0.043, 0.34), (0.097, 0.24), (0.171, 0.15), (0.26, 0.08)):   # eco del corridoio
        k = int(ritardo * sr); out[k:] += g * y[:-k]
    rms = lambda a: np.sqrt(np.mean(a[np.abs(a) > 0.02] ** 2)) if np.any(np.abs(a) > 0.02) else 1.0
    out = out * (rms(x) / rms(out)) * 0.92
    k = int(0.02 * sr); out[:k] *= np.linspace(0, 1, k); out[-k:] *= np.linspace(1, 0, k)
    return out.astype(np.float32)


def _altoparlante():
    v, p, tm, marca = D / "voce.wav", D / "voce_pulita.wav", D / "tempi.json", D / "_voce_altoparlante.sha1"
    if not (v.exists() and tm.exists()):
        return
    import soundfile as sf
    h = hashlib.sha1(v.read_bytes()).hexdigest()
    if marca.exists() and marca.read_text().strip() == h:              # voce.wav è già quella filtrata
        return
    shutil.copy(v, p)                                                  # voce.wav nuova (appena fatta da voce.py)
    x, sr = sf.read(p, dtype="float32")
    for r, t in zip(EP["righe"], json.loads(tm.read_text())["righe"]):
        if r.get("altoparlante"):
            for pz in t["pezzi"]:
                if pz["tipo"] == "citazione":
                    a, b = max(0, int((pz["inizio"] - 0.05) * sr)), min(len(x), int((pz["fine"] + 0.45) * sr))
                    x[a:b] = _filtro_altoparlante(x[a:b], sr)
    sf.write(v, x, sr)
    marca.write_text(hashlib.sha1(v.read_bytes()).hexdigest())
    print("voce dell'altoparlante filtrata (originale in voce_pulita.wav)", flush=True)


if __name__ != "__main__":
    _altoparlante()


# ---------------------------------------------------------------- effetti sulle inquadrature (chiamati da monta.py)
def _indice(r, m):
    return next(k for k, x in enumerate(m.righe) if x is r)


def _istanti(r, i, m, file):
    """Secondi (dall'inizio della riga) in cui partono i suoni `file` di questa riga: stessa regola di quando() in monta.py."""
    out = []
    for s in m.ep.get("suoni", []):
        if s["riga"] == r["id"] and s["file"] == file:
            t = m.T[i]["inizio"]
            if s.get("parola"):
                t = next((w[0] for w in m.parole[i] if s["parola"].lower() in w[2].lower()), t)
            out.append(t + s.get("dopo", 0.0) - m.T[i]["inizio"])
    return sorted(out)


def _sposta(fr, m, dx=0.0, dy=0.0, ang=0.0, sc=1.0):
    A = cv2.getRotationMatrix2D((m.W / 2, m.H / 2), ang, sc); A[0, 2] += dx; A[1, 2] += dy
    return cv2.warpAffine(fr, A, (m.W, m.H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def _strato(chiave, base, disegno, r, i, u, tau, m):
    """Un disegno fatto sull'immagine grande `base` (stessa profondità), mosso con la stessa camera dell'inquadratura."""
    if chiave not in m.IMG:
        big, dep = m.IMG[base]
        m.IMG[chiave] = (disegno(big), dep)
    return m.muovi(chiave, r.get("mov", "avanza_lento"), u, tau, float(i))


def _rollio(fr, t, m):
    f = 2 * np.pi * t / 5.6
    return _sposta(fr, m, 0, 7 * np.sin(f + 0.9), 0.5 * np.sin(f), 1.03)


def _sfarfalla(fr, t, tau):
    k = int(t * 13); h = (np.sin(k * 12.9898) * 43758.5453) % 1.0
    buio = 0.45 if (h < 0.22 and tau > 0.25) else 0.0                 # spenta per un attimo, a caso
    return fr * (1 - buio) * (1 + 0.025 * np.sin(2 * np.pi * 9.7 * t))


def _vibra(fr, r, i, tau, m):
    pz = next((p for p in m.T[i]["pezzi"] if p["tipo"] == "citazione"), None)
    if pz is None:
        return fr
    a, b = pz["inizio"] - m.T[i]["inizio"], pz["fine"] - m.T[i]["inizio"]
    e = float(np.clip((tau - a) / 0.1, 0, 1) * np.clip((b + 0.3 - tau) / 0.3, 0, 1))
    if e <= 0:
        return fr
    return _sposta(fr, m, 1.8 * e * np.sin(2 * np.pi * 23 * tau), 1.4 * e * np.sin(2 * np.pi * 31 * tau + 1), 0, 1.006)


def _colpi(fr, r, i, tau, m):
    amp = 0.0; dx = dy = 0.0
    for k, tk in enumerate(_istanti(r, i, m, "pugni_porta.mp3")):
        for c in COLPI_DENTRO:                                          # più colpi dentro lo stesso file
            d = tau - tk - c
            if d >= 0:
                e = np.exp(-d / 0.09); amp += e
                dx += e * 16 * np.sin(3.7 * (k + c * 5) + 1); dy += e * 12 * np.cos(2.3 * (k + c * 5))
    if amp < 1e-3:
        return fr
    return _sposta(fr, m, dx, dy, 0.4 * dx / 16, 1.025 + 0.02 * min(amp, 1))


COLPI_DENTRO = [0.0]                   # secondi dei colpi dentro pugni_porta.mp3 (si misurano sul file)
LED = {}                               # riga → posizione del led nell'immagine generata (x, y in 576x1024)
SPARISCE = {}                          # parametri della nave che si scioglie


def dopo(fr, r, tau, u, t, m):
    i = _indice(r, m)
    if r.get("rollio"):
        fr = _rollio(fr, t, m)
    if r.get("colpi"):
        fr = _colpi(fr, r, i, tau, m)
    if r.get("sfarfalla"):
        fr = _sfarfalla(fr, t, tau)
    if r.get("altoparlante"):
        fr = _vibra(fr, r, i, tau, m)
    return fr


# ---------------------------------------------------------------- scritte disegnate col codice (python extra.py)
FONTS = D.parents[2] / "scripts/bivio/fonts"
NAVY, INCHIOSTRO, CREMA = (24, 36, 76), (30, 30, 38), (240, 230, 204)          # RGB


def _font(peso, size):
    from PIL import ImageFont
    return ImageFont.truetype(str(FONTS / f"Roboto-{peso}.ttf"), int(size))


def _adatta(testo, peso, size, larg):
    while size > 8 and _font(peso, size).getlength(testo) > larg:
        size -= 1
    return _font(peso, size)


def _freccia(d, x, y, lung, sp, col):
    """La freccia → disegnata (Roboto non ce l'ha)."""
    d.line([(x, y), (x + lung - sp * 1.2, y)], fill=col, width=int(sp * 0.55))
    d.polygon([(x + lung, y), (x + lung - sp * 1.7, y - sp * 1.05), (x + lung - sp * 1.7, y + sp * 1.05)], fill=col)


def _rosa(d, cx, cy, r, col):
    """Piccola rosa dei venti: stella a quattro punte in un cerchio."""
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=col, width=max(2, int(r * 0.09)))
    for a in range(4):
        th = a * np.pi / 2; c, s = np.cos(th), np.sin(th)
        d.polygon([(cx + c * r * 0.95, cy + s * r * 0.95), (cx - s * r * 0.2, cy + c * r * 0.2), (cx, cy), (cx + s * r * 0.2, cy - c * r * 0.2)], fill=col)
    d.ellipse([cx - r * 0.12, cy - r * 0.12, cx + r * 0.12, cy + r * 0.12], fill=col)


def disegno_biglietto(passeggero, w=1200, h=900):
    """Biglietto della Linee del Maestrale (piatto, RGBA): banda blu notte, rosa dei venti, nome a destra in grande."""
    from PIL import Image, ImageDraw
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    bh = int(h * 0.15); x0 = int(w * 0.2); xr = int(w * 0.95)
    d.rectangle([0, 0, w, bh], fill=NAVY + (255,))
    _rosa(d, w - bh * 0.62, bh / 2, bh * 0.34, CREMA + (255,))
    d.text((x0, bh / 2), "LINEE DEL MAESTRALE", font=_adatta("LINEE DEL MAESTRALE", "Bold", bh * 0.5, w - bh * 1.3 - x0), fill=CREMA + (255,), anchor="lm")
    for y in range(bh + 14, h - 10, 34):                                            # tratteggio della matrice
        d.line([(w * 0.155, y), (w * 0.155, y + 16)], fill=INCHIOSTRO + (110,), width=4)
    d.text((xr, h * 0.205), "PASSEGGERO", font=_font("Medium", h * 0.058), fill=INCHIOSTRO + (190,), anchor="rm")
    d.text((xr, h * 0.315), passeggero, font=_adatta(passeggero, "Black", h * 0.15, xr - x0), fill=INCHIOSTRO + (255,), anchor="rm")
    d.text((x0, h * 0.48), "M/N TRAMONTANA", font=_adatta("M/N TRAMONTANA", "Bold", h * 0.085, xr - x0), fill=NAVY + (255,), anchor="lm")
    f = _font("Medium", h * 0.075); y = h * 0.6
    d.text((x0, y), "LIVORNO", font=f, fill=INCHIOSTRO + (255,), anchor="lm"); x = x0 + f.getlength("LIVORNO ") + 6
    _freccia(d, x, y + 2, h * 0.09, h * 0.02, INCHIOSTRO + (255,)); x += h * 0.09 + f.getlength(" ")
    d.text((x, y), "OLBIA  ·  22:30", font=f, fill=INCHIOSTRO + (255,), anchor="lm")
    d.text((x0, h * 0.79), "CABINA 512", font=_adatta("CABINA 512", "Black", h * 0.13, xr - x0), fill=INCHIOSTRO + (255,), anchor="lm")
    return im


def disegno_numero(testo, w, h, col, peso="Bold", riempi=0.78):
    """Solo un numero (targhetta, tessera), centrato e grande quanto il rettangolo permette."""
    from PIL import Image, ImageDraw
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    f = _adatta(testo, peso, h * riempi, w * 0.86)
    d.text((w / 2, h / 2), testo, font=f, fill=col + (255,), anchor="mm")
    return im


def _omografia(w, h, quad):
    dst = np.float32(quad) * K
    return cv2.getPerspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]), dst)


def stampa(big, disegno, quad, carta=None, luce=1.0, bordo=1.2):
    """Stampa il disegno piatto (PIL RGBA) sulla superficie `quad` (4 angoli nell'immagine 576x1024, in senso orario
    dall'alto a sinistra). L'inchiostro prende la luce della superficie (ombre e riflessi restano); `carta` è una
    maschera 0-1 (grande) dei punti dove la superficie si vede davvero (dita e pollici restano sopra)."""
    a = np.asarray(disegno).astype(np.float32) / 255
    Hm = _omografia(disegno.width, disegno.height, quad)
    rgba = cv2.warpPerspective(a, Hm, (SW, SH), flags=cv2.INTER_AREA if bordo else cv2.INTER_LINEAR)
    al = rgba[..., 3:] * (1 if carta is None else carta[..., None])
    col = rgba[..., 2::-1] * 255                                                    # BGR
    lum = cv2.cvtColor(big, cv2.COLOR_BGR2GRAY).astype(np.float32)
    poly = np.zeros((SH, SW), np.uint8); cv2.fillConvexPoly(poly, (np.float32(quad) * K).astype(np.int32), 1)
    rif = np.percentile(lum[poly > 0], 80) + 1e-3
    ombra = np.clip(lum / rif, 0.25, 1.25)[..., None] * luce                       # luce della superficie
    return np.clip(big * (1 - al) + col * ombra * al, 0, 255)


def maschera_carta(big, quad, pelle=6, morbido=2.0):
    """Punti del poligono che sono carta (verdognoli o neutri), non pelle (più rossa che verde)."""
    poly = np.zeros((SH, SW), np.uint8); cv2.fillConvexPoly(poly, (np.float32(quad) * K).astype(np.int32), 255)
    b, g, r = [big[..., k].astype(np.float32) for k in range(3)]
    ok = ((g + pelle >= r) & (poly > 0)).astype(np.uint8)
    ok = cv2.morphologyEx(ok, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    return cv2.GaussianBlur(ok.astype(np.float32), (0, 0), morbido)


def schiarisci(big, m, guadagno, tinta):
    """Schiarisce la zona m (0-1) come se la luce del molo ci battesse sopra."""
    return np.clip(big * (1 - m[..., None]) + big * guadagno * np.float32(tinta)[None, None] * m[..., None], 0, 255)


def cancella(big, rett):
    """Toglie una finta scritta del modello (rettangolo x0, y0, x1, y1 nell'immagine 576x1024)."""
    x0, y0, x1, y1 = (np.float32(rett) * K).astype(int)
    m = np.zeros(big.shape[:2], np.uint8); m[y0:y1, x0:x1] = 255
    return cv2.inpaint(np.clip(big, 0, 255).astype(np.uint8), m, 7, cv2.INPAINT_TELEA).astype(np.float32)


def grande(nome):
    im = cv2.imread(str(D / "img" / nome))
    return cv2.resize(im, (SW, SH), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)


def salva(big, nome):
    cv2.imwrite(str(D / "img" / nome), np.clip(big, 0, 255).astype(np.uint8))
    print("scritta", nome, flush=True)


SCRITTE = {}                           # nome dell'immagine generata → funzione che fa la versione con le scritte


# --- inquadratura 1: i due biglietti (sopra FENU DARIO, sotto spunta FENU EFISIO), sotto la luce arancione del molo
B_DAVANTI = [(191, 549), (383, 549), (397, 703), (193, 707)]
B_DIETRO = [(180, 477), (356, 452), (377, 609), (199, 634)]


def _biglietti(big):
    big = cancella(big, (282, 331, 332, 350))                                     # finta scritta sulla nave
    dav = maschera_carta(big, B_DAVANTI)
    poly_dav = np.zeros((SH, SW), np.uint8); cv2.fillConvexPoly(poly_dav, (np.float32(B_DAVANTI) * K).astype(np.int32), 1)
    die = maschera_carta(big, B_DIETRO) * cv2.GaussianBlur(1 - poly_dav.astype(np.float32), (0, 0), 1.2)
    carta = np.clip(dav + die, 0, 1)
    big = schiarisci(big, carta, 2.1, (0.74, 0.97, 1.2))                         # la carta prende la luce del molo
    big = stampa(big, disegno_biglietto("FENU EFISIO"), B_DIETRO, die)
    big = stampa(big, disegno_biglietto("FENU DARIO"), B_DAVANTI, dav)
    return big


SCRITTE["s01_biglietti.png"] = _biglietti


# --- inquadratura 4: la tessera bianca con la banda blu, «512»
T_CARTA = [(218, 535), (402, 520), (418, 680), (233, 703)]
T_ALTO = [(224, 549), (401, 534), (408, 586), (227, 603)]                        # striscia bianca sopra la banda


def _tessera(big):
    m = maschera_carta(big, T_CARTA, pelle=4, morbido=1.5)
    big = schiarisci(big, m, 3.6, (1.1, 0.97, 1.2))                            # bianca alla luce della lampada
    return stampa(big, disegno_numero("512", 900, 280, NAVY, "Black", 0.82), T_ALTO, m)


SCRITTE["s04_tessera.png"] = _tessera


def scritte(solo=None):
    for nome, f in SCRITTE.items():
        if solo and solo not in nome:
            continue
        salva(f(grande(nome)), nome.replace(".png", "_scritte.png"))


if __name__ == "__main__":
    scritte(sys.argv[1] if len(sys.argv) > 1 else None)
