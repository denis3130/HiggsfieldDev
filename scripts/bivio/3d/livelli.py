# livelli.py <fx.wav> <vo.wav> <guadagno voce dB>: dove i suoni (senza voce) sono forti rispetto alla voce, finestra per finestra
import sys, subprocess, numpy as np
def leggi(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(float)
fx = leggi(sys.argv[1]); vo = leggi(sys.argv[2]) * 10 ** (float(sys.argv[3]) / 20); sr = 16000; h = int(0.25 * sr)
n = min(len(fx), len(vo)) // h
rms = lambda x: 20 * np.log10(np.sqrt((x[:n * h].reshape(n, h) ** 2).mean(1)) + 1e-9)
pk = lambda x: 20 * np.log10(np.abs(x[:n * h].reshape(n, h)).max(1) + 1e-9)
rf, rv, pf, pv = rms(fx), rms(vo), pk(fx), pk(vo)
print('voce: rms mediano mentre parla %.1f dB, picco %.1f | suoni: rms mediano %.1f, picco %.1f' % (np.median(rv[rv > -40]), pv.max(), np.median(rf), pf.max()))
print('--- i 25 momenti più forti dei suoni (rms su 0,25 s):')
for i in np.argsort(-rf)[:25]: print('  t=%6.2f  suoni rms %6.1f picco %6.1f | voce rms %6.1f' % (i * 0.25, rf[i], pf[i], rv[i]))
print('--- finestre in cui la voce parla forte (oltre -26 dB) e i suoni le stanno a meno di 3 dB:')
for i in range(n):
    if rv[i] > -26 and rf[i] > rv[i] - 3: print('  t=%6.2f  suoni %6.1f voce %6.1f' % (i * 0.25, rf[i], rv[i]))
