# ossa7.py: lo scheletro ridotto dei sette (le ossa di MakeHuman raggruppate come in cast/sets/corpi/converti_corpo.py) e i pesi delle ossa
# per ogni vertice del corpo hm08. Lo usano converti_teste.py (i busti, con i pesi: così la testa segue il collo e il petto) e corpi_sette.py
# (corpo, vestiti, scarpe). Le pose le fa sets/corpi7.js con queste stesse ossa.
import numpy as np

def riduci(nome):
    lato = 'S' if nome.endswith('.L') else 'D' if nome.endswith('.R') else ''; b = nome[:-2] if lato else nome
    if b in ('root', 'pelvis'): return 'bacino'
    if b.startswith('spine'): return 'spina' + b[-1]
    if b == 'breast': return 'spina2'
    if b.startswith('neck'): return 'collo' + b[-1]
    t = {'clavicle': 'clav', 'shoulder01': 'spalla', 'upperarm01': 'brac1', 'upperarm02': 'brac2', 'lowerarm01': 'ava1', 'lowerarm02': 'ava2', 'wrist': 'mano',
         'upperleg01': 'coscia1', 'upperleg02': 'coscia2', 'lowerleg01': 'gamba1', 'lowerleg02': 'gamba2', 'foot': 'piede'}
    if b in t: return t[b] + lato
    if b.startswith(('metacarpal', 'finger')): return 'mano' + lato
    if b.startswith('toe'): return 'piede' + lato
    return 'testa'

CENTRO = ['bacino', 'spina5', 'spina4', 'spina3', 'spina2', 'spina1', 'collo1', 'collo2', 'collo3', 'testa']
LATO = ['clav', 'spalla25', 'spalla', 'spalla75', 'brac1', 'brac2', 'ava1', 'ava2', 'mano', 'coscia1', 'coscia2', 'gamba1', 'gamba2', 'piede']
OSSA = CENTRO + [b + s for s in 'DS' for b in LATO]; KO = {n: i for i, n in enumerate(OSSA)}
# il padre di ogni osso ridotto (le tre tappe della spalla e il braccio sono figli della clavicola)
PADRE = {'bacino': None, 'spina5': 'bacino', 'spina4': 'spina5', 'spina3': 'spina4', 'spina2': 'spina3', 'spina1': 'spina2', 'collo1': 'spina1', 'collo2': 'collo1', 'collo3': 'collo2', 'testa': 'collo3'}
for s in 'DS':
    PADRE.update({'clav' + s: 'spina1', 'spalla25' + s: 'clav' + s, 'spalla' + s: 'clav' + s, 'spalla75' + s: 'clav' + s, 'brac1' + s: 'clav' + s, 'brac2' + s: 'brac1' + s,
                  'ava1' + s: 'brac2' + s, 'ava2' + s: 'ava1' + s, 'mano' + s: 'ava2' + s, 'coscia1' + s: 'bacino', 'coscia2' + s: 'coscia1' + s, 'gamba1' + s: 'coscia2' + s,
                  'gamba2' + s: 'gamba1' + s, 'piede' + s: 'gamba2' + s})
# l'osso di MakeHuman che dà la posizione (testa dell'osso) a ogni osso ridotto
ORIGINE = {'bacino': 'spine05', 'spina5': 'spine05', 'spina4': 'spine04', 'spina3': 'spine03', 'spina2': 'spine02', 'spina1': 'spine01', 'collo1': 'neck01', 'collo2': 'neck02', 'collo3': 'neck03', 'testa': 'head',
           'clav': 'clavicle', 'spalla': 'upperarm01', 'spalla25': 'upperarm01', 'spalla75': 'upperarm01', 'brac1': 'upperarm01', 'brac2': 'upperarm02', 'ava1': 'lowerarm01', 'ava2': 'lowerarm02', 'mano': 'wrist',
           'coscia1': 'upperleg01', 'coscia2': 'upperleg02', 'gamba1': 'lowerleg01', 'gamba2': 'lowerleg02', 'piede': 'foot'}

def catena_spalla(W, stringi=1.8):
    """Tra il busto (fermo) e il braccio la sfumatura dei pesi passa per tre ossa intermedie che fanno un quarto, metà e tre quarti della
    rotazione del braccio (come in converti_corpo.py: senza, col braccio in avanti la spalla si accartoccia)."""
    W = W.copy()
    for s in 'DS':
        bracci = [KO[x + s] for x in ('brac1', 'brac2', 'ava1', 'ava2', 'mano')]; ks = KO['spalla' + s]; tappe = [KO['spalla25' + s], ks, KO['spalla75' + s]]
        a = W[:, bracci].sum(1); sp = W[:, ks].copy(); fi = np.clip(a + 0.5 * sp, 0, 1); q = np.where((fi > 1e-4) & (fi < 1 - 1e-4) | (sp > 1e-4))[0]
        if not len(q): continue
        f = fi[q] ** stringi; k = np.minimum((f * 4).astype(int), 3); u = f * 4 - k
        resto = W[q].copy(); resto[:, bracci + [ks]] = 0; tr = resto.sum(1, keepdims=True); br = W[q][:, bracci]; ta = br.sum(1, keepdims=True)
        w0 = np.where(k == 0, 1 - u, 0.0); w4 = np.where(k == 3, u, 0.0); nuovo = resto / np.maximum(tr, 1e-9) * w0[:, None]
        senza_busto = (tr[:, 0] < 1e-6) & (w0 > 0)
        nuovo[:, bracci] = br / np.maximum(ta, 1e-9) * w4[:, None]
        for j, kt in enumerate(tappe): nuovo[:, kt] = np.where(k == j, u, 0.0) + np.where(k == j + 1, 1 - u, 0.0)
        nuovo[senza_busto, tappe[0]] += w0[senza_busto]; W[q] = nuovo / nuovo.sum(1, keepdims=True)
    return W

def pesi_ridotti(PESI, nv):
    """PESI: osso di MakeHuman -> pesi (nv,). Torna (nv, len(OSSA)) normalizzati, con la spalla a tappe"""
    W = np.zeros((nv, len(OSSA)))
    for osso, w in PESI.items(): W[:, KO[riduci(osso)]] += w
    s = W.sum(1, keepdims=True); W = np.where(s > 0, W / np.maximum(s, 1e-12), 0); W[s[:, 0] == 0, KO['bacino']] = 1
    return catena_spalla(W)

def quattro(W):
    """i 4 pesi più grandi per vertice, rinormalizzati -> indici (n,4) uint8, pesi (n,4) uint8 con somma 255"""
    W = np.clip(W, 0, None); ji = np.argsort(-W, axis=1)[:, :4]; jw = np.take_along_axis(W, ji, 1); s = jw.sum(1, keepdims=True); s[s == 0] = 1; jw = jw / s
    q = np.floor(jw * 255 + 0.5).astype(int); q[:, 0] += 255 - q.sum(1); return ji.astype(np.uint8), np.clip(q, 0, 255).astype(np.uint8)

def giunti(H, GRUPPI, RIG, capo, giunto, T):
    """le teste delle ossa ridotte (e qualche punto utile) nella posa di riposo, trasformate con T"""
    out = {}
    for rid in CENTRO: out[rid] = T(capo(H, GRUPPI, RIG[ORIGINE[rid]]['head'])).tolist()
    out['testa2'] = T(capo(H, GRUPPI, RIG['head']['tail'])).tolist()
    for s, sx in (('D', '.R'), ('S', '.L')):
        for rid in LATO: out[rid + s] = T(capo(H, GRUPPI, RIG[ORIGINE[rid] + sx]['head'])).tolist()
        l = 'l' if s == 'S' else 'r'
        for k, g in (('nocca2', f'joint-{l}-finger-2-1'), ('nocca3', f'joint-{l}-finger-3-1'), ('nocca5', f'joint-{l}-finger-5-1'), ('punta3', f'joint-{l}-finger-3-4'),
                     ('pollice', f'joint-{l}-finger-1-3'), ('pianta', f'joint-{l}-foot-1'), ('punta', f'joint-{l}-foot-2')):
            try: out[k + s] = T(giunto(H, GRUPPI, g)).tolist()
            except KeyError: pass
    return out
