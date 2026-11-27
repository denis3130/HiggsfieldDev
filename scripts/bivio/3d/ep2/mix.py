# Mix dell'episodio 2 de «Il testimone» («Interno 11», la terza versione approvata il 27/11): la voce + suoni veri CC0 agganciati alle stesse parole
# delle inquadrature (assets/parole.json, gli stessi conti di film.js). Il mix della prima versione («La mano tesa», bocciata) è nella storia del repository.
# Uso: python3 mix.py [video_muto.mp4 uscita.mp4]     → audio/mix.wav (48 kHz, -14 LUFS) e, se indicato, il video con l'audio.
# I suoni stanno in scripts/bivio/sfx (licenze in licenze_suoni.json); LIB=<cartella> per prenderli altrove. Quelli nuovi dell'episodio 2: campanello, chiavi,
# serratura, chiavi_porta, catenella, passi_piastrelle, ringhiera, finestra, vento; per «Interno 11»: vetro, vetro_schegge, scricchiolio, maniglia,
# maniglia_finestra, corsa_scale, corsa_strada (tutti CC0, scelti dal titolo e dalla forma d'onda: i volumi si misurano contro la voce).
# La musica di sottofondo la sceglie l'utente: musica.json = {"file": brano in scripts/bivio/musica (licenze in licenze_musica.json),
#   "da": secondo da cui parte, "coda": secondi finali da scartare, "incrocio": dissolvenza quando il brano ricomincia, "filtri": filtri di ffmpeg sul brano,
#   "lufs": livello prima del volume finale, misurato senza i bassi sotto 200 Hz, cioè come si sente da un telefono (lì la voce è a -22,9 e la pioggia intorno a -31,5)}.
#   Può essere anche una lista di brani da sovrapporre. Un brano che manca (quelli dell'utente stanno solo sulla macchina, in musica/utente) si salta con un avviso.
#   Per provarne un'altra senza toccare musica.json: MUSICA=<file> oppure MUSICA='{"file": ..., "lufs": ...}' (o una lista); MUSICA=no la toglie.
# MIX=<file.wav> scrive il mix altrove (per le prove); SENZA_VOCE=1 lascia fuori la voce, GREZZO=1 non normalizza (per misurare i livelli dei suoni contro la voce).
# ELENCO=1 stampa ogni suono (inizio, fine, volume) senza fare il mix: per sapere cosa suona in un punto (es. `ELENCO=1 python3 mix.py | awk '$1 < 74 && $2 > 73'`).
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

# ---- gli stessi momenti del film (film.js, sequenza())
tOm = w(2, 'respiri') - 0.25; tVia = rf(2) + 0.75; tS = tVia + 0.55
tGira = tS + 0.15; tVa = tGira + 0.45; tArr = tVa + 1.25; tSuona = tArr + 0.1; tApre = r(3) - 0.35; tChiude = r(4) + 0.1; buioA = w(4, 'piante') + 0.1
tVai = r(5) - 0.28; esce = w(5, 'trovarle') + 0.35
tGu = r(6) - 0.2; c0 = rf(6) + 0.15; tChiave = c0 + 2.35; tNg = tChiave + 1.45; tPd = tNg + 1.1; tCi = tPd + 1.45; tChiusa = r(7) - 0.1; bagn = c0 + 1.15
tVaso = w(7, 'per') - 0.1; tAsp = w(8, 'aspetti') - 1.1; tRompe = rf(8) + 2.0; lampoL = tAsp + 2.9; tMano = tRompe + 1.05; tDentro = r(9) + 0.5
tMuro = w(9, 'e') - 0.05; tLui = r(10) - 0.05; tPasso = r(11) - 0.15; tScr = w(11, 'scricchiola'); tGelo = tScr + 0.15; tSez = r(12) - 0.1; tRip = r(13) - 0.1
tPorta = r(14) - 0.05; tScopre = w(14, 'dà') - 0.1; tScala = tScopre + 1.65; tFuori = r(15) - 0.1; tRespiri = r(16) - 0.25
tVibra = r(17) - 0.1; tSchermo = w(17, 'è') - 0.05; tChiama = r(18) - 0.05; tPol = w(18, 'polizia') - 0.1; tAda = r(19) - 0.2; tChina = r(20) - 0.1; tDito = w(20, 'notte') + 0.45; tCarte = r(21) - 0.2

ING, FIL = [], []          # ingressi di ffmpeg e catene di filtri
def lunghezza(f): return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout or 0)
def suono(file, t, vol=1.0, ss=None, dur=None, filtri='', ciclo=False, dentro=0.0, fuori=0.0, lib=True):
    """mette un suono al tempo t (secondi della voce); quello che finisce prima dell'inizio del video (T0) si salta"""
    percorso = os.path.join(LIB, file) if lib else file
    if os.environ.get('ELENCO'): print(f"{t:7.2f} {t + (dur if dur is not None else lunghezza(percorso) - (ss or 0)):7.2f} {vol:6.2f} {os.path.basename(file)}")
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
def inviluppo(punti, da):
    """volume a tratti lineari [(t, v), ...] nel tempo della voce, per un suono che parte al secondo `da` (dentro il filtro t è il tempo del suono)"""
    T = f'(t+{da:.3f})'; e = f'{punti[-1][1]}'
    for (t0, v0), (t1, v1) in reversed(list(zip(punti, punti[1:]))):
        e = f'if(lt({T},{t1:.3f}),{v0}+({v1}-{v0})*({T}-{t0:.3f})/{max(0.001, t1 - t0):.3f},{e})'
    return f"volume='if(lt({T},{punti[0][0]:.3f}),{punti[0][1]},{e})':eval=frame"
# i silenzi alla maniera dei Coen (sezione 5 di FORMATO_STORIA): l'ombra sotto la porta, lo scavalco, il viso che si gela. Lì la musica scende quasi a zero.
SILENZI = [(tOm - 0.3, tVia + 0.4), (c0 - 0.2, tCi + 0.2), (tGelo - 0.15, tSez + 1.7)]
def duck(da=0.0, giu=0.2, rampa=0.5):
    p = [(0, 1.0)]
    for a, b in SILENZI: p += [(a - rampa, 1.0), (a, giu), (b, giu), (b + rampa, 1.0)]
    return inviluppo(p, da)
for i, m in enumerate(MUS):
    r_ = musica(m, i)
    if r_: suono(r_[0], T0, r_[1], dur=FINE, dentro=float(m.get('entra', 1.0)), fuori=1.5, lib=False, filtri=duck(T0)); LETTI.append((m, r_[1], r_[2], r_[0]))

# --- ambienti. In casa tua e dalla signora Ada la pioggia dietro i vetri; fuori la pioggia vera, che si alza e si abbassa con dove sta la camera:
#     forte sul balcone e in strada, attutita nell'appartamento vuoto (il vetro rotto) e nel tuo soggiorno, quasi niente sulla scala e dalla signora Ada.
#     (la registrazione della pioggia nei primi 57 secondi ha dei colpi secchi, uno fortissimo a 49 s: si usa solo la parte pulita, in due pezzi)
FUORI = [(esce, 0.95), (tChiave - 0.05, 0.95), (tChiave + 0.05, 0.3), (tNg - 0.05, 0.3), (tNg + 0.05, 1.0), (tRompe, 1.0), (tRompe + 1.5, 0.6), (tMuro + 0.9, 0.6), (tMuro + 1.1, 0.4),
         (tGelo - 0.15, 0.4), (tGelo + 0.05, 0.12), (tSez - 0.05, 0.12), (tSez + 0.05, 0.75),      # (il viso che si gela: anche la pioggia si ritira) (tPorta - 0.05, 0.75), (tPorta + 0.05, 0.5), (tScopre - 0.05, 0.5), (tScopre + 0.05, 0.8), (tScala - 0.05, 0.8), (tScala + 0.05, 0.12),
         (tFuori - 0.4, 0.12), (tFuori + 0.1, 1.2), (tRespiri - 0.05, 1.2), (tRespiri + 0.1, 0.75), (tAda - 0.05, 0.75), (tAda + 0.05, 0.0), (END, 0.0)]
suono('pioggia_notte.mp3', esce, 1.0, ss=58, dur=58.0, filtri='lowpass=f=6000,' + inviluppo(FUORI, esce), dentro=0.6, fuori=1.5)
suono('pioggia_notte.mp3', esce + 57.0, 1.0, ss=70, dur=END - esce - 57.0, filtri='lowpass=f=6000,' + inviluppo(FUORI, esce + 57.0), dentro=1.5, fuori=0.6)
suono('pioggia_finestra.mp3', 0, 0.4, dur=esce + 0.4, ciclo=True, filtri='lowpass=f=2200', dentro=0.4, fuori=0.5)
suono('pioggia_finestra.mp3', tChiave, 0.45, dur=tNg - tChiave, ciclo=True, filtri='lowpass=f=2200', dentro=0.05, fuori=0.05)
suono('pioggia_finestra.mp3', tAda, 0.22, dur=END - tAda, ciclo=True, filtri='lowpass=f=1600', dentro=0.1, fuori=1.0)
suono('amb_slow.mp3', 0, 0.15, ss=6, dur=END, ciclo=True, dentro=1.5, fuori=1.2, filtri=duck(0, 0.3))      # (anche il fondo scuro si ritira nei silenzi)
for t in (esce + 0.3, tGu + 0.2, tNg - 0.2): suono('vento.mp3', t, 4.0, filtri='lowpass=f=3000', dentro=0.8, fuori=1.5, dur=5.3)
MURO = 'lowpass=f=1500,aecho=0.8:0.5:60|130:0.25|0.12'          # da dietro la porta di casa (il pianerottolo)
DENTRO = 'lowpass=f=700,aecho=0.8:0.5:70|150:0.3|0.15'           # da dietro il muro, nel tuo soggiorno
COLPO = 'aecho=0.8:0.6:120|260:0.3|0.18'
SCALA = 'aecho=0.8:0.7:90|210|380:0.45|0.3|0.18'                 # la tromba delle scale: rimbomba
NEL_TELEFONO = 'highpass=f=450,lowpass=f=3000'                    # sentito dentro il telefono
# --- «Avete scelto la B.»; poi l'ombra dei suoi piedi sotto la porta, il cuore; l'ombra se ne va (i passi sul pianerottolo)
suono('colpo.mp3', 0.15, 0.4, filtri=COLPO)
suono('heart60.mp3', tOm - 0.4, 1.0, dur=esce - tOm + 0.4, ciclo=True, dentro=0.8, fuori=0.8, filtri="atempo=1.1,volume='0.42':eval=frame")
suono('passi_piastrelle.mp3', tVia - 0.05, 6.5, ss=1.4, dur=1.4, filtri=MURO, fuori=0.5)
# --- dallo spioncino: i suoi passi fino alla porta di fronte, il campanello, la catenella, la porta della vicina, la luce delle scale che scatta
suono('passi_piastrelle.mp3', tVa, 7.5, ss=1.4, dur=max(0.6, tArr - tVa), filtri=MURO, fuori=0.15)
suono('campanello.mp3', tSuona + 0.3, 0.2, filtri=MURO)
suono('catenella.mp3', tApre - 0.25, 0.5, filtri=MURO)
suono('porta_cigola.mp3', tApre + 0.05, 0.22, dur=1.2, filtri=MURO, fuori=0.3)
suono('legno.mp3', tChiude, 0.3, ss=3.28, dur=0.75, filtri=MURO, fuori=0.1)
suono('interruttore.mp3', buioA - 0.02, 0.5, filtri=MURO)
suono('colpo.mp3', buioA + 0.45, 0.5, filtri=COLPO)
# --- vai al balcone: la portafinestra
suono('passi_piastrelle.mp3', tVai + 1.2, 2.2, ss=7.6, dur=esce - tVai - 1.0, filtri='lowpass=f=2500', fuori=0.2)
suono('finestra.mp3', esce + 0.1, 0.9, fuori=0.4)
# --- lo scavalco, senza voce: il corrimano bagnato, la mano che scivola; la chiave che gira nella tua porta e la porta che si apre (lo sentiamo da dentro);
#     fuori dalla ringhiera il cuore più veloce; il piede, l'atterraggio, il fiato
suono('ringhiera.mp3', c0 + 0.12, 0.3, filtri='lowpass=f=2400')
suono('stoffa.mp3', c0 + 0.5, 0.3)
suono('scivolata.mp3', bagn + 0.33, 0.35, dur=0.5, fuori=0.15)
suono('ringhiera.mp3', bagn + 0.4, 0.2, filtri='lowpass=f=1800')
suono('serratura.mp3', tChiave - 0.35, 1.0)
suono('porta_cigola.mp3', tChiave + 0.12, 0.35, dur=1.4, fuori=0.4)
suono('heart60.mp3', tNg, 1.0, dur=tChiusa - tNg, ciclo=True, dentro=0.3, fuori=0.8, filtri="atempo=1.3,volume='0.45':eval=frame")
for t in (tPd + 0.25, tPd + 0.85): suono('passi_bagnati.mp3', t, 0.25, ss=0.0, dur=0.45, fuori=0.15)
for t in (tPd + 0.2, tPd + 0.8): suono('ringhiera.mp3', t, 0.14, filtri='lowpass=f=1800')
suono('tonfo.mp3', tCi + 0.1, 0.3, filtri='lowpass=f=1800')
suono('respiro.mp3', tCi + 0.3, 0.45, dur=tChiusa - tCi - 0.2, dentro=0.2, fuori=0.6)
# --- la portafinestra chiusa: due spinte, il telaio che sbatte; il vaso
for t in (tChiusa + 0.55, tChiusa + 1.3): suono('maniglia.mp3', t, 0.45, ss=0.3, dur=0.35, filtri='lowpass=f=2600', fuori=0.1)
suono('stoffa.mp3', tVaso + 1.25, 0.25)
# --- «Aspetti il tuono.»: il cuore, il lampo lontano col suo brontolio, poi il tuono vero che copre il vetro (il colpo del tuono cade insieme al vetro)
suono('heart60.mp3', tAsp, 1.0, dur=tRompe - tAsp, ciclo=True, dentro=0.6, fuori=0.15, filtri="atempo=1.45,volume='0.32+0.3*min(1,t/4)':eval=frame")
suono('tuono.mp3', lampoL + 0.7, 0.35, ss=4.0, dur=3.0, filtri='lowpass=f=500', dentro=0.4, fuori=1.0)
suono('tuono.mp3', tRompe - 0.78, 0.7, dur=9.0, fuori=3.0)
suono('vetro.mp3', tRompe - 0.2, 0.42, filtri='lowpass=f=9000')      # (l'attacco del vetro, troppo secco, l'AAC lo gonfiava fino a 0 dB)
suono('vetro_schegge.mp3', tRompe + 0.15, 0.3, filtri='lowpass=f=7000')
# --- la mano nel buco: la martellina che gira, l'anta che si apre; i vetri sotto le scarpe
suono('maniglia_finestra.mp3', tMano + 0.02, 0.6)
suono('finestra.mp3', tMano + 0.62, 0.3, dur=0.8, fuori=0.3)
for t in (tDentro + 0.25, tDentro + 0.85): suono('vetro_schegge.mp3', t, 0.22, ss=1.55, dur=0.45, filtri='lowpass=f=5000', fuori=0.15)
# --- la camera passa il muro: un colpo sordo; di là c'è lui
suono('colpo.mp3', tMuro + 0.92, 0.35, filtri='lowpass=f=260,' + COLPO)
# --- «Fai un passo. Il pavimento scricchiola.»: il parquet; poi il silenzio
suono('scricchiolio.mp3', tScr - 0.45, 0.55)
# --- lo spaccato: i suoi passi di là dal muro, si fermano; la mano sul muro; poi riprendono verso il balcone. I tuoi, piano, verso la porta
suono('passi_piastrelle.mp3', tSez + 0.2, 4.5, ss=2.0, dur=1.45, filtri=DENTRO, fuori=0.2)
suono('tonfo.mp3', tSez + 1.85, 0.18, filtri='lowpass=f=500')
suono('heart60.mp3', tSez + 2.2, 1.0, dur=tScala - tSez - 2.2, ciclo=True, dentro=1.0, fuori=0.5, filtri="atempo=1.35,volume='0.4':eval=frame")
suono('passi_piastrelle.mp3', tRip + 0.15, 4.0, ss=4.4, dur=2.9, filtri=DENTRO, dentro=0.1, fuori=0.4)
suono('passi_piastrelle.mp3', tRip + 0.9, 1.4, ss=9.0, dur=2.4, filtri='lowpass=f=2000', fuori=0.3)
# --- la porta d'ingresso dell'appartamento vuoto: la maniglia, la porta che si apre sull'altra scala; lui sul balcone che vede il vetro
suono('maniglia.mp3', tPorta + 0.25, 0.5, ss=0.25, dur=0.7, fuori=0.15)
suono('porta_cigola.mp3', tPorta + 1.1, 0.1, dur=1.3, filtri='lowpass=f=3500', fuori=0.4)
suono('vento.mp3', tScopre + 0.2, 2.5, filtri='lowpass=f=3000', dentro=0.8, fuori=1.5, dur=4.0)
suono('passi_bagnati.mp3', tScopre - 0.1, 0.18, ss=2.0, dur=1.0, fuori=0.3)
suono('riser.mp3', tScopre + 0.1, 0.25)
# --- giù per la scala di corsa, poi fuori sotto la pioggia
suono('corsa_scale.mp3', tScala - 0.55, 0.9, dur=tFuori - tScala + 0.55, filtri=SCALA, fuori=0.3)
suono('corsa_strada.mp3', tFuori - 0.05, 0.9, ss=3.0, dur=tRespiri - tFuori, filtri='lowpass=f=5000', dentro=0.1, fuori=0.6)
# --- «Per la prima volta stanotte, respiri.»: il fiato che rallenta, le gocce dal portico
suono('respiro.mp3', tRespiri + 0.2, 0.55, dur=tVibra - tRespiri, dentro=0.3, fuori=0.8)
for t in (tRespiri + 1.3, tRespiri + 3.1, tVibra + 1.2): suono('gocce.mp3', t, 0.35, dur=1.2, fuori=0.4)
# --- il telefono vibra in tasca, poi in mano; risponde. Nella chiamata, piano, il pendolo della signora Ada (lo stesso che sentiremo da lei)
suono('phone_table.mp3', tVibra + 0.1, 0.5, dur=tChiama - 0.45 - tVibra - 0.1, filtri='lowpass=f=1200', fuori=0.1)
suono('pendolo_tic.mp3', tChiama + 0.4, 0.22, dur=tAda - tChiama - 0.4, ciclo=True, filtri=NEL_TELEFONO, dentro=0.5, fuori=0.1)
suono('heart60.mp3', tPol + 0.3, 1.0, dur=tAda - tPol - 0.3, ciclo=True, dentro=0.8, fuori=0.2, filtri="atempo=1.3,volume='0.4':eval=frame")
# --- dalla signora Ada: il pendolo vero, nella stanza; lui che si china; il dito sulle labbra; le carte
suono('pendolo_tic.mp3', tAda, 0.45, dur=END - tAda, ciclo=True, dentro=0.05, fuori=1.5)
suono('rise_long.mp3', tChina, 0.35, ss=12, dur=tCarte - tChina + 0.5, dentro=1.5, fuori=0.5)
suono('colpo.mp3', tDito + 0.85, 0.45, filtri=COLPO)
suono('colpo.mp3', r(24) - 0.12, 0.5, filtri=COLPO)
suono('rise_long.mp3', r(22), 0.22, ss=20, dur=END - r(22), dentro=1.0, fuori=1.2)

if os.environ.get('ELENCO'): sys.exit(0)
n = len(ING); pre = f'{D}/audio/_premix.wav'
graf = ';'.join(FIL) + ';' + ''.join(f'[s{i}]' for i in range(n)) + f'amix=inputs={n}:normalize=0:duration=longest,atrim=0:{FINE},afade=t=out:st={FINE - 0.8:.2f}:d=0.8[a]'
cmd = ['ffmpeg', '-v', 'error', '-y'] + sum(ING, []) + ['-filter_complex', graf, '-map', '[a]', '-c:a', 'pcm_f32le', '-ar', '48000', pre]
subprocess.run(cmd, check=True)
if os.environ.get('GREZZO'):          # per misurare i livelli: il mix com'è, senza portarlo a -14 LUFS
    os.replace(pre, MIX); print('mix grezzo (senza normalizzare) in', MIX); sys.exit(0)
# volume a -14 LUFS in due passate (misura, poi correzione lineare: niente pompaggio)
m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', pre, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
af = f"loudnorm=I=-14:TP=-1:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
af += ',alimiter=limit=0.68:level=disabled:attack=3:release=60'          # picchi a -3,3 dB: la codifica AAC li rialza anche di 2,5 dB (episodio 2, col tuono: +0,6 dB con 0,79)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', pre, '-af', af, '-ar', '48000', '-c:a', 'pcm_s16le', MIX], check=True); os.remove(pre)
print(f"mix: {n} tracce, durata {FINE} s (dal secondo {T0:.2f} della voce), misurato {j['input_i']} LUFS / picco {j['input_tp']} dB -> -14 LUFS" + (''.join(f"; musica {os.path.basename(m['file'])} da {m.get('da', 0)} s a {m.get('lufs', -34)} LUFS da telefono (volume {v}, {g} giro/i)" for m, v, g, _ in LETTI) if LETTI else '; senza musica'))
for _, _, _, f in LETTI:
    if os.path.exists(f): os.remove(f)
if len(sys.argv) > 2:
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', sys.argv[1], '-i', MIX, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', sys.argv[2]], check=True)
    print('scritto', sys.argv[2])
