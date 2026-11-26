# lufs_tratti.py <file> <guadagno dB> a:b [a:b ...]: volume percepito (LUFS, pesato K) di ogni tratto
import sys, subprocess, re
f, g = sys.argv[1], float(sys.argv[2])
for tr in sys.argv[3:]:
    a, b = map(float, tr.split(':'))
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-ss', str(a), '-t', str(b - a), '-i', f, '-af', f'volume={g}dB,ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', e); print(f'  {a:6.1f}-{b:6.1f}: {m[-1] if m else "?"} LUFS')
