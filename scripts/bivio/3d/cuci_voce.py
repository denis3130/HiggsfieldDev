# cuci_voce.py <cartella voce di uscita> <montaggio.json>: monta la voce di un episodio prendendo le righe da più registrazioni già allineate
# (cartelle con voce.wav + parole.json fatte da voce_esterna.py), tagliando sempre nel silenzio vero, e scrive nella cartella di uscita
# voce.wav, parole.json ed episodio.json pronti per prepara_voce.py. Serve per non rigenerare (e ripagare) le frasi che restano uguali.
# montaggio.json: {"copione": <file episodio.json>, "sorgenti": {"nome": <cartella>}, "righe": [["nome", riga da 1], ...]   (una per riga del copione)
#                  "parole": [{"riga": n, "parola": i (da 0), "da": ["nome", riga, parola]}]}   ← sostituisce una parola detta male con la stessa parola
#                                                                                                 presa da un'altra registrazione (taglio nel punto più debole prima)
import json, os, sys
import numpy as np, soundfile as sf
OUT, MJ = sys.argv[1], sys.argv[2]; M = json.load(open(MJ)); B = os.path.dirname(os.path.abspath(MJ))
pth = lambda p: p if os.path.isabs(p) else os.path.join(B, p)
SR = 48000; PASSO = 0.005
SRC = {}
for k, d in M['sorgenti'].items():
    a, sr = sf.read(f"{pth(d)}/voce.wav", dtype='float32'); assert sr == SR, (d, sr)
    if a.ndim > 1: a = a.mean(1)
    w = int(PASSO * SR); n = len(a) // w; liv = 20 * np.log10(np.sqrt((a[:n * w].reshape(n, w) ** 2).mean(1) + 1e-12)); liv -= np.percentile(liv, 90)
    SRC[k] = {'a': a, 'liv': liv, 'p': json.load(open(f"{pth(d)}/parole.json"))}
def silenzio(s, t0, t1):
    """il centro del silenzio vero (40 dB sotto la voce) più lungo tra t0 e t1; se non c'è, il punto più debole"""
    liv = SRC[s]['liv']; lo, hi = max(0, int((t0 - 0.05) / PASSO)), min(len(liv), int((t1 + 0.05) / PASSO)); best = None; k = lo
    while k < hi:
        if liv[k] < -40:
            j = k
            while j < hi and liv[j] < -40: j += 1
            if (j - k) * PASSO >= 0.03 and (best is None or j - k > best[1] - best[0]): best = (k, j)
            k = j
        else: k += 1
    if best: return (best[0] + best[1]) / 2 * PASSO
    return (lo + int(np.argmin(liv[lo:hi])) + 0.5) * PASSO
# il punto più debole subito PRIMA dell'inizio della parola (la chiusura della consonante iniziale). Non dopo: dentro la parola c'è spesso un'altra
# consonante (la «c» di «balcone») e lì il taglio lasciava metà della parola vecchia («bai… balcone»).
def debole(s, t, r=0.12):
    liv = SRC[s]['liv']; lo, hi = max(0, int((t - r) / PASSO)), min(len(liv), int(t / PASSO) + 1); return (lo + int(np.argmin(liv[lo:hi])) + 0.5) * PASSO
def estremi(s, i):
    p = SRC[s]['p']; r = p[i]; a = SRC[s]['a']
    t0 = silenzio(s, p[i - 1][-1][1], r[0][0]) if i > 0 else max(0.0, r[0][0] - 0.15)
    t1 = silenzio(s, r[-1][1], p[i + 1][0][0]) if i + 1 < len(p) else min(len(a) / SR, r[-1][1] + 0.3)
    return t0, t1
def sfuma(x, n=int(0.005 * SR)):
    x = x.copy(); n = min(n, len(x) // 2); x[:n] *= np.linspace(0, 1, n, dtype=np.float32); x[-n:] *= np.linspace(1, 0, n, dtype=np.float32); return x
SOST = {(c['riga'], c['parola']): c['da'] for c in M.get('parole', [])}
cop = json.load(open(pth(M['copione']))); assert len(cop['righe']) == len(M['righe']), (len(cop['righe']), len(M['righe']))
pezzi, parole, pos = [], [], 0.0
for n, (s, rr) in enumerate(M['righe'], start=1):
    i = rr - 1; t0, t1 = estremi(s, i); r = [list(x) for x in SRC[s]['p'][i]]
    assert len(r) == len(cop['righe'][n - 1]['voce'].split()), (n, len(r), cop['righe'][n - 1]['voce'])
    sost = [(k, v) for k, v in SOST.items() if k[0] == n]
    if not sost:
        seg = sfuma(SRC[s]['a'][int(t0 * SR):int(t1 * SR)]); righe_t = [[x[0] - t0 + pos, x[1] - t0 + pos, x[2]] for x in r]
    else:
        (_, wi), (d, dr, dw) = sost[0]; assert wi == len(r) - 1, 'per ora si sostituisce solo l\'ultima parola della riga'
        tj = debole(s, r[wi][0]); dp = SRC[d]['p'][dr - 1]; dj = debole(d, dp[dw][0])
        de = silenzio(d, dp[dw][1], dp[dw + 1][0]) if dw + 1 < len(dp) else silenzio(d, dp[dw][1], SRC[d]['p'][dr][0][0]) if dr < len(SRC[d]['p']) else dp[dw][1] + 0.25
        a1, a2 = SRC[s]['a'][int(t0 * SR):int(tj * SR)], SRC[d]['a'][int(dj * SR):int(de * SR)]; x = int(0.008 * SR)
        a1, a2 = a1.copy(), a2.copy(); a1[-x:] *= np.cos(np.linspace(0, np.pi / 2, x)).astype(np.float32); a2[:x] *= np.sin(np.linspace(0, np.pi / 2, x)).astype(np.float32)
        seg = sfuma(np.concatenate([a1[:-x], a1[-x:] + a2[:x], a2[x:]]))
        righe_t = [[x_[0] - t0 + pos, x_[1] - t0 + pos, x_[2]] for x_ in r[:wi]]
        off = pos + (tj - t0) - x / SR - dj; righe_t.append([dp[dw][0] + off, dp[dw][1] + off, r[wi][2]])
        print(f'riga {n}: «{r[wi][2]}» presa da {d} riga {dr} (taglio a {tj:.3f} s / {dj:.3f} s)')
    pezzi.append(seg); parole.append([[round(a, 3), round(b, 3), w] for a, b, w in righe_t]); pos += len(seg) / SR
    print(f'riga {n:2d} da {s} riga {rr:2d}: {t0:7.3f}-{t1:7.3f} ({t1 - t0:.2f} s)  {cop["righe"][n - 1]["voce"][:60]}')
os.makedirs(OUT, exist_ok=True)
sf.write(f'{OUT}/voce.wav', np.concatenate(pezzi), SR, subtype='PCM_24'); json.dump(parole, open(f'{OUT}/parole.json', 'w'), ensure_ascii=False)
json.dump(cop, open(f'{OUT}/episodio.json', 'w'), ensure_ascii=False, indent=1); print('voce montata:', round(pos, 2), 's')
