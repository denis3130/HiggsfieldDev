# pittura.py: le texture dei vestiti di MakeHuman (foto) ridipinte nello stile del Bivio: colori piatti del personaggio, sfumature morbide,
# e del disegno originale restano solo cuciture, tasche, orli, lacci e suole (come linee e toni), non le macchie e i loghi.
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

def rgb(h): h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float) / 255
def lum(a): return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114
def sfoca(a, s): return ndi.gaussian_filter(a, s)
def sm(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

def isole(c, comp, dim):
    """maschere nello spazio uv: per ogni componente della maglia del capo, i suoi triangoli disegnati (v in su: riga 0 = v 1)"""
    out = {}
    for k in np.unique(comp):
        im = Image.new('L', (dim, dim), 0); d = ImageDraw.Draw(im)
        for f, ft in zip(c['F'], c['FT']):
            if comp[f[0]] != k: continue
            d.polygon([(float(c['UV'][t][0]) * dim, (1 - float(c['UV'][t][1])) * dim) for t in ft], fill=255, outline=255)
        out[int(k)] = np.array(im) > 0
    return out

def orli(c, dim, largo=2):
    """i bordi veri della maglia (colletto, maniche, fondo: i lati con una faccia sola) disegnati nello spazio uv -> distanza in pixel da quei bordi"""
    conta = {}
    for f, ft in zip(c['F'], c['FT']):
        n = len(f)
        for j in range(n):
            a, b = f[j], f[(j + 1) % n]; k = (a, b) if a < b else (b, a); conta.setdefault(k, []).append((ft[j], ft[(j + 1) % n]))
    im = Image.new('L', (dim, dim), 0); d = ImageDraw.Draw(im)
    for k, l in conta.items():
        if len(l) == 1: t0, t1 = l[0]; d.line([(float(c['UV'][t0][0]) * dim, (1 - float(c['UV'][t0][1])) * dim), (float(c['UV'][t1][0]) * dim, (1 - float(c['UV'][t1][1])) * dim)], fill=255, width=largo)
    return ndi.distance_transform_edt(np.array(im) == 0)

def isole_uv(c, dim):
    """le isole degli uv (pezzi del cartamodello): lista di { maschera, facce (indici), vertici }"""
    par = {}
    def tr(a):
        while par.setdefault(a, a) != a: par[a] = par[par[a]]; a = par[a]
        return a
    for ft in c['FT']:
        r = tr(ft[0])
        for t in ft[1:]:
            q = tr(t)
            if q != r: par[q] = r
    gr = {}
    for i, ft in enumerate(c['FT']): gr.setdefault(tr(ft[0]), []).append(i)
    out = []
    for k, fi in gr.items():
        im = Image.new('L', (dim, dim), 0); d = ImageDraw.Draw(im)
        for i in fi: d.polygon([(float(c['UV'][t][0]) * dim, (1 - float(c['UV'][t][1])) * dim) for t in c['FT'][i]], fill=255, outline=255)
        out.append(dict(maschera=np.array(im) > 0, facce=fi, vertici=np.unique(np.concatenate([c['F'][i] for i in fi]))))
    return out

def carica(path, dim):
    im = Image.open(path).convert('RGBA').resize((dim, dim), Image.LANCZOS); a = np.asarray(im, float) / 255; return a[..., :3], a[..., 3]

def riempi(img, pieno):
    """fuori dalle isole il colore del punto d'isola più vicino: niente righe sulle cuciture degli uv"""
    _, (iy, ix) = ndi.distance_transform_edt(~pieno, return_indices=True); return img[iy, ix]

def dettaglio(L, fine=1.2, largo=14):
    k = L.shape[0] / 1024; fine, largo = fine * k, largo * k
    """le linee del disegno (cuciture, tasche, lacci): differenza tra il tono fine e quello largo"""
    return sfoca(L, fine) - sfoca(L, largo)

def tessuto(L, isola, colore, forza=1.5, sfum=0.25, ao=None):
    """un tessuto a tinta unita: colore piatto, linee del disegno originale, un po' delle sue sfumature larghe"""
    m = L[isola].mean(); d = dettaglio(L); largo = sfoca(L, 26 * L.shape[0] / 1024) - m
    k = 1 + forza * np.clip(d, -0.22, 0.12) + sfum * np.clip(largo, -0.3, 0.3)
    if ao is not None: k = k * (0.6 + 0.4 * ao)
    return np.clip(colore[None, None, :] * k[..., None], 0, 1)

def salva(img, path, liscia=3):
    im = Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8))
    if liscia: im = im.filter(ImageFilter.MedianFilter(liscia))
    im.save(path)
