"""Short verticale 1080x1920 da una clip di streamer: webcam sopra, gioco sotto, sottotitoli al centro.
Uso: python stack_short.py spec.json   (spec: clip, cam=[x,y,w,h], start, end, hook, credit, subs=[[t0,t1,testo],...], out)
Al posto di start/end si può dare segments=[[a,b],[c,d],...]: i pezzi vengono montati uno dopo l'altro (tagli secchi).
focus=[[t0,t1],...]: in quei tratti lo schermo passa tutto sulla webcam (inquadratura 9:16 sul volto, lento zoom in avanti),
poi torna webcam sopra / gioco sotto. Serve per le reazioni: quando lo streamer fissa la camera, ride, resta a bocca aperta.
focus_cx (facoltativo): x fissa del volto nel video sorgente; se manca, l'inquadratura segue il volto da sola (riconoscimento del volto).
I tempi di sottotitoli e focus sono relativi al video finale (cioè all'inizio del primo pezzo).
game_box (facoltativo) = [x, y, w, h] del ritaglio di gioco, con w:h circa 1080:1220 (es. [535, 0, 850, 960] toglie la fascia bassa dei sottotitoli del gioco)."""
import json
import subprocess
import sys
from pathlib import Path

W, H, CAM_H = 1080, 1920, 700
GAME_H = H - CAM_H
FONT = "DejaVu Sans"
ZOOM = 0.08        # zoom in avanti durante ogni tratto di focus (8%)


def ts(t):
    t = max(0.0, t)
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def esc(s):
    return s.replace("\\", "").replace("{", "(").replace("}", ")").replace("\n", "\\N")


def in_focus(t, focus):
    return any(a <= t < b for a, b in focus)


def ass(spec, dur, focus, path):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,{FONT},80,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,7,3,8,60,60,{CAM_H + 70},1
Style: SubF,{FONT},80,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,7,3,2,60,60,560,1
Style: Hook,{FONT},66,&H0000E1FF,&H00FFFFFF,&H00000000,&HB4000000,1,0,0,0,100,100,0,0,3,18,0,8,70,70,95,1
Style: Credit,{FONT},34,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,3,1,1,28,28,{H - CAM_H + 16},1
Style: CreditF,{FONT},34,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,3,1,1,28,28,470,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    if spec.get("hook"):
        ev.append(f"Dialogue: 2,{ts(0)},{ts(min(3.8, dur))},Hook,,0,0,0,,{{\\fad(120,250)}}{esc(spec['hook'])}")
    for t0, t1, txt in spec.get("subs", []):
        if t1 > t0 and t0 < dur:
            st = "SubF" if in_focus((t0 + min(t1, dur)) / 2, focus) else "Sub"
            ev.append(f"Dialogue: 1,{ts(t0)},{ts(min(t1, dur))},{st},,0,0,0,,"
                      f"{{\\fscx90\\fscy90\\t(0,80,\\fscx100\\fscy100)}}{esc(txt.upper())}")
    if spec.get("credit"):
        # il credito resta sempre a schermo: sotto la webcam di solito, più in basso durante il focus
        cuts = sorted({0.0, dur, *[min(max(x, 0.0), dur) for ab in focus for x in ab]})
        for a, b in zip(cuts, cuts[1:]):
            if b - a > 0.01:
                st = "CreditF" if in_focus((a + b) / 2, focus) else "Credit"
                ev.append(f"Dialogue: 0,{ts(a)},{ts(b)},{st},,0,0,0,,{esc(spec['credit'])}")
    Path(path).write_text(head + "\n".join(ev) + "\n", encoding="utf-8")


def src_time(t, segs):
    """Tempo nel video finale -> tempo nella clip sorgente."""
    for a, b in segs:
        if t < b - a:
            return a + t
        t -= b - a
    return segs[-1][1]


def face_track(clip, cam, focus, segs, fw, step=0.2):
    """Segue il volto nei tratti di focus: per ogni tratto una lista di (tempo finale, x sinistra della finestra 9:16)."""
    import cv2
    x, y, w, h = cam
    hc = cv2.data.haarcascades
    front = cv2.CascadeClassifier(hc + "haarcascade_frontalface_default.xml")
    prof = cv2.CascadeClassifier(hc + "haarcascade_profileface.xml")
    cap = cv2.VideoCapture(clip)

    eyes = cv2.CascadeClassifier(hc + "haarcascade_eye.xml")

    def candidates(t):
        """Volti candidati (centro x sorgente, ha gli occhi?) in un istante del video finale."""
        cap.set(cv2.CAP_PROP_POS_MSEC, 1000 * src_time(t, segs))
        ok, fr = cap.read()
        if not ok:
            return []
        g = cv2.cvtColor(cv2.resize(fr[y:y + h, x:x + w], None, fx=2, fy=2), cv2.COLOR_BGR2GRAY)
        out = []
        for det, flip in ((front, False), (prof, False), (prof, True)):
            img = cv2.flip(g, 1) if flip else g
            for fx, fy, fwd, fht in det.detectMultiScale(img, 1.1, 6, minSize=(60, 60)):
                top = img[fy:fy + fht // 2 + fht // 8, fx:fx + fwd]          # gli occhi stanno nella metà alta
                e = len(eyes.detectMultiScale(top, 1.1, 4, minSize=(fwd // 8, fwd // 8)))
                c = fx + fwd / 2
                out.append((x + ((img.shape[1] - c) if flip else c) / 2, e > 0))
        return out

    def pick(cands, prev):
        """Sceglie il volto vero: con gli occhi e vicino a quello di prima (i falsi positivi della stanza stanno fermi altrove)."""
        if not cands:
            return None
        good = [c for c, e in cands if e] or [c for c, _ in cands]
        if prev is None:
            return max(good, key=lambda c: sum(e for c2, e in cands if abs(c2 - c) < 25))
        best = min(good, key=lambda c: abs(c - prev))
        return best if abs(best - prev) < 60 else None

    tracks, allc = [], []
    for a, b in focus:
        ts_ = [a + k * step for k in range(int((b - a) / step) + 1)] + [b]
        cands = [candidates(min(t, b - 0.01)) for t in ts_]
        # punto di partenza: il candidato con gli occhi che compare più spesso in tutto il tratto
        votes = {}
        for cl in cands:
            for c, e in cl:
                if e:
                    k = round(c / 20)
                    votes[k] = votes.get(k, 0) + 1
        prev = votes and max(votes, key=votes.get) * 20 or None
        cs = []
        for cl in cands:
            c = pick(cl, prev)
            cs.append(c)
            prev = c if c is not None else prev
        allc += [c for c in cs if c is not None]
        tracks.append((ts_, cs))
    cap.release()
    allc.sort()
    fallback = allc[len(allc) // 2] if allc else x + w / 2
    out = []
    for ts_, cs in tracks:
        known = [(t, c) for t, c in zip(ts_, cs) if c is not None]
        full = []
        for t, c in zip(ts_, cs):       # i buchi si riempiono interpolando i vicini
            if c is None:
                prev = [k for k in known if k[0] < t]
                nxt = [k for k in known if k[0] > t]
                if prev and nxt:
                    (t0, c0), (t1, c1) = prev[-1], nxt[0]
                    c = c0 + (c1 - c0) * (t - t0) / (t1 - t0)
                else:
                    c = (prev[-1][1] if prev else nxt[0][1]) if (prev or nxt) else fallback
            full.append(c)
        sm = [sum(full[max(0, i - 2):i + 3]) / len(full[max(0, i - 2):i + 3]) for i in range(len(full))]   # niente scatti
        out.append([(t, min(max(c - fw / 2, x), x + w - fw)) for t, c in zip(ts_, sm)])
    return out


def main():
    spec = json.loads(Path(sys.argv[1]).read_text())
    x, y, w, h = spec["cam"]
    segs = [[float(a), float(b)] for a, b in (spec.get("segments") or [[spec["start"], spec["end"]]])]
    dur = sum(b - a for a, b in segs)
    focus = [[float(a), min(float(b), dur)] for a, b in spec.get("focus", []) if float(a) < dur]
    sub = Path(spec["out"]).with_suffix(".ass")
    ass(spec, dur, focus, sub)
    gw = round(1080 * W / GAME_H / 2) * 2          # larghezza del ritaglio di gioco (altezza piena 1080)
    gx, gy, gh = (1920 - gw) // 2, 0, 1080
    if spec.get("game_box"):                       # [x, y, w, h]: ritaglio del gioco diverso (es. senza la fascia dei sottotitoli del gioco in basso)
        gx, gy, gw, gh = spec["game_box"]
    sub_arg = str(sub).replace(":", "\\:").replace("'", "\\'")
    cut = "".join(f"[0:v]trim=start={a:.3f}:end={b:.3f},setpts=PTS-STARTPTS[v{i}];"
                  f"[0:a]atrim=start={a:.3f}:end={b:.3f},asetpts=PTS-STARTPTS[a{i}];"
                  for i, (a, b) in enumerate(segs))
    cut += "".join(f"[v{i}][a{i}]" for i in range(len(segs))) + f"concat=n={len(segs)}:v=1:a=1[vc][ac];"
    base = (f"[c]crop={w}:{h}:{x}:{y},scale={W}:-2:flags=lanczos,crop={W}:{CAM_H}:0:(ih-{CAM_H})*0.3[cam];"
            f"[g]crop={gw}:{gh}:{gx}:{gy},scale={W}:{GAME_H}:flags=lanczos[game];"
            f"[cam][game]vstack,drawbox=x=0:y={CAM_H - 3}:w={W}:h=6:color=black@0.9:t=fill[base];")
    if focus:
        fw = int(round(h * 9 / 16 / 2) * 2)
        if spec.get("focus_cx"):
            fixed = min(max(float(spec["focus_cx"]) - fw / 2, x), x + w - fw)
            tracks = [[(a, fixed), (b, fixed)] for a, b in focus]
        else:
            tracks = face_track(spec["clip"], (x, y, w, h), focus, segs, fw)
        x0 = tracks[0][0][1]
        terms = [f"gte(t,{t0:.3f})*lt(t,{t1:.3f})*({c0 - x0:.1f}+({c1 - c0:.1f})*(t-{t0:.3f})/{t1 - t0:.3f})"
                 for tr in tracks for (t0, c0), (t1, c1) in zip(tr, tr[1:]) if t1 - t0 > 0.005]   # niente tratti di durata zero: «/0.000» renderebbe x NaN e il ritaglio finirebbe al centro
        fxe = f"{x0:.1f}+" + "+".join(terms)
        ramp = "+".join(f"between(on/30,{a:.3f},{b:.3f})*(on/30-{a:.3f})/{b - a:.3f}" for a, b in focus)
        enable = "+".join(f"between(t,{a:.3f},{b:.3f})" for a, b in focus)
        fc = (cut + "[vc]fps=30,split=3[c][g][f];" + base +
              f"[f]crop={fw}:{h}:x='{fxe}':y={y},scale={W}:{H}:flags=lanczos,"
              f"zoompan=z='1+{ZOOM}*({ramp})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps=30,"
              f"unsharp=5:5:0.6,setsar=1[full];"
              f"[base][full]overlay=0:0:enable='{enable}'[comp];")
        print(f"focus su {len(focus)} tratti, finestra {fw}x{h}, x da {min(c for tr in tracks for _, c in tr):.0f} a {max(c for tr in tracks for _, c in tr):.0f}")
    else:
        fc = cut + "[vc]fps=30,split=2[c][g];" + base + "[base]null[comp];"
    fc += (f"[comp]subtitles='{sub_arg}',format=yuv420p[v];"
           f"[ac]loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=in:d=0.15,afade=t=out:st={dur - 0.4:.2f}:d=0.4[aout]")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", spec["clip"],
                    "-filter_complex", fc, "-map", "[v]", "-map", "[aout]",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-r", "30", "-c:a", "aac", "-b:a", "192k",
                    "-ar", "48000", "-movflags", "+faststart", spec["out"]], check=True)
    print("ok", spec["out"], round(dur, 1), "s")


if __name__ == "__main__":
    main()
