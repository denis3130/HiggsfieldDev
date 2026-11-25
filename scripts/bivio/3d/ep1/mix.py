# Mix dell'episodio 1 de «Il testimone»: la voce + suoni veri CC0 agganciati alle stesse parole delle inquadrature (assets/parole.json).
# Uso: python3 mix.py [video_muto.mp4 uscita.mp4]     → audio/mix.wav (48 kHz, -14 LUFS) e, se indicato, il video con l'audio.
# I suoni stanno in scripts/bivio/sfx (licenze in licenze_suoni.json); LIB=<cartella> per prenderli altrove.
# La musica di sottofondo la sceglie l'utente: musica.json = {"file": brano in scripts/bivio/musica (licenze in licenze_musica.json),
#   "da": secondo da cui parte, "coda": secondi finali da scartare, "incrocio": dissolvenza quando il brano ricomincia, "filtri": filtri di ffmpeg sul brano,
#   "lufs": livello prima del volume finale, misurato senza i bassi sotto 200 Hz, cioè come si sente da un telefono (lì la voce è a -22,9 e la pioggia intorno a -31,5)}.
#   Può essere anche una lista di brani da sovrapporre. Un brano che manca (quelli dell'utente stanno solo sulla macchina, in musica/utente) si salta con un avviso.
#   Per provarne un'altra senza toccare musica.json: MUSICA=<file> oppure MUSICA='{"file": ..., "lufs": ...}' (o una lista); MUSICA=no la toglie.
# MIX=<file.wav> scrive il mix altrove (per le prove); SENZA_VOCE=1 lascia fuori la voce (per misurare i livelli).
import json, math, os, re, subprocess, sys, unicodedata
D = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.normpath(os.path.join(D, '../../sfx'))
if not os.path.isdir(LIB): LIB = '/home/user/HiggsfieldDev/scripts/bivio/sfx'
MLIB = os.environ.get('MLIB') or os.path.normpath(os.path.join(D, '../../musica'))
if not os.path.isdir(MLIB): MLIB = '/home/user/HiggsfieldDev/scripts/bivio/musica'
MUS = json.load(open(f'{D}/musica.json')) if os.path.exists(f'{D}/musica.json') else {}
if os.environ.get('MUSICA'):
    e = os.environ['MUSICA']; MUS = [] if e == 'no' else json.loads(e) if e.lstrip()[:1] in '{[' else {'file': e}
MUS = [m for m in (MUS if isinstance(MUS, list) else [MUS]) if m.get('file')]
MIX = os.environ.get('MIX') or f'{D}/audio/mix.wav'
# film.json: "inizio_fotogramma" dice da dove parte il video nel tempo della voce (l'aggancio iniziale è stato tagliato: vedi film.js),
# "duration" quanto dura il video. Qui T0 è quell'inizio in secondi, FINE la durata del video, END la fine nel tempo della voce:
# i suoni restano agganciati alle parole (tempo della voce) e `suono` li sposta; la musica invece parte con il video.
CFG = json.load(open(f'{D}/film.json')); T0 = CFG.get('inizio_fotogramma', 0) / 30; FINE = CFG['duration']; END = FINE + T0
RIGHE = json.load(open(f'{D}/assets/parole.json'))
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
def lunghezza(f): return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout or 0)
def suono(file, t, vol=1.0, ss=None, dur=None, filtri='', ciclo=False, dentro=0.0, fuori=0.0, lib=True):
    """mette un suono al tempo t (secondi della voce); quello che finisce prima dell'inizio del video (T0) si salta"""
    percorso = os.path.join(LIB, file) if lib else file
    if t < T0 and not ciclo and t + (dur if dur is not None else lunghezza(percorso) - (ss or 0)) <= T0 + 0.02: return
    arg = []
    if ciclo: arg += ['-stream_loop', '-1']
    if ss is not None: arg += ['-ss', f'{ss:.3f}']
    if dur is not None: arg += ['-t', f'{dur:.3f}']
    ING.append(arg + ['-i', percorso])
    i = len(ING) - 1; c = ['aresample=48000', 'aformat=channel_layouts=stereo']
    if filtri: c.append(filtri)
    if dentro: c.append(f'afade=t=in:st=0:d={dentro}')
    if fuori and dur: c.append(f'afade=t=out:st={max(0, dur - fuori):.3f}:d={fuori}')
    c.append(f'volume={vol}')
    if t < T0:          # comincia prima dell'inizio del video: se ne tiene solo la parte che resta, con un attacco morbido
        c.append(f'atrim=start={T0 - t:.4f},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.08')
    else: c.append(f'adelay={int((t - T0) * 1000)}:all=1')
    FIL.append(f'[{i}:a]' + ','.join(c) + f'[s{i}]')

LONTANO = 'lowpass=f=1700,aecho=0.8:0.6:90|180:0.3|0.18'        # un suono che arriva dal parcheggio, quattro piani più giù
vo = f'{D}/audio/vo.wav'
if os.path.exists(vo) and not os.environ.get('SENZA_VOCE'):
    # la voce entra sempre allo stesso livello (-19,4 LUFS, quello su cui sono tarati i suoni), qualunque motore l'abbia fatta
    mv = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', vo, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    lv = float(json.loads(mv[mv.rindex('{'):mv.rindex('}') + 1])['input_i'])
    suono(vo, 0, round(10 ** ((-19.4 - lv) / 20), 3), lib=False)
# --- la musica di sottofondo: un brano vero per tutto l'episodio, sempre allo stesso livello sotto la voce
TELEFONO = 'highpass=f=200,highpass=f=200'                     # l'altoparlante di un telefono non rende i bassi: i livelli della musica si misurano così
def volume_di(file, filtri='anull'):
    m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', file, '-af', f'{filtri},loudnorm=print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(json.loads(m[m.rindex('{'):m.rindex('}') + 1])['input_i'])
def musica(m, i=0):
    """prepara il brano: parte da m['da'], copre tutto l'episodio (se è più corto ricomincia con una dissolvenza incrociata; se gli manca
    poco, o con "ripeti": false, finisce nel silenzio), passa dai filtri e torna con il volume che lo porta al livello m['lufs']"""
    src = m['file'] if os.path.isabs(m['file']) else os.path.join(MLIB, m['file']); da = float(m.get('da', 0)); serve = FINE + 0.5
    if not os.path.exists(src): print('ATTENZIONE: manca la musica', src, '(saltata)'); return None
    lungo = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout) - da - float(m.get('coda', 0))
    X = float(m.get('incrocio', 4.0)); n = 1 if (lungo >= FINE - 2 or m.get('ripeti') is False) else math.ceil((serve - X) / (lungo - X))
    ing = sum([['-ss', f'{da:.3f}', '-t', f'{lungo:.3f}', '-i', src] for _ in range(n)], [])
    g = ';'.join(f'[{k}:a]aresample=48000,aformat=channel_layouts=stereo[c{k}]' for k in range(n)); u = '[c0]'
    for k in range(1, n): g += f';{u}[c{k}]acrossfade=d={X}:c1=qsin:c2=qsin[x{k}]'; u = f'[x{k}]'
    g += f";{u}apad,atrim=0:{serve:.3f},{m.get('filtri', 'highpass=f=70')}[m]"; out = f'{D}/audio/_musica{i}.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + ing + ['-filter_complex', g, '-map', '[m]', '-c:a', 'pcm_s24le', out], check=True)
    return out, round(10 ** ((float(m.get('lufs', -34)) - volume_di(out, TELEFONO)) / 20), 4), n
LETTI = []
for i, m in enumerate(MUS):
    r_ = musica(m, i)
    if r_: suono(r_[0], T0, r_[1], dur=FINE, dentro=float(m.get('entra', 1.0)), fuori=1.5, lib=False); LETTI.append((m, r_[1], r_[2], r_[0]))
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
graf = ';'.join(FIL) + ';' + ''.join(f'[s{i}]' for i in range(n)) + f'amix=inputs={n}:normalize=0:duration=longest,atrim=0:{FINE},afade=t=out:st={FINE - 0.8:.2f}:d=0.8[a]'
cmd = ['ffmpeg', '-v', 'error', '-y'] + sum(ING, []) + ['-filter_complex', graf, '-map', '[a]', '-c:a', 'pcm_f32le', '-ar', '48000', pre]
subprocess.run(cmd, check=True)
# volume a -14 LUFS in due passate (misura, poi correzione lineare: niente pompaggio)
m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', pre, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
af = f"loudnorm=I=-14:TP=-1:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
af += ',alimiter=limit=0.79:level=disabled:attack=3:release=60'          # picchi a -2 dB: la codifica AAC li rialza di oltre 1 dB
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', pre, '-af', af, '-ar', '48000', '-c:a', 'pcm_s16le', MIX], check=True); os.remove(pre)
print(f"mix: {n} tracce, durata {FINE} s (dal secondo {T0:.2f} della voce), misurato {j['input_i']} LUFS / picco {j['input_tp']} dB -> -14 LUFS" + (''.join(f"; musica {os.path.basename(m['file'])} da {m.get('da', 0)} s a {m.get('lufs', -34)} LUFS da telefono (volume {v}, {g} giro/i)" for m, v, g, _ in LETTI) if LETTI else '; senza musica'))
for _, _, _, f in LETTI:
    if os.path.exists(f): os.remove(f)
if len(sys.argv) > 2:
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', sys.argv[1], '-i', MIX, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', sys.argv[2]], check=True)
    print('scritto', sys.argv[2])
