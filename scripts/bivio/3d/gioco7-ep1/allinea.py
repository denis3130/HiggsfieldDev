# allinea.py <voce.mp3> <copione.json> <parole.json>: i tempi di ogni parola del copione sulla voce (Whisper large-v3-turbo + allineamento
# col testo esatto, come voce_esterna.py). Uscita: [[inizio, fine, parola, riga], ...] e stampa le parole sentite diverse dal copione.
import sys, json, re, difflib, subprocess, unicodedata
import numpy as np
from faster_whisper import WhisperModel
AUDIO, COP, OUT = sys.argv[1:4]
NUM = {"7": "sette", "10": "dieci", "2016": "duemilasedici", "3": "tre", "6": "sei"}
def norm(s):
    s = unicodedata.normalize("NFKD", s.lower()); s = "".join(c for c in s if not unicodedata.combining(c))
    return [NUM.get(w, w) for w in re.sub(r"[^a-z0-9 ]", " ", s).split()]
righe = [r['t'] for r in json.load(open(COP))['righe']]
script = [(w, ri) for ri, r in enumerate(righe) for w in r.split(' ')]
x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", AUDIO, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout, np.float32)
wm = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
segs, _ = wm.transcribe(x, language="it", beam_size=5, word_timestamps=True, condition_on_previous_text=False)
heard = []
for s in segs:
    for w in s.words:
        t = w.word.strip()
        if t.startswith("'") and heard: heard[-1] = (heard[-1][0], w.end, heard[-1][2] + t)
        else: heard.append((w.start, w.end, t))
a = ["".join(norm(w)) for w, _ in script]; b = ["".join(norm(w[2])) for w in heard]; times = [None] * len(script)
for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
    if tag == "equal":
        for k in range(i2 - i1): times[i1 + k] = heard[j1 + k][:2]
    elif j2 > j1 and i2 > i1:
        t0, t1 = heard[j1][0], heard[j2 - 1][1]; n = i2 - i1
        for k in range(n): times[i1 + k] = (t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n)
        print('diverso:', ' '.join(w for w, _ in script[i1:i2]), '| sentito:', ' '.join(h[2] for h in heard[j1:j2]))
known = [i for i, t in enumerate(times) if t]
for i, t in enumerate(times):
    if t is None:
        p = max([k for k in known if k < i], default=None); q = min([k for k in known if k > i], default=None)
        s0 = times[p][1] if p is not None else 0.0; s1 = times[q][0] if q is not None else s0 + 0.3
        times[i] = (s0, max(s1, s0 + 0.05)); print('mancante:', script[i][0])
out = [[round(float(s), 3), round(float(e), 3), w, ri] for (s, e), (w, ri) in zip(times, script)]
json.dump(out, open(OUT, 'w'), ensure_ascii=False)
for ri in range(len(righe)):
    ws = [o for o in out if o[3] == ri]; print(f'{ri:2d} {ws[0][0]:7.2f}-{ws[-1][1]:7.2f}  {righe[ri][:70]}')
