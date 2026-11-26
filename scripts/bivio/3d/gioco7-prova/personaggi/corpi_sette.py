# corpi_sette.py <mpfb2> <vestiti> <uscita> [personaggio ...]
# I corpi interi dei sette de «Il gioco dei sette», per le scene a tavola: lo STESSO corpo MakeHuman delle teste approvate (forma, testa da
# cartone: converti_teste.forma_di), con vestiti e scarpe veri di MakeHuman (in dotazione al programma, CC0: cast/sets/corpi/LICENZE.md)
# adattati al corpo e ridipinti coi colori di ogni personaggio, la pelle tolta dove sta sotto la stoffa, e i pesi delle ossa (ossa7.py).
# Le mani sono quelle vere del corpo (una superficie sola col braccio). La testa NON è qui: è il busto di converti_teste.py (stesso corpo,
# stesse ossa), che sets/corpi7.js mette in posa insieme al resto. Tutto nella posa di riposo; le pose le fa corpi7.js.
#   <mpfb2>   = anny/data/mpfb2 (pip download anny==0.6.2 --no-deps)
#   <vestiti> = package/public/data/proxies/clothes del pacchetto npm «makehuman-data» 0.0.2
# Uscita: <nome>_corpo.json + <nome>_corpo.bin (metri, origine nel giunto della testa come i busti) e le texture <nome>_<capo>.png.
import sys, os, json
import numpy as np
QUI = os.path.dirname(os.path.abspath(__file__)); CORPI = os.path.join(QUI, '..', '..', 'cast', 'sets', 'corpi'); sys.path[:0] = [QUI, CORPI]
MP, CL, OUT = sys.argv[1:4]; SOLO = sys.argv[4:]
sys.argv = [sys.argv[0], MP, OUT]
import converti_teste as CT
import mh, maglia, pittura as PT
import ossa7 as O7
from scipy.spatial import cKDTree

V0, F0, FT0, UV0, G0, GRUPPI, RIG, ID_BODY, WB = CT.V0, CT.F0, CT.FT0, CT.UV0, CT.G0, CT.GRUPPI, CT.RIG, CT.ID_BODY, CT.WB
NV0 = len(V0); KO = O7.KO; capo = lambda H, n: mh.capo(H, GRUPPI, RIG[n]['head'])

# ---- i vestiti: capi di MakeHuman, scarpe, colori (le chiavi come in converti_corpo.py), quanto lisciare
SCURE = dict(scarpaChiaro='#3A3B42', scarpaScuro='#0E0E11', calza='#1B1C21')
VESTITI = {
    'leon':   dict(capi=['male_elegantsuit01'], scarpe='shoes03', colori=dict(giacca='#2A2C31', pantaloni='#23252A', camicia='#4A4E57', cravatta='#4A4E57', **SCURE)),
    'victor': dict(capi=['male_elegantsuit01'], scarpe='shoes03', colori=dict(giacca='#474B53', pantaloni='#383B42', camicia='#E6E3DC', cravatta='#5C1C26', **SCURE)),
    'elena':  dict(capi=['male_elegantsuit01'], scarpe='shoes03', colori=dict(giacca='#151517', pantaloni='#151517', camicia='#EFEBE4', cravatta='#EFEBE4', **SCURE)),
    'marcus': dict(capi=['male_casualsuit01'], scarpe='shoes01', colori=dict(sopra='#4A3324', sotto='#2A2C33', dettaglio='#2A1C14', scarpaChiaro='#6A4A32', scarpaScuro='#24170F', calza='#1B1C21')),
    'nora':   dict(capi=['female_elegantsuit01'], scarpe='shoes04', liscio=9.0, colori=dict(sopra='#2F4A3C', sotto='#22242A', dettaglio='#1C2C24', **SCURE)),
    'adrian': dict(capi=['male_elegantsuit01'], scarpe='shoes03', colori=dict(giacca='#1B2236', pantaloni='#1B2236', camicia='#DCE1E9', cravatta='#7A5E22', **SCURE)),
    'sophie': dict(capi=['female_casualsuit01'], scarpe='shoes06', liscio=14.0, colori=dict(sopra='#6B1D22', sotto='#2A3042', dettaglio='#4A1418', scarpaChiaro='#C9C4BC', scarpaScuro='#3A3634', calza='#C9C4BC')),
}
LIVELLI = {'pelle': 1, 'vestito': 1, 'scarpa': 0}
DIM = 1024

def ammorbidisci(c, H, raggio=1.8, giri=8):
    """i pesi delle ossa del capo lisciati attorno alle spalle (come converti_corpo.py: a braccio mosso la stoffa non si accartoccia)"""
    P, W = c['Pf'], c['W']; n = len(P); lati = set()
    for f in c['F']:
        f = [int(v) for v in f]
        for a, b in zip(f, f[1:] + f[:1]): lati.add((min(a, b), max(a, b)))
    E = np.array(sorted(lati)); quanto = np.zeros(n)
    for sx in ('.R', '.L'): quanto = np.maximum(quanto, np.clip((raggio - np.linalg.norm(P - capo(H, 'upperarm01' + sx), axis=1)) / (0.4 * raggio), 0, 1))
    cnt = np.zeros(n); np.add.at(cnt, E[:, 0], 1); np.add.at(cnt, E[:, 1], 1)
    for _ in range(giri):
        s_ = np.zeros_like(W); np.add.at(s_, E[:, 0], W[E[:, 1]]); np.add.at(s_, E[:, 1], W[E[:, 0]]); W = W + (0.5 * quanto)[:, None] * (s_ / np.maximum(cnt, 1)[:, None] - W)
    c['W'] = W / W.sum(1, keepdims=True)

def normali_quad(H, facce):
    N = np.zeros_like(H)
    for f in facce:
        n = np.cross(H[f[1]] - H[f[0]], H[f[3]] - H[f[0]])
        for v in f: N[v] += n
    return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)

def dipingi(nome, v, c, H):
    """la texture del capo coi colori del personaggio -> <nome>_<capo>.png (+ la mappa delle pieghe dell'originale)"""
    col = {k: PT.rgb(x) for k, x in v['colori'].items()}; f = c['file']; cart = os.path.join(CL, f, 'textures')
    img, _ = PT.carica(os.path.join(cart, f + '_diffuse.png'), DIM); L = PT.lum(img); out = np.zeros_like(img); pieno = np.zeros((DIM, DIM), bool); info = {}
    ao = PT.lum(PT.carica(os.path.join(cart, f + '_ao.png'), DIM)[0]) if os.path.exists(os.path.join(cart, f + '_ao.png')) else None
    comp = maglia.componenti(len(c['Pf']), c['F'])
    if f.startswith('shoes'):
        isl = PT.isole(c, comp, DIM); ids = sorted(isl, key=lambda k: -c['Pf'][comp == k][:, 1].mean())
        scarpe = [k for k in ids if (comp == k).sum() > 300]; calze = [k for k in ids if (comp == k).sum() <= 300]
        t = PT.sm(0.06, 0.72, PT.sfoca(L, 0.8))[..., None]; tono = col['scarpaScuro'][None, None, :] * (1 - t) + col['scarpaChiaro'][None, None, :] * t
        for k in scarpe: out[isl[k]] = tono[isl[k]]; pieno |= isl[k]
        for k in calze: out[isl[k]] = (col['calza'][None, None, :] * (1 + 1.2 * np.clip(PT.dettaglio(L, 1.0, 6), -0.1, 0.1))[..., None])[isl[k]]; pieno |= isl[k]
    elif f == 'male_elegantsuit01':                                         # completo: giacca e pantaloni, camicia, cravatta (dipinta sul davanti), bottoni
        isl = PT.isole(c, comp, DIM); ids = sorted(isl, key=lambda k: -c['Pf'][comp == k][:, 1].mean()); pant = ids[1]
        giacca = PT.tessuto(L, isl[ids[0]], col['giacca'], forza=2.6, sfum=0.0); calz = PT.tessuto(L, isl[pant], col['pantaloni'], forza=2.6, sfum=0.3)
        cam = col['camicia'][None, None, :] * (1 + 0.9 * np.clip(PT.dettaglio(L, 1.0, 8), -0.18, 0.08))[..., None]
        for q in PT.isole_uv(c, DIM):
            m = q['maschera']; pieno |= m
            if comp[q['vertici'][0]] == pant: out[m] = calz[m]
            elif L[m].mean() > 0.35:
                out[m] = cam[m]; blu = (img[..., 2] - img[..., 0]) > 0.03
                if (blu & m).sum() > 200:
                    cr = PT.ndi.binary_fill_holes(PT.ndi.binary_closing(blu & m, PT.ndi.generate_binary_structure(2, 1), iterations=int(0.012 * DIM)))
                    cr = PT.sm(0.42, 0.58, PT.sfoca(cr.astype(float), 0.005 * DIM))[..., None]
                    out[m] = (out * (1 - cr) + col['cravatta'][None, None, :] * cr)[m]
            elif len(q['facce']) < 45: out[m] = col['giacca'] * 0.45
            else: out[m] = giacca[m]
    else:                                                                   # gli altri capi: il pezzo di sopra e quello di sotto a tinta unita; i pezzetti (bottoni, etichette) scuri
        Ls = PT.sfoca(L, v.get('liscio', 0) * DIM / 1024) if v.get('liscio') else L                # le righe e i loghi dell'originale spariscono
        anca = capo(H, 'upperleg01.L')[1]
        for q in PT.isole_uv(c, DIM):
            m = q['maschera']; pieno |= m; yv = c['Pf'][q['vertici'], 1].mean()
            chi = 'dettaglio' if len(q['facce']) < 30 else ('sopra' if yv > anca + 0.6 else 'sotto')
            out[m] = PT.tessuto(Ls, m, col[chi], forza=1.4 if chi == 'sotto' else 0.6, sfum=0.15 if chi == 'sotto' else 0.05, ao=ao)[m]
    out = PT.riempi(out, pieno)
    file = f'{nome}_{f}.png'; PT.salva(out, os.path.join(OUT, file)); info['texture'] = file
    nrm = os.path.join(cart, f + '_normal.png')
    if os.path.exists(nrm): PT.Image.open(nrm).convert('RGB').resize((DIM, DIM)).save(os.path.join(OUT, f'{nome}_{f}_n.png')); info['pieghe'] = f'{nome}_{f}_n.png'
    return info

def costruisci(nome):
    o = CT.PERSONAGGI[nome]; v = VESTITI[nome]; print('==', nome, flush=True)
    H, J = CT.forma_di(o); T = lambda X: (np.asarray(X) - J['testa']) * 0.1
    nomi = v['capi'] + [v['scarpe']]; capi = [mh.vestito(os.path.join(CL, n, n + '.json')) for n in nomi]
    corpoF = F0[G0 == ID_BODY]; NH = normali_quad(H, corpoF); cb = GRUPPI['body']
    for c, n in zip(capi, nomi):
        c['file'] = n; c['tipo'] = 'scarpa' if n == v['scarpe'] else 'vestito'
        c['W'] = np.clip((WB[c['ref']] * c['w'][:, :, None]).sum(1), 0, None); c['W'] /= c['W'].sum(1, keepdims=True)
        c['Pf'] = (H[c['ref']] * c['w'][:, :, None]).sum(1) + c['off']
        if c['tipo'] == 'vestito': ammorbidisci(c, H)
    # ---- la pelle: via quella sotto i vestiti (segnata dai capi, più quella che sta comunque sotto la stoffa), via la testa (è il busto)
    nasc = np.zeros(NV0, bool)
    for c in capi: nasc[:len(c['nascondi'])] |= c['nascondi']
    stoffa = np.vstack([c['Pf'] for c in capi]); dg, ig = cKDTree(stoffa).query(H[cb]); verso = ((stoffa[ig] - H[cb]) * NH[cb]).sum(1)
    coperto = (dg < 0.35) & (verso > 0.75 * dg); vuoto = np.full(NV0, 9.0); vuoto[cb] = dg
    tri = np.vstack([np.array([[f[0], f[j], f[j + 1]] for f in c['F'] for j in range(1, len(f) - 1)]) + sum(len(x['Pf']) for x in capi[:i]) for i, c in enumerate(capi)])
    TA, TE1, TE2 = stoffa[tri[:, 0]], stoffa[tri[:, 1]] - stoffa[tri[:, 0]], stoffa[tri[:, 2]] - stoffa[tri[:, 0]]; cen = stoffa[tri].mean(1); largo = np.linalg.norm(stoffa[tri] - cen[:, None], axis=2).max()
    incontra = np.zeros(len(cb), bool)
    for i, vv in enumerate(cKDTree(cen).query_ball_point(H[cb], 0.4 + min(largo, 0.6))):
        if coperto[i] or not vv: continue
        d = NH[cb[i]]; da = H[cb[i]] - 0.03 * d; h = np.cross(d, TE2[vv]); a = (TE1[vv] * h).sum(1); ok = np.abs(a) > 1e-9; fa = 1 / np.where(ok, a, 1); s_ = da - TA[vv]
        u = fa * (s_ * h).sum(1); q = np.cross(s_, TE1[vv]); w_ = fa * (q @ d); t = fa * (TE2[vv] * q).sum(1); incontra[i] = (ok & (u >= -0.02) & (w_ >= -0.02) & (u + w_ <= 1.02) & (t > 0) & (t < 0.38)).any()
    coperto |= incontra; nasc[cb[coperto]] = True
    corpo = GRUPPI['body']; vis = corpo[~nasc[corpo]]; nas = corpo[nasc[corpo]]; WBc = WB
    if len(vis) and len(nas):                    # la pelle continua per qualche centimetro sotto gli orli (niente buchi), spinta un poco dentro
        tocca = np.zeros(NV0, bool); tocca[corpoF[(~nasc[corpoF]).any(1)].ravel()] = True
        d, _ = cKDTree(H[vis]).query(H[nas]); scelti = (d < 0.22) | tocca[nas]; sotto = nas[scelti]; d = d[scelti]; nasc[sotto] = False
        stretto = np.clip(1 - (vuoto[sotto] - 0.06) / 0.1, 0, 1)
        H = H.copy(); H[sotto] -= NH[sotto] * (0.12 * np.clip((d - 0.03) / 0.15, 0, 1) * stretto)[:, None]
        Wt = np.vstack([c['W'] for c in capi]); _, vic = cKDTree(stoffa).query(H[sotto]); tt = (np.clip((d - 0.02) / 0.1, 0, 1) * stretto)[:, None]
        WBc = WB.copy(); WBc[sotto] = WB[sotto] * (1 - tt) + Wt[vic] * tt
    taglio = capo(H, 'spine02')[1] - 0.6                                                   # lo stesso taglio del busto (converti_teste.py)
    busto = (H[F0][:, :, 1].min(1) > taglio)
    tieni = (G0 == ID_BODY) & ~nasc[F0].any(1) & ~busto
    usati = np.unique(F0[tieni]); nuovo = -np.ones(NV0, int); nuovo[usati] = np.arange(len(usati))
    parti = [dict(nome='pelle', tipo='pelle', P=H[usati], F=[list(nuovo[f]) for f in F0[tieni]], W=WBc[usati], FT=[list(f) for f in FT0[tieni]], UV=UV0)]
    for c in capi: tex = dipingi(nome, v, c, H); parti.append(dict(nome=c['file'], tipo=c['tipo'], P=c['Pf'], F=c['F'], W=c['W'], FT=c['FT'], UV=c['UV'], tex=tex))
    POS, UVS, RV, IDX, JI, JW, meta = [], [], [], [], [], [], []; np0 = nr0 = ni0 = 0
    for p in parti:
        P, F, W, FT, UV = p['P'], [list(f) for f in p['F']], p['W'], p['FT'], p['UV']
        for _ in range(LIVELLI[p['tipo']] if p['nome'] != 'male_elegantsuit01' else 0): P, F, (W,), FT, UV = maglia.catmull_clark(P, F, (W,), FT, UV)
        chiave = {}; rv, uv, FR = [], [], []
        for f, ft in zip(F, FT):
            q = []
            for vv, t in zip(f, ft):
                k = (vv, round(float(UV[t][0]), 5), round(float(UV[t][1]), 5)); i = chiave.get(k)
                if i is None: i = chiave[k] = len(rv); rv.append(vv); uv.append(UV[t])
                q.append(i)
            FR.append(q)
        rv, uv = np.array(rv), np.array(uv); tr = np.array([[f[0], f[j], f[j + 1]] for f in FR for j in range(1, len(f) - 1)])
        ji, jw = O7.quattro(W)
        meta.append(dict(nome=p['nome'], tipo=p['tipo'], p0=np0, np=len(P), r0=nr0, nr=len(rv), i0=ni0, ni=int(tr.size), **(p.get('tex') or {})))
        POS.append(T(P)); UVS.append(uv); RV.append(rv + np0); IDX.append(tr + nr0); JI.append(ji); JW.append(jw)
        print(f"  {p['nome']:22s} punti {len(P):6d} vertici {len(rv):6d} triangoli {len(tr):6d}", flush=True)
        np0 += len(P); nr0 += len(rv); ni0 += tr.size
    POS, UVS, RV, IDX, JI, JW = np.vstack(POS), np.vstack(UVS), np.concatenate(RV), np.concatenate(IDX).ravel(), np.vstack(JI), np.vstack(JW)
    blob = b''.join([POS.astype('<f4').tobytes(), UVS.astype('<f4').tobytes(), RV.astype('<u4').tobytes(), IDX.astype('<u4').tobytes(), JI.tobytes(), JW.tobytes()])
    open(os.path.join(OUT, nome + '_corpo.bin'), 'wb').write(blob)
    G = O7.giunti(H, GRUPPI, RIG, mh.capo, mh.giunto, T)
    json.dump(dict(nome=nome, punti=len(POS), vertici=len(RV), indici=len(IDX), ossa=O7.OSSA, padri=[O7.PADRE[b] for b in O7.OSSA], giunti=G, parti=meta,
                   pelle=o['pelle'], suolo=float(POS[:, 1].min()), ordine=['pos f4 punti*3', 'uv f4 vertici*2', 'rv u4 vertici', 'idx u4 indici', 'ji u1 punti*4', 'jw u1 punti*4']),
              open(os.path.join(OUT, nome + '_corpo.json'), 'w'))
    print(f'  totale punti {len(POS)} vertici {len(RV)} triangoli {len(IDX) // 3}  {len(blob) / 1e6:.1f} MB', flush=True)

for nome in (SOLO or list(VESTITI)): costruisci(nome)
