# converti_corpo.py <mpfb2> <vestiti> <uscita> [personaggio ...]
# Dal corpo umano MakeHuman (maglia hm08, forme e scheletro presi dai dati MPFB2: CC0) e dai vestiti e dalle scarpe ufficiali di
# MakeHuman (CC0) ai dati che legge corpo_mesh.js: per ogni personaggio un .json (parti, ossa, giunti) e un .bin (numeri).
#   <mpfb2>   = cartella anny/data/mpfb2 del pacchetto Python «anny» (pip download anny)
#   <vestiti> = cartella package/public/data/proxies/clothes del pacchetto npm «makehuman-data»
# I vestiti sono legati al corpo (ogni vertice a tre vertici del corpo, più uno scarto): seguono la forma del corpo e ne ereditano i pesi delle ossa.
# Unità in uscita: metri, y in su, z = davanti, piedi (suola) a y = 0; il corpo è nella posa di riposo di MakeHuman (braccia aperte in basso).
import sys, os, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mh, maglia, pittura

MP, CL, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
TEX = os.path.join(OUT, 'tex'); DIMS = {'male_elegantsuit01': 2048}        # lato delle texture dipinte (le altre 1024)

# ---- i personaggi: forma del corpo (bersagli di MakeHuman), vestiti, scarpe, quanto lisciare
PERSONAGGI = {
    'testimone': dict(forma={'macrodetails/caucasian-male-young': 1.0}, vestiti=['male_casualsuit06'], scarpe='shoes05', livelli={'pelle': 2, 'vestito': 1, 'scarpa': 1},
                      colori=dict(maglia='#A9ADB3', magliaDk='#8B8F96', jeans='#2C3654', scarpaChiaro='#D5D7DC', scarpaScuro='#3B3E47', calza='#8A8D96')),
    'ispettore': dict(forma={'macrodetails/caucasian-male-young': 0.55, 'macrodetails/caucasian-male-old': 0.45,
                             'macrodetails/universal-male-young-averagemuscle-maxweight': 0.12, 'macrodetails/universal-male-old-averagemuscle-maxweight': 0.1},
                      vestiti=['male_elegantsuit01'], scarpe='shoes03', livelli={'pelle': 2, 'vestito': 0, 'scarpa': 1}, cappotto=dict(lungo=3.9, anelli=14),   # il completo NON si liscia: lisciando, la camicia buca i risvolti
                      colori=dict(giacca='#30323A', pantaloni='#22242B', camicia='#B9C2CC', cravatta='#141519', scarpaChiaro='#3A3B42', scarpaScuro='#0E0E11', calza='#1B1C21')),
}

# ---- le ossa ridotte: quelle di MakeHuman raggruppate (D = destra anatomica, x < 0; S = sinistra, x > 0)
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
LATO = ['clav', 'spalla', 'brac1', 'brac2', 'ava1', 'ava2', 'mano', 'coscia1', 'coscia2', 'gamba1', 'gamba2', 'piede']
OSSA = CENTRO + [b + s for s in 'DS' for b in LATO]; KO = {n: i for i, n in enumerate(OSSA)}
# l'osso di MakeHuman che dà la posizione (testa dell'osso) a ogni osso ridotto
ORIGINE = {'bacino': 'spine05', 'spina5': 'spine05', 'spina4': 'spine04', 'spina3': 'spine03', 'spina2': 'spine02', 'spina1': 'spine01', 'collo1': 'neck01', 'collo2': 'neck02', 'collo3': 'neck03', 'testa': 'head',
           'clav': 'clavicle', 'spalla': 'shoulder01', 'brac1': 'upperarm01', 'brac2': 'upperarm02', 'ava1': 'lowerarm01', 'ava2': 'lowerarm02', 'mano': 'wrist',
           'coscia1': 'upperleg01', 'coscia2': 'upperleg02', 'gamba1': 'lowerleg01', 'gamba2': 'lowerleg02', 'piede': 'foot'}

print('leggo il corpo…', flush=True)
V0, F0, FT0, UV0, G0, NOMI_G = mh.carica_base(os.path.join(MP, '3dobjs', 'base.obj')); NV0 = len(V0)
GRUPPI = mh.carica_gruppi(os.path.join(MP, 'mesh_metadata', 'basemesh_vertex_groups.json'))
RIG = json.load(open(os.path.join(MP, 'rigs', 'standard', 'rig.default.json')))
PESI_MH = mh.pesi(os.path.join(MP, 'rigs', 'standard', 'weights.default.json'), NV0)
WB = np.zeros((NV0, len(OSSA)))
for osso, w in PESI_MH.items(): WB[:, KO[riduci(osso)]] += w
ID_BODY = [k for k, v in NOMI_G.items() if v == 'body'][0]

def quattro(W):
    """i 4 pesi più grandi per vertice, rinormalizzati -> indici (n,4) uint8, pesi (n,4) uint8 con somma 255"""
    W = np.clip(W, 0, None); ji = np.argsort(-W, axis=1)[:, :4]; jw = np.take_along_axis(W, ji, 1); s = jw.sum(1, keepdims=True); s[s == 0] = 1; jw = jw / s
    q = np.floor(jw * 255 + 0.5).astype(int); q[:, 0] += 255 - q.sum(1); return ji.astype(np.uint8), np.clip(q, 0, 255).astype(np.uint8)

def liscia(P, F, W, FT, UV, livelli):
    for _ in range(livelli): P, F, (W,), FT, UV = maglia.catmull_clark(P, F, (W,), FT, UV)
    return P, F, W, FT, UV

QUADRI = {}                                                       # nome della tinta -> posto nella texture (quadratini in basso a destra, fuori dalle isole)
def tinta(c, nome):
    """un uv nuovo che cade su un quadratino a tinta unita (lo dipinge dipingi): per le facce tutte di un colore (falda del cappotto, cravatta)"""
    t = c.setdefault('tinte', {})
    if nome not in t:
        c['UV'] = np.vstack([c['UV'], [0.0, 0.0]]); t[nome] = len(c['UV']) - 1                 # il posto vero lo sceglie dipingi (un quadratino libero)
    return t[nome]

def cappotto(c, H, lungo=3.9, anelli=9, gioco=0.2, svasa=0.06):
    """La giacca del completo diventa un CAPPOTTO: dal suo orlo (gli stessi vertici) scende una falda fino al ginocchio, che gira attorno alle gambe
    con un po' di gioco; lo spacco dietro continua fino in fondo, l'incavo davanti si chiude. Una superficie sola con la giacca."""
    from scipy.spatial import cKDTree
    P, F, W = c['Pf'], c['F'], c['W']; comp = maglia.componenti(len(P), F); g = max(maglia.giri_di_bordo(F), key=len); n = len(g)
    c['orlo'] = set((min(a_, b_), max(a_, b_)) for a_, b_ in zip(g, g[1:] + g[:1]))            # i lati del vecchio orlo della giacca: lì il disegno dell'orlo va tolto
    y = P[g, 1]; basso = y < y.min() + 0.25; i0 = next(i for i in range(n) if basso[i] and not basso[i - 1]); g = g[i0:] + g[:i0]; basso = np.roll(basso, -i0)
    tratti, cur = [], []
    for i in range(n):
        if basso[i]: cur.append(i)
        elif cur: tratti.append(cur); cur = []
    if cur: tratti.append(cur)
    assert len(tratti) == 2, [len(t) for t in tratti]
    buco1 = list(range(tratti[0][-1] + 1, tratti[1][0])); davanti = P[[g[i] for i in buco1], 2].mean() > 0
    A, B = (tratti[0], tratti[1]) if davanti else (tratti[1], tratti[0]); incavo = buco1 if davanti else list(range(tratti[1][-1] + 1, n))
    linea = [g[i] for i in A] + [g[i] for i in B]; m = len(linea)
    uv0 = tinta(c, 'giacca')
    # l'incavo davanti: un ventaglio di triangoli dal suo vertice più alto
    poli = [g[A[-1]]] + [g[i] for i in incavo] + [g[B[0]]]; cima = max(poli, key=lambda v: P[v, 1]); F = list(F); FT = list(c['FT'])
    for p_, q_ in zip(poli, poli[1:]):
        if cima not in (p_, q_): F.append([q_, p_, cima]); FT.append([uv0, uv0, uv0])
    # gli anelli della falda. La falda si disegna con le gambe DRITTE (in piedi), non nella posa di riposo a gambe larghe: scende dall'orlo quasi
    # dritta, appena svasata, col gioco che serve attorno alle cosce; poi ogni punto si riporta nella posa di riposo (il contrario di come lo
    # muoveranno le ossa), così in piedi il cappotto cade come è stato disegnato.
    nb = W.shape[1]; MS = np.tile(np.eye(4), (nb, 1, 1))
    for sx, s_ in (('.R', 'D'), ('.L', 'S')):
        Jh = mh.capo(H, GRUPPI, RIG['upperleg01' + sx]['head']); Jk = mh.capo(H, GRUPPI, RIG['lowerleg01' + sx]['head']); a_ = (Jk - Jh) / np.linalg.norm(Jk - Jh); b_ = np.array([0.0, -1.0, 0.0])
        v_ = np.cross(a_, b_); cs = float(a_ @ b_); vx = np.array([[0, -v_[2], v_[1]], [v_[2], 0, -v_[0]], [-v_[1], v_[0], 0]]); R = np.eye(3) + vx + vx @ vx / (1 + cs); T4 = np.eye(4); T4[:3, :3] = R; T4[:3, 3] = Jh - R @ Jh
        for b in ('coscia1', 'coscia2', 'gamba1', 'gamba2', 'piede'): MS[KO[b + s_]] = T4
    def inpiedi(X, Wx): A = np.einsum('vb,bij->vij', Wx, MS); return np.einsum('vij,vj->vi', A[:, :3, :3], X) + A[:, :3, 3], A
    altri = comp != comp[linea[0]]; gambe, _ = inpiedi(P[altri], W[altri]); Wg = W[altri]; albero = cKDTree(gambe); sm = lambda x: (lambda t: t * t * (3 - 2 * t))(np.clip(x, 0, 1))
    orlo, _ = inpiedi(P[linea], W[linea]); cen = np.array([0.0, orlo[:, 2].mean()]); bac = np.zeros(nb); bac[KO['bacino']] = 1; nuovi, pesi, idx = [], [], [linea]; passo = lungo / anelli; y0 = orlo[:, 1].mean()
    xz0 = orlo[:, [0, 2]] - cen; s0 = np.linalg.norm(xz0, axis=1); dd = xz0 / s0[:, None]
    for r in range(1, anelli + 1):
        yr = orlo[:, 1] + (y0 - orlo[:, 1]) * sm(r / 4) - passo * r; s_r = s0 * (1 + svasa * r / anelli)
        fetta = gambe[np.abs(gambe[:, 1] - (y0 - passo * r)) < 0.5][:, [0, 2]] - cen; h = (fetta @ dd.T).max(0) + gioco if len(fetta) else s_r
        s2 = np.maximum(s_r, h * sm(r / 4) + s_r * (1 - sm(r / 4)))
        for _ in range(3): s2 = np.maximum(np.convolve(np.pad(s2, 1, mode='edge'), [0.25, 0.5, 0.25], mode='valid'), s_r)
        pr = np.column_stack([cen[0] + dd[:, 0] * s2, yr, cen[1] + dd[:, 1] * s2])
        dist, vic = albero.query(pr, k=24); pw = 1 / (dist + 0.3); wl = (Wg[vic] * pw[:, :, None]).sum(1) / pw.sum(1, keepdims=True)
        wl = 0.75 * wl + 0.25 * bac; t = sm(r / 3.5); wr = W[linea] * (1 - t) + wl * t
        for _ in range(8): wr = np.apply_along_axis(lambda a: np.convolve(np.pad(a, 1, mode='edge'), [0.25, 0.5, 0.25], mode='valid'), 0, wr)
        wr = wr / wr.sum(1, keepdims=True); A = np.einsum('vb,bij->vij', wr, MS); riposo = np.linalg.solve(A[:, :3, :3], (pr - A[:, :3, 3])[:, :, None])[:, :, 0]
        base = len(P) + len(nuovi) * m; nuovi.append(riposo); pesi.append(wr); idx.append(list(range(base, base + m)))
    for r in range(anelli):
        for i in range(m - 1): F.append([idx[r][i + 1], idx[r][i], idx[r + 1][i], idx[r + 1][i + 1]]); FT.append([uv0] * 4)
    c['Pf'] = np.vstack([P] + nuovi); c['W'] = np.vstack([W] + pesi); c['F'] = F; c['FT'] = FT
    print(f'  cappotto: falda di {anelli} anelli da {m} punti, {lungo / 10:.2f} m sotto la giacca', flush=True)

def dipingi(nome, o, c):
    """la texture del capo ridipinta coi colori del personaggio -> tex/<personaggio>_<capo>.png (e, se c'è, la mappa delle pieghe)"""
    P = pittura; col = {k: P.rgb(v) for k, v in o['colori'].items()}; f = c['file']; cart = os.path.join(CL, f, 'textures'); DIM = DIMS.get(f, 1024)
    comp = maglia.componenti(len(c['Pf']), c['F']); isl = P.isole(c, comp, DIM); ids = sorted(isl, key=lambda k: -c['Pf'][comp == k][:, 1].mean())   # dall'alto in basso
    img, alfa = P.carica(os.path.join(cart, f + '_diffuse.png'), DIM); L = P.lum(img); out = np.zeros_like(img); pieno = np.zeros((DIM, DIM), bool); info = {}
    ao = P.lum(P.carica(os.path.join(cart, f + '_ao.png'), DIM)[0]) if os.path.exists(os.path.join(cart, f + '_ao.png')) else None
    if f in ('male_casualsuit04', 'male_casualsuit06'):                     # maglietta a tinta unita con colletto e orli più scuri, jeans
        m, j = isl[ids[0]], isl[ids[1]]; d = P.orli(c, DIM); orlo = P.sfoca((m & (d < 0.02 * DIM)).astype(float), 1.5) * 0.9 + 0.5 * P.sfoca((m & (np.abs(d - 0.021 * DIM) < 1.5)).astype(float), 1.0)
        orlo = np.clip(orlo, 0, 1); k = (0.5 + 0.5 * ao) if ao is not None else 1.0
        out[m] = ((col['maglia'][None, None, :] * (1 - orlo[..., None]) + col['magliaDk'][None, None, :] * orlo[..., None]) * (k[..., None] if ao is not None else 1))[m]
        out[j] = P.tessuto(L, j, col['jeans'], forza=1.7, sfum=0.3, ao=ao)[j]; pieno = m | j
    elif f.startswith('shoes'):                                             # scarpe: i toni dell'originale tra lo scuro e il chiaro del personaggio; calze a tinta unita
        scarpe = [k for k in ids if (comp == k).sum() > 300]; calze = [k for k in ids if (comp == k).sum() <= 300]
        t = P.sm(0.06, 0.72, P.sfoca(L, 0.8))[..., None]; tono = col['scarpaScuro'][None, None, :] * (1 - t) + col['scarpaChiaro'][None, None, :] * t
        for k in scarpe: out[isl[k]] = tono[isl[k]]; pieno |= isl[k]
        for k in calze: out[isl[k]] = (col['calza'][None, None, :] * (1 + 1.2 * np.clip(P.dettaglio(L, 1.0, 6), -0.1, 0.1))[..., None])[isl[k]]; pieno |= isl[k]
    elif f == 'male_elegantsuit01':                                         # completo: giacca (cappotto) e pantaloni scuri, camicia chiara, cravatta scura, bottoni
        pant = ids[1]; giacca = P.tessuto(L, isl[ids[0]], col['giacca'], forza=2.6, sfum=0.0)
        if c.get('orlo'):                                                   # col cappotto l'orlo della giacca non esiste più: vicino a dove stava, la stoffa è a tinta unita
            im = P.Image.new('L', (DIM, DIM), 0); dis = P.ImageDraw.Draw(im)
            for fa, ft in zip(c['F'], c['FT']):
                nfa = len(fa)
                for jj in range(nfa):
                    if (min(fa[jj], fa[(jj + 1) % nfa]), max(fa[jj], fa[(jj + 1) % nfa])) in c['orlo'] and ft[jj] < len(c['UV']) and c['UV'][ft[jj]].any():
                        dis.line([(float(c['UV'][ft[jj]][0]) * DIM, (1 - float(c['UV'][ft[jj]][1])) * DIM), (float(c['UV'][ft[(jj + 1) % nfa]][0]) * DIM, (1 - float(c['UV'][ft[(jj + 1) % nfa]][1])) * DIM)], fill=255, width=3)
            w = (1 - P.sm(0.02 * DIM, 0.05 * DIM, P.ndi.distance_transform_edt(np.array(im) == 0)))[..., None]; giacca = giacca * (1 - w) + col['giacca'][None, None, :] * w
        dummy = 0; calz = P.tessuto(L, isl[pant], col['pantaloni'], forza=2.6, sfum=0.3)      # giacca senza sfumature larghe: deve avere lo stesso tono della falda
        cam = col['camicia'][None, None, :] * (1 + 0.9 * np.clip(P.dettaglio(L, 1.0, 8), -0.18, 0.08))[..., None]
        for q in P.isole_uv(c, DIM):
            m = q['maschera']; pieno |= m
            if comp[q['vertici'][0]] == pant: out[m] = calz[m]
            elif L[m].mean() > 0.35:                                        # camicia (davanti, colletto, polsini); la cravatta è la parte a righe blu
                out[m] = cam[m]; blu = (img[..., 2] - img[..., 0]) > 0.03
                if (blu & m).sum() > 200:                                    # la cravatta è DIPINTA sul davanti della camicia: la sua forma è quella delle righe blu, chiuse e lisciate
                    cr = P.ndi.binary_fill_holes(P.ndi.binary_closing(blu & m, P.ndi.generate_binary_structure(2, 1), iterations=int(0.012 * DIM)))
                    cr = P.sm(0.42, 0.58, P.sfoca(cr.astype(float), 0.005 * DIM))[..., None]
                    out[m] = (out * (1 - cr) + col['cravatta'][None, None, :] * cr)[m]
            elif len(q['facce']) < 45: out[m] = col['giacca'] * 0.45                       # bottoni
            else: out[m] = giacca[m]
    else: out, pieno = img, np.ones((DIM, DIM), bool)
    out = P.riempi(out, pieno)
    occupato = P.ndi.binary_dilation(pieno, iterations=6)
    for nt, iu in c.get('tinte', {}).items():                                # un quadratino libero (fuori dalle isole) per ogni tinta
        x, y = next((x, y) for y in range(DIM - 48, 0, -24) for x in range(DIM - 48, 0, -24) if not occupato[y:y + 40, x:x + 40].any())
        out[y:y + 40, x:x + 40] = col[nt]; occupato[y:y + 40, x:x + 40] = True; c['UV'][iu] = [(x + 20) / DIM, 1 - (y + 20) / DIM]
    os.makedirs(TEX, exist_ok=True); file = f'{nome}_{f}.png'; P.salva(out, os.path.join(TEX, file)); info['texture'] = file
    nrm = os.path.join(cart, f + '_normal.png')
    if os.path.exists(nrm): P.Image.open(nrm).convert('RGB').save(os.path.join(TEX, f + '_normal.png')); info['pieghe'] = f + '_normal.png'
    return info

def costruisci(nome, o):
    print('==', nome, flush=True)
    H = mh.forma(V0, MP, o['forma'])                                                   # il corpo con la sua forma (decimetri)
    capi = [mh.vestito(os.path.join(CL, n, n + '.json')) for n in o['vestiti'] + [o['scarpe']]]
    for c, n in zip(capi, o['vestiti'] + [o['scarpe']]):
        c['file'] = n; c['tipo'] = 'scarpa' if n == o['scarpe'] else 'vestito'
        c['Pf'] = (H[c['ref']] * c['w'][:, :, None]).sum(1) + c['off']                 # il capo sul corpo di questo personaggio
        c['W'] = np.clip((WB[c['ref']] * c['w'][:, :, None]).sum(1), 0, None); c['W'] /= c['W'].sum(1, keepdims=True)
    if o.get('cappotto'): cappotto(capi[0], H, **o['cappotto'])
    suolo = min(c['Pf'][:, 1].min() for c in capi if c['tipo'] == 'scarpa')
    T = lambda X: (np.asarray(X) - [0, suolo, 0]) * 0.1                                # decimetri -> metri, suola a terra
    # ---- la pelle: le facce del corpo non coperte dai vestiti, senza testa e senza mani
    nasc = np.zeros(NV0, bool)
    for c in capi: nasc[:len(c['nascondi'])] |= c['nascondi']
    # la pelle continua per qualche centimetro sotto i vestiti (collo sotto il colletto, braccio sotto la manica): niente buchi ai bordi
    corpo = GRUPPI['body']; vis = corpo[~nasc[corpo]]; nas = corpo[nasc[corpo]]
    if len(vis) and len(nas):
        from scipy.spatial import cKDTree
        d, _ = cKDTree(H[vis]).query(H[nas]); r = o.get('sotto', 0.45); sotto = nas[d < r]; nasc[sotto] = False
        # ...ma un filo più in dentro (fino a 3 mm), così non buca mai il vestito
        N = np.zeros_like(H)
        for f in F0[G0 == ID_BODY]:
            n = np.cross(H[f[1]] - H[f[0]], H[f[3]] - H[f[0]])
            for v in f: N[v] += n
        N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
        H = H.copy(); H[sotto] -= N[sotto] * (0.03 * np.clip(d[d < r] / 0.2, 0, 1))[:, None]
    via = nasc.copy()
    # della testa resta solo la parte bassa (mento e mascella, fino a un piano sopra il giunto della testa): corpo_mesh.js la infila dentro la
    # testa disegnata e toglie quel che ci finisce dentro. I polsi finiscono con un taglio piano
    # a 3,5 cm dal giunto del polso, lungo l'avambraccio (da lì la pelle la continua il raccordo con la mano modellata)
    lungo = lambda a, b: (H - b) @ ((b - a) / np.linalg.norm(b - a))                      # quanto ogni vertice sta oltre b, lungo a -> b (decimetri)
    J = lambda n: mh.capo(H, GRUPPI, RIG[n]['head'])
    collo = WB[:, [KO['collo1'], KO['collo2'], KO['collo3'], KO['testa']]].sum(1) > 0.5
    via |= collo & (lungo(J('neck01'), J('head')) > o.get('taglio_collo', 0.0))
    for sx, s in (('.R', 'D'), ('.L', 'S')):
        braccio = WB[:, [KO['ava1' + s], KO['ava2' + s], KO['mano' + s]]].sum(1) > 0.5
        via |= braccio & (lungo(J('lowerarm01' + sx), J('wrist' + sx)) > -o.get('taglio_polso', 0.35))
    tieni = (G0 == ID_BODY) & ~via[F0].any(1)
    usati = np.unique(F0[tieni]); nuovo = -np.ones(NV0, int); nuovo[usati] = np.arange(len(usati))
    parti = [dict(nome='pelle', tipo='pelle', P=H[usati], F=[list(nuovo[f]) for f in F0[tieni]], W=WB[usati], FT=None, UV=None, file=None)]
    for c in capi: tex = dipingi(nome, o, c); parti.append(dict(nome=c['file'], tipo=c['tipo'], P=c['Pf'], F=c['F'], W=c['W'], FT=c['FT'], UV=c['UV'], file=c['file'], tex=tex))
    # ---- lisciatura, vertici di disegno (posizione + uv), triangoli
    POS, UVS, RV, IDX, JI, JW, meta = [], [], [], [], [], [], []; np0 = nr0 = ni0 = 0
    for p in parti:
        P, F, W, FT, UV = liscia(p['P'], p['F'], p['W'], p['FT'], p['UV'], o['livelli'][p['tipo']])
        comp = maglia.componenti(len(P), F)
        if UV is None: rv = np.arange(len(P)); uv = np.zeros((len(P), 2)); FR = [list(f) for f in F]
        else:
            chiave = {}; rv, uv, FR = [], [], []
            for f, ft in zip(F, FT):
                q = []
                for v, t in zip(f, ft):
                    k = (v, round(float(UV[t][0]), 5), round(float(UV[t][1]), 5)); i = chiave.get(k)
                    if i is None: i = chiave[k] = len(rv); rv.append(v); uv.append(UV[t])
                    q.append(i)
                FR.append(q)
            rv, uv = np.array(rv), np.array(uv)
        tri = np.array([[f[0], f[j], f[j + 1]] for f in FR for j in range(1, len(f) - 1)])
        ji, jw = quattro(W)
        giri = [[int(x) for x in g] for g in maglia.giri_di_bordo(F)]
        meta.append(dict(nome=p['nome'], tipo=p['tipo'], p0=np0, np=len(P), r0=nr0, nr=len(rv), i0=ni0, ni=tri.size, bordi=giri, **(p.get('tex') or {})))
        POS.append(T(P)); UVS.append(uv); RV.append(rv + np0); IDX.append(tri + nr0); JI.append(ji); JW.append(jw)
        print(f"  {p['nome']:20s} punti {len(P):6d} vertici {len(rv):6d} triangoli {len(tri):6d} bordi {[len(g) for g in giri]}", flush=True)
        np0 += len(P); nr0 += len(rv); ni0 += tri.size
    POS, UVS, RV, IDX, JI, JW = np.vstack(POS), np.vstack(UVS), np.concatenate(RV), np.concatenate(IDX).ravel(), np.vstack(JI), np.vstack(JW)
    # ---- i giunti (teste delle ossa) e qualche punto utile, nella posa di riposo
    giunti = {}
    for rid in CENTRO: giunti[rid] = T(mh.capo(H, GRUPPI, RIG[ORIGINE[rid]]['head'])).tolist()
    giunti['testa2'] = T(mh.capo(H, GRUPPI, RIG['head']['tail'])).tolist()
    for s, sx in (('D', '.R'), ('S', '.L')):
        for rid in LATO: giunti[rid + s] = T(mh.capo(H, GRUPPI, RIG[ORIGINE[rid] + sx]['head'])).tolist()
        l = 'l' if s == 'S' else 'r'
        for k, g in (('nocca2', f'joint-{l}-finger-2-1'), ('nocca3', f'joint-{l}-finger-3-1'), ('nocca5', f'joint-{l}-finger-5-1'), ('mano3', f'joint-{l}-hand-3'), ('pianta', f'joint-{l}-foot-1'), ('punta', f'joint-{l}-foot-2'),
                     ('alluce', f'joint-{l}-toe-1-1')): giunti[k + s] = T(mh.giunto(H, GRUPPI, g)).tolist()
    blob = b''.join([POS.astype('<f4').tobytes(), UVS.astype('<f4').tobytes(), RV.astype('<u4').tobytes(), IDX.astype('<u4').tobytes(), JI.tobytes(), JW.tobytes()])
    open(os.path.join(OUT, nome + '.bin'), 'wb').write(blob)
    json.dump(dict(nome=nome, punti=len(POS), vertici=len(RV), indici=len(IDX), ossa=OSSA, parti=meta, giunti=giunti, altezza=float(T(H[GRUPPI['body']])[:, 1].max()),
                   ordine=['pos f4 punti*3', 'uv f4 vertici*2', 'rv u4 vertici', 'idx u4 indici', 'ji u1 punti*4', 'jw u1 punti*4']), open(os.path.join(OUT, nome + '.json'), 'w'))
    print(f'  totale punti {len(POS)} vertici {len(RV)} triangoli {len(IDX) // 3}  file {len(blob) / 1e6:.2f} MB  altezza corpo {T(H[GRUPPI["body"]])[:, 1].max():.3f} m', flush=True)

for nome in (sys.argv[4:] or PERSONAGGI): costruisci(nome, PERSONAGGI[nome])
