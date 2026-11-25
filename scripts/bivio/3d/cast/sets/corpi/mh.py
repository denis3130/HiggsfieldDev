# mh.py: lettura dei dati MakeHuman (corpo hm08 e scheletro da MPFB2, CC0; vestiti ufficiali nel formato JSON di three.js) per converti_corpo.py
import json, gzip, os
import numpy as np

def carica_base(obj):
    """base.obj -> V (n,3) in decimetri, facce quad (m,4), indici uv (m,4), UV (k,2), gruppo di ogni faccia."""
    V, UV, F, FT, G, nomi, cur = [], [], [], [], [], {}, 0
    for l in open(obj):
        p = l.split()
        if not p: continue
        if p[0] == 'v': V.append([float(x) for x in p[1:4]])
        elif p[0] == 'vt': UV.append([float(p[1]), float(p[2])])
        elif p[0] == 'g': cur = nomi.setdefault(p[1], len(nomi))
        elif p[0] == 'f':
            a = [q.split('/') for q in p[1:5]]
            F.append([int(q[0]) - 1 for q in a]); FT.append([int(q[1]) - 1 for q in a]); G.append(cur)
    return np.array(V), np.array(F), np.array(FT), np.array(UV), np.array(G), {v: k for k, v in nomi.items()}

def carica_gruppi(path):
    """gruppi di vertici: nome -> indici (gli intervalli nel file sono chiusi)"""
    return {k: np.concatenate([np.arange(a, b + 1) for a, b in v]) for k, v in json.load(open(path)).items()}

def target(path, n):
    """file .target(.gz): righe «indice dx dy dz» -> spostamenti (n,3)"""
    D = np.zeros((n, 3)); raw = gzip.open(path, 'rt').read() if path.endswith('.gz') else open(path).read()
    for l in raw.splitlines():
        p = l.split()
        if len(p) == 4: D[int(p[0])] = [float(p[1]), float(p[2]), float(p[3])]
    return D

def forma(V0, mpfb, ricetta):
    """ricetta: { 'macrodetails/caucasian-male-young': 1.0, ... } (senza .target.gz)"""
    V = V0.copy()
    for nome, k in ricetta.items():
        if k: V += k * target(os.path.join(mpfb, 'targets', nome + '.target.gz'), len(V0))
    return V

def pesi(path, n):
    """pesi dello scheletro: nome osso -> vettore denso (n,)"""
    W = {}
    for osso, lista in json.load(open(path))['weights'].items():
        w = np.zeros(n); a = np.array(lista)
        if len(a): w[a[:, 0].astype(int)] = a[:, 1]
        W[osso] = w
    return W

def giunto(V, gruppi, nome): return V[gruppi[nome]].mean(0)

def capo(V, gruppi, d):
    """estremo di un osso dello scheletro MPFB2 (strategie CUBE, VERTEX, MEAN)"""
    s = d['strategy']
    if s == 'CUBE': return V[gruppi[d['cube_name']]].mean(0)
    if s == 'VERTEX': return V[d['vertex_index']]
    if s == 'MEAN': return V[d['vertex_indices']].mean(0)
    raise ValueError(s)

def vestito(path):
    """JSON three.js (formato 3) di un vestito: vertici, facce quad/tri con gli uv per angolo, legami col corpo (ref, pesi, scarti), vertici del corpo da nascondere"""
    d = json.load(open(path)); P = np.array(d['vertices']).reshape(-1, 3); uv = np.array(d['uvs'][0]).reshape(-1, 2) if d['uvs'] and d['uvs'][0] else np.zeros((0, 2))
    f = d['faces']; i = 0; Q, QT = [], []
    while i < len(f):
        t = f[i]; i += 1; n = 4 if t & 1 else 3; v = f[i:i + n]; i += n
        if t & 2: i += 1
        if t & 4: i += 1
        vt = None
        if t & 8: vt = f[i:i + n]; i += n
        if t & 16: i += 1
        if t & 32: i += n
        if t & 64: i += 1
        if t & 128: i += n
        Q.append(v); QT.append(vt or [0] * n)
    m = d['metadata']
    return dict(P=P, UV=uv, F=Q, FT=QT, ref=np.array(d['ref_vIdxs']), w=np.array(d['weights']), off=np.array(d['offsets']), nascondi=np.array(m.get('deleteVerts', []), bool),
                materiali=d.get('materials', []), z=m.get('z_depth', 50), nome=m.get('name'), licenza=m.get('license'))
