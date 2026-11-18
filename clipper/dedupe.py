"""Anti-duplicati: stessa fonte/intervallo sovrapposto, titoli simili e hash percettivo dei frame."""
from __future__ import annotations

import difflib
from pathlib import Path

from PIL import Image

from .media import extract_frames, probe_duration


def dhash(img: Image.Image, size: int = 8) -> str:
    g = img.convert("L").resize((size + 1, size), Image.LANCZOS)
    px = list(g.getdata())
    bits = 0
    for r in range(size):
        for c in range(size):
            bits = (bits << 1) | (px[r * (size + 1) + c] > px[r * (size + 1) + c + 1])
    return f"{bits:016x}"


def video_hashes(path: Path, work: Path, n: int = 6) -> list[str]:
    d = probe_duration(path)
    times = [d * (i + 0.5) / n for i in range(n)]
    return [dhash(Image.open(f)) for f in extract_frames(path, times, work, width=256)]


def hamming(a: str, b: str) -> int:
    return bin(int(a, 16) ^ int(b, 16)).count("1")


def similar_hashes(a: list[str], b: list[str], max_dist: int = 10, min_matches: int = 3) -> bool:
    matches = sum(1 for x in a if any(hamming(x, y) <= max_dist for y in b))
    return matches >= min_matches


def overlaps(a: tuple[float, float], b: tuple[float, float], min_ratio: float = 0.3) -> bool:
    inter = max(0.0, min(a[1], b[1]) - max(a[0], b[0]))
    return inter >= min_ratio * min(a[1] - a[0], b[1] - b[0])


def is_duplicate(published: list[dict], source_key: str, seg: tuple[float, float],
                 hashes: list[str] | None = None, title: str | None = None,
                 vod_key: str | None = None, vod_seg: tuple[float, float] | None = None) -> str | None:
    """Ritorna il motivo se è un duplicato, altrimenti None."""
    for p in published:
        if p["source_key"] == source_key and overlaps(seg, tuple(p["segment"])):
            return f"stesso intervallo già pubblicato ({p.get('youtube_id')})"
        if vod_key and vod_seg and p.get("vod_key") == vod_key and p.get("vod_segment") \
                and overlaps(vod_seg, tuple(p["vod_segment"])):
            return "stesso momento del VOD già pubblicato da un'altra clip"
        if hashes and p.get("phash") and similar_hashes(hashes, p["phash"]):
            return f"contenuto visivamente identico a {p.get('youtube_id')}"
        if title and p.get("title") and difflib.SequenceMatcher(None, title.lower(), p["title"].lower()).ratio() > 0.9:
            return "titolo quasi identico a uno già pubblicato"
    return None
