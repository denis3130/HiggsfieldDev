# capelli.py: i capelli come UNA forma sola (26/11, dopo «i capelli ancora da rifare sembrano pezzi staccati»).
# Come la mano approvata: niente pezzi incollati (calotta + tenda + palla dello chignon), ma un volume unico per pettinatura:
#   - lo strato sul cuoio capelluto, spesso come la pettinatura (più alto in cima, ciuffo davanti), che a filo dell'attaccatura
#     scende a zero e quindi nasce dalla pelle invece di appoggiarcisi sopra;
#   - per chi li porta: i capelli che cadono (caschetto, lunghi alle spalle) e lo chignon, uniti allo strato con un'unione morbida;
# poi la superficie esterna di quel volume (marching cubes), lisciata, con le ciocche scavate lungo il verso della pettinatura
# (indietro in cima, dalla riga, giù dove cadono) e i colori: le creste più chiare, i solchi e le radici più scuri.
# Tutto in metri nello spazio della testa (origine nel giunto della testa, y su, il viso guarda +z), come il busto di converti_teste.py.
import numpy as np
from scipy.spatial import cKDTree
from scipy import ndimage as ndi
from skimage.measure import marching_cubes

def sm(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def smin(a, b, k):                                    # unione morbida di due distanze (raccordo largo k)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1); return b * (1 - h) + a * h - k * h * (1 - h)
def smax(a, b, k): return -smin(-a, -b, k)

def attaccatura(x, z, eY, c):
    """l'altezza dell'attaccatura (m) nella direzione (x, z): davanti, ai lati, sulla nuca, rientro alle tempie"""
    k = np.abs(np.arctan2(x, z)) / np.pi
    s = np.where(k < 0.35, c['fronte'] + (c['lati'] - c['fronte']) * (k / 0.35), c['lati'] + (c['nuca'] - c['lati']) * ((k - 0.35) / 0.65))
    return eY + s + c.get('tempie', 0) * np.exp(-((k - 0.2) / 0.07) ** 2)

def fai(P, N, eY, c, st, passo=0.0022):
    """P, N: punti e normali del busto (m). c: attaccatura e colore. st: pettinatura. Torna pos, nor, col (n,3) e triangoli."""
    albero = cKDTree(P)
    lo = np.array([P[:, 0].min() - 0.03, eY + st.get('giu', -0.04) - 0.03, P[:, 2].min() - 0.05])
    hi = np.array([P[:, 0].max() + 0.03, P[:, 1].max() + 0.05, P[:, 2].max() + 0.01])
    dims = np.ceil((hi - lo) / passo).astype(int) + 1
    gx, gy, gz = (lo[i] + passo * np.arange(dims[i]) for i in range(3))
    X, Y, Z = np.meshgrid(gx, gy, gz, indexing='ij'); Q = np.stack([X, Y, Z], -1).reshape(-1, 3)
    # distanza con segno dalla pelle: la distanza dal piano tangente dei 6 punti più vicini, pesata (la distanza dal punto più vicino
    # farebbe una perlina attorno a ogni vertice)
    d, iv = albero.query(Q, k=6, workers=-1); w = 1.0 / np.maximum(d, 1e-4) ** 2; w /= w.sum(1, keepdims=True)
    dt = (((Q[:, None, :] - P[iv]) * N[iv]).sum(2) * w).sum(1)
    x, y, z = Q[:, 0], Q[:, 1], Q[:, 2]
    soglia = attaccatura(x, z, eY, c)
    # lo strato sul cuoio capelluto: spessore che cresce dall'attaccatura (0,8 mm) verso la cima, più il ciuffo
    alto = sm(eY + 0.02, eY + 0.12, y)
    T = 0.0008 + (st['lato'] + (st['cima'] - st['lato']) * alto) * sm(soglia, soglia + st.get('morbido', 0.016), y)
    if st.get('ciuffo'): T += st['ciuffo'] * np.exp(-((x - st.get('ciuffo_x', 0.0)) / 0.045) ** 2 - ((y - eY - 0.085) / 0.035) ** 2) * sm(0.0, 0.06, z)
    f = smax(dt - T, (soglia - y) * 1.0, 0.002)
    # i capelli che cadono: dalle tempie, girando dietro, fino a st['giu'] sotto gli occhi; raggio = la testa più larga sopra quel punto
    if st.get('cadono'):
        cd = st['cadono']; cx, cz = 0.0, cd.get('cz', -0.012)
        rho = np.hypot(x - cx, z - cz); a = np.arctan2(x - cx, z - cz)
        # il raggio della testa a ogni angolo e altezza (dai punti del busto sopra la mascella), poi «appeso»: non stringe scendendo
        NA, NY = 96, 60; ya, yb = eY + cd.get('da', 0.15), eY + st['giu']
        Pa = np.arctan2(P[:, 0] - cx, P[:, 2] - cz); Pr = np.hypot(P[:, 0] - cx, P[:, 2] - cz)
        ka = np.clip(((Pa + np.pi) / (2 * np.pi) * NA).astype(int), 0, NA - 1); ky = np.clip(((ya - P[:, 1]) / (ya - yb) * NY).astype(int), -1, NY)
        R = np.zeros((NA, NY)); ok = (ky >= 0) & (ky < NY) & (P[:, 1] > eY - cd.get('collo', 0.085))
        np.maximum.at(R, (ka[ok], ky[ok]), Pr[ok])
        R = ndi.maximum_filter1d(R, 3, axis=0, mode='wrap'); R = np.maximum.accumulate(R, axis=1)                 # appeso
        R = ndi.uniform_filter1d(R, 5, axis=0, mode='wrap')
        qa = np.clip(((a + np.pi) / (2 * np.pi) * NA).astype(int), 0, NA - 1); qy = np.clip(((ya - y) / (ya - yb) * NY).astype(int), 0, NY - 1)
        t = np.clip((ya - y) / (ya - yb), 0, 1)
        apre = cd.get('apre', 1.2)                                                                                  # dalle tempie in giù il viso resta libero
        bordo = sm(apre - 0.05, apre + 0.45, np.abs(a))                                                               # verso il viso i capelli si stringono sulla testa
        Rq = R[qa, qy] + 0.002 + (cd.get('spesso', 0.01) + cd.get('gonfio', 0.01) * t ** 1.4) * (0.35 + 0.65 * bordo)
        Rq = Rq * (1 - cd.get('rientra', 0.0) * sm(0.7, 1.0, t)) + 0.004 * np.sin(a * 11 + 2 * np.sin(a * 3)) * t * bordo      # caschetto: le punte rientrano
        punte = 0.012 * np.sin(a * 9 + 1.7) * np.sin(a * 4.3) + 0.006 * np.sin(a * 23)                             # le punte non finiscono tutte alla stessa altezza
        f2 = smax(smax(rho - Rq, (apre - np.abs(a)) * rho, 0.014), smax(y - ya, yb + punte - y, 0.02), 0.014)
        f = smin(f, f2, 0.03)
    if st.get('chignon'):
        b = st['chignon']; cpos = np.array(b['c']); r = b['r']
        e = (Q - cpos) / np.array([1.0, 0.86, 0.9]); f = smin(f, np.linalg.norm(e, axis=1) * 0.93 - r, 0.014)
    F = f.reshape(dims)
    v, tri, nrm, _ = marching_cubes(F, level=0.0, spacing=(passo, passo, passo), gradient_direction='ascent')
    v += lo
    # tieni il pezzo grande (via le briciole), liscia un poco
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
    n = len(v); A = coo_matrix((np.ones(len(tri) * 3), (np.r_[tri[:, 0], tri[:, 1], tri[:, 2]], np.r_[tri[:, 1], tri[:, 2], tri[:, 0]])), shape=(n, n))
    nc, lab = connected_components(A, directed=False); big = np.bincount(lab).argmax(); keepv = lab == big
    keept = keepv[tri[:, 0]]; tri = tri[keept]; nuovo = -np.ones(n, int); nuovo[keepv] = np.arange(keepv.sum()); v = v[keepv]; tri = nuovo[tri]
    vic = [[] for _ in range(len(v))]
    for a_, b_, c_ in tri: vic[a_] += [b_, c_]; vic[b_] += [a_, c_]; vic[c_] += [a_, b_]
    vic = [np.unique(x) for x in vic]
    import scipy.sparse as sp_
    righe = np.concatenate([np.full(len(x), i) for i, x in enumerate(vic)]); col_ = np.concatenate(vic)
    Ad = sp_.csr_matrix((np.ones(len(righe)), (righe, col_)), shape=(len(v), len(v))); deg = np.asarray(Ad.sum(1)).ravel(); deg[deg == 0] = 1
    Mm = sp_.diags(1 / deg) @ Ad
    def liscia(V, k=0.5, giri=3):
        for _ in range(giri): V = V + k * (Mm @ V - V); V = V - 0.53 * (Mm @ V - V) if k > 0.4 else V
        return V
    v = liscia(v, 0.6, 12)
    def normali(V):
        Nn = np.zeros_like(V); fn = np.cross(V[tri[:, 1]] - V[tri[:, 0]], V[tri[:, 2]] - V[tri[:, 0]])
        for j in range(3): np.add.at(Nn, tri[:, j], fn)
        return Nn / np.maximum(np.linalg.norm(Nn, axis=1, keepdims=True), 1e-12)
    nn = normali(v)
    if (nn * (v - v.mean(0))).sum(1).mean() < 0: tri = tri[:, ::-1].copy(); nn = normali(v)       # le facce guardano fuori
    # le ciocche: solchi lungo il verso della pettinatura. In cima: indietro (solchi paralleli a z) o a raggiera dalla riga;
    # dove i capelli cadono: verticali (giro attorno alla testa). Larghezza e profondità variano (ciocche vere, non righe).
    x, y, z = v[:, 0], v[:, 1], v[:, 2]
    rg = np.random.default_rng(len(v))
    def rum(u, s): return np.interp(u, np.linspace(u.min() - 1, u.max() + 1, 400), rg.standard_normal(400).cumsum() * s)
    if st.get('riga') is not None: s_top = z + 0.6 * (x - st['riga']) ** 2                                # dalla riga verso i lati: i solchi corrono di traverso
    else: s_top = x                                                                                       # tutto indietro
    s_giu = np.arctan2(x, z + 0.012) * 0.1
    w_giu = sm(eY + 0.07, eY + 0.02, y) if st.get('cadono') else np.zeros_like(y)
    s = s_top * (1 - w_giu) + s_giu * w_giu
    largo = st.get('ciocca', 0.0075) * (1 + 0.35 * np.sin(s * 37 + 1.3) + 0.25 * np.sin(y * 55 + 0.7))
    fase = s / largo + 0.9 * rum(s, 0.12) + 0.15 * np.sin(y * 30 + s * 10)
    cresta = np.abs(np.sin(np.pi * fase)) ** 1.6                                                          # creste larghe e morbide, solchi stretti
    prof = st.get('solchi', 0.0018) * (0.6 + 0.4 * np.sin(fase * 0.37 + y * 40)) * sm(0.0, 0.004, -np.minimum(0, -999))
    radice = sm(-0.004, 0.01, y - attaccatura(x, z, eY, c))                                               # niente solchi a filo della pelle
    v = v + nn * ((cresta - 0.6) * prof * radice)[:, None]
    nn = normali(liscia(v, 0.3, 1)) * 0.3 + normali(v) * 0.7; nn /= np.linalg.norm(nn, axis=1, keepdims=True)
    quanto = min(1.0, st.get('solchi', 0.0018) / 0.0015)
    luce = np.clip(0.86 + quanto * 0.16 * (cresta - 0.5) * radice - 0.1 * (1 - radice) + 0.05 * rum(y * 3 + x, 0.05), 0, 1)
    col = np.repeat(luce[:, None], 3, 1)
    return v.astype('<f4'), nn.astype('<f4'), (col * 255).astype('u1'), tri.astype('<u4')
