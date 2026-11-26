# scatti.py <video> <secondo d'inizio>: cerca gli scatti (un fotogramma molto diverso dal precedente, mentre prima e dopo l'immagine cambia poco) che non sono tagli di scena
import sys, subprocess, numpy as np
f, t0 = sys.argv[1], float(sys.argv[2]); W, H = 108, 192
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vf', f'crop=iw:ih*0.78:0:ih*0.22,scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.uint8).reshape(-1, H, W).astype(np.float32); d = np.abs(np.diff(x, axis=0)); m = d.mean((1, 2)); q = np.percentile(d.reshape(len(d), -1), 99.5, axis=1)
print(f, len(x), 'fotogrammi')
for i in range(len(m)):
    a = np.r_[m[max(0, i - 6):i], m[i + 1:i + 7]]; fondo = np.median(a) if len(a) else 0
    if m[i] > 6: tipo = 'TAGLIO'
    elif m[i] > 0.5 and m[i] > 3.5 * fondo + 0.15: tipo = 'scatto?'
    else: continue
    print('  %s tra il fotogramma %d e %d  (t=%.2f s)  differenza %.2f, intorno %.2f, punte %.0f' % (tipo, i, i + 1, t0 + (i + 1) / 30, m[i], fondo, q[i]))
