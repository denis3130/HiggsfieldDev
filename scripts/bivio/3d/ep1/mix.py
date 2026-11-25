# Mix dell'episodio 1 de «Il testimone»: la voce + suoni veri CC0 agganciati alle stesse parole delle inquadrature (assets/parole.json).
# Uso: python3 mix.py [video_muto.mp4 uscita.mp4]     → audio/mix.wav (48 kHz, -14 LUFS) e, se indicato, il video con l'audio.
# I suoni stanno in scripts/bivio/sfx (licenze in licenze_suoni.json); LIB=<cartella> per prenderli altrove.
import json, os, re, subprocess, sys, unicodedata
D = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.normpath(os.path.join(D, '../../sfx'))
if not os.path.isdir(LIB): LIB = '/home/user/HiggsfieldDev/scripts/bivio/sfx'
RIGHE = json.load(open(f'{D}/assets/parole.json')); END = json.load(open(f'{D}/film.json'))['duration']
norm = lambda s: re.sub(r"[^a-z']", '', ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn'))
r = lambda n: RIGHE[n - 1][0][0]
rf = lambda n: RIGHE[n - 1][-1][1]
def w(n, parola, fine=0, quale=0):
    h = [x for x in RIGHE[n - 1] if norm(x[2]) == norm(parola)]
    return h[min(quale, len(h) - 1)][fine] if h else r(n)

# ---- gli stessi momenti del film (film.js)
g2 = r(2) - 0.12; grida = rf(3) + 0.12
tG, tL, tC = w(6, 'graffia') + 0.12, w(7, 'luccica') + 0.1, w(7, 'cade')
tRec = w(10, 'dodici') - 0.12; su13 = r(13) + 0.05; buio = w(17, 'luce') + 0.12; agente = w(20, 'agente') - 0.15
K3 = [rf(22) + 0.22, rf(22) + 0.62, rf(22) + 1.02]; cutA = w(23, 'guardi') - 0.18; scr = w(26, 'scricchiola')
chiuso = rf(11) + 0.3; ferma = w(21, 'ferma') + 0.1

ING, FIL = [], []          # ingressi di ffmpeg e catene di filtri
def suono(file, t, vol=1.0, ss=None, dur=None, filtri='', ciclo=False, dentro=0.0, fuori=0.0, lib=True):
    """mette un suono al tempo t (secondi del film)"""
    arg = []
    if ciclo: arg += ['-stream_loop', '-1']
    if ss is not None: arg += ['-ss', f'{ss:.3f}']
    if dur is not None: arg += ['-t', f'{dur:.3f}']
    ING.append(arg + ['-i', os.path.join(LIB, file) if lib else file])
    i = len(ING) - 1; c = ['aresample=48000', 'aformat=channel_layouts=stereo']
    if filtri: c.append(filtri)
    if dentro: c.append(f'afade=t=in:st=0:d={dentro}')
    if fuori and dur: c.append(f'afade=t=out:st={max(0, dur - fuori):.3f}:d={fuori}')
    c.append(f'volume={vol}'); c.append(f'adelay={max(0, int(t * 1000))}:all=1')
    FIL.append(f'[{i}:a]' + ','.join(c) + f'[s{i}]')

LONTANO = 'lowpass=f=1700,aecho=0.8:0.6:90|180:0.3|0.18'        # un suono che arriva dal parcheggio, quattro piani più giù
vo = f'{D}/audio/vo.wav'
if os.path.exists(vo):
    # la voce entra sempre allo stesso livello (-19,4 LUFS, quello su cui sono tarati i suoni), qualunque motore l'abbia fatta
    mv = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', vo, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    lv = float(json.loads(mv[mv.rindex('{'):mv.rindex('}') + 1])['input_i'])
    suono(vo, 0, round(10 ** ((-19.4 - lv) / 20), 3), lib=False)
# --- ambienti: pioggia fuori, pioggia dietro il vetro in cucina, buio di fondo per tutto l'episodio
fuori = [(0.0, g2), (r(4) - 0.1, r(18) - 0.2), (agente, r(21) - 0.25)]
dentro = [(r(3) - 0.15, r(4) - 0.1), (r(18) - 0.2, agente)]
for a, b in fuori: suono('pioggia_notte.mp3', a, 0.9, ss=5 + a % 60, dur=b - a, filtri='lowpass=f=6000', dentro=0.25, fuori=0.3)
for a, b in dentro: suono('pioggia_finestra.mp3', a, 0.55, dur=b - a, ciclo=True, filtri='lowpass=f=2500', dentro=0.25, fuori=0.3)
suono('amb_slow.mp3', 0, 0.15, ss=6, dur=END, ciclo=True, dentro=1.5, fuori=1.2)
# --- l'aggancio
suono('colpo.mp3', w(1, 'uccidere', 1) - 0.05, 0.4, filtri='aecho=0.8:0.6:120|260:0.3|0.18')
for i, x in enumerate([0.75, 1.0, 1.25]): suono('bussata.mp3', g2 + x - 0.03, [0.8, 0.85, 0.45][i], ss=[0.97, 1.27, 1.57][i], dur=[0.3, 0.3, 0.43][i], filtri='equalizer=f=110:t=q:w=0.9:g=6', fuori=0.05)
# --- la cucina: il grido da fuori, la tenda
suono('grido.mp3', grida, 1.15, filtri='lowpass=f=2400,aecho=0.8:0.6:90|180:0.3|0.18')
suono('stoffa.mp3', r(4) + 0.2, 0.35)
# --- sotto il lampione: i passi nella zuffa, il crescendo fino al luccichio, il tonfo
for k in range(4): suono('scivolata.mp3', r(6) + 0.1 + k * 0.42, 0.16, filtri=LONTANO)
suono('riser.mp3', tL - 3.5, 0.22)
suono('tonfo.mp3', tC + 0.5, 0.75, filtri='lowpass=f=1500,aecho=0.8:0.5:80|160:0.25|0.12')
# --- il battito: dalla caduta fino alla telefonata, più forte quando lui alza la testa
suono('heart60.mp3', r(8), 1.0, dur=r(21) - r(8), ciclo=True, dentro=1.0, fuori=1.0,
      filtri=f"volume='0.3+0.25*clip((t-{su13 - r(8):.2f})/0.6,0,1)-0.27*clip((t-{buio - r(8):.2f})/1.5,0,1)':eval=frame")
# --- il telefono: il trascinamento, il baule che si chiude piano
suono('stoffa.mp3', tRec + 0.9, 0.2, filtri=LONTANO)
suono('baule.mp3', chiuso - 0.12, 1.0, filtri='lowpass=f=2200,aecho=0.8:0.5:90|170:0.25|0.12')
suono('colpo.mp3', su13 + 0.45, 0.5, filtri='aecho=0.8:0.6:120|260:0.3|0.18')
# --- conta i piani: un crescendo scuro fino al dito sulle labbra
suono('rise_long.mp3', r(15) - 0.3, 0.55, ss=14, dur=rf(16) + 1.0 - r(15) + 0.3, dentro=0.8, fuori=0.6)
# --- la luce, la telefonata, la radio
suono('interruttore.mp3', buio - 0.03, 0.45)
suono('squillo.mp3', r(18) + 0.05, 0.22, dur=1.7, filtri='highpass=f=350,lowpass=f=2800', fuori=0.1)
suono('radio_bip.mp3', agente + 0.45, 0.3, filtri=LONTANO)
suono('colpo.mp3', agente + 0.05, 0.35, filtri='aecho=0.8:0.6:120|260:0.3|0.18')
# --- l'ingresso: l'ascensore che sale e si ferma col colpo, il campanello del piano, i tre colpi
a0 = r(21) + 0.15
suono('ascensore.mp3', a0, 2.4, ss=27.1 - (ferma - a0), dur=(ferma - a0) + 1.2, filtri='lowpass=f=2600', dentro=1.5, fuori=0.45)
suono('ascensore_ding.mp3', rf(21) + 0.14, 0.4, filtri='lowpass=f=3800')
for i, x in enumerate(K3): suono('bussata.mp3', x - 0.03, [2.5, 2.7, 1.05][i], ss=[0.97, 1.27, 1.57][i], dur=[0.3, 0.3, 0.45][i], filtri='equalizer=f=110:t=q:w=0.9:g=6,aecho=0.85:0.5:38|82:0.22|0.12', fuori=0.05)
suono('heart60.mp3', cutA + 0.06, 1.0, dur=END - cutA, ciclo=True, dentro=0.8, filtri="atempo=1.15,volume='0.42+0.2*min(1,t/6)':eval=frame")
# --- lo spioncino: crescendo e colpo sui graffi
suono('riser.mp3', w(25, 'graffi') - 3.5, 0.3)
suono('colpo.mp3', w(25, 'freschi') - 0.02, 0.5, filtri='aecho=0.8:0.6:120|260:0.3|0.18')
# --- il pavimento, la voce dietro la porta, le carte
suono('legno.mp3', scr - 0.12, 0.6, ss=3.28, dur=0.75, fuori=0.1)
suono('rise_long.mp3', r(28) - 0.2, 0.5, ss=12, dur=r(30) - r(28) + 0.2, dentro=1.0, fuori=0.4)
suono('colpo.mp3', r(30) - 0.12, 0.55, filtri='aecho=0.8:0.6:120|260:0.3|0.18')
suono('rise_long.mp3', r(30), 0.35, ss=20, dur=END - r(30), dentro=1.0, fuori=1.2)

n = len(ING); pre = f'{D}/audio/_premix.wav'
graf = ';'.join(FIL) + ';' + ''.join(f'[s{i}]' for i in range(n)) + f'amix=inputs={n}:normalize=0:duration=longest,atrim=0:{END},afade=t=out:st={END - 0.8:.2f}:d=0.8[a]'
cmd = ['ffmpeg', '-v', 'error', '-y'] + sum(ING, []) + ['-filter_complex', graf, '-map', '[a]', '-c:a', 'pcm_f32le', '-ar', '48000', pre]
subprocess.run(cmd, check=True)
# volume a -14 LUFS in due passate (misura, poi correzione lineare: niente pompaggio)
m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', pre, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
af = f"loudnorm=I=-14:TP=-1:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
af += ',alimiter=limit=0.79:level=disabled:attack=3:release=60'          # picchi a -2 dB: la codifica AAC li rialza di oltre 1 dB
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', pre, '-af', af, '-ar', '48000', '-c:a', 'pcm_s16le', f'{D}/audio/mix.wav'], check=True); os.remove(pre)
print(f"mix: {n} tracce, durata {END} s, misurato {j['input_i']} LUFS / picco {j['input_tp']} dB -> -14 LUFS")
if len(sys.argv) > 2:
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', sys.argv[1], '-i', f'{D}/audio/mix.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', sys.argv[2]], check=True)
    print('scritto', sys.argv[2])
