"""Download e analisi segnale (audio/frames) con yt-dlp + ffmpeg."""
from __future__ import annotations

import json
import logging
import re
import subprocess
from pathlib import Path

import numpy as np

log = logging.getLogger(__name__)


def run(cmd: list[str]) -> str:
    log.debug("$ %s", " ".join(map(str, cmd)))
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"comando fallito ({p.returncode}): {' '.join(map(str, cmd))}\n{p.stderr[-2000:]}")
    return p.stdout + p.stderr


def download(url: str, out_dir: Path, section: tuple[float, float] | None = None, max_height: int = 1080) -> Path:
    """Scarica il video (o solo una sezione) e ritorna il percorso del file mp4."""
    import yt_dlp

    out_dir.mkdir(parents=True, exist_ok=True)
    opts = {
        "outtmpl": str(out_dir / "%(id)s.%(ext)s"),
        "format": f"bv*[height<={max_height}]+ba/b[height<={max_height}]/b",
        "merge_output_format": "mp4",
        "quiet": True, "noprogress": True,
    }
    if section:
        from yt_dlp.utils import download_range_func
        opts["download_ranges"] = download_range_func(None, [section])
        opts["force_keyframes_at_cuts"] = True
        opts["outtmpl"] = str(out_dir / f"%(id)s_{int(section[0])}_{int(section[1])}.%(ext)s")
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        path = Path(ydl.prepare_filename(info)).with_suffix(".mp4")
    if not path.exists():
        cands = sorted(out_dir.glob(f"{info['id']}*"), key=lambda p: p.stat().st_mtime)
        path = cands[-1]
    return path


def download_audio(url: str, out_dir: Path) -> Path:
    import yt_dlp

    out_dir.mkdir(parents=True, exist_ok=True)
    opts = {"outtmpl": str(out_dir / "%(id)s.audio.%(ext)s"), "format": "ba/b", "quiet": True, "noprogress": True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return Path(ydl.prepare_filename(info))


def probe_duration(path: Path) -> float:
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)])
    return float(json.loads(out[: out.rfind("}") + 1])["format"]["duration"])


def loudness_curve(path: Path, hop: float = 0.5) -> np.ndarray:
    """RMS in dB ogni `hop` secondi (mono 8 kHz)."""
    sr = 8000
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr), "-f", "s16le", "-"],
                       capture_output=True)
    pcm = np.frombuffer(p.stdout, dtype=np.int16).astype(np.float32) / 32768.0
    n = int(sr * hop)
    if len(pcm) < n:
        return np.array([-90.0])
    frames = pcm[: len(pcm) // n * n].reshape(-1, n)
    rms = np.sqrt((frames ** 2).mean(axis=1) + 1e-12)
    return 20 * np.log10(rms)


def loud_peaks(curve: np.ndarray, hop: float = 0.5, top: int = 12, min_gap: float = 20.0) -> list[dict]:
    """Picchi di volume (urla, esplosioni, risate) rispetto alla mediana."""
    if curve.size < 4:
        return []
    k = max(1, int(3 / hop))
    smooth = np.convolve(curve, np.ones(k) / k, mode="same")
    base = float(np.median(smooth))
    order = np.argsort(smooth)[::-1]
    peaks: list[dict] = []
    for i in order:
        t = i * hop
        if all(abs(t - p["t"]) >= min_gap for p in peaks):
            peaks.append({"t": round(t, 1), "db_over_median": round(float(smooth[i] - base), 1)})
        if len(peaks) >= top:
            break
    return sorted(peaks, key=lambda p: p["t"])


def silences(path: Path, noise_db: int = -35, min_len: float = 0.6) -> list[tuple[float, float]]:
    out = run(["ffmpeg", "-i", str(path), "-af", f"silencedetect=noise={noise_db}dB:d={min_len}", "-f", "null", "-"])
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    return list(zip(starts, ends))


def scene_changes(path: Path, threshold: float = 0.35) -> list[float]:
    out = run(["ffmpeg", "-i", str(path), "-vf", f"select='gt(scene,{threshold})',showinfo", "-f", "null", "-"])
    return [float(x) for x in re.findall(r"pts_time:([\d.]+)", out)]


def extract_frames(path: Path, times: list[float], out_dir: Path, width: int = 512) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for i, t in enumerate(times):
        p = out_dir / f"f{i:03d}_{t:.1f}.jpg"
        run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.2f}", "-i", str(path), "-frames:v", "1",
             "-vf", f"scale={width}:-2", "-q:v", "4", str(p)])
        if p.exists():
            paths.append(p)
    return paths
