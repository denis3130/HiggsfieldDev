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
    'testimone': dict(forma={'macrodetails/caucasian-male-young': 1.0}, vestiti=['male_casualsuit06'], scarpe='shoes05', maniche=0.55, livelli={'pelle': 2, 'vestito': 1, 'scarpa': 1},
                      collo=dict(largo=0.84, profondo=0.81, spalle=0.3, gola=0.92), sotto_collo=0.6,      # il collo più snello sotto la testa piccola (26/11: «migliorare il collo del protagonista»)
                      colori=dict(maglia='#A9ADB3', magliaDk='#8B8F96', jeans='#2C3654', scarpaChiaro='#D5D7DC', scarpaScuro='#3B3E47', calza='#8A8D96')),
    'ispettore': dict(forma={'macrodetails/caucasian-male-young': 0.55, 'macrodetails/caucasian-male-old': 0.45,
                             'macrodetails/universal-male-young-averagemuscle-maxweight': 0.12, 'macrodetails/universal-male-old-averagemuscle-maxweight': 0.1},
                      vestiti=['male_elegantsuit01'], scarpe='shoes03', livelli={'pelle': 2, 'vestito': 0, 'scarpa': 1}, cappotto=dict(lungo=3.9, anelli=14),   # il completo NON si liscia: lisciando, la camicia buca i risvolti
                      colori=dict(giacca='#30323A', pantaloni='#22242B', camicia='#B9C2CC', cravatta='#141519', scarpaChiaro='#3A3B42', scarpaScuro='#0E0E11', calza='#1B1C21')),
    # Elena (si vede da lontano nel parcheggio): corpo di donna, cappotto rosso (lo stesso completo allungato, adattato al suo corpo), maglia scura senza cravatta
    'elena': dict(forma={'macrodetails/caucasian-female-young': 1.0}, vestiti=['male_elegantsuit01'], scarpe='shoes03', livelli={'pelle': 1, 'vestito': 0, 'scarpa': 0}, cappotto=dict(lungo=3.4, anelli=12, gioco=0.32),
                  borsa=dict(dietro=40, alto=0.9, largo=2.4, alta=1.8, spessa=0.7, cinghia=0.26, spalla=0.5, colori=dict(pelle='#3B2A1E', patta='#4A3526', cinghia='#2E2018', metallo='#C9A24A')),
                  colori=dict(giacca='#B5252C', pantaloni='#1E1F26', camicia='#2A2B31', cravatta='#2A2B31', scarpaChiaro='#2A2A30', scarpaScuro='#0C0C0E', calza='#16161A')),
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
CENTRO = ['bacino', 'spina5', 'spina4', 'spina3', 'spina2', 'spina1', 'collo1', 'collo2', 'collo3', 'testa', 'borsa']      # borsa: un osso in più per la borsa a tracolla (di solito sta col bacino; una scena può farla cadere di lato)
LATO = ['clav', 'spalla25', 'spalla', 'spalla75', 'brac1', 'brac2', 'ava1', 'ava2', 'mano', 'coscia1', 'coscia2', 'gamba1', 'gamba2', 'piede']
OSSA = CENTRO + [b + s for s in 'DS' for b in LATO]; KO = {n: i for i, n in enumerate(OSSA)}
# l'osso di MakeHuman che dà la posizione (testa dell'osso) a ogni osso ridotto
ORIGINE = {'borsa': 'spine05', 'bacino': 'spine05', 'spina5': 'spine05', 'spina4': 'spine04', 'spina3': 'spine03', 'spina2': 'spine02', 'spina1': 'spine01', 'collo1': 'neck01', 'collo2': 'neck02', 'collo3': 'neck03', 'testa': 'head',
           'clav': 'clavicle', 'spalla': 'shoulder01', 'spalla25': 'shoulder01', 'spalla75': 'shoulder01', 'brac1': 'upperarm01', 'brac2': 'upperarm02', 'ava1': 'lowerarm01', 'ava2': 'lowerarm02', 'mano': 'wrist',
           'coscia1': 'upperleg01', 'coscia2': 'upperleg02', 'gamba1': 'lowerleg01', 'gamba2': 'lowerleg02', 'piede': 'foot'}

print('leggo il corpo…', flush=True)
V0, F0, FT0, UV0, G0, NOMI_G = mh.carica_base(os.path.join(MP, '3dobjs', 'base.obj')); NV0 = len(V0)
GRUPPI = mh.carica_gruppi(os.path.join(MP, 'mesh_metadata', 'basemesh_vertex_groups.json'))
RIG = json.load(open(os.path.join(MP, 'rigs', 'standard', 'rig.default.json')))
PESI_MH = mh.pesi(os.path.join(MP, 'rigs', 'standard', 'weights.default.json'), NV0)
WB = np.zeros((NV0, len(OSSA)))
for osso, w in PESI_MH.items(): WB[:, KO[riduci(osso)]] += w

# ---- la spalla a tappe. Tra il busto (fermo) e il braccio (che gira del tutto) i pesi di MakeHuman sfumano in linea retta: col braccio portato in
# avanti di 60-70 gradi la stoffa a metà strada rientrava di oltre un centimetro e si accartocciava (la spalla sembrava una palla staccata dal
# busto). Qui la sfumatura passa per tre ossa intermedie, che fanno un quarto, metà e tre quarti della rotazione del braccio attorno alla spalla
# (spalla25, spalla, spalla75: le muove corpo_mesh.js): ogni punto gira della sua frazione lungo l'arco, non lungo la corda. La frazione di
# ciascun punto resta quella di prima (braccio + metà della spalla); «stringi» > 1 la concentra verso il braccio.
def catena_spalla(W, stringi=1.0):
    W = W.copy()
    for s in 'DS':
        bracci = [KO[x + s] for x in ('brac1', 'brac2', 'ava1', 'ava2', 'mano')]; ks = KO['spalla' + s]; tappe = [KO['spalla25' + s], ks, KO['spalla75' + s]]
        a = W[:, bracci].sum(1); sp = W[:, ks].copy(); fi = np.clip(a + 0.5 * sp, 0, 1); q = np.where((fi > 1e-4) & (fi < 1 - 1e-4) | (sp > 1e-4))[0]
        if not len(q): continue
        f = fi[q] ** stringi; k = np.minimum((f * 4).astype(int), 3); u = f * 4 - k                      # tra la tappa k e la k + 1 (0 = busto, 4 = braccio)
        resto = W[q].copy(); resto[:, bracci + [ks]] = 0; tr = resto.sum(1, keepdims=True); br = W[q][:, bracci]; ta = br.sum(1, keepdims=True)
        w0 = np.where(k == 0, 1 - u, 0.0); w4 = np.where(k == 3, u, 0.0); nuovo = resto / np.maximum(tr, 1e-9) * w0[:, None]
        senza_busto = (tr[:, 0] < 1e-6) & (w0 > 0)                                                        # nessun osso del busto a cui dare la tappa 0: va alla prima tappa
        nuovo[:, bracci] = br / np.maximum(ta, 1e-9) * w4[:, None]
        for j, kt in enumerate(tappe): nuovo[:, kt] = np.where(k == j, u, 0.0) + np.where(k == j + 1, 1 - u, 0.0)
        nuovo[senza_busto, tappe[0]] += w0[senza_busto]; W[q] = nuovo / nuovo.sum(1, keepdims=True)
    return W
WB = catena_spalla(WB, stringi=float(os.environ.get('STRINGI', 1.8)))
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
    # quali vertici del giro sono l'orlo: si decide sulla giacca com'è stata modellata (su un corpo di donna, una volta adattata, l'orlo non è più in piano)
    y = c['P'][g, 1]; basso = y < y.min() + 0.25; i0 = next(i for i in range(n) if basso[i] and not basso[i - 1]); g = g[i0:] + g[:i0]; basso = np.roll(basso, -i0)
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

def ammorbidisci(c, H, raggio=1.8, giri=8):
    """Attorno alle spalle i pesi delle ossa che un capo eredita dal corpo cambiano a scatti da un vertice all'altro (ogni vertice copia tre vertici
    del corpo, e due vicini possono copiarli da zone diverse): a braccio alzato la stoffa si accartocciava. Qui si lisciano lungo la maglia del capo,
    pieni fino a 0,6 raggi dal giunto della spalla e poi sempre meno fino a un raggio (decimetri)."""
    P, W = c['Pf'], c['W']; n = len(P); lati = set()
    for f in c['F']:
        f = [int(v) for v in f]
        for a, b in zip(f, f[1:] + f[:1]): lati.add((min(a, b), max(a, b)))
    E = np.array(sorted(lati)); quanto = np.zeros(n)
    for sx in ('.R', '.L'): quanto = np.maximum(quanto, np.clip((raggio - np.linalg.norm(P - mh.capo(H, GRUPPI, RIG['upperarm01' + sx]['head']), axis=1)) / (0.4 * raggio), 0, 1))
    cnt = np.zeros(n); np.add.at(cnt, E[:, 0], 1); np.add.at(cnt, E[:, 1], 1)
    for _ in range(giri):
        s_ = np.zeros_like(W); np.add.at(s_, E[:, 0], W[E[:, 1]]); np.add.at(s_, E[:, 1], W[E[:, 0]]); W = W + (0.5 * quanto)[:, None] * (s_ / np.maximum(cnt, 1)[:, None] - W)
    c['W'] = W / W.sum(1, keepdims=True)

def scatola(Pi, Po):
    """Maglia chiusa a quadrilateri: due facce a griglia (Pi verso dentro, Po verso fuori; matrici (ny+1, nx+1, 3)) unite lungo il bordo."""
    ny, nx = Pi.shape[0] - 1, Pi.shape[1] - 1; n1 = (nx + 1) * (ny + 1); k = lambda l, i, j: l * n1 + j * (nx + 1) + i; F = []
    for j in range(ny):
        for i in range(nx): F.append([k(1, i, j), k(1, i + 1, j), k(1, i + 1, j + 1), k(1, i, j + 1)]); F.append([k(0, i, j), k(0, i, j + 1), k(0, i + 1, j + 1), k(0, i + 1, j)])
    giro = [(i, 0) for i in range(nx)] + [(nx, j) for j in range(ny)] + [(i, ny) for i in range(nx, 0, -1)] + [(0, j) for j in range(ny, 0, -1)]
    for a, b in zip(giro, giro[1:] + giro[:1]): F.append([k(1, *b), k(1, *a), k(0, *a), k(0, *b)])
    return np.vstack([Pi.reshape(-1, 3), Po.reshape(-1, 3)]), F

def verso_fuori(P, F):
    """gira le facce di una maglia chiusa in modo che guardino fuori (volume positivo)"""
    vol = sum(np.dot(P[f[0]], np.cross(P[f[j]], P[f[j + 1]])) for f in F for j in range(1, len(f) - 1))
    return F if vol > 0 else [list(f[::-1]) for f in F]

def tracolla(nome, o, capi, H):
    """La BORSA A TRACOLLA: una borsa vera (corpo morbido, patta) appesa al fianco destro, un po' indietro, e la cinghia che passa sulla spalla
    sinistra. La cinghia corre come una cinghia tesa: nel suo piano fa il giro più corto attorno al busto (l'involucro convesso del cappotto tagliato
    da quel piano), appoggiata sulla stoffa coi due bordi; si muove col cappotto (stessi pesi delle ossa), la borsa col bacino."""
    from scipy.spatial import cKDTree, ConvexHull
    b = o['borsa']; c = capi[0]; P, W = c['Pf'], c['W']; nb = W.shape[1]; col = {k: pittura.rgb(v) for k, v in b['colori'].items()}
    arti = [KO[x + s] for s in 'DS' for x in LATO if not x.startswith(('clav', 'spalla'))]; braccia = W[:, [KO[x + s] for s in 'DS' for x in ('brac1', 'brac2', 'ava1', 'ava2', 'mano')]].sum(1)
    tri = np.array([[f[0], f[j], f[j + 1]] for f in c['F'] for j in range(1, len(f) - 1)]); tri = tri[(braccia[tri] < 0.5).all(1)]
    A0, E1, E2 = P[tri[:, 0]], P[tri[:, 1]] - P[tri[:, 0]], P[tri[:, 2]] - P[tri[:, 0]]
    def esce(da, d):                                                   # quanto lontano la semiretta esce dal cappotto per l'ultima volta (nan se non lo tocca)
        h = np.cross(d, E2); a = (E1 * h).sum(1); ok = np.abs(a) > 1e-9; f = 1 / np.where(ok, a, 1); s_ = da - A0; u = f * (s_ * h).sum(1); q = np.cross(s_, E1); v = f * (q @ d); t = f * (E2 * q).sum(1)
        m = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 1e-6); return t[m].max() if m.any() else np.nan
    su = np.array([0.0, 1.0, 0.0]); w, h, sp = b['largo'], b['alta'], b['spessa']
    # ---- dove sta la borsa: sul fianco destro girato all'indietro, col bordo alto poco sopra l'anca; la faccia interna appoggiata al cappotto
    y0 = mh.capo(H, GRUPPI, RIG['upperleg01.R']['head'])[1] + b['alto']; fetta = P[(np.abs(P[:, 1] - y0) < 0.4) & (braccia < 0.5)]; cen = np.array([fetta[:, 0].mean(), y0, fetta[:, 2].mean()])
    az = np.radians(b['dietro']); fuori = np.array([-np.cos(az), 0.0, -np.sin(az)]); lung = np.array([np.sin(az), 0.0, -np.cos(az)])        # lung: lungo il bordo della borsa, verso dietro
    ys = np.linspace(0, h, 9); m = np.array([np.nanmax([esce(cen + lung * x - su * y, fuori) for x in np.linspace(-w / 2, w / 2, 7)]) for y in ys])
    a_, pend = m[:3].max(), float(np.clip((m[-3:].max() - m[:3].max()) / (ys[-2] - ys[1]), -0.15, 0.35)); a_ += max(0.0, (m - (a_ + pend * ys)).max()) + 0.05
    giu = pend * fuori - su; giu /= np.linalg.norm(giu); nrm = fuori + pend * su; nrm /= np.linalg.norm(nrm); Bt = cen + fuori * a_                # il punto in mezzo al bordo alto, sulla faccia interna
    mondo = lambda L: Bt + L[..., 0:1] * lung + L[..., 1:2] * giu + L[..., 2:3] * nrm
    # ---- il corpo della borsa: una gabbia 4x4 lisciata due volte (più stretta e sottile in alto, piena in basso)
    xs = np.array([-1, -0.82, 0, 0.82, 1.0]); ry = np.array([0, 0.1, 0.5, 0.9, 1.0]) * h; lw = np.array([0.9, 0.93, 1.0, 1.0, 0.96]) * w / 2; zo = np.array([0.42, 0.6, 0.95, 1.0, 0.8]) * sp
    X = lw[:, None] * xs[None, :]; Y = np.repeat(ry[:, None], 5, 1); Zo = zo[:, None] * np.array([0.75, 0.95, 1, 0.95, 0.75])[None, :]
    Pb, Fb = scatola(np.dstack([X, Y, np.zeros_like(X)]), np.dstack([X, Y, Zo]))
    uvb = np.column_stack([(8 + 144 * (Pb[:, 0] / w + 0.5)) / 256, 1 - (8 + 112 * Pb[:, 1] / h) / 256])
    # ---- la patta: una falda sottile cucita in cima, che scende sul davanti fino a metà borsa con gli angoli tondi
    zf = lambda y: np.interp(y, ry, zo); cam = np.array([[-0.05, 0.05], [-0.08, 0.2], [0.1 * h, zf(0.1 * h) + 0.05], [0.3 * h, zf(0.3 * h) + 0.05], [0.48 * h, zf(0.48 * h) + 0.05], [0.56 * h, zf(0.56 * h) + 0.045]])
    dq = np.gradient(cam, axis=0); nq = np.column_stack([-dq[:, 1], dq[:, 0]]); nq /= np.linalg.norm(nq, axis=1, keepdims=True); xf = np.array([-1, -0.8, 0, 0.8, 1.0])
    lf = np.interp(cam[:, 0], ry, lw) + 0.025; Xf = lf[:, None] * xf[None, :]; orlo_x = np.array([0.8, 0.97, 1, 0.97, 0.8])[None, :]
    strato = lambda d: np.dstack([Xf, np.repeat((cam[:, 0] + nq[:, 0] * d)[:, None], 5, 1), (cam[:, 1] + nq[:, 1] * d)[:, None] * np.where(np.arange(6)[:, None] >= 2, orlo_x, 1.0)])
    Pf, Ff = scatola(strato(-0.025), strato(0.025)); sq = np.tile(np.repeat(np.linspace(0, 1, 6), 5), 2)
    uvf = np.column_stack([(8 + 144 * (np.tile(np.tile(xf, 6), 2) * 0.5 + 0.5)) / 256, 1 - (136 + 112 * sq) / 256])
    pezzi = []
    for Pl, Fl, uv in ((Pb, Fb, uvb), (Pf, Ff, uvf)):
        Fl = verso_fuori(Pl, Fl); FT = [list(f) for f in Fl]
        for _ in range(2): Pl, Fl, _a, FT, uv = maglia.catmull_clark(Pl, Fl, (), FT, uv)
        pezzi.append((mondo(Pl), Fl, FT, uv))
    # ---- la cinghia. Il suo piano passa per il bordo alto della borsa e per la cima della spalla sinistra
    xa = lw[0] - 0.06; Af, Ab = mondo(np.array([-xa, 0.12, 0.15])), mondo(np.array([xa, 0.12, 0.15]))
    Ja, Jn = mh.capo(H, GRUPPI, RIG['upperarm01.L']['head']), mh.capo(H, GRUPPI, RIG['neck01']['head']); da = np.array([Jn[0] + b['spalla'] * (Ja[0] - Jn[0]), Ja[1] - 1.5, Ja[2]]); S = da + su * esce(da, su)
    mid = (Af + Ab) / 2; e2 = lung; npi = np.cross(S - mid, e2); npi /= np.linalg.norm(npi); e1 = np.cross(e2, npi)
    O = mid + e1 * 0.5 * ((S - mid) @ e1); busto = P[(np.abs(P[:, 1] - O[1]) < 0.4) & (braccia < 0.5)]; O = O + e2 * ((np.array([busto[:, 0].mean(), O[1], busto[:, 2].mean()]) - O) @ e2)
    ws, th, N = b['cinghia'], 0.035, 240; ang = np.linspace(0, 2 * np.pi, N, endpoint=False)
    def bordo(delta):                                                  # un bordo della cinghia: il giro teso attorno al busto, nel piano spostato di delta
        r = np.array([esce(O + npi * delta, np.cos(a) * e1 + np.sin(a) * e2) for a in ang]); ok = ~np.isnan(r); r = np.interp(ang, ang[ok], r[ok], period=2 * np.pi) + 0.03
        pts = np.vstack([np.column_stack([r * np.cos(ang), r * np.sin(ang)]), [(Af - O) @ e1, (Af - O) @ e2], [(Ab - O) @ e1, (Ab - O) @ e2]]); hv = list(ConvexHull(pts).vertices)
        assert N in hv and N + 1 in hv, 'gli attacchi della borsa non sporgono dal busto'
        i, j = hv.index(N), hv.index(N + 1); g1 = (hv[i:] + hv[:i])[:(j - i) % len(hv) + 1]; g2 = (hv[j:] + hv[:j])[:(i - j) % len(hv) + 1][::-1]
        g = max((g1, g2), key=lambda g_: pts[g_, 0].max()); q = pts[g]; s_ = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(q, axis=0), axis=1))])
        return q, s_
    (q1, s1), (q2, s2) = bordo(-ws / 2), bordo(ws / 2); M = int(max(s1[-1], s2[-1]) / 0.2) + 1
    campiona = lambda q, s_, delta: (lambda t: O + npi * delta + np.outer(np.interp(t, s_, q[:, 0]), e1) + np.outer(np.interp(t, s_, q[:, 1]), e2))(np.linspace(0, s_[-1], M))
    B1, B2 = campiona(q1, s1, -ws / 2), campiona(q2, s2, ws / 2); cx = (B1 + B2) / 2; tg = np.gradient(cx, axis=0); nu = np.cross(tg, B2 - B1); nu /= np.linalg.norm(nu, axis=1, keepdims=True)
    if ((cx - O) * nu).sum() < 0: nu = -nu
    Pc = np.stack([B1, B2, B2 + nu * th, B1 + nu * th], 1).reshape(-1, 3); Fc = [[4 * j + k, 4 * j + (k + 1) % 4, 4 * j + 4 + (k + 1) % 4, 4 * j + 4 + k] for j in range(M - 1) for k in range(4)] + [[3, 2, 1, 0], [4 * M - 4, 4 * M - 3, 4 * M - 2, 4 * M - 1]]
    Fc = verso_fuori(Pc, Fc); uvc = np.array([[212 / 256, 1 - 44 / 256]]); pezzi.append((Pc, Fc, [[0] * len(f) for f in Fc], uvc))
    # ---- i pesi delle ossa: la borsa col bacino e la schiena bassa (niente gambe: non deve dondolare a ogni passo); la cinghia col cappotto che ha sotto
    wb = np.zeros(nb); wb[KO['borsa']] = 1.0                                                        # la borsa ha il suo osso (a riposo segue il bacino)
    dist, vic = cKDTree(P).query(cx, k=8); pw = 1 / (dist + 0.2); wc = (W[vic] * pw[:, :, None]).sum(1) / pw.sum(1, keepdims=True); wc[:, arti] = 0; wc /= wc.sum(1, keepdims=True)
    for _ in range(6): wc = np.apply_along_axis(lambda a: np.convolve(np.pad(a, 1, mode='edge'), [0.25, 0.5, 0.25], mode='valid'), 0, wc)
    sc = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(cx, axis=0), axis=1))]); t = np.clip(np.minimum(sc, sc[-1] - sc) / 3.5, 0, 1)[:, None]; t = t * t * (3 - 2 * t); wc = wb[None, :] * (1 - t) + wc * t; wc /= wc.sum(1, keepdims=True)      # gli ultimi 35 cm di cinghia seguono via via la borsa
    Wt = [np.tile(wb, (len(pezzi[0][0]), 1)), np.tile(wb, (len(pezzi[1][0]), 1)), np.repeat(wc, 4, 0)]
    # ---- una maglia sola (tre pezzi) e la sua texture: pelle con una sfumatura, patta più chiara con la cucitura e il fermaglio, cinghia scura
    PP, FF, FTT, UU = [], [], [], []; n0 = u0 = 0
    for Pl, Fl, FT, uv in pezzi:
        PP.append(Pl); FF += [[v + n0 for v in f] for f in Fl]; FTT += [[v + u0 for v in f] for f in FT]; UU.append(uv); n0 += len(Pl); u0 += len(uv)
    img = np.tile(col['pelle'][None, None, :], (256, 256, 1)); yy = np.arange(256)[:, None, None]
    img[:128] = col['pelle'][None, None, :] * (1.1 - 0.28 * np.clip((yy[:128] - 8) / 112, 0, 1)); img[128:] = col['patta'][None, None, :] * (1.06 - 0.16 * np.clip((yy[128:] - 136) / 112, 0, 1)); img[:96, 168:] = col['cinghia']
    im = pittura.Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)); dis = pittura.ImageDraw.Draw(im); cuc = tuple(int(255 * x) for x in np.clip(col['patta'] * 1.55, 0, 1))
    for x0, x1 in ((20 + 8 * k, 24 + 8 * k) for k in range(15)): dis.line([(x0, 236), (x1, 236)], fill=cuc, width=1)
    for y0_, y1_ in ((150 + 8 * k, 154 + 8 * k) for k in range(11)): dis.line([(20, y0_), (20, y1_)], fill=cuc, width=1); dis.line([(140, y0_), (140, y1_)], fill=cuc, width=1)
    met = tuple(int(255 * x) for x in col['metallo']); dis.rectangle([72, 222, 88, 240], fill=met); dis.rectangle([76, 227, 84, 235], fill=tuple(int(0.55 * x) for x in met))
    os.makedirs(TEX, exist_ok=True); file = f'{nome}_borsa.png'; im.save(os.path.join(TEX, file))
    print(f'  borsa a tracolla: cinghia di {M} anelli, lunga {sc[-1] / 10:.2f} m; borsa {w / 10:.2f} x {h / 10:.2f} x {sp / 10:.2f} m, appoggiata a {a_ / 10:.3f} m dal centro, pendenza {pend:.2f}', flush=True)
    return dict(nome='borsa', tipo='accessorio', P=np.vstack(PP), F=FF, W=np.vstack(Wt), FT=FTT, UV=np.vstack(UU), file=None, tex=dict(texture=file), perno=mondo(np.array([0.0, 0.0, sp * 0.2])))

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

def collo_snello(H, largo=0.84, profondo=0.81, spalle=0.3, gola=0.92):
    """Il collo di MakeHuman ha misure vere (11-12 cm), ma sotto una testa disegnata piccola e con poche ombre sembra un tubo grosso quanto la
    mascella (l'utente il 26/11: «migliorare il collo del protagonista»). Lo stringe attorno al suo asse (dal giunto del collo a quello della
    testa): `largo` di lato, `profondo` davanti-dietro (l'asse sta verso la nuca, quindi rientra soprattutto la gola). Sfuma verso le spalle
    coi pesi delle ossa del collo, così il trapezio scende più dolce invece di fare un cono (`spalle` = quanto ne risente la base di lato,
    `gola` = quanto ne risente davanti-dietro: di profilo, alla base, la gola faceva uno scalino sopra il colletto)."""
    a, b = mh.capo(H, GRUPPI, RIG['neck01']['head']), mh.capo(H, GRUPPI, RIG['head']['head']); asse = (b - a) / np.linalg.norm(b - a); L = np.linalg.norm(b - a)
    sm = lambda x0, x1, x: (lambda t: t * t * (3 - 2 * t))(np.clip((x - x0) / (x1 - x0), 0, 1))
    d = H - a; s = (d @ asse) / L                                                     # 0 alla base del collo, 1 al giunto della testa
    wc = WB[:, [KO['collo1'], KO['collo2'], KO['collo3'], KO['testa']]].sum(1)        # quanto un vertice è «collo» (le spalle e il petto no)
    fuori = sm(0.12, 0.55, wc) * sm(-0.9, -0.25, s) * (1 - sm(1.2, 1.7, s))             # sopra il giunto della testa niente: la testa modellata non si usa
    m, mz = fuori * (spalle + (1 - spalle) * sm(-0.1, 0.45, s)), fuori * (gola + (1 - gola) * sm(-0.1, 0.45, s))
    r = d - np.outer(d @ asse, asse)                                                  # la parte di d perpendicolare all'asse
    ex = np.array([1.0, 0, 0]); ez = np.cross(ex, asse); ez /= np.linalg.norm(ez)     # di lato; davanti-dietro (perpendicolare all'asse)
    rx, rz = r @ ex, r @ ez; nuovo = np.outer(rx * (1 - m * (1 - largo)), ex) + np.outer(rz * (1 - mz * (1 - profondo)), ez) + (r - np.outer(rx, ex) - np.outer(rz, ez))
    H = H.copy(); H += nuovo - r
    return H

def costruisci(nome, o):
    print('==', nome, flush=True)
    H = mh.forma(V0, MP, o['forma'])                                                   # il corpo con la sua forma (decimetri)
    if o.get('collo'): H = collo_snello(H, **o['collo'])
    capi = [mh.vestito(os.path.join(CL, n, n + '.json')) for n in o['vestiti'] + [o['scarpe']]]
    from scipy.spatial import cKDTree
    NH = np.zeros_like(H); cb_ = GRUPPI['body']                                         # le normali della pelle (verso fuori) e i suoi punti, per sapere se un vestito ci finisce sotto
    for f in F0[G0 == ID_BODY]:
        n = np.cross(H[f[1]] - H[f[0]], H[f[3]] - H[f[0]])
        for v in f: NH[v] += n
    NH /= np.maximum(np.linalg.norm(NH, axis=1, keepdims=True), 1e-9); ALBERO_H = cKDTree(H[cb_])
    for c, n in zip(capi, o['vestiti'] + [o['scarpe']]):
        c['file'] = n; c['tipo'] = 'scarpa' if n == o['scarpe'] else 'vestito'
        c['W'] = np.clip((WB[c['ref']] * c['w'][:, :, None]).sum(1), 0, None); c['W'] /= c['W'].sum(1, keepdims=True)
        # maniche: quanto resta della distanza tra la stoffa e il braccio (1 = com'è il capo; meno = manica più aderente: larga, a braccio alzato sembrava gonfia)
        manica = np.clip((c['W'][:, [KO[x + s_] for s_ in 'DS' for x in ('brac2', 'ava1', 'ava2')]].sum(1) - 0.3) / 0.4, 0, 1) if c['tipo'] == 'vestito' else np.zeros(len(c['off']))
        c['Pf'] = (H[c['ref']] * c['w'][:, :, None]).sum(1) + c['off'] * (1 - (1 - o.get('maniche', 1.0)) * manica)[..., None]       # il capo sul corpo di questo personaggio
        if o.get('maniche', 1.0) < 1 and c['tipo'] == 'vestito':            # ...ma la manica stretta non deve finire sotto la pelle: almeno 4 mm sopra il braccio
            q = np.where(manica > 0)[0]; _, vb = ALBERO_H.query(c['Pf'][q]); alto = ((c['Pf'][q] - H[cb_[vb]]) * NH[cb_[vb]]).sum(1); c['Pf'][q] += NH[cb_[vb]] * np.clip(0.04 - alto, 0, None)[:, None]
        if c['tipo'] == 'vestito' and o.get('spalle', 8): ammorbidisci(c, H, giri=o.get('spalle', 8))
    if o.get('cappotto'): cappotto(capi[0], H, **o['cappotto'])
    suolo = min(c['Pf'][:, 1].min() for c in capi if c['tipo'] == 'scarpa')
    T = lambda X: (np.asarray(X) - [0, suolo, 0]) * 0.1                                # decimetri -> metri, suola a terra
    # ---- la pelle: le facce del corpo non coperte dai vestiti, senza testa e senza mani
    nasc = np.zeros(NV0, bool)
    for c in capi: nasc[:len(c['nascondi'])] |= c['nascondi']
    # i vestiti dicono quali vertici del corpo nascondere, ma ne lasciano fuori alcuni che stanno comunque SOTTO la stoffa (in cima alle spalle):
    # a braccio alzato bucavano la maglietta. Sotto la stoffa = c'è un punto di vestito entro 3 cm, dalla parte di fuori della pelle.
    from scipy.spatial import cKDTree
    N0 = np.zeros_like(H)
    for f in F0[G0 == ID_BODY]:
        n = np.cross(H[f[1]] - H[f[0]], H[f[3]] - H[f[0]])
        for v in f: N0[v] += n
    N0 /= np.maximum(np.linalg.norm(N0, axis=1, keepdims=True), 1e-9)
    stoffa = np.vstack([c['Pf'] for c in capi]); cb = GRUPPI['body']; dg, ig = cKDTree(stoffa).query(H[cb]); verso = ((stoffa[ig] - H[cb]) * N0[cb]).sum(1)
    coperto = (dg < 0.35) & (verso > 0.75 * dg); vuoto = np.full(NV0, 9.0); vuoto[cb] = dg                # vuoto = quanto spazio c'è tra la pelle e la stoffa più vicina
    # ...e anche dove la stoffa è vicinissima (una manica aderente): lì il punto di stoffa più vicino può stare di lato, e conta se la normale
    # della pelle INCONTRA la stoffa entro 3,5 cm (semiretta contro i triangoli vicini)
    tri = np.vstack([np.array([[f[0], f[j], f[j + 1]] for f in c['F'] for j in range(1, len(f) - 1)]) + sum(len(x['Pf']) for x in capi[:i]) for i, c in enumerate(capi)])
    TA, TE1, TE2 = stoffa[tri[:, 0]], stoffa[tri[:, 1]] - stoffa[tri[:, 0]], stoffa[tri[:, 2]] - stoffa[tri[:, 0]]; cen = stoffa[tri].mean(1); largo = np.linalg.norm(stoffa[tri] - cen[:, None], axis=2).max()
    incontra = np.zeros(len(cb), bool)
    for i, vv in enumerate(cKDTree(cen).query_ball_point(H[cb], 0.4 + min(largo, 0.6))):
        if coperto[i] or not vv: continue
        d = N0[cb[i]]; da = H[cb[i]] - 0.03 * d; h = np.cross(d, TE2[vv]); a = (TE1[vv] * h).sum(1); ok = np.abs(a) > 1e-9; fa = 1 / np.where(ok, a, 1); s_ = da - TA[vv]
        u = fa * (s_ * h).sum(1); q = np.cross(s_, TE1[vv]); v = fa * (q @ d); t = fa * (TE2[vv] * q).sum(1); incontra[i] = (ok & (u >= -0.02) & (v >= -0.02) & (u + v <= 1.02) & (t > 0) & (t < 0.38)).any()
    print(f'  sotto la stoffa lungo la normale (in più): {int((incontra & ~coperto & ~nasc[cb]).sum())} vertici', flush=True); coperto |= incontra
    print(f'  sotto la stoffa ma non segnati: {int((coperto & ~nasc[cb]).sum())} vertici', flush=True); nasc[cb[coperto]] = True
    # la pelle continua per qualche centimetro sotto i vestiti (collo sotto il colletto, braccio sotto la manica): niente buchi ai bordi
    corpo = GRUPPI['body']; vis = corpo[~nasc[corpo]]; nas = corpo[nasc[corpo]]; WBc = WB
    if len(vis) and len(nas):
        # (dove la maglia del corpo è rada, come sul braccio, due centimetri non arrivano al primo giro di vertici nascosti: resta comunque tutto
        # il giro di vertici che tocca la pelle visibile, altrimenti tra la pelle e l'orlo della manica si apre un buco)
        tocca = np.zeros(NV0, bool); fb = F0[G0 == ID_BODY]; tocca[fb[(~nasc[fb]).any(1)].ravel()] = True
        # (attorno al collo la pelle continua più in giù, `sotto_collo`: con il collo snellito tra colletto e collo resta uno spiraglio, e da lì
        # si vedeva il bordo dove la pelle finiva, come una punta che spuntava dal colletto)
        d, _ = cKDTree(H[vis]).query(H[nas]); r = o.get('sotto', 0.22) + (o.get('sotto_collo', o.get('sotto', 0.22)) - o.get('sotto', 0.22)) * np.clip(WB[nas][:, [KO['collo1'], KO['collo2'], KO['collo3']]].sum(1) / 0.25, 0, 1)
        scelti = (d < r) | tocca[nas]; sotto = nas[scelti]; d = d[scelti]; nasc[sotto] = False
        # ...ma solo per 2 cm e subito più in dentro (fino a 1,2 cm), così non buca il vestito nemmeno a braccio alzato: più in là, sotto il vestito non c'è niente
        N = np.zeros_like(H)
        for f in F0[G0 == ID_BODY]:
            n = np.cross(H[f[1]] - H[f[0]], H[f[3]] - H[f[0]])
            for v in f: N[v] += n
        N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
        stretto = np.clip(1 - (vuoto[sotto] - 0.06) / 0.1, 0, 1)                                    # dove la stoffa sta larga (un colletto) la pelle resta dov'è: lì non buca e si vedrebbe lo scalino
        H = H.copy(); H[sotto] -= N[sotto] * (0.12 * np.clip((d - 0.03) / 0.15, 0, 1) * stretto)[:, None]
        # ...e si muove COL vestito che ha sopra (prende i pesi delle ossa del punto di vestito più vicino): se seguisse le sue ossa, alzando
        # il braccio la spalla salirebbe più della maglietta e la bucherebbe
        tutti = np.vstack([c['Pf'] for c in capi]); Wt = np.vstack([c['W'] for c in capi]); _, vic = cKDTree(tutti).query(H[sotto]); tt = (np.clip((d - 0.02) / 0.1, 0, 1) * stretto)[:, None]
        WBc = WB.copy(); WBc[sotto] = WB[sotto] * (1 - tt) + Wt[vic] * tt
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
    parti = [dict(nome='pelle', tipo='pelle', P=H[usati], F=[list(nuovo[f]) for f in F0[tieni]], W=WBc[usati], FT=None, UV=None, file=None)]
    for c in capi: tex = dipingi(nome, o, c); parti.append(dict(nome=c['file'], tipo=c['tipo'], P=c['Pf'], F=c['F'], W=c['W'], FT=c['FT'], UV=c['UV'], file=c['file'], tex=tex))
    if o.get('borsa'): parti.append(tracolla(nome, o, capi, H))
    # ---- lisciatura, vertici di disegno (posizione + uv), triangoli
    POS, UVS, RV, IDX, JI, JW, meta = [], [], [], [], [], [], []; np0 = nr0 = ni0 = 0
    for p in parti:
        P, F, W, FT, UV = liscia(p['P'], p['F'], p['W'], p['FT'], p['UV'], o['livelli'].get(p['tipo'], 0))
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
    for p in parti:
        if p.get('perno') is not None: giunti['borsa'] = T(p['perno']).tolist()                    # il punto attorno a cui gira la borsa: in mezzo al suo bordo alto
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
