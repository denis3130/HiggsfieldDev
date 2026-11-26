# mix_ep1.py <video.mp4> <uscita.mp4> <voce.mp3> [musica.mp3]
# L'audio dell'episodio 1: la voce di Luc (entra a 0,3 s; le due frasi dell'uomo mascherato passano dal televisore: banda stretta, un po'
# di distorsione e di stanza), sotto i suoni veri CC0 (audio_ep1/licenze.json, ../gioco7-prova/audio/sfx, ../../sfx) e la musica circa
# 20 dB sotto la voce come nel video A (se non si dà una musica: gli archi in tensione CC0). Uscita a -14 LUFS.
# I tempi dei suoni vengono da assets/parole.json, come le inquadrature di film.js.
import sys, subprocess, os, json, unicodedata, re
VID, OUT, VOCE = sys.argv[1:4]; MUSICA = sys.argv[4] if len(sys.argv) > 4 else None
B = os.path.dirname(os.path.abspath(__file__)); A = os.path.join(B, 'audio_ep1'); L7 = os.path.join(B, '..', 'gioco7-prova', 'audio', 'sfx'); SFX = os.path.join(B, '..', '..', 'sfx')
MUS = MUSICA or os.path.join(B, '..', '..', 'musica', 'archi_tensione.mp3')
DUR = json.load(open(os.path.join(B, 'film.json')))['duration']
P = json.load(open(os.path.join(B, 'assets', 'parole.json')))
def norm(s): return re.sub(r"[^a-z']", '', unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode())
def w(p, r=None, fine=0):
    for x in P:
        if norm(x[2]) == norm(p) and (r is None or x[3] == r): return x[fine]
    raise KeyError(p)
riga = lambda n: next(x[0] for x in P if x[3] == n)
rfine = lambda n: [x for x in P if x[3] == n][-1][1]
e = dict(eppure=w('Eppure'), ottavo=w("Sull'ottavo"), nome=w('nome', 2), sorella=w('sorella', 2), morta=w('Morta', 3), casa=riga(4) - 0.2, busta=w('busta', 4), mittente=w('mittente', 4),
         interno=riga(5), indirizzo=w('indirizzo', 5), so=riga(6), ucciso=w('ucciso', 6), dieciAnni=riga(7), incidente=w('incidente', 7), dovevo=riga(8), verita=w('verità', 8),
         arrivo=riga(9), persone=w('persone', 9), victor=riga(10), elena=riga(11), marcus=riga(12), nora=riga(13), adrian=riga(14), sophie=riga(15), nessuno=riga(16),
         improvv=riga(17), bloccarono=w('bloccarono', 17), tv=riga(18), accese=w('accese', 18), mascherato=w('mascherato', 18), ognuno=riga(19), qui=w('qui', 19), avete=riga(20), dieciMil=w('Dieci', 20),
         vivo=w('vivo', 20), dal=riga(21), fotografia=w('fotografia', 21), mostrava=riga(22), eravamo=riga(23), noi=w('noi', 23), dieci2=riga(24), sentii=riga(25), gelarmi=w('gelarmi', 25),
         avevo=riga(26), luogo=w('luogo', 26), victorAlza=riga(27), alzo=w('alzò', 27), soChi=riga(28), organizzato=w('organizzato', 28), luci=riga(29), spensero=w('spensero', 29),
         rumore=riga(30), urlo=riga(31), tornarono=w('tornarono', 32), morto=w('morto', 32), nella=riga(33), biglietto=w('biglietto', 33), raccolsi=riga(34), sul=riga(35), leon=riga(36),
         mortaN=w('morta', 36), sophieV=riga(37), non=riga(38), vieni=w('Vieni', 38), destino=riga(39), mani=w('mani', 39), cartaA=riga(40), cartaB=riga(41), commento=riga(42))
f = lambda d, n: os.path.join(d, n)
# (file, inizio nel film, da dove nel file, quanto, volume dB, dissolvenza in, dissolvenza out)
pezzi = [
    # il gancio: fuori i grilli, dentro il pendolo e le candele
    (f(L7, 'grilli_notte.mp3'), 0.0, 2.0, e['eppure'] + 0.1, -25, 0.6, 0.45),
    (f(L7, 'whoosh_aria.mp3'), e['eppure'] - 0.36, 0.0, 0.52, -10, 0.02, 0.1),
    (f(L7, 'whoosh_profondo.mp3'), e['eppure'] - 0.42, 0.25, 1.1, -18, 0.05, 0.5),
    (f(SFX, 'pendolo_tic.mp3'), e['eppure'] + 0.05, 0.0, e['casa'] - e['eppure'], -26, 0.3, 0.4),
    (f(SFX, 'fuoco.mp3'), e['eppure'] + 0.05, 3.0, e['casa'] - e['eppure'], -34, 0.4, 0.4),
    (f(L7, 'whoosh_profondo.mp3'), e['ottavo'] - 0.2, 0.0, 1.6, -11, 0.03, 0.6),
    (f(L7, 'whoosh_aria.mp3'), e['nome'] - 0.12, 0.0, 0.52, -16, 0.02, 0.1),
    (f(SFX, 'colpo.mp3'), e['sorella'] - 0.02, 0.0, 0.65, -14, 0.005, 0.2),
    (f(SFX, 'riser.mp3'), e['morta'] - 0.6, 0.0, e['casa'] - e['morta'] + 0.9, -22, 0.6, 0.6),
    # casa di Leon: la busta che scivola, la busta girata, il cartoncino, il colpo sulla frase, le chiavi, la macchina nella notte
    (f(A, 'busta_scivola.mp3'), e['busta'] - 0.32, 0.0, 1.1, -12, 0.01, 0.2),
    (f(L7, 'whoosh_aria.mp3'), e['busta'] - 0.15, 0.0, 0.5, -20, 0.02, 0.1),
    (f(A, 'carta_gira.mp3'), e['mittente'] - 0.12, 0.0, 1.1, -13, 0.01, 0.2),
    (f(A, 'carta_apre.mp3'), e['interno'] - 0.2, 0.0, 1.6, -14, 0.01, 0.3),
    (f(L7, 'whoosh_aria.mp3'), e['indirizzo'] - 0.2, 0.0, 0.5, -18, 0.02, 0.1),
    (f(SFX, 'colpo.mp3'), e['ucciso'] - 0.02, 0.0, 0.65, -12, 0.005, 0.2),
    (f(SFX, 'amb_slow.mp3'), e['so'], 0.0, e['arrivo'] - e['so'] - 1.0, -26, 1.0, 1.0),
    (f(L7, 'whoosh_aria.mp3'), e['incidente'] - 0.25, 0.0, 0.5, -18, 0.02, 0.1),
    (f(A, 'chiavi.mp3'), e['dovevo'] + 0.4, 0.0, 1.4, -14, 0.01, 0.3),
    (f(L7, 'whoosh_profondo.mp3'), e['verita'] - 0.4, 0.2, 1.0, -12, 0.03, 0.4),
    (f(A, 'auto_notte.mp3'), e['verita'] - 0.3, 10.0, e['arrivo'] - e['verita'] + 0.6, -18, 0.15, 0.5),
    # l'arrivo: il portone che cigola, dentro il pendolo e le candele fino al buio
    (f(SFX, 'porta_cigola.mp3'), e['arrivo'] + 0.15, 0.0, 2.2, -12, 0.02, 0.4),
    (f(SFX, 'pendolo_tic.mp3'), e['arrivo'] + 0.6, 0.0, e['spensero'] - e['arrivo'] - 0.6, -28, 0.6, 0.2),
    (f(SFX, 'fuoco.mp3'), e['arrivo'] + 0.6, 1.0, e['spensero'] - e['arrivo'] - 0.6, -36, 0.6, 0.2),
    *[(f(L7, 'whoosh_aria.mp3'), e[k] - 0.37, 0.0, 0.5, -20, 0.02, 0.1) for k in ('victor', 'elena', 'marcus', 'nora', 'adrian', 'sophie', 'nessuno')],
    # le porte si bloccano: la serratura, la grata; il televisore
    (f(L7, 'whoosh_aria.mp3'), e['improvv'] - 0.3, 0.0, 0.5, -16, 0.02, 0.1),
    (f(A, 'serratura.mp3'), e['bloccarono'] - 0.06, 0.0, 0.5, -6, 0.005, 0.1),
    (f(A, 'grata.mp3'), e['bloccarono'] + 0.25, 0.0, 2.2, -9, 0.005, 0.6),
    (f(A, 'tv_accende.mp3'), e['accese'] - 0.08, 0.0, 1.2, -10, 0.005, 0.3),
    (f(A, 'tv_statica.mp3'), e['accese'], 0.0, 0.45, -14, 0.01, 0.1),
    (f(A, 'tv_statica.mp3'), e['accese'] + 0.4, 0.5, 4.3, -34, 0.3, 0.3),
    (f(A, 'neon.mp3'), e['accese'] + 0.3, 2.0, e['dal'] - e['accese'], -36, 0.5, 0.5),
    (f(L7, 'whoosh_profondo.mp3'), e['mascherato'] - 0.32, 0.2, 1.0, -14, 0.03, 0.4),
    (f(SFX, 'riser.mp3'), e['avete'] + 2.0, 0.0, e['vivo'] - e['avete'] - 1.6, -24, 1.0, 0.3),
    (f(A, 'tv_statica.mp3'), e['vivo'] - 0.05, 1.0, 0.6, -14, 0.01, 0.2),
    (f(SFX, 'colpo.mp3'), e['vivo'] - 0.02, 0.0, 0.65, -12, 0.005, 0.2),
    # la foto: la neve, la salita, i colpi sui volti e sulla data; il cuore; il verbale
    (f(A, 'tv_statica.mp3'), e['dal'], 2.0, 0.6, -14, 0.01, 0.2),
    (f(L7, 'whoosh_profondo.mp3'), e['fotografia'] - 0.1, 0.2, 1.0, -14, 0.03, 0.4),
    (f(SFX, 'rise_long.mp3'), e['mostrava'], 0.0, e['noi'] - e['mostrava'] + 0.2, -24, 0.8, 0.2),
    *[(f(L7, 'whoosh_aria.mp3'), t0, 0.0, 0.45, -20, 0.02, 0.1) for t0 in (e['eravamo'] + 0.2, e['eravamo'] + 0.7, e['noi'] + 0.1, e['dieci2'] - 0.1)],
    (f(SFX, 'colpo.mp3'), e['noi'] + 0.05, 0.0, 0.65, -11, 0.005, 0.2),
    (f(SFX, 'heart60.mp3'), e['sentii'] - 0.2, 0.0, e['victorAlza'] - e['sentii'], -14, 0.4, 0.8),
    (f(L7, 'whoosh_aria.mp3'), e['luogo'] - 0.3, 0.0, 0.5, -18, 0.02, 0.1),
    # Victor si alza: la sedia che stride; il buio: le candele, il tonfo, l'urlo; le luci che tornano
    (f(A, 'sedia.mp3'), e['alzo'] - 0.08, 0.6, 1.2, -8, 0.01, 0.3),
    (f(L7, 'whoosh_aria.mp3'), e['alzo'] - 0.05, 0.0, 0.5, -16, 0.02, 0.1),
    (f(SFX, 'riser.mp3'), e['soChi'], 0.0, e['spensero'] - e['soChi'], -20, 0.6, 0.1),
    (f(A, 'candela_soffio.mp3'), e['spensero'] - 0.12, 0.0, 1.2, -8, 0.01, 0.4),
    (f(L7, 'whoosh_profondo.mp3'), e['spensero'] - 0.15, 0.3, 1.0, -12, 0.03, 0.5),
    (f(SFX, 'tonfo.mp3'), e['rumore'] + 0.55, 0.0, 1.2, -6, 0.005, 0.4),
    (f(SFX, 'grido.mp3'), e['urlo'] + 0.3, 0.0, 1.6, -9, 0.01, 0.5),
    (f(SFX, 'interruttore.mp3'), e['tornarono'] - 0.06, 0.0, 0.5, -8, 0.005, 0.1),
    (f(A, 'neon.mp3'), e['tornarono'] - 0.05, 0.0, 1.6, -18, 0.01, 0.6),
    (f(SFX, 'colpo.mp3'), e['morto'] - 0.02, 0.0, 0.65, -10, 0.005, 0.2),
    (f(SFX, 'amb_slow.mp3'), e['tornarono'], 3.0, DUR - e['tornarono'], -26, 1.0, 1.5),
    (f(L7, 'whoosh_aria.mp3'), e['biglietto'] - 0.2, 0.0, 0.5, -18, 0.02, 0.1),
    (f(SFX, 'stoffa.mp3'), e['raccolsi'] + 0.4, 0.0, 1.0, -16, 0.02, 0.3),
    (f(A, 'carta_apre.mp3'), e['sul'] + 0.1, 0.0, 1.5, -12, 0.01, 0.3),
    (f(SFX, 'colpo.mp3'), e['leon'] - 0.02, 0.0, 0.65, -10, 0.005, 0.2),
    (f(SFX, 'heart60.mp3'), e['leon'] + 0.3, 0.0, e['sophieV'] - e['leon'] + 0.5, -16, 0.4, 0.6),
    (f(SFX, 'respiro.mp3'), e['sophieV'] + 0.2, 0.0, 2.5, -20, 0.3, 0.6),
    (f(L7, 'whoosh_aria.mp3'), e['vieni'] + 0.4, 0.0, 0.5, -18, 0.02, 0.1),
    # la scelta: le carte entrano, poi l'ottavo piatto
    (f(L7, 'whoosh_aria.mp3'), e['mani'] + 0.0, 0.0, 0.5, -14, 0.02, 0.1),
    (f(L7, 'whoosh_aria.mp3'), e['mani'] + 0.25, 0.0, 0.5, -14, 0.02, 0.1),
    (f(L7, 'whoosh_profondo.mp3'), e['commento'] - 0.35, 0.2, 1.2, -14, 0.03, 0.5),
    (f(SFX, 'pendolo_tic.mp3'), e['commento'], 0.0, DUR - e['commento'], -26, 0.5, 1.0),
]
pezzi = [p for p in pezzi if os.path.exists(p[0]) and os.path.getsize(p[0]) > 1000]
SOTTO = -2                                                         # tutto il resto rispetto alla voce (dopo la normalizzazione finale)
pezzi = [(fi, t0, ss, d, db + SOTTO, a, b) for fi, t0, ss, d, db, a, b in pezzi]
pezzi.append((MUS, 0.0, 0.0, DUR, -20 + SOTTO - (0 if MUSICA else 2), 2.0, 2.5))
args = ['ffmpeg', '-v', 'error', '-y', '-i', VID, '-i', VOCE]
for fi, *_ in pezzi: args += ['-i', fi]
fc = []
# la voce: normale, poi le due frasi del televisore filtrate, poi normale (tempi della voce = tempi del film - 0,3)
t1, t2 = riga(19) - 0.3 - 0.08, rfine(20) - 0.3 + 0.25
fc.append(f"[1:a]aresample=48000,aformat=channel_layouts=stereo,asplit=3[v0][v1][v2]")
fc.append(f"[v0]atrim=0:{t1},asetpts=PTS-STARTPTS[va]")
fc.append(f"[v1]atrim={t1}:{t2},asetpts=PTS-STARTPTS,highpass=f=320,lowpass=f=3300,acompressor=threshold=-18dB:ratio=4,volume=2dB,"
          f"aecho=0.8:0.5:28|47:0.25|0.18,asoftclip=type=tanh[vb]")
fc.append(f"[v2]atrim={t2},asetpts=PTS-STARTPTS[vc]")
fc.append("[va][vb][vc]concat=n=3:v=0:a=1,adelay=300|300[voce]")
for i, (fi, t0, ss, dur, db, a, b) in enumerate(pezzi):
    dur = max(0.05, dur)
    fc.append(f'[{i + 2}:a]atrim={ss}:{ss + dur},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,volume={db}dB,'
              f'afade=t=in:d={a},afade=t=out:st={max(0, dur - b)}:d={b},adelay={int(t0 * 1000)}|{int(t0 * 1000)}[a{i}]')
fc.append('[voce]' + ''.join(f'[a{i}]' for i in range(len(pezzi))) + f'amix=inputs={len(pezzi) + 1}:normalize=0,atrim=0:{DUR},loudnorm=I=-14:TP=-1.5:LRA=11[out]')
args += ['-filter_complex', ';'.join(fc), '-map', '0:v', '-map', '[out]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', OUT]
subprocess.run(args, check=True)
print('ok', OUT, len(pezzi), 'suoni')
