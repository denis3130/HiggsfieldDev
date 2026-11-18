"""Montaggio Short verticale 1080x1920: tagli dinamici, zoom punch-in, sottotitoli italiani, overlay."""
from __future__ import annotations

import logging
from pathlib import Path

from .media import probe_duration, run, silences

log = logging.getLogger(__name__)

FONT = "DejaVu Sans"


# ------------------------------------------------------------------ tagli dinamici

def keep_intervals(duration: float, sil: list[tuple[float, float]], pad: float = 0.15,
                   min_cut: float = 0.7) -> list[tuple[float, float]]:
    """Intervalli da tenere eliminando i silenzi più lunghi di `min_cut` (con un piccolo margine)."""
    keep, cur = [], 0.0
    for s, e in sil:
        s2, e2 = s + pad, e - pad
        if e2 - s2 < min_cut:
            continue
        if s2 > cur:
            keep.append((cur, s2))
        cur = max(cur, e2)
    if cur < duration:
        keep.append((cur, duration))
    return [(round(a, 3), round(b, 3)) for a, b in keep if b - a > 0.05]


def remap(t: float, keep: list[tuple[float, float]]) -> float | None:
    """Tempo originale -> tempo dopo i tagli (None se cade in una parte tagliata)."""
    acc = 0.0
    for a, b in keep:
        if t < a:
            return None
        if t <= b:
            return acc + (t - a)
        acc += b - a
    return None


def dynamic_cut(src: Path, start: float, end: float, out: Path, min_len: float) -> tuple[Path, list]:
    """Estrae [start,end] e rimuove i silenzi, senza scendere sotto `min_len` secondi."""
    seg = out.with_name(out.stem + "_seg.mp4")
    run(["ffmpeg", "-y", "-v", "error", "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", str(src),
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-c:a", "aac", "-b:a", "192k", str(seg)])
    dur = probe_duration(seg)
    keep = keep_intervals(dur, silences(seg))
    if sum(b - a for a, b in keep) < min_len or len(keep) <= 1:
        seg.replace(out)
        return out, [(0.0, dur)]
    expr = "+".join(f"between(t,{a},{b})" for a, b in keep)
    run(["ffmpeg", "-y", "-v", "error", "-i", str(seg),
         "-vf", f"select='{expr}',setpts=N/FRAME_RATE/TB",
         "-af", f"aselect='{expr}',asetpts=N/SR/TB",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-c:a", "aac", "-b:a", "192k", str(out)])
    seg.unlink(missing_ok=True)
    return out, keep


# ------------------------------------------------------------------ sottotitoli ASS

def _ts(t: float) -> str:
    t = max(0.0, t)
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def _esc(text: str) -> str:
    return text.replace("\\", "").replace("{", "(").replace("}", ")").replace("\n", "\\N")


def build_ass(path: Path, subs: list[dict], hook: str, commentary: list[dict], credit: str,
              duration: float, w: int = 1080, h: int = 1920) -> Path:
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {w}
PlayResY: {h}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,{FONT},74,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,6,2,2,70,70,440,1
Style: Hook,{FONT},84,&H0000E5FF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,7,3,8,60,60,210,1
Style: Comment,{FONT},56,&H00000000,&H00FFFFFF,&H00FFFFFF,&H00FFFFFF,1,0,0,0,100,100,0,0,3,14,0,8,90,90,370,1
Style: Credit,{FONT},38,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,3,1,2,40,40,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    if hook:
        ev.append(f"Dialogue: 2,{_ts(0)},{_ts(min(3.0, duration))},Hook,,0,0,0,,{{\\fad(150,250)}}{_esc(hook.upper())}")
    for c in commentary:
        if c["end"] > c["start"]:
            ev.append(f"Dialogue: 2,{_ts(c['start'])},{_ts(min(c['end'], duration))},Comment,,0,0,0,,"
                      f"{{\\fad(120,120)}}{_esc(c['text'])}")
    for s in subs:
        if s["end"] > s["start"] and s["text"].strip():
            ev.append(f"Dialogue: 1,{_ts(s['start'])},{_ts(s['end'])},Sub,,0,0,0,,"
                      f"{{\\fscx92\\fscy92\\t(0,90,\\fscx100\\fscy100)}}{_esc(s['text'])}")
    if credit:
        ev.append(f"Dialogue: 0,{_ts(0)},{_ts(duration)},Credit,,0,0,0,,{_esc(credit)}")
    path.write_text(header + "\n".join(ev) + "\n", encoding="utf-8")
    return path


# ------------------------------------------------------------------ layout verticale

def zoom_expr(points: list[float], fps: int, strength: float = 0.18, hold: float = 1.2) -> str:
    """Espressione zoompan: punch-in istantaneo con rilascio morbido dopo ogni punto."""
    if not points:
        return "1"
    parts = []
    for p in points:
        t = f"(in/{fps})"
        # 0 prima del punto, strength subito dopo, decade linearmente a 0 in `hold` secondi
        parts.append(f"{strength}*between({t},{p:.2f},{p + hold:.2f})*(1-({t}-{p:.2f})/{hold})")
    return "1+" + "+".join(parts)


def render_vertical(src: Path, ass: Path, out: Path, zoom_points: list[float], cfg: dict) -> Path:
    r = cfg["render"]
    W, H, fps = r["width"], r["height"], r["fps"]
    fg_w = W
    fg_h = int(round(W / 1.39 / 2) * 2)          # gameplay ritagliato ~4:3 per riempire di più lo schermo
    y = (H - fg_h) // 2 - 80
    z = zoom_expr(zoom_points, fps)
    ass_arg = str(ass).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
    graph = (
        f"[0:v]fps={fps},split[a][b];"
        f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=24:2,eq=brightness=-0.10[bg];"
        f"[b]crop=w='min(iw,ih*1.39)':h=ih,scale={fg_w * 2}:{fg_h * 2},"
        f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={fg_w}x{fg_h}:fps={fps}[fg];"
        f"[bg][fg]overlay=0:{y},subtitles='{ass_arg}',format=yuv420p[v]"
    )
    run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-filter_complex", graph,
         "-map", "[v]", "-map", "0:a?", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
         "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-profile:v", "high", "-r", str(fps),
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", str(out)])
    return out
