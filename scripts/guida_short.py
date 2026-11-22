"""Short "guida" 1080x1920: voce italiana (Kokoro, gratis), gameplay a tutto schermo, sottotitoli parola per parola,
titolo fisso in alto, numeri dei punti, musica e whoosh generati col codice.
Uso: python guida_short.py spec.json (il modello voce viene scaricato da solo la prima volta, accanto allo script)
spec: voice, title, credit, out, segments=[{text, clip, start, badge?}]"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

HERE = Path(__file__).parent
SR = 24000
W, H = 1080, 1920
FONT = "DejaVu Sans"


def ensure_model():
    """Scarica una volta sola il modello Kokoro (ONNX) e le voci italiane da Hugging Face."""
    if (HERE / "kokoro.onnx").exists() and (HERE / "voices.bin").exists():
        return
    import os
    import shutil
    os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
    from huggingface_hub import hf_hub_download
    repo = "onnx-community/Kokoro-82M-v1.0-ONNX"
    shutil.copy(hf_hub_download(repo, "onnx/model.onnx"), HERE / "kokoro.onnx")
    v = {n: np.fromfile(hf_hub_download(repo, f"voices/{n}.bin"), dtype=np.float32).reshape(-1, 1, 256)
         for n in ("if_sara", "im_nicola")}
    with open(HERE / "voices.bin", "wb") as f:
        np.savez(f, **v)


def tts(segs, voice):
    ensure_model()
    from kokoro_onnx import Kokoro
    k = Kokoro(str(HERE / "kokoro.onnx"), str(HERE / "voices.bin"))
    out = []
    for s in segs:
        a, sr = k.create(s["text"], voice=voice, speed=1.12, lang="it")
        out.append(np.asarray(a, np.float32))
    return out


def align(text, heard):
    """Mette il testo esatto del copione sui tempi delle parole sentite da Whisper.
    Whisper può sbagliare qualche parola ("Tra" al posto di "Tre"): il testo resta quello scritto, i tempi i suoi."""
    import difflib
    import re
    script = text.split()
    norm = lambda s: re.sub(r"[^\w]", "", s.lower())
    a = [norm(w) for w in script]
    b = [norm(w[2]) for w in heard]
    times = [None] * len(script)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                times[i1 + k] = heard[j1 + k][:2]
        elif j2 > j1 and i2 > i1:                    # parole diverse: si dividono il tempo di quelle sentite
            t0, t1 = heard[j1][0], heard[j2 - 1][1]
            n = i2 - i1
            for k in range(n):
                times[i1 + k] = (t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n)
    known = [i for i, t in enumerate(times) if t]
    for i, t in enumerate(times):                      # parole non sentite affatto: tra la precedente e la successiva
        if t is None:
            p = max([k for k in known if k < i], default=None)
            q = min([k for k in known if k > i], default=None)
            s0 = times[p][1] if p is not None else (heard[0][0] if heard else 0.0)
            s1 = times[q][0] if q is not None else s0 + 0.3
            times[i] = (s0, max(s1, s0 + 0.05))
    return [(s, e, w) for (s, e), w in zip(times, script)]


def words(audios, texts):
    """Tempi parola per parola di ogni pezzo di voce (Whisper sulla voce sintetica, che è pulitissima), con il testo del copione."""
    from faster_whisper import WhisperModel
    m = WhisperModel("medium", device="cpu", compute_type="int8")
    res = []
    for a, txt in zip(audios, texts):
        a16 = np.interp(np.arange(0, len(a), SR / 16000), np.arange(len(a)), a).astype(np.float32)
        segs, _ = m.transcribe(a16, language="it", word_timestamps=True, beam_size=5, initial_prompt=txt)
        heard = [(w.start, w.end, w.word.strip()) for s in segs for w in s.words]
        res.append(align(txt, heard) if heard else [])
    return res


def music(dur, seed=7):
    """Base leggera: accordi La-Fa-Do-Sol, basso, cassa e charleston morbidi."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    bpm = 96
    beat = 60 / bpm
    bar = 4 * beat
    chords = [(220.0, 261.63, 329.63), (174.61, 220.0, 261.63), (261.63, 329.63, 392.0), (196.0, 246.94, 293.66)]
    pad = np.zeros(n)
    bass = np.zeros(n)
    for i in range(int(dur / bar) + 1):
        a0 = int(i * bar * SR)
        a1 = min(n, int((i + 1) * bar * SR))
        if a0 >= n:
            break
        tt = t[a0:a1] - i * bar
        env = np.minimum(1, tt / 0.4) * np.minimum(1, (bar - tt) / 0.4)
        ch = chords[i % 4]
        pad[a0:a1] = env * sum(np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt) for f in ch) / 3
        for b in range(4):
            b0 = a0 + int(b * beat * SR)
            L = min(int(beat * SR), a1 - b0)
            if L <= 0:
                continue
            tb = np.arange(L) / SR
            bass[b0:b0 + L] += np.sin(2 * np.pi * ch[0] / 2 * tb) * np.exp(-tb * 3)
    kick = np.zeros(n)
    hat = np.zeros(n)
    for j in range(int(dur / beat) + 1):
        k0 = int(j * beat * SR)
        if k0 >= n:
            break
        if j % 2 == 0:
            L = min(int(0.25 * SR), n - k0)
            tk = np.arange(L) / SR
            kick[k0:k0 + L] += np.sin(2 * np.pi * (45 + 60 * np.exp(-tk * 25)) * tk) * np.exp(-tk * 12)
        for h in (0, 0.5):
            h0 = int((j + h) * beat * SR)
            L = min(int(0.05 * SR), n - h0)
            if L > 0:
                nz = rng.standard_normal(L)
                nz = np.diff(np.concatenate([[0], nz]))          # passa-alto grezzo
                hat[h0:h0 + L] += nz * np.exp(-np.arange(L) / SR * 80) * (0.5 if h else 0.35)
    mix = 0.55 * pad + 0.5 * bass + 0.6 * kick + 0.12 * hat
    mix /= np.abs(mix).max() + 1e-9
    fade = np.minimum(1, t / 1.0) * np.minimum(1, (dur - t) / 1.5)
    return (mix * fade * 0.10).astype(np.float32)


def whoosh(L=0.35, seed=3):
    rng = np.random.default_rng(seed)
    n = int(L * SR)
    x = rng.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    X *= np.exp(-((f - 1800) / 1500) ** 2)
    x = np.fft.irfft(X, n)
    env = np.sin(np.pi * np.arange(n) / n) ** 2
    x = x * env
    return (x / np.abs(x).max() * 0.18).astype(np.float32)


def ts(t):
    t = max(0.0, t)
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def esc(s):
    return s.replace("\\", "").replace("{", "(").replace("}", ")")


def main():
    spec = json.loads(Path(sys.argv[1]).read_text())
    segs = spec["segments"]
    voice = tts(segs, spec.get("voice", "im_nicola"))
    wt = words(voice, [s["text"] for s in segs])
    gap = 0.28
    starts, t = [], 0.35
    for a in voice:
        starts.append(t)
        t += len(a) / SR + gap
    dur = t + 0.6
    # --- audio: voce + whoosh ai cambi + musica sotto
    n = int(dur * SR)
    vtrack = np.zeros(n, np.float32)
    for st, a in zip(starts, voice):
        i = int(st * SR)
        vtrack[i:i + len(a)] += a
    fx = np.zeros(n, np.float32)
    w = whoosh()
    for st in starts[1:]:
        i = max(0, int((st - 0.25) * SR))
        fx[i:i + len(w)] += w[:n - i]
    mix = vtrack / (np.abs(vtrack).max() + 1e-9) * 0.9 + fx + music(dur)
    sf.write(HERE / "mix.wav", np.clip(mix, -1, 1), SR)
    # --- sottotitoli ASS: titolo, parole a gruppi di 3 con la parola detta in giallo, numeri, credito
    ass = [f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,{FONT},70,&H00FFFFFF,&H00FFFFFF,&H00000000,&HC8000000,1,0,0,0,100,100,0,0,3,20,0,8,60,60,150,1
Style: Cap,{FONT},96,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,8,4,5,60,60,0,1
Style: Badge,{FONT},150,&H0000E1FF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,10,5,8,60,60,420,1
Style: Credit,{FONT},34,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,3,1,7,40,40,330,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""]
    ass.append(f"Dialogue: 3,{ts(0)},{ts(dur)},Title,,0,0,0,,{esc(spec['title'])}")
    ass.append(f"Dialogue: 0,{ts(0)},{ts(dur)},Credit,,0,0,0,,{esc(spec['credit'])}")
    for st, s, ws in zip(starts, segs, wt):
        nxt = st + (ws[-1][1] if ws else 1) + gap
        if s.get("badge"):
            ass.append(f"Dialogue: 2,{ts(st)},{ts(nxt)},Badge,,0,0,0,,{{\\fad(80,120)\\fscx70\\fscy70\\t(0,120,\\fscx100\\fscy100)}}{esc(s['badge'])}")
        groups = [ws[i:i + 3] for i in range(0, len(ws), 3)]
        for gi, g in enumerate(groups):
            g_end = groups[gi + 1][0][0] if gi + 1 < len(groups) else g[-1][1] + 0.15
            for wi, (a, b, _) in enumerate(g):
                b2 = g[wi + 1][0] if wi + 1 < len(g) else g_end
                txt = " ".join((f"{{\\c&H0000E1FF&}}{esc(x[2].upper())}{{\\c&H00FFFFFF&}}" if k == wi else esc(x[2].upper()))
                               for k, x in enumerate(g))
                ass.append(f"Dialogue: 1,{ts(st + a)},{ts(st + b2)},Cap,,0,0,0,,{{\\pos({W // 2},{int(H * 0.62)})}}{txt}")
    (HERE / "guida.ass").write_text("\n".join(ass) + "\n", encoding="utf-8")
    # --- video: un pezzo di gameplay per ogni frase, ritaglio 9:16 dal centro (niente webcam/chat), lento zoom
    parts = []
    for i, (st, s) in enumerate(zip(starts, segs)):
        d = (starts[i + 1] - st) if i + 1 < len(starts) else dur - st
        if i == 0:
            d += st
        out = HERE / f"part{i}.mp4"
        z = f"1+0.06*on/{max(1, int(d * 30))}"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{s['start']:.2f}", "-t", f"{d:.3f}", "-i", s["clip"],
                        "-vf", f"crop=540:960:690:0,scale={W}:{H}:flags=lanczos,fps=30,"
                               f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps=30,"
                               f"eq=saturation=1.12:contrast=1.04,setsar=1",
                        "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", str(out)], check=True)
        parts.append(out)
    (HERE / "parts.txt").write_text("".join(f"file '{p}'\n" for p in parts))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(HERE / "parts.txt"),
                    "-i", str(HERE / "mix.wav"),
                    "-vf", f"subtitles='{HERE / 'guida.ass'}',format=yuv420p",
                    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-map", "0:v", "-map", "1:a", "-shortest",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                    "-movflags", "+faststart", spec["out"]], check=True)
    print("ok", spec["out"], round(dur, 1), "s")


if __name__ == "__main__":
    main()
