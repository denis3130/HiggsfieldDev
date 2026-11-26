# converti_teste.py <mpfb2> <uscita> [personaggio ...]
# I sette de «Il gioco dei sette» nell'aspetto del video A: corpo e testa VERI di MakeHuman (maglia hm08, forme, scheletro: CC0, dati MPFB2
# dal pacchetto Python «anny»), con la forma di ogni personaggio (età, sesso, peso, origine, viso), la testa ingrandita da cartone,
# la pelle dipinta (colore, lentiggini, macchie, labbra, sopracciglia, barba, rughe e pori nel rilievo) e i centri degli occhi.
# Qui il busto per la scheda dei personaggi (testa, collo, spalle, petto). Gli occhi, i capelli e i vestiti li fa personaggi.js.
#   <mpfb2> = cartella anny/data/mpfb2 (pip download anny==0.6.2 --no-deps; vedi cast/sets/corpi/LICENZE.md)
# Uscita: <nome>.json + <nome>.bin (posizioni, normali, uv, indici; metri, y in su, il viso guarda +z, origine nel giunto della testa)
#         <nome>_pelle.jpg (colore) e <nome>_rilievo.png (mappa delle normali), 2048 x 2048.
import sys, os, json, math
import numpy as np
from PIL import Image
QUI = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(QUI, '..', '..', 'cast', 'sets', 'corpi'))
import mh, maglia
from scipy import ndimage as ndi

MP, OUT = sys.argv[1], sys.argv[2]; SOLO = sys.argv[3:]
os.makedirs(OUT, exist_ok=True)
DIM = 2048
V0, F0, FT0, UV0, G0, NOMI_G = mh.carica_base(os.path.join(MP, '3dobjs', 'base.obj')); NV0 = len(V0)
GRUPPI = mh.carica_gruppi(os.path.join(MP, 'mesh_metadata', 'basemesh_vertex_groups.json'))
RIG = json.load(open(os.path.join(MP, 'rigs', 'standard', 'rig.default.json')))
PESI = mh.pesi(os.path.join(MP, 'rigs', 'standard', 'weights.default.json'), NV0)
ID_BODY = [k for k, v in NOMI_G.items() if v == 'body'][0]
def discendenti(radice):
    out = {radice}; cambiato = True
    while cambiato:
        cambiato = False
        for k, v in RIG.items():
            if v.get('parent') in out and k not in out: out.add(k); cambiato = True
    return out
TESTA = discendenti('head')
W_TESTA = sum(PESI[b] for b in TESTA if b in PESI)
MASCHERE = {n: np.asarray(Image.open(os.path.join(MP, 'textures', f'mpfb_{n}.jpg')).convert('L').resize((DIM, DIM)), float) / 255 for n in ('face', 'lips', 'eyelids', 'ears')}

# ---- i personaggi: forma (bersagli MakeHuman, senza .target.gz), quanto ingrandire la testa, pelle e segni dell'età
def eta(giovane, vecchio, sesso='male', origine='caucasian'):
    return {f'macrodetails/{origine}-{sesso}-young': giovane, f'macrodetails/{origine}-{sesso}-old': vecchio}
PERSONAGGI = {
    'leon':   dict(forma={**eta(0.85, 0.15), 'head/head-square': 0.3, 'chin/chin-prominent-incr': 0.3, 'nose/nose-scale-vert-incr': 0.2, 'eyebrows/eyebrows-trans-down': 0.4},
                   testa=1.25, pelle='#D9A07E', guance='#D9796A', labbra='#B86B5E', sopracciglia='#3B2A20', barba=0.55, rughe=0.25, lentiggini=0.15, macchie=0.0, occhiaie=0.45),
    'victor': dict(forma={**eta(0.45, 0.55), 'head/head-oval': 0.5, 'nose/nose-scale-vert-incr': 0.4, 'nose/nose-hump-incr': 0.5, 'cheek/l-cheek-volume-decr': 0.4, 'cheek/r-cheek-volume-decr': 0.4},
                   testa=1.25, pelle='#E2AE90', guance='#D88072', labbra='#B97268', sopracciglia='#8A8580', barba=0.1, rughe=0.8, lentiggini=0.0, macchie=0.55, occhiaie=0.5),
    'elena':  dict(forma={**eta(0.75, 0.25, 'female'), 'head/head-oval': 0.6, 'chin/chin-prominent-incr': 0.3, 'nose/nose-scale-horiz-decr': 0.4, 'cheek/l-cheek-bones-incr': 0.5, 'cheek/r-cheek-bones-incr': 0.5},
                   testa=1.25, pelle='#E7B595', guance='#D9817A', labbra='#8E2A35', sopracciglia='#2B1E18', barba=0.0, rughe=0.4, lentiggini=0.0, macchie=0.1, occhiaie=0.3),
    'marcus': dict(forma={**eta(0.55, 0.45, 'male', 'african'), 'macrodetails/universal-male-young-averagemuscle-maxweight': 0.35, 'head/head-square': 0.6, 'chin/chin-width-incr': 0.5, 'nose/nose-scale-horiz-incr': 0.4},
                   testa=1.23, pelle='#8A5A3E', guance='#7A4232', labbra='#6E4034', sopracciglia='#1A1210', barba=0.7, rughe=0.6, lentiggini=0.0, macchie=0.0, occhiaie=0.4),
    'nora':   dict(forma={**eta(0.9, 0.1, 'female', 'asian'), 'head/head-round': 0.4, 'nose/nose-scale-horiz-decr': 0.2},
                   testa=1.27, pelle='#E8B996', guance='#E08F84', labbra='#B86A66', sopracciglia='#1E1612', barba=0.0, rughe=0.15, lentiggini=0.6, macchie=0.0, occhiaie=0.2),
    'adrian': dict(forma={**eta(0.8, 0.2), 'head/head-rectangular': 0.5, 'chin/chin-width-incr': 0.6, 'chin/chin-prominent-incr': 0.4, 'nose/nose-scale-vert-decr': 0.2},
                   testa=1.23, pelle='#DDA785', guance='#D37E6E', labbra='#B46E60', sopracciglia='#2A1C14', barba=0.3, rughe=0.3, lentiggini=0.0, macchie=0.05, occhiaie=0.25),
    'sophie': dict(forma={**eta(1.0, 0.0, 'female'), 'head/head-round': 0.3, 'eyes/l-eye-scale-incr': 0.5, 'eyes/r-eye-scale-incr': 0.5, 'chin/chin-height-decr': 0.3},
                   testa=1.3, pelle='#EDBEA0', guance='#E79A8E', labbra='#C7766E', sopracciglia='#4A3426', barba=0.0, rughe=0.0, lentiggini=0.35, macchie=0.0, occhiaie=0.15),
}

# capelli: colore e attaccatura (metri sopra il centro degli occhi: davanti, ai lati, sulla nuca). La stessa attaccatura la usa personaggi.js
# per il guscio scolpito; qui il cuoio capelluto sotto si dipinge del colore dei capelli, così al bordo non resta una riga chiara.
CAPELLI = {
    'leon':   {'tempie': 0.012, 'colore': '#3A2A1E', 'fronte': 0.065, 'lati': 0.03, 'nuca': -0.07},
    'victor': {'tempie': 0.022, 'colore': '#A8A49C', 'fronte': 0.085, 'lati': 0.028, 'nuca': -0.06},
    'elena':  {'colore': '#2A1C14', 'fronte': 0.062, 'lati': 0.02, 'nuca': -0.085},
    'marcus': {'tempie': 0.008, 'colore': '#161210', 'fronte': 0.068, 'lati': 0.03, 'nuca': -0.07},
    'nora':   {'colore': '#1A1412', 'fronte': 0.055, 'lati': -0.01, 'nuca': -0.1},
    'adrian': {'tempie': 0.01, 'colore': '#241A12', 'fronte': 0.07, 'lati': 0.032, 'nuca': -0.07},
    'sophie': {'colore': '#5A3A22', 'fronte': 0.058, 'lati': 0.0, 'nuca': -0.09},
}
for _n, _c in CAPELLI.items(): PERSONAGGI[_n]['capelli'] = _c

def rgb(h): h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float) / 255
def sm(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

def rasterizza(P, F, FT, UV, dim):
    """per ogni texel dentro un triangolo: posizione 3D e normale interpolate (dove non c'è nulla: nan)"""
    POS = np.full((dim, dim, 3), np.nan, np.float32); NOR = np.zeros((dim, dim, 3), np.float32)
    N = np.zeros_like(P)
    for f in F:
        n = np.cross(P[f[1]] - P[f[0]], P[f[2]] - P[f[0]]) + (np.cross(P[f[2]] - P[f[0]], P[f[3]] - P[f[0]]) if len(f) == 4 else 0)
        for v in f: N[v] += n
    N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
    for f, ft in zip(F, FT):
        for tri in ((0, 1, 2), (0, 2, 3)) if len(f) == 4 else ((0, 1, 2),):
            a, b, c = (UV[ft[i]] * [dim, dim] for i in tri); va, vb, vc = (f[i] for i in tri)
            a = np.array([a[0], dim - a[1]]); b = np.array([b[0], dim - b[1]]); c = np.array([c[0], dim - c[1]])
            x0, x1 = int(max(0, math.floor(min(a[0], b[0], c[0])))), int(min(dim - 1, math.ceil(max(a[0], b[0], c[0]))))
            y0, y1 = int(max(0, math.floor(min(a[1], b[1], c[1])))), int(min(dim - 1, math.ceil(max(a[1], b[1], c[1]))))
            if x1 < x0 or y1 < y0: continue
            X, Y = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
            d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
            if abs(d) < 1e-12: continue
            l1 = ((b[1] - c[1]) * (X - c[0]) + (c[0] - b[0]) * (Y - c[1])) / d; l2 = ((c[1] - a[1]) * (X - c[0]) + (a[0] - c[0]) * (Y - c[1])) / d; l3 = 1 - l1 - l2
            m = (l1 >= -0.02) & (l2 >= -0.02) & (l3 >= -0.02)
            if not m.any(): continue
            yy, xx = np.nonzero(m); L = np.stack([l1[m], l2[m], l3[m]], 1)
            POS[y0 + yy, x0 + xx] = L @ np.stack([P[va], P[vb], P[vc]]); NOR[y0 + yy, x0 + xx] = L @ np.stack([N[va], N[vb], N[vc]])
    return POS, NOR

def rumore(dim, scala, seed):
    r = np.random.default_rng(seed); g = r.standard_normal((dim // scala + 2, dim // scala + 2))
    return ndi.zoom(g, scala, order=3)[:dim, :dim]

def dipingi(nome, o, P, F, FT, UV, J):
    """Pelle del personaggio nello spazio uv: colore e rilievo, decisi guardando dove sta ogni texel sulla testa (coordinate della testa:
    origine nel giunto, x verso la sua sinistra, y su, z avanti, in decimetri)."""
    POS, NOR = rasterizza(P, F, FT, UV, DIM)
    ok = ~np.isnan(POS[..., 0]); Q = np.where(ok[..., None], POS - J['testa'], 0)
    x, y, z = Q[..., 0], Q[..., 1], Q[..., 2]
    viso = MASCHERE['face']; labbra = MASCHERE['lips']; palpebre = MASCHERE['eyelids']
    occ = {s: J['occhio' + s] - J['testa'] for s in 'SD'}; rO = J['r_occhio']
    pelle = rgb(o['pelle']); C = np.ones((DIM, DIM, 3)) * pelle; A = np.zeros((DIM, DIM))
    rng = np.random.default_rng(len(nome) * 97)
    # variazione lenta del colore (macchie di sangue sotto la pelle), un po' più rossa su naso, guance, orecchie
    n1 = rumore(DIM, 64, 1) * 0.5 + rumore(DIM, 16, 2) * 0.25; C *= (1 + 0.035 * n1[..., None])
    guance = np.exp(-(((np.abs(x) - 0.42) / 0.22) ** 2 + ((y - (occ['S'][1] - 0.35)) / 0.25) ** 2)) * (z > 0.2)
    naso = np.exp(-((x / 0.12) ** 2 + ((y - (occ['S'][1] - 0.35)) / 0.2) ** 2)) * (z > 0.7)
    C = C * (1 - 0.45 * guance[..., None]) + rgb(o['guance']) * 0.45 * guance[..., None]
    C = C * (1 - 0.18 * naso[..., None]) + rgb(o['guance']) * 0.18 * naso[..., None]
    C = C * (1 - 0.22 * MASCHERE['ears'][..., None]) + rgb(o['guance']) * 0.22 * MASCHERE['ears'][..., None]
    # occhiaie e incavo degli occhi un po' più scuri e violacei
    for s in 'SD':
        e = occ[s]; d = np.sqrt(((x - e[0]) / 0.36) ** 2 + ((y - e[1] + 0.12) / 0.2) ** 2); sotto = np.exp(-d ** 2) * (y < e[1]) * (z > 0.2)
        C = C * (1 - o['occhiaie'] * 0.22 * sotto[..., None]) + np.array([0.45, 0.3, 0.33]) * o['occhiaie'] * 0.22 * sotto[..., None]
        A -= 0.25 * o['occhiaie'] * np.exp(-(((x - e[0]) / 0.3) ** 2 + ((y - e[1] + 0.2) / 0.06) ** 2)) * (z > 0.2)        # la borsa sotto l'occhio
    # labbra
    C = C * (1 - 0.85 * labbra[..., None]) + rgb(o['labbra']) * 0.85 * labbra[..., None]
    # sopracciglia dipinte: una pennellata morbida sopra ogni occhio, più spessa verso il naso
    for s in 'SD':
        e = occ[s]; u = (x - e[0]) * (1 if s == 'S' else -1)                      # u > 0 verso l'esterno
        arco = e[1] + o.get('alt_sop', 0.2) + 0.03 * np.cos(np.clip(u / 0.22, -1.5, 1.5) * 1.1) - 0.04 * np.clip(u - 0.1, 0, 1)
        spess = 0.03 * (1 - 0.45 * sm(-0.12, 0.24, u)) * o.get('spess_sop', 1.0)
        sop = sm(1.15, 0.35, np.abs(y - arco) / spess) * sm(-0.2, -0.13, u) * sm(0.27, 0.19, u) * (z > 0.3)
        peli = np.clip(0.88 + 0.12 * rumore(DIM, 3, 7 + (s == 'S')), 0, 1)
        C = C * (1 - 0.92 * sop[..., None] * peli[..., None]) + rgb(o['sopracciglia']) * 0.92 * sop[..., None] * peli[..., None]
        A += 0.1 * sop
    # lentiggini e macchie dell'età: puntini morbidi sul viso (soprattutto guance e naso; le macchie anche su fronte e tempie)
    for qta, scuro, dim_, zona in ((o['lentiggini'], 0.42, 5, guance + naso * 0.6), (o['macchie'], 0.35, 9, np.ones_like(x))):
        if qta <= 0: continue
        punti = np.zeros((DIM, DIM)); k = int(2200 * qta)
        ys = rng.integers(0, DIM, k); xs = rng.integers(0, DIM, k); punti[ys, xs] = rng.uniform(0.4, 1.0, k)
        punti = ndi.gaussian_filter(punti, dim_ * 0.6) * (dim_ ** 2) * 1.6
        m = np.clip(punti, 0, 1) * np.clip(viso * 1.4, 0, 1) * np.clip(zona * 1.5, 0, 1)
        C = C * (1 - scuro * m[..., None]) + np.array([0.42, 0.26, 0.17]) * scuro * m[..., None]
    # barba di qualche giorno (uomini): puntini scuri su mascella, mento e sopra il labbro, non sulle labbra
    if o['barba'] > 0:
        b_zona = sm(0.05, -0.25, y - (occ['S'][1] - 0.55)) * (z > -0.1) * sm(1.3, 0.9, np.sqrt(x ** 2 + (y - occ['S'][1] + 1.0) ** 2)) * (1 - labbra)
        sopra = np.exp(-((x / 0.22) ** 2 + ((y - (occ['S'][1] - 0.62)) / 0.07) ** 2)) * (z > 0.6)
        b_zona = np.clip(b_zona + sopra, 0, 1) * np.clip(viso * 2 + (y < occ['S'][1] - 0.6), 0, 1)
        peli = np.clip(rumore(DIM, 1, 11) * 0.8 + 0.2, 0, 1)
        m = b_zona * o['barba'] * (0.45 + 0.55 * peli)
        C = C * (1 - 0.55 * m[..., None]) + rgb('#2A221E') * 0.55 * m[..., None]
    # rughe nel rilievo: fronte, zampe di gallina, pieghe naso-bocca, collo; e i pori
    r = o['rughe']
    if r > 0:
        fy = occ['S'][1] + 0.36
        for i in range(4):
            yi = fy + i * 0.065 + 0.012 * np.sin(x * 6 + i)
            A -= r * 0.35 * np.exp(-((y - yi) / 0.008) ** 2) * sm(0.42, 0.22, np.abs(x)) * (z > 0.4)
        for s in 'SD':
            e = occ[s]; ang = np.arctan2(y - e[1], np.abs(x) - np.abs(e[0])); rr = np.hypot(np.abs(x) - np.abs(e[0]), y - e[1])
            for a0 in (-0.5, -0.15, 0.2, 0.5):
                A -= r * 0.3 * np.exp(-((ang - a0) / 0.06) ** 2) * sm(0.19, 0.24, rr) * sm(0.38, 0.3, rr) * (np.abs(x) > np.abs(e[0]) + 0.16) * (z > -0.2)
            nx0, ny0 = 0.2 * (1 if s == 'S' else -1), occ['S'][1] - 0.48; mx0, my0 = 0.28 * (1 if s == 'S' else -1), occ['S'][1] - 0.85
            t = np.clip(((x - nx0) * (mx0 - nx0) + (y - ny0) * (my0 - ny0)) / ((mx0 - nx0) ** 2 + (my0 - ny0) ** 2), 0, 1)
            dd = np.hypot(x - (nx0 + t * (mx0 - nx0) + 0.04 * np.sin(t * 3.14) * (1 if s == 'S' else -1)), y - (ny0 + t * (my0 - ny0)))
            A -= r * 0.55 * np.exp(-(dd / 0.018) ** 2) * (z > 0.5) * sm(0.0, 0.15, t) * sm(1.0, 0.8, t)
        for i in range(3): A -= r * 0.25 * np.exp(-((y - (-1.15 - i * 0.18)) / 0.02) ** 2) * (z > 0.0)
    A += 0.01 * rumore(DIM, 1, 13) * np.clip(viso * 1.5, 0, 1)          # pori
    A += 0.008 * rumore(DIM, 3, 17)
    cap = o.get('capelli')
    if cap:
        ey = occ['S'][1]; a = np.arctan2(x, z); k = np.abs(a) / np.pi
        soglia = (np.where(k < 0.35, cap['fronte'] + (cap['lati'] - cap['fronte']) * (k / 0.35), cap['lati'] + (cap['nuca'] - cap['lati']) * ((k - 0.35) / 0.65)) + cap.get('tempie', 0) * np.exp(-((k - 0.2) / 0.07) ** 2)) * 10 + ey
        m = sm(-0.16, 0.0, y - soglia) * (1 - MASCHERE['ears'])
        C = C * (1 - 0.9 * m[..., None]) + rgb(cap['colore']) * 0.9 * m[..., None]
    # fuori dalle facce: riempi coi vicini (niente righe scure sulle cuciture)
    C = np.clip(C, 0, 1); dentro = ok
    idx = ndi.distance_transform_edt(~dentro, return_distances=False, return_indices=True)
    C = C[idx[0], idx[1]]; A = A[idx[0], idx[1]]
    Image.fromarray((C * 255).astype(np.uint8)).save(os.path.join(OUT, f'{nome}_pelle.jpg'), quality=92)
    # rilievo -> normali nello spazio tangente (u verso destra, v verso l'alto dell'immagine)
    As = ndi.gaussian_filter(A, 1.0); gx = np.gradient(As, axis=1); gy = np.gradient(As, axis=0); k = 4.0
    Nn = np.stack([-gx * k, gy * k, np.ones_like(As)], -1); Nn /= np.linalg.norm(Nn, axis=-1, keepdims=True)
    Image.fromarray(((Nn * 0.5 + 0.5) * 255).astype(np.uint8)).save(os.path.join(OUT, f'{nome}_rilievo.png'))

OCCHI_GRANDI = {'eyes/l-eye-scale-incr': 0.6, 'eyes/r-eye-scale-incr': 0.6, 'eyes/l-eye-height2-incr': 0.45, 'eyes/r-eye-height2-incr': 0.45,
                'head/head-round': 0.15, 'cheek/l-cheek-volume-incr': 0.15, 'cheek/r-cheek-volume-incr': 0.15}     # un po' più cartone, come il video A (26/11: «miglioralo leggermente»)
def costruisci(nome, o):
    print('==', nome, flush=True)
    forma = dict(OCCHI_GRANDI); [forma.__setitem__(k, forma.get(k, 0) + v) for k, v in o['forma'].items()]
    H = mh.forma(V0, MP, forma)                                                     # decimetri
    J = {'testa': mh.capo(H, GRUPPI, RIG['head']['head']), 'collo': mh.capo(H, GRUPPI, RIG['neck01']['head'])}
    # la testa da cartone: ingrandita attorno al giunto della testa, pesata dalle ossa della testa (il collo raccorda da solo)
    s = o['testa']; w = np.clip(W_TESTA, 0, 1); H = J['testa'] + (H - J['testa']) * (1 + (s - 1) * w)[:, None]
    for l, s_ in (('l', 'S'), ('r', 'D')):
        J['occhio' + s_] = mh.giunto(H, GRUPPI, f'joint-{l}-eye')
        occhio = H[GRUPPI[f'helper-{l}-eye']]; J['r_occhio'] = float(np.linalg.norm(occhio - occhio.mean(0), axis=1).max())
    J['testa2'] = mh.capo(H, GRUPPI, RIG['head']['tail'])
    # il busto: le facce del corpo sopra il petto
    taglio = mh.capo(H, GRUPPI, RIG['spine02']['head'])[1] - 0.6
    tieni = (G0 == ID_BODY) & (H[F0][:, :, 1].min(1) > taglio)
    F = [list(f) for f in F0[tieni]]; FT = [list(f) for f in FT0[tieni]]
    usati = np.unique(np.array(F).ravel()); nuovo = -np.ones(NV0, int); nuovo[usati] = np.arange(len(usati))
    P = H[usati]; F = [list(nuovo[f]) for f in F]
    P, F, _, FT, UV = maglia.catmull_clark(P, F, (), FT, UV0)
    dipingi(nome, o, P, F, FT, UV, J)
    # vertici da disegnare: uno per coppia (punto, uv); normali lisce sui punti
    N = np.zeros_like(P)
    for f in F:
        n = np.cross(P[f[1]] - P[f[0]], P[f[2]] - P[f[0]]) + np.cross(P[f[2]] - P[f[0]], P[f[3]] - P[f[0]])
        for v in f: N[v] += n
    N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
    chiave = {}; rv, uv, tri = [], [], []
    for f, ft in zip(F, FT):
        q = []
        for v, t in zip(f, ft):
            k = (v, round(float(UV[t][0]), 5), round(float(UV[t][1]), 5)); i = chiave.get(k)
            if i is None: i = chiave[k] = len(rv); rv.append(v); uv.append(UV[t])
            q.append(i)
        tri += [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]
    rv = np.array(rv); T = lambda X: (np.asarray(X) - J['testa']) * 0.1
    POS = T(P[rv]).astype('<f4'); NOR = N[rv].astype('<f4'); UVS = np.array(uv, '<f4'); IDX = np.array(tri, '<u4').ravel()
    open(os.path.join(OUT, nome + '.bin'), 'wb').write(POS.tobytes() + NOR.tobytes() + UVS.tobytes() + IDX.tobytes())
    json.dump(dict(nome=nome, vertici=len(rv), indici=len(IDX), ordine=['pos f4 vertici*3', 'nor f4 vertici*3', 'uv f4 vertici*2', 'idx u4 indici'],
                   occhi={'S': T(J['occhioS']).tolist(), 'D': T(J['occhioD']).tolist(), 'raggio': J['r_occhio'] * 0.1}, testa2=T(J['testa2']).tolist(), collo=T(J['collo']).tolist(),
                   taglio=float((taglio - J['testa'][1]) * 0.1), pelle=o['pelle'], sopracciglia=o['sopracciglia'], capelli=o.get('capelli')), open(os.path.join(OUT, nome + '.json'), 'w'))
    print(f'  vertici {len(rv)} triangoli {len(IDX) // 3}', flush=True)

for nome, o in PERSONAGGI.items():
    if SOLO and nome not in SOLO: continue
    costruisci(nome, o)
