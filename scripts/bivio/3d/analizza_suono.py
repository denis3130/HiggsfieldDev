# analizza_suono.py <file>...: per ogni file stampa durata, livello e gli «eventi» (tratti sopra la soglia), per scegliere dove tagliare senza poterlo ascoltare
import sys, subprocess, numpy as np
for f in sys.argv[1:]:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.int16).astype(float) / 32768; sr = 8000
    if len(x) < 100: print(f, 'vuoto'); continue
    h = int(0.02 * sr); n = len(x) // h; e = np.sqrt((x[:n * h].reshape(n, h) ** 2).mean(1) + 1e-12); db = 20 * np.log10(e); top = np.percentile(db, 98); s = db > top - 22
    ev = []; i = 0
    while i < n:
        if s[i]:
            j = i
            while j < n and (s[j] or (j + 8 < n and s[j:j + 8].any())): j += 1
            ev.append((round(i * 0.02, 2), round(j * 0.02, 2), round(float(db[i:j].max()), 1))); i = j
        else: i += 1
    print(f.split('/')[-1], f'durata {len(x) / sr:.2f} s, picco {db.max():.1f} dB, fondo {np.percentile(db, 20):.1f} dB;', len(ev), 'eventi:', ' '.join(f'{a}-{b}({p})' for a, b, p in ev[:22]))
