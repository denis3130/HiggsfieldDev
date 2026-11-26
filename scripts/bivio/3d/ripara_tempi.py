# ripara_tempi.py <cartella voce> <riga da> <riga a>: rimette i tempi delle parole di alcune righe quando Whisper, sulla voce intera, ne ha
# saltato un pezzo (succede dopo una pausa lunga: le parole ci sono nell'audio, ma nella trascrizione mancano e voce_esterna.py le schiaccia
# tutte sullo stesso istante). Ritaglia l'audio tra la fine della riga prima e l'inizio della riga dopo, lo riascolta da solo e riallinea
# le parole del copione; quelle che ancora non sente le distribuisce dentro i tratti in cui si parla davvero. Aggiorna parole.json
# (la copia di prima resta in parole.json.prima_della_riparazione) e stampa cosa ha sentito.
import difflib, json, os, re, shutil, subprocess, sys, unicodedata
import numpy as np
from faster_whisper import WhisperModel
V, R0, R1 = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
NUM = {"112": "centododici"}
def norm(s):
    s = unicodedata.normalize("NFKD", s.lower()); s = "".join(c for c in s if not unicodedata.combining(c))
    return "".join(NUM.get(w, w) for w in re.sub(r"[^a-z0-9 ]", " ", s).split())
P = json.load(open(f"{V}/parole.json")); ep = json.load(open(f"{V}/episodio.json"))
a = P[R0 - 2][-1][1] + 0.02 if R0 > 1 else 0.0; b = P[R1][0][0] - 0.02 if R1 < len(P) else None
dur = (b - a) if b else None
x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a}"] + (["-t", f"{dur}"] if dur else []) + ["-i", f"{V}/voce.wav", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout, np.float32)
wm = WhisperModel("medium", device="cpu", compute_type="int8")
segs, _ = wm.transcribe(x, language="it", beam_size=5, word_timestamps=True, condition_on_previous_text=False, vad_filter=False, initial_prompt=" ".join(ep["righe"][i]["voce"] for i in range(R0 - 1, R1)))
heard = [(w.start + a, w.end + a, w.word.strip()) for s in segs for w in s.words]
print("sentito:", " ".join(w[2] for w in heard))
script = [(i, w) for i in range(R0 - 1, R1) for w in ep["righe"][i]["voce"].split()]
A = [norm(w) for _, w in script]; B = [norm(w[2]) for w in heard]; T = [None] * len(script)
for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(a=A, b=B, autojunk=False).get_opcodes():
    if tag == "equal":
        for k in range(i2 - i1): T[i1 + k] = heard[j1 + k][:2]
    elif j2 > j1 and i2 > i1:
        t0, t1 = heard[j1][0], heard[j2 - 1][1]; n = i2 - i1
        for k in range(n): T[i1 + k] = (t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n)
# quelle ancora senza tempo: dentro i tratti parlati (40 dB sotto il picco = silenzio) non ancora occupati
if any(t is None for t in T):
    e = np.sqrt(np.convolve(x.astype(float) ** 2, np.ones(320) / 320, "same")); s = e > e.max() * 10 ** (-32 / 20); tr = []; i = 0
    while i < len(s):
        if s[i]:
            j = i
            while j < len(s) and (s[j] or s[j:j + 2400].any()): j += 1
            tr.append([a + i / 16000, a + j / 16000]); i = j
        else: i += 1
    i = 0
    while i < len(T):
        if T[i] is None:
            j = i
            while j < len(T) and T[j] is None: j += 1
            lo = T[i - 1][1] if i else a; hi = T[j][0] if j < len(T) else (b or a + len(x) / 16000)
            liberi = [(max(u, lo), min(v, hi)) for u, v in tr if min(v, hi) - max(u, lo) > 0.08]; tot = sum(v - u for u, v in liberi) or 1e-6
            pesi = [max(2, len(A[k])) for k in range(i, j)]; acc = 0.0
            def al(q):          # dal «tempo parlato» q (0..tot) al tempo vero
                for u, v in liberi:
                    if q <= v - u + 1e-9: return u + q
                    q -= v - u
                return liberi[-1][1] if liberi else lo
            for k in range(i, j): t0 = al(tot * acc / sum(pesi)); acc += pesi[k - i]; T[k] = (t0, al(tot * acc / sum(pesi)))
            i = j
        else: i += 1
if not os.path.exists(f"{V}/parole.json.prima_della_riparazione"): shutil.copy(f"{V}/parole.json", f"{V}/parole.json.prima_della_riparazione")
k = 0
for i in range(R0 - 1, R1):
    riga = []
    for w in ep["righe"][i]["voce"].split(): riga.append([round(float(T[k][0]), 3), round(float(T[k][1]), 3), w]); k += 1
    P[i] = riga; print(i + 1, " ".join(f"{q[2]}[{q[0]:.2f}]" for q in riga))
json.dump(P, open(f"{V}/parole.json", "w"), ensure_ascii=False)
