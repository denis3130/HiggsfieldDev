# provini.py <film> <t1,t2,...> <uscita.jpg> [colonne]: fotogrammi di controllo affiancati (rende quelli che mancano o tutti con RIFAI=1)
import sys, os, subprocess
from PIL import Image, ImageDraw
film, ts, out = sys.argv[1], [float(x) for x in sys.argv[2].split(',')], sys.argv[3]; col = int(sys.argv[4]) if len(sys.argv) > 4 else 6
K = os.environ.get('MOTION_REEL') or '/root/.claude/plugins/synced/a9f9448a-3c3a-40d2-a574-611db035a76e_1c8cab5d-b80b-45a2-ae9b-720beb80bd35/d92346f7-5140-4ddb-b284-a3b42995e5b0/skills/motion-reel'   # cartella della skill motion-reel
r = subprocess.run(['node', f'{K}/scripts/render.mjs', '--film', film, '--format', '9x16', '--noblur', '--fps', '30', '--workers', os.environ.get('WORKERS', '2'), '--at', ','.join(f'{t:g}' for t in ts)], capture_output=True, text=True)
err = [l for l in (r.stdout + r.stderr).splitlines() if 'rror' in l or '[404]' in l or 'arning' in l]
if err: print('\n'.join(err[:12]))
w, h = 360, 640; righe = (len(ts) + col - 1) // col
S = Image.new('RGB', (w * col, h * righe)); d = ImageDraw.Draw(S)
for i, t in enumerate(ts):
    f = f'out/{film}/stills/t{t:.3f}_9x16.png'
    if not os.path.exists(f): print('manca', f); continue
    S.paste(Image.open(f).resize((w, h)), ((i % col) * w, (i // col) * h)); d.text(((i % col) * w + 6, (i // col) * h + h - 16), f'{t:g}', fill='#ff0')
S.save(out, quality=86); print(out)
