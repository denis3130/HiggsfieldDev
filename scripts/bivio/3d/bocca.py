"""Bocche a tempo: per ogni battuta tra «» del copione, il volume della voce (30 valori al secondo) -> assets/bocca.json.
Uso: python bocca.py voce.wav parole.json "tu,nonna" out.json   (chi parla in ogni battuta, nell'ordine)"""
import json, subprocess, sys
import numpy as np
wav, par, chi, out = sys.argv[1], sys.argv[2], sys.argv[3].split(","), sys.argv[4]
a = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", wav, "-ac", "1", "-ar", "24000", "-f", "f32le", "-"], capture_output=True).stdout, np.float32)
w = [x for r in json.load(open(par)) for x in r]
seg, cur = [], None
for x in w:
    if "«" in x[2] and cur is None: cur = [x[0], x[1]]
    if cur is not None:
        cur[1] = x[1]
        if "»" in x[2]: seg.append(cur); cur = None
res = []
for i, (t0, t1) in enumerate(seg):
    t0 -= 0.04; t1 += 0.08; fps = 30
    v = []
    for k in range(int((t1 - t0) * fps)):
        s = int((t0 + k / fps) * 24000); p = a[s:s + 800]
        v.append(float(np.sqrt(np.mean(p ** 2))) if len(p) else 0.0)
    v = np.array(v); v = np.clip((v / (np.percentile(v, 95) + 1e-9)) ** 0.7, 0, 1); v = np.convolve(v, [0.25, 0.5, 0.25], "same")
    res.append({"who": chi[i % len(chi)], "t0": round(t0, 3), "fps": fps, "vals": [round(float(x), 3) for x in v]})
    print(chi[i % len(chi)], round(t0, 2), "->", round(t1, 2))
json.dump(res, open(out, "w"))
