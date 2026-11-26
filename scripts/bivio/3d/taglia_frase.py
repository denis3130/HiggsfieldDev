# taglia_frase.py <cartella film> <riga> <prima parola> <ultima parola> [--prova]
# Toglie dalla voce GIÀ PREPARATA un gruppo di parole di una riga (dalla prima all'ultima comprese) senza rigenerare niente: montaggio, zero crediti.
# (26/11: l'utente ha fatto togliere «Sotto l'unico lampione,» dall'episodio 1 de «Il testimone»: «taglia senza spendere».)
#  - taglia nel silenzio vero: prima della prima parola da togliere e prima della parola che segue (soglia: 40 dB sotto la voce, come prepara_voce.py);
#  - il pezzo tolto dura un numero intero di fotogrammi (30 al secondo) e comincia su un fotogramma del video: il video si accorcia degli stessi fotogrammi;
#  - la pausa prima della parola che segue resta quella che c'era prima della frase tolta;
#  - aggiorna audio/vo.wav, assets/parole.json (parole tolte, tempi spostati, maiuscola alla parola che ora apre la frase), assets/bocca.json e la durata
#    in film.json; di ogni file tiene la copia di prima (*.prima_del_taglio). Con --prova stampa soltanto.
# Dopo: si rifanno i fotogrammi dalla scena prima del taglio alla fine della scena tagliata (i confini delle scene sono agganciati alle parole) e si
# attaccano a quelli di prima, che dopo il taglio sono gli stessi spostati; poi mix.py. Vedi «Tagliare una frase dalla voce» nel LEGGIMI.
import sys, os, json, re, shutil, unicodedata, wave
import numpy as np
film, riga, prima, ultima = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]; PROVA = '--prova' in sys.argv; FPS = 30
norm = lambda s: re.sub(r"[^a-z']", '', ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn'))
fp, fv, fb, fc = f'{film}/assets/parole.json', f'{film}/audio/vo.wav', f'{film}/assets/bocca.json', f'{film}/film.json'
P = json.load(open(fp)); CFG = json.load(open(fc)); T0 = CFG.get('inizio_fotogramma', 0) / FPS; R = P[riga - 1]
i0 = next(i for i, x in enumerate(R) if norm(x[2]) == norm(prima)); i1 = next(i for i, x in enumerate(R) if i >= i0 and norm(x[2]) == norm(ultima))
assert i1 + 1 < len(R), 'dopo le parole da togliere deve restare almeno una parola nella riga'
w = wave.open(fv); sr, ch, sw, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes(); grezzo = w.readframes(n); w.close(); assert sw == 2
x = np.frombuffer(grezzo, dtype=np.int16).reshape(-1, ch); m = x.astype(float).mean(axis=1) / 32768
h = int(sr * 0.005); env = np.sqrt(np.convolve(m ** 2, np.ones(h) / h, 'same')); voce = np.percentile(env[env > 1e-4], 90); soglia = voce * 10 ** (-40 / 20)
def silenzi(t0, t1):
    a, b = max(0, int(t0 * sr)), min(len(env), int(t1 * sr)); s = env[a:b] < soglia; out = []; k = 0
    while k < len(s):
        if s[k]:
            j = k
            while j < len(s) and s[j]: j += 1
            if (j - k) / sr > 0.03: out.append((a / sr + k / sr, a / sr + j / sr))
            k = j
        else: k += 1
    return out
prec = R[i0 - 1][1] if i0 else (P[riga - 2][-1][1] if riga > 1 else 0.0)
# il silenzio prima della frase da togliere: l'ultimo che finisce prima che la prima parola sia cominciata davvero; quello prima della parola che segue: il più lungo
s1 = [s for s in silenzi(prec - 0.3, R[i0][0] + 0.12) if s[0] < R[i0][0]]; assert s1, 'nessun silenzio prima della prima parola'
s1 = max(s1, key=lambda s: s[1] - s[0]) if len(s1) > 1 and s1[-1][1] - s1[-1][0] < 0.06 else s1[-1]
s2 = silenzi(R[i1][1] - 0.2, R[i1 + 1][0] + 0.15); assert s2, 'nessun silenzio prima della parola che segue: il taglio si sentirebbe'
s2 = max(s2, key=lambda s: s[1] - s[0]); meta = s2[1] - s1[1]          # quanto togliere per lasciare la stessa pausa
scelte = []
for k in range(int((s1[0] - T0) * FPS) + 1, int((s1[1] - T0) * FPS) + 1):
    a = T0 + k / FPS
    for N in range(1, int((s2[1] - a) * FPS) + 1):
        b = a + N / FPS
        if not (s2[0] < b < s2[1]) or not (s1[0] < a < s1[1]): continue
        margine = min(min(s1[1] - a, 0.08), min(b - s2[0], s2[1] - b))
        scelte.append((round(min(margine, 0.06), 3), -abs(N / FPS - meta), k, N))
assert scelte, 'nessuna coppia di tagli su fotogrammi interi cade nel silenzio'
_, _, k, N = max(scelte); a = T0 + k / FPS; D = N / FPS; b = a + D
print(f'riga {riga}: tolgo «{" ".join(q[2] for q in R[i0:i1 + 1])}»')
print(f'silenzio prima: {s1[0]:.3f}-{s1[1]:.3f} s; silenzio dopo: {s2[0]:.3f}-{s2[1]:.3f} s (tempi della voce)')
print(f'taglio da {a:.4f} a {b:.4f} s: {D:.4f} s = {N} fotogrammi; nel video i fotogrammi da {k} a {k + N - 1} (secondi {k / FPS:.3f}-{(k + N) / FPS:.3f})')
print(f'livello nei due punti: {20 * np.log10(env[int(a * sr)] + 1e-9):.0f} dB e {20 * np.log10(env[int(b * sr)] + 1e-9):.0f} dB (voce {20 * np.log10(voce):.0f} dB)')
if PROVA: sys.exit(0)
for f in (fp, fv, fb, fc):
    if os.path.exists(f) and not os.path.exists(f + '.prima_del_taglio'): shutil.copy(f, f + '.prima_del_taglio')
# audio: via il pezzo, con 4 ms di dissolvenza per parte (sono due silenzi: serve solo a non lasciare uno scalino)
ia, ib, d = int(round(a * sr)), int(round(b * sr)), int(sr * 0.004); y = x.astype(float)
y[ia - d:ia] *= np.linspace(1, 0, d)[:, None]; y[ib:ib + d] *= np.linspace(0, 1, d)[:, None]
z = np.concatenate([y[:ia], y[ib:]]).round().clip(-32768, 32767).astype(np.int16)
o = wave.open(fv, 'wb'); o.setnchannels(ch); o.setsampwidth(2); o.setframerate(sr); o.writeframes(z.tobytes()); o.close()
# parole: tolte quelle, maiuscola a quella che ora apre la frase (se la frase tolta cominciava con la maiuscola), tempi dopo il taglio spostati
maiuscola = R[i0][2].lstrip('«"(')[:1].isupper()
nuova = R[:i0] + R[i1 + 1:]
if maiuscola: q = nuova[i0]; j = next(i for i, c in enumerate(q[2]) if c.isalpha()); q[2] = q[2][:j] + q[2][j].upper() + q[2][j + 1:]
P[riga - 1] = nuova
for rr in P:
    for q in rr:
        if q[0] >= b - 1e-6: q[0] = round(q[0] - D, 4); q[1] = round(q[1] - D, 4)
json.dump(P, open(fp, 'w'), ensure_ascii=False)
if os.path.exists(fb):
    B = json.load(open(fb))
    for e in B:
        if e.get('t0', 0) >= b: e['t0'] = round(e['t0'] - D, 4)
    json.dump(B, open(fb, 'w'), ensure_ascii=False)
CFG['duration'] = round(CFG['duration'] - D, 6); json.dump(CFG, open(fc, 'w'), ensure_ascii=False, indent=1)
print(f'fatto: voce {len(z) / sr:.3f} s (prima {n / sr:.3f}), durata del film {CFG["duration"]} s; la riga ora è «{" ".join(q[2] for q in nuova)}»')
