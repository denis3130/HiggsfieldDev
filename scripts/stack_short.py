"""Short verticale 1080x1920 da una clip di streamer: webcam sopra, gioco sotto, sottotitoli al centro.
Uso: python stack_short.py spec.json   (spec: clip, cam=[x,y,w,h], start, end, hook, credit, subs=[[t0,t1,testo],...], out)
I tempi dei sottotitoli sono relativi all'inizio del taglio (start)."""
import json
import subprocess
import sys
from pathlib import Path

W, H, CAM_H = 1080, 1920, 700
GAME_H = H - CAM_H
FONT = "DejaVu Sans"


def ts(t):
    t = max(0.0, t)
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def esc(s):
    return s.replace("\\", "").replace("{", "(").replace("}", ")").replace("\n", "\\N")


def ass(spec, dur, path):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,{FONT},80,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,7,3,8,60,60,{CAM_H + 70},1
Style: Hook,{FONT},66,&H0000E1FF,&H00FFFFFF,&H00000000,&HB4000000,1,0,0,0,100,100,0,0,3,18,0,8,70,70,95,1
Style: Credit,{FONT},34,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,3,1,1,28,28,{H - CAM_H + 16},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    if spec.get("hook"):
        ev.append(f"Dialogue: 2,{ts(0)},{ts(min(3.8, dur))},Hook,,0,0,0,,{{\\fad(120,250)}}{esc(spec['hook'])}")
    for t0, t1, txt in spec.get("subs", []):
        if t1 > t0 and t0 < dur:
            ev.append(f"Dialogue: 1,{ts(t0)},{ts(min(t1, dur))},Sub,,0,0,0,,"
                      f"{{\\fscx90\\fscy90\\t(0,80,\\fscx100\\fscy100)}}{esc(txt.upper())}")
    if spec.get("credit"):
        ev.append(f"Dialogue: 0,{ts(0)},{ts(dur)},Credit,,0,0,0,,{esc(spec['credit'])}")
    Path(path).write_text(head + "\n".join(ev) + "\n", encoding="utf-8")


def main():
    spec = json.loads(Path(sys.argv[1]).read_text())
    x, y, w, h = spec["cam"]
    start, end = float(spec["start"]), float(spec["end"])
    dur = end - start
    sub = Path(spec["out"]).with_suffix(".ass")
    ass(spec, dur, sub)
    gw = round(1080 * W / GAME_H / 2) * 2          # larghezza del ritaglio di gioco (altezza piena 1080)
    gx = (1920 - gw) // 2
    sub_arg = str(sub).replace(":", "\\:").replace("'", "\\'")
    fc = (f"[0:v]split=2[c][g];"
          f"[c]crop={w}:{h}:{x}:{y},scale={W}:-2:flags=lanczos,crop={W}:{CAM_H}:0:(ih-{CAM_H})*0.3[cam];"
          f"[g]crop={gw}:1080:{gx}:0,scale={W}:{GAME_H}:flags=lanczos[game];"
          f"[cam][game]vstack,drawbox=x=0:y={CAM_H - 3}:w={W}:h=6:color=black@0.9:t=fill,"
          f"subtitles='{sub_arg}',format=yuv420p[v]")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{start:.2f}", "-t", f"{dur:.2f}", "-i", spec["clip"],
                    "-filter_complex", fc, "-map", "[v]", "-map", "0:a",
                    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=in:d=0.15,afade=t=out:st=%.2f:d=0.4" % (dur - 0.4),
                    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-r", "30", "-c:a", "aac", "-b:a", "192k",
                    "-ar", "48000", "-movflags", "+faststart", spec["out"]], check=True)
    print("ok", spec["out"], round(dur, 1), "s")


if __name__ == "__main__":
    main()
