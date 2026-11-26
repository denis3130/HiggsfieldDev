# Mix dell'episodio 2 de «Il testimone» («La mano tesa»): la voce + suoni veri CC0 agganciati alle stesse parole delle inquadrature (assets/parole.json).
# Uso: python3 mix.py [video_muto.mp4 uscita.mp4]     → audio/mix.wav (48 kHz, -14 LUFS) e, se indicato, il video con l'audio.
# I suoni stanno in scripts/bivio/sfx (licenze in licenze_suoni.json); LIB=<cartella> per prenderli altrove. Quelli nuovi dell'episodio 2: campanello, chiavi,
# serratura, chiavi_porta, catenella, passi_piastrelle, ringhiera, finestra, vento (tutti CC0, scelti dal titolo e dalla forma d'onda: i volumi vanno riascoltati).
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
K2 = [r(2) + 0.55, r(2) + 0.9, r(2) + 1.25]; resti = w(2, 'resti') - 0.15
tS = r(3) - 0.25; tGira = r(3) + 0.3; tVa = tGira + 0.9; tArr = w(3, 'suona') + 0.5; tSuona = tArr + 0.15; tApre = r(4) - 0.35; tChiude = r(5) + 0.1; buioA = w(5, 'piante') + 0.1
esce = r(7) - 0.3; soc = w(7, 'portafinestra') - 0.2; auto = w(8, "l'auto") - 0.25
bagn = w(10, 'è') - 0.15; nong = w(10, 'non') - 0.15; poi = w(11, 'poi') - 0.15; cisei = w(11, 'ci') - 0.2
acc = w(13, 'accende') + 0.15; sogg = rf(14) + 0.25; apre = w(15, 'apre') - 0.2; dita = w(16, 'sono') - 0.3; spunta = w(19, 'spunta') - 0.1

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
# --- ambienti: in casa la pioggia dietro i vetri; dal balcone in poi la pioggia vera, col vento a folate; il buio di fondo per tutto l'episodio
suono('pioggia_finestra.mp3', 0, 0.4, dur=esce + 0.3, ciclo=True, filtri='lowpass=f=2200', dentro=0.4, fuori=0.5)
suono('pioggia_notte.mp3', esce, 0.95, ss=8, dur=END - esce, ciclo=True, filtri='lowpass=f=6000', dentro=0.6, fuori=0.6)
suono('amb_slow.mp3', 0, 0.15, ss=6, dur=END, ciclo=True, dentro=1.5, fuori=1.2)
for t in (soc + 0.2, nong - 0.1, r(13) - 1.2, r(18) + 0.3, r(21) - 0.2): suono('vento.mp3', t, 5.0, filtri='lowpass=f=3000', dentro=0.8, fuori=1.5, dur=5.3)
MURO = 'lowpass=f=1500,aecho=0.8:0.5:60|130:0.25|0.12'          # un suono che arriva da dietro la porta di casa
DENTRO = 'lowpass=f=900,aecho=0.8:0.5:70|150:0.3|0.15'           # un suono che arriva da dentro casa tua, sentito dal balcone accanto
COLPO = 'aecho=0.8:0.6:120|260:0.3|0.18'
# --- «Avete scelto la B.» / lui bussa ancora, tu fermo
suono('colpo.mp3', 0.15, 0.4, filtri=COLPO)
for i, x in enumerate(K2): suono('bussata.mp3', x - 0.03, [2.5, 2.7, 1.05][i], ss=[0.97, 1.27, 1.57][i], dur=[0.3, 0.3, 0.45][i], filtri='equalizer=f=110:t=q:w=0.9:g=6,aecho=0.85:0.5:38|82:0.22|0.12', fuori=0.05)
suono('heart60.mp3', resti, 1.0, dur=esce - resti, ciclo=True, dentro=0.8, fuori=0.8, filtri="atempo=1.1,volume='0.4':eval=frame")
# --- dallo spioncino: i suoi passi sul pianerottolo, il campanello della vicina, la catenella, la luce delle scale che scatta
suono('passi_piastrelle.mp3', tVa, 7.5, ss=1.4, dur=max(0.6, tArr - tVa), filtri=MURO, fuori=0.15)
suono('campanello.mp3', tSuona + 0.3, 0.2, filtri=MURO)
suono('catenella.mp3', tApre - 0.25, 0.5, filtri=MURO)
suono('porta_cigola.mp3', tApre + 0.05, 0.22, dur=1.2, filtri=MURO, fuori=0.3)
suono('legno.mp3', tChiude, 0.3, ss=3.28, dur=0.75, filtri=MURO, fuori=0.1)
suono('interruttore.mp3', buioA - 0.02, 0.5, filtri=MURO)
suono('colpo.mp3', buioA + 0.55, 0.5, filtri=COLPO)
# --- il telefono; fuori dalla porta tornano le chiavi
suono('chiavi.mp3', w(6, 'mandato') - 0.1, 0.5, filtri=MURO)
suono('riser.mp3', r(7) - 3.6, 0.2)
# --- sul balcone: la portafinestra, il vuoto, il corrimano
suono('finestra.mp3', esce + 0.1, 0.9, fuori=0.4)
suono('rise_long.mp3', r(8) - 0.2, 0.4, ss=14, dur=rf(8) + 0.6 - r(8), dentro=1.0, fuori=0.8)
suono('colpo.mp3', w(8, 'lei') - 0.05, 0.35, filtri=COLPO)
suono('ringhiera.mp3', r(10) + 0.12, 0.3, filtri='lowpass=f=2400')
suono('stoffa.mp3', bagn + 0.3, 0.35)
suono('ringhiera.mp3', bagn + 0.42, 0.18, filtri='lowpass=f=1800')
suono('riser.mp3', nong - 0.4, 0.2)
suono('heart60.mp3', nong, 1.0, dur=r(12) - nong, ciclo=True, dentro=0.6, fuori=1.0, filtri="atempo=1.25,volume='0.5':eval=frame")
for t in (r(11) + 0.55, poi + 0.45): suono('scivolata.mp3', t, 0.3, dur=0.6, fuori=0.15)
for t in (r(11) + 0.25, poi + 0.15): suono('ringhiera.mp3', t, 0.14, filtri='lowpass=f=1800')
suono('tonfo.mp3', cisei + 0.1, 0.35, filtri='lowpass=f=1800')
suono('respiro.mp3', cisei + 0.3, 0.5, dur=r(13) - cisei - 0.6, dentro=0.2, fuori=0.8)
suono('stoffa.mp3', r(12) + 0.6, 0.3)
# --- in casa tua: le chiavi nella porta, la luce, i suoi passi da una stanza all'altra
suono('chiavi_porta.mp3', r(13) - 2.3, 1.3, filtri=DENTRO)
suono('porta_cigola.mp3', r(13) - 0.2, 0.25, dur=1.6, filtri=DENTRO, fuori=0.4)
suono('interruttore.mp3', acc - 0.02, 0.35, filtri=DENTRO)
suono('colpo.mp3', acc + 0.05, 0.45, filtri=COLPO)
suono('interruttore.mp3', sogg - 0.02, 0.4, filtri=DENTRO)
suono('passi_piastrelle.mp3', r(15) - 0.1, 9.0, ss=2.0, dur=dita - r(15), filtri=DENTRO, dentro=0.3, fuori=0.3)
suono('porta_cigola.mp3', apre, 0.22, dur=1.4, filtri=DENTRO, fuori=0.4)
suono('interruttore.mp3', apre + 0.33, 0.35, filtri=DENTRO)
suono('rise_long.mp3', r(16) - 0.2, 0.45, ss=12, dur=rf(16) + 1.0 - r(16), dentro=1.0, fuori=0.5)
suono('finestra.mp3', dita + 0.45, 1.0, fuori=0.5)
# --- i passi escono sul balcone e si fermano; il respiro trattenuto
suono('passi_piastrelle.mp3', r(17) + 0.15, 11.0, ss=7.6, dur=max(0.7, w(17, 'fermano') + 0.25 - r(17)), filtri='lowpass=f=4000', fuori=0.12)
suono('heart60.mp3', w(17, 'fermano') + 0.3, 1.0, dur=r(20) - w(17, 'fermano') - 0.3, ciclo=True, dentro=0.5, fuori=1.2, filtri="atempo=1.3,volume='0.5+0.25*min(1,t/5)':eval=frame")
# --- la sua faccia: un crescendo scuro e il colpo quando è fuori del tutto
suono('rise_long.mp3', r(19) - 0.3, 0.6, ss=14, dur=rf(19) + 0.9 - r(19), dentro=0.8, fuori=0.5)
suono('colpo.mp3', rf(19) + 0.45, 0.6, filtri=COLPO)
suono('ringhiera.mp3', r(19) - 0.1, 0.16, filtri='lowpass=f=1800')
suono('colpo.mp3', w(22, 'mano') + 0.3, 0.35, filtri=COLPO)
# --- le carte
suono('colpo.mp3', r(24) - 0.12, 0.55, filtri=COLPO)
suono('rise_long.mp3', r(24), 0.35, ss=20, dur=END - r(24), dentro=1.0, fuori=1.2)

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
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', sys.argv[1], '-i', MIX, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', sys.argv[2]], check=True)
    print('scritto', sys.argv[2])
