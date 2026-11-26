# mix.py <video.mp4> <uscita.mp4>: l'audio della prova di stile, solo suoni veri CC0 (niente voce: Luc costa crediti e va chiesto).
# Fuori: grilli; lo scatto nella finestra: un soffio d'aria; dentro: il pendolo, le candele che crepitano; la picchiata sull'ottavo posto:
# un soffio profondo; «il nome»: un soffio corto; «sorella»: un colpo basso; sotto tutto gli archi in tensione (CC0) come tappeto.
# I tempi vengono dalle parole calcolate in film.js (stesso testo, stesso ritmo); se cambia il testo vanno ricalcolati.
import sys, subprocess, os
VID, OUT = sys.argv[1], sys.argv[2]
B = os.path.dirname(os.path.abspath(__file__)); SFX = os.path.join(B, '..', '..', 'sfx'); MUS = os.path.join(B, '..', '..', 'musica'); LOC = os.path.join(B, 'audio', 'sfx')
DUR = 13.2
E1, O1, NOME, SORELLA, MORTA = 4.579, 7.404, 8.986, 9.752, 10.711
pezzi = [  # (file, inizio nel film, da dove nel file, quanto, volume dB, dissolvenza in, dissolvenza out)
    (os.path.join(LOC, 'grilli_notte.mp3'), 0.0, 2.0, E1 + 0.1, -16, 0.6, 0.45),
    (os.path.join(MUS, 'archi_tensione.mp3'), 0.0, 38.0, DUR, -15, 1.8, 0.8),
    (os.path.join(LOC, 'whoosh_aria.mp3'), E1 - 0.36, 0.0, 0.52, -4, 0.02, 0.1),
    (os.path.join(LOC, 'whoosh_profondo.mp3'), E1 - 0.42, 0.25, 1.1, -12, 0.05, 0.5),
    (os.path.join(SFX, 'pendolo_tic.mp3'), E1 + 0.05, 0.0, DUR - E1, -17, 0.3, 0.8),
    (os.path.join(SFX, 'fuoco.mp3'), E1 + 0.05, 3.0, DUR - E1, -27, 0.4, 0.8),
    (os.path.join(LOC, 'whoosh_profondo.mp3'), O1 - 0.2, 0.0, 1.6, -5, 0.03, 0.6),
    (os.path.join(LOC, 'whoosh_aria.mp3'), NOME - 0.12, 0.0, 0.52, -10, 0.02, 0.1),
    (os.path.join(SFX, 'colpo.mp3'), SORELLA - 0.02, 0.0, 0.65, -9, 0.005, 0.2),
    (os.path.join(SFX, 'riser.mp3'), MORTA - 0.6, 0.0, DUR - MORTA + 0.6, -14, 0.6, 0.9),
]
args = ['ffmpeg', '-v', 'error', '-y', '-i', VID]
for f, *_ in pezzi: args += ['-i', f]
fc = []
for i, (f, t0, ss, dur, db, fi, fo) in enumerate(pezzi):
    fc.append(f'[{i + 1}:a]atrim={ss}:{ss + dur},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,volume={db}dB,'
              f'afade=t=in:d={fi},afade=t=out:st={max(0, dur - fo)}:d={fo},adelay={int(t0 * 1000)}|{int(t0 * 1000)}[a{i}]')
fc.append(''.join(f'[a{i}]' for i in range(len(pezzi))) + f'amix=inputs={len(pezzi)}:normalize=0,atrim=0:{DUR},'
          'loudnorm=I=-20:TP=-1.5:LRA=11[out]')
args += ['-filter_complex', ';'.join(fc), '-map', '0:v', '-map', '[out]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', OUT]
subprocess.run(args, check=True)
print('ok', OUT)
