# maglia.py: operazioni sulle maglie a quadrilateri (suddivisione di Catmull-Clark con i bordi, componenti, giri di bordo)
import numpy as np

def lati_di(F):
    """lati unici di una maglia di poligoni: (E (ne,2), mappa (a,b)->indice, facce per lato)"""
    idx, E, EF = {}, [], []
    for fi, f in enumerate(F):
        n = len(f)
        for j in range(n):
            a, b = f[j], f[(j + 1) % n]; k = (a, b) if a < b else (b, a)
            e = idx.get(k)
            if e is None: e = idx[k] = len(E); E.append(k); EF.append([])
            EF[e].append(fi)
    return np.array(E), idx, EF

def catmull_clark(P, F, attributi=(), FT=None, UV=None):
    """Un passo di Catmull-Clark su facce a 3 o 4 lati (i bordi restano bordi: regola dei lati di bordo).
    P (n,3); attributi: altre matrici (n,k) da portare con le stesse regole (i pesi delle ossa).
    FT/UV: uv per angolo di faccia, interpolati dentro ogni faccia (le cuciture degli uv restano).
    Torna P2, F2 (quad), attributi2, FT2, UV2."""
    n = len(P); E, eidx, EF = lati_di(F); ne, nf = len(E), len(F)
    A = [P] + list(attributi)
    def passo(X):
        X = np.asarray(X, float)
        fp = np.array([X[f].mean(0) for f in F])                                   # punti di faccia
        bordo = np.array([len(x) == 1 for x in EF])
        ep = np.empty((ne, X.shape[1])); mid = (X[E[:, 0]] + X[E[:, 1]]) / 2
        for e in range(ne): ep[e] = mid[e] if bordo[e] else (X[E[e, 0]] + X[E[e, 1]] + fp[EF[e][0]] + fp[EF[e][1]]) / 4
        # punti di vertice
        sf = np.zeros_like(X); nfv = np.zeros(n); sm = np.zeros_like(X); nev = np.zeros(n); sb = np.zeros_like(X); nb = np.zeros(n)
        for fi, f in enumerate(F):
            for v in f: sf[v] += fp[fi]; nfv[v] += 1
        for e in range(ne):
            a, b = E[e]; sm[a] += mid[e]; sm[b] += mid[e]; nev[a] += 1; nev[b] += 1
            if bordo[e]: sb[a] += X[b]; sb[b] += X[a]; nb[a] += 1; nb[b] += 1
        vp = X.copy()
        dentro = (nb == 0) & (nfv > 0); k = nfv[dentro][:, None]
        vp[dentro] = (sf[dentro] / k + 2 * sm[dentro] / nev[dentro][:, None] + (k - 3) * X[dentro]) / k
        orlo = nb == 2; vp[orlo] = 0.75 * X[orlo] + 0.125 * sb[orlo]
        return np.vstack([vp, ep, fp])
    out = [passo(X) for X in A]
    F2, FT2, UV2 = [], [], ([] if UV is not None else None)
    for fi, f in enumerate(F):
        m = len(f); es = [eidx[(f[j], f[(j + 1) % m]) if f[j] < f[(j + 1) % m] else (f[(j + 1) % m], f[j])] for j in range(m)]
        if UV is not None:
            c = [UV[t] for t in FT[fi]]; cf = np.mean(c, 0); b = len(UV2)
            UV2 += c + [(c[j] + c[(j + 1) % m]) / 2 for j in range(m)] + [cf]
        for j in range(m):
            F2.append([f[j], n + es[j], n + ne + fi, n + es[j - 1]])
            if UV is not None: FT2.append([b + j, b + m + j, b + 2 * m, b + m + (j - 1) % m])
    return out[0], F2, out[1:], (FT2 if UV is not None else None), (np.array(UV2) if UV is not None else None)

def componenti(nv, F):
    par = list(range(nv))
    def trova(a):
        while par[a] != a: par[a] = par[par[a]]; a = par[a]
        return a
    for f in F:
        r = trova(f[0])
        for v in f[1:]:
            q = trova(v)
            if q != r: par[q] = r
    return np.array([trova(i) for i in range(nv)])

def giri_di_bordo(F):
    """i giri di lati con una faccia sola: lista di liste di vertici in ordine"""
    E, eidx, EF = lati_di(F); succ = {}
    for fi, f in enumerate(F):
        m = len(f)
        for j in range(m):
            a, b = f[j], f[(j + 1) % m]; k = (a, b) if a < b else (b, a)
            if len(EF[eidx[k]]) == 1: succ[a] = b
    giri, visti = [], set()
    for a0 in list(succ):
        if a0 in visti: continue
        g, a = [], a0
        while a not in visti and a in succ: visti.add(a); g.append(a); a = succ[a]
        giri.append(g)
    return giri
