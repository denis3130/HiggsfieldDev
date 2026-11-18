"""Trascrizione con faster-whisper (CPU), con timestamp per parola."""
from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path

log = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _model(name: str, compute_type: str):
    from faster_whisper import WhisperModel
    return WhisperModel(name, device="cpu", compute_type=compute_type)


def transcribe(path: Path, model: str = "small", compute_type: str = "int8",
               clip: tuple[float, float] | None = None) -> dict:
    """Ritorna {"language": str, "segments": [{start,end,text,words:[{start,end,word}]}]}."""
    kw = {"word_timestamps": True, "vad_filter": True}
    if clip:
        kw["clip_timestamps"] = [clip[0], clip[1]]
    segs, info = _model(model, compute_type).transcribe(str(path), **kw)
    out = []
    for s in segs:
        out.append({
            "start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip(),
            "words": [{"start": round(w.start, 2), "end": round(w.end, 2), "word": w.word.strip()}
                      for w in (s.words or [])],
        })
    log.info("Trascritti %d segmenti (%s)", len(out), info.language)
    return {"language": info.language, "segments": out}


def transcript_text(tr: dict, start: float = 0, end: float = 1e12) -> str:
    return "\n".join(f"[{s['start']:.1f}-{s['end']:.1f}] {s['text']}"
                     for s in tr["segments"] if s["end"] >= start and s["start"] <= end)
