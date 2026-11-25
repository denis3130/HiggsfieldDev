# Per una narrazione fatta fuori da voce.py (es. una voce di Higgsfield generata in un colpo solo): ricava i tempi delle parole con Whisper
# e li mette sul testo esatto del copione, riga per riga.
# Uso: python3 voce_esterna.py <audio> <cartella voce con episodio.json>  ->  voce.wav, parole.json, controllo.txt (righe sentite diverse dal copione)
import difflib, json, re, subprocess, sys, unicodedata
import numpy as np
from faster_whisper import WhisperModel
AUDIO, V = sys.argv[1], sys.argv[2]
NUM = {"0": "zero", "1": "uno", "2": "due", "3": "tre", "4": "quattro", "5": "cinque", "6": "sei", "7": "sette", "8": "otto", "9": "nove", "10": "dieci", "12": "dodici", "112": "centododici"}
def norm(s):
    s = unicodedata.normalize("NFKD", s.lower()); s = "".join(c for c in s if not unicodedata.combining(c))
    return [NUM.get(w, w) for w in re.sub(r"[^a-z0-9 ]", " ", s).split()]
def align(script, heard):
    a = ["".join(norm(w)) for w in script]; b = ["".join(norm(w[2])) for w in heard]; times = [None] * len(script)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1): times[i1 + k] = heard[j1 + k][:2]
        elif j2 > j1 and i2 > i1:
            t0, t1 = heard[j1][0], heard[j2 - 1][1]; n = i2 - i1
            for k in range(n): times[i1 + k] = (t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n)
    known = [i for i, t in enumerate(times) if t]
    for i, t in enumerate(times):
        if t is None:
            p = max([k for k in known if k < i], default=None); q = min([k for k in known if k > i], default=None)
            s0 = times[p][1] if p is not None else (heard[0][0] if heard else 0.0); s1 = times[q][0] if q is not None else s0 + 0.3
            times[i] = (s0, max(s1, s0 + 0.05))
    return [(float(s), float(e), w) for (s, e), w in zip(times, script)]
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", AUDIO, "-ac", "1", "-ar", "48000", f"{V}/voce.wav"], check=True)
x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", AUDIO, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout, np.float32)
wm = WhisperModel("medium", device="cpu", compute_type="int8")
segs, _ = wm.transcribe(x, language="it", beam_size=5, word_timestamps=True, condition_on_previous_text=False); segs = list(segs)
heard = [(w.start, w.end, w.word.strip()) for s in segs for w in s.words]
righe = [r["voce"] for r in json.load(open(f"{V}/episodio.json"))["righe"]]
script = [w for r in righe for w in r.split()]; al = align(script, heard)
out, i = [], 0
for r in righe:
    n = len(r.split()); out.append([[round(s, 3), round(e, 3), w] for s, e, w in al[i:i + n]]); i += n
json.dump(out, open(f"{V}/parole.json", "w"), ensure_ascii=False)
# controllo: per ogni riga, quello che Whisper ha sentito in quel tratto
diversi = []
for k, (r, ws) in enumerate(zip(righe, out)):
    t0, t1 = ws[0][0] - 0.05, ws[-1][1] + 0.05; sent = " ".join(h[2] for h in heard if h[0] >= t0 and h[1] <= t1 + 0.2)
    if norm(sent) != norm(r): diversi.append(f"riga {k + 1}: «{r}» -> «{sent}»")
open(f"{V}/controllo.txt", "w").write("\n".join(diversi) + "\n")
w = [q for r in out for q in r]; parl = sum(q[1] - q[0] for q in w) + sum(max(0, b[0] - a[1]) for a, b in zip(w, w[1:]) if b[0] - a[1] < 0.14)
print(f"{len(w)} parole su {len(heard)} sentite, durata {len(x) / 16000:.1f} s, {len(w) / parl:.2f} parole/s mentre parla, {len(w) / (w[-1][1] - w[0][0]):.2f} con le pause")
print(f"righe diverse dal copione: {len(diversi)}"); print("\n".join(diversi))
print("pause tra le righe:", " ".join(f"{b[0][0] - a[-1][1]:.2f}" for a, b in zip(out, out[1:])))
