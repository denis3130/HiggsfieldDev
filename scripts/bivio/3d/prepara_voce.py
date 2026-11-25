# Prepara la voce di un episodio per il film: rallenta alla velocità voluta, inserisce i silenzi per le azioni tra una riga e l'altra,
# scrive <film>/audio/vo.wav, <film>/assets/parole.json (righe di [inizio, fine, parola]) e la durata in <film>/film.json.
# Uso: prepara_voce.py <cartella voce> <cartella film> [--finta]   (--finta: tempi inventati dal testo, per lavorare prima che la voce sia pronta)
import json, subprocess, sys, os
import numpy as np
V, F = sys.argv[1], sys.argv[2]; FINTA = '--finta' in sys.argv
ART = float(os.environ.get('ART', 2.85))            # parole al secondo mentre parla, pause escluse: la prova del 25/11 era a 3,2 e per l'utente «va troppo veloce»; 3,0 era una differenza troppo piccola
VEL = 2.5                                           # solo per i tempi finti
TESTA, CODA = 0.4, 1.7
# silenzio in più DOPO la riga (numero della riga: secondi)
PAUSE = {2: 0.3, 3: 0.8, 4: 0.45, 6: 0.2, 7: 0.7, 8: 0.45, 9: 0.35, 10: 0.25, 11: 0.6, 12: 0.35, 13: 0.75, 14: 0.35, 15: 0.25, 16: 0.9, 17: 0.45, 18: 0.25, 19: 0.2, 20: 0.75,
         21: 0.6, 22: 1.4, 23: 0.25, 24: 0.4, 25: 0.75, 26: 0.65, 27: 0.35, 28: 0.25, 29: 0.75, 30: 0.2, 31: 0.25, 32: 0.25}
ep = json.load(open(f'{V}/episodio.json'))
if FINTA:
    q, t = [], 0.0
    for r in ep['righe']:
        riga = []
        for w in r['voce'].split():
            d = (0.1 + 0.05 * sum(ch.isalpha() for ch in w)) * 2.9 / VEL; riga.append([round(t, 3), round(t + d, 3), w]); t += d + (0.2 if w[-1] in '.?!»' else 0.08 if w[-1] in ',:' else 0.0)
        q.append(riga); t += 0.2
    a = None; sr = 24000
else:
    import soundfile as sf
    p = json.load(open(f'{V}/parole.json')); w = [x for r in p for x in r]
    parl = sum(x[1] - x[0] for x in w) + sum(max(0, b[0] - a[1]) for a, b in zip(w, w[1:]) if b[0] - a[1] < 0.14)      # tempo di sola parola (le pause da 0,14 s in su non contano)
    rate = len(w) / parl; k = max(1.0, round(rate / ART, 3))
    print(f'{len(w)} parole, {rate:.2f} parole/s mentre parla ({len(w) / (w[-1][1] - w[0][0]):.2f} con le pause) -> rallento di {k}')
    subprocess.run(['rubberband', '-q', '--fine', '-t', str(k), f'{V}/voce.wav', f'{V}/voce_lenta.wav'], check=True)
    a, sr = sf.read(f'{V}/voce_lenta.wav', dtype='float32')
    q = [[[x[0] * k, x[1] * k, x[2]] for x in r] for r in p]
assert len(q) == len(ep['righe']), (len(q), len(ep['righe']))
# Dove tagliare la voce tra una riga e la successiva. NON a metà tra i tempi delle parole: quelli di Whisper sbagliano di qualche centesimo e,
# con una voce letta tutta di seguito (Luc), il taglio finiva dentro l'attacco della parola dopo: se ne sentiva la prima lettera, poi la
# pausa, poi la parola intera («s… Sotto», «o… Oppure»: l'utente il 25/11: «nella voce a volte si ripete con qualche lettera»).
# Si taglia in mezzo al silenzio vero più vicino (40 dB sotto il livello della voce); se un silenzio non c'è, nel punto più debole.
if a is not None:
    PASSO = 0.005; _w = int(PASSO * sr); _n = len(a) // _w; LIV = 20 * np.log10(np.sqrt((a[:_n * _w].reshape(_n, _w) ** 2).mean(1) + 1e-12)); LIV -= np.percentile(LIV, 90)
def taglio(fine, inizio):
    t = (fine + inizio) / 2; lo, hi = max(0, int((fine - 0.25) / PASSO)), min(len(LIV), int((inizio + 0.25) / PASSO)); zitto = LIV[lo:hi] < -40; meglio = None; k = 0
    while k < len(zitto):
        if zitto[k]:
            j = k
            while j < len(zitto) and zitto[j]: j += 1
            s0, s1 = (lo + k) * PASSO, (lo + j) * PASSO; voto = (s1 - s0) - 2 * max(0.0, s0 - t, t - s1)       # lungo e vicino al punto atteso
            if s1 - s0 >= 0.03 and (meglio is None or voto > meglio[0]): meglio = (voto, (s0 + s1) / 2)
            k = j
        else: k += 1
    if meglio: return meglio[1], True
    lo, hi = max(0, int((fine - 0.1) / PASSO)), min(len(LIV), int((inizio + 0.1) / PASSO)); return (lo + int(np.argmin(LIV[lo:hi])) + 0.5) * PASSO, False
TAGLI = []
def pausa(i, sec):                                   # dopo la riga di indice i (da 0)
    global a
    if a is not None:
        t, pulito = taglio(q[i][-1][1], q[i + 1][0][0]); j = int(t * sr); n = int((0.004 if pulito else 0.012) * sr); prima, dopo = a[:j].copy(), a[j:].copy()
        prima[-n:] *= np.linspace(1, 0, n, dtype=np.float32); dopo[:n] *= np.linspace(0, 1, n, dtype=np.float32)          # niente scatti sul taglio
        a = np.concatenate([prima, np.zeros(int(sec * sr), np.float32), dopo]); TAGLI.append((i + 1, round(t, 3), pulito))
    for r in q[i + 1:]:
        for x in r: x[0] += sec; x[1] += sec
for n, sec in sorted(PAUSE.items(), reverse=True): pausa(n - 1, sec)
sh = TESTA - q[0][0][0]
if a is not None: a = np.concatenate([np.zeros(int(max(0, sh) * sr), np.float32), a]) if sh >= 0 else a[int(-sh * sr):]
q = [[[round(x[0] + sh, 3), round(x[1] + sh, 3), x[2]] for x in r] for r in q]
fine = round(q[-1][-1][1] + CODA, 2)
os.makedirs(f'{F}/assets', exist_ok=True); os.makedirs(f'{F}/audio', exist_ok=True)
if a is not None:
    import soundfile as sf
    a = np.concatenate([a, np.zeros(sr * 4, np.float32)])[: int(fine * sr)]; sf.write(f'{F}/audio/vo.wav', a, sr)
json.dump(q, open(f'{F}/assets/parole.json', 'w'), ensure_ascii=False)
# film.json: se c'è già (un episodio in lavorazione ha anche altre voci, come l'inizio tagliato) si aggiorna solo la durata quando non c'è un taglio iniziale
if os.path.exists(f'{F}/film.json'):
    cfg = json.load(open(f'{F}/film.json'))
    if not cfg.get('inizio_fotogramma'): cfg['duration'] = fine; json.dump(cfg, open(f'{F}/film.json', 'w'), indent=1, ensure_ascii=False)
else: json.dump({'title': 'Il testimone - episodio 1', 'duration': fine, 'formats': ['9x16'], 'poster': 30}, open(f'{F}/film.json', 'w'), indent=1)
if TAGLI: print('tagli per le pause (dopo la riga, secondo, nel silenzio):', ' '.join(f"{n}:{t}{'' if ok else '(!)'}" for n, t, ok in sorted(TAGLI)))
print('durata', fine, '| righe:', ' '.join(f'{i + 1}:{r[0][0]:.1f}' for i, r in enumerate(q)))
