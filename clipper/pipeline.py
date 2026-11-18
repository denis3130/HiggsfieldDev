"""Orchestrazione: scoperta → diritti → analisi → selezione → montaggio → metadati → anti-duplicati → upload."""
from __future__ import annotations

import json
import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path

from . import dedupe, llm, media, render, rights, twitch, youtube_discovery, youtube_upload
from .config import DATA_DIR, ROOT, WORK_DIR, Settings
from .models import Source
from .state import State
from .transcribe import transcribe, transcript_text

log = logging.getLogger(__name__)
OUTPUT_DIR = ROOT / "output"
MAX_SOURCE_SECONDS = 60 * 60
FULL_TRANSCRIBE_SECONDS = 20 * 60


# ------------------------------------------------------------------ helpers

def _lines_for(tr: dict, seg_start: float, keep: list[tuple[float, float]],
               max_words: int = 5, max_len: float = 2.4) -> list[dict]:
    """Parole whisper nel momento -> righe brevi con tempi rimappati sullo Short tagliato."""
    words = []
    for s in tr["segments"]:
        for w in s["words"]:
            a = render.remap(w["start"] - seg_start, keep)
            b = render.remap(w["end"] - seg_start, keep)
            if a is not None and b is not None and w["word"]:
                words.append((a, b, w["word"]))
    lines, cur = [], []
    for a, b, w in words:
        if cur and (len(cur) >= max_words or b - cur[0][0] > max_len or a - cur[-1][1] > 0.6):
            lines.append(cur)
            cur = []
        cur.append((a, b, w))
        if w.endswith((".", "?", "!")):
            lines.append(cur)
            cur = []
    if cur:
        lines.append(cur)
    return [{"id": i, "start": round(l[0][0], 2), "end": round(l[-1][1] + 0.15, 2),
             "text": " ".join(x[2] for x in l)} for i, l in enumerate(lines)]


def _clamp_moment(m: dict, sel: dict, total: float) -> dict | None:
    s, e = max(0.0, float(m["start"])), min(total, float(m["end"]))
    if e - s > sel["max_duration"]:
        mid = (s + e) / 2
        s, e = mid - sel["max_duration"] / 2, mid + sel["max_duration"] / 2
    if e - s < sel["min_duration"]:
        pad = (sel["min_duration"] - (e - s)) / 2
        s, e = max(0.0, s - pad), min(total, e + pad)
    if e - s < sel["min_duration"] - 0.5:
        return None
    return dict(m, start=round(s, 2), end=round(e, 2))


def _description(pkg: dict, src: Source) -> str:
    tags = " ".join(h if h.startswith("#") else f"#{h}" for h in pkg["hashtags"])
    return (f"{pkg['description'].strip()}\n\n"
            f"🎥 Fonte originale: {src.creator} — {src.url}\n"
            f"📄 Base di riuso: {src.rights_basis}\n"
            f"Tutti i diritti sul contenuto originale appartengono al creator. GTA VI © Rockstar Games.\n\n"
            f"{tags}")


def _queue_room(cfg: dict, state: State) -> int:
    """Quanti Short possiamo aggiungere: buffer massimo di 2 giorni di programmazione."""
    now = datetime.now(timezone.utc)
    future = [p for p in state.published if p.get("publish_at")
              and datetime.fromisoformat(p["publish_at"].replace("Z", "+00:00")) > now]
    return max(0, cfg["selection"]["shorts_per_day"] * 2 - len(future))


# ------------------------------------------------------------------ singola fonte

def process_source(settings: Settings, state: State, src: Source, dry_run: bool) -> list[dict]:
    cfg = settings.cfg
    sel = cfg["selection"]
    wd = WORK_DIR / src.key.replace(":", "_")
    wd.mkdir(parents=True, exist_ok=True)
    meta = {"piattaforma": src.platform, "titolo": src.title, "creator": src.creator, "views": src.views,
            "lingua": src.language, "url": src.url}

    video = media.download(src.url, wd)
    total = media.probe_duration(video)
    hop = 0.5
    curve = media.loudness_curve(video, hop)
    peaks = media.loud_peaks(curve, hop, top=12, min_gap=max(8.0, total / 15))
    scenes = media.scene_changes(video) if total <= 30 * 60 else []

    wcfg = cfg["whisper"]
    if total <= FULL_TRANSCRIBE_SECONDS:
        tr = transcribe(video, wcfg["model"], wcfg["compute_type"])
    else:   # video lunghi: trascrivi solo le finestre attorno ai picchi
        tr = {"language": "", "segments": []}
        for p in peaks[:6]:
            part = transcribe(video, wcfg["model"], wcfg["compute_type"],
                              clip=(max(0, p["t"] - 40), min(total, p["t"] + 40)))
            tr["language"] = tr["language"] or part["language"]
            tr["segments"] += part["segments"]
        tr["segments"].sort(key=lambda s: s["start"])

    n_even = 10 if total > 60 else 6
    times = sorted({round(total * (i + 0.5) / n_even, 1) for i in range(n_even)} | {p["t"] for p in peaks[:6]})
    frames = media.extract_frames(video, [t for t in times if t < total], wd / "frames")

    moments = llm.select_moments(cfg, meta, transcript_text(tr), peaks, scenes, frames)
    moments = [m for m in (_clamp_moment(m, sel, total) for m in moments) if m and m["score"] >= sel["min_score"]]
    moments.sort(key=lambda m: m["score"], reverse=True)
    log.info("%s: %d momenti sopra soglia", src.key, len(moments))

    results = []
    vod_key = f"twitch_vod:{src.extra['video_id']}" if src.extra.get("video_id") else None
    for m in moments[:1]:   # un solo Short per fonte, per varietà del canale
        seg = (m["start"], m["end"])
        vod_seg = None
        if vod_key and src.extra.get("vod_offset") is not None:
            off = float(src.extra["vod_offset"])
            vod_seg = (off + seg[0], off + seg[1])
        why = dedupe.is_duplicate(state.published, src.key, seg, vod_key=vod_key, vod_seg=vod_seg)
        if why:
            log.info("Scartato (%s)", why)
            continue

        cut, keep = render.dynamic_cut(video, seg[0], seg[1], wd / f"cut_{int(seg[0])}.mp4", sel["min_duration"])
        short_dur = media.probe_duration(cut)
        hashes = dedupe.video_hashes(cut, wd / "hash")
        why = dedupe.is_duplicate(state.published, src.key, seg, hashes=hashes)
        if why:
            log.info("Scartato (%s)", why)
            continue

        lines = _lines_for(tr, seg[0], keep)
        mid_frames = media.extract_frames(cut, [short_dur * f for f in (0.15, 0.5, 0.85)], wd / "pkg_frames")
        rel_moment = dict(m, start=0.0, end=round(short_dur, 2))
        pkg = llm.package(cfg, meta, rel_moment, lines, mid_frames)
        if dedupe.is_duplicate(state.published, "-", (0, 0), title=pkg["title"]):
            pkg["title"] = f"{pkg['title'][:60]} ({src.creator})"

        it = {s["id"]: s["it"] for s in pkg["subtitles"]}
        subs = [{"start": l["start"], "end": l["end"], "text": it.get(l["id"], l["text"])} for l in lines]
        commentary = pkg["commentary"] if cfg["render"].get("add_original_commentary") else []
        credit = f"Fonte: {src.creator} · {src.platform.replace('_clip', '')}" if cfg["render"].get("watermark_source") else ""
        ass = render.build_ass(wd / "subs.ass", subs, pkg["hook"], commentary, credit, short_dur)
        zooms = [z for z in pkg["zoom_points"] if 0 < z < short_dur - 0.5][:4]

        OUTPUT_DIR.mkdir(exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        final = OUTPUT_DIR / f"{stamp}_{src.key.replace(':', '_')}.mp4"
        render.render_vertical(cut, ass, final, zooms, cfg)

        title = pkg["title"][:95]
        if "#shorts" not in title.lower() and len(title) < 88:
            title += " #Shorts"
        description = _description(pkg, src)
        entry = {
            "source_key": src.key, "source_url": src.url, "creator": src.creator, "rights_basis": src.rights_basis,
            "segment": list(seg), "vod_key": vod_key, "vod_segment": list(vod_seg) if vod_seg else None,
            "category": m["category"], "score": m["score"], "title": title, "phash": hashes,
            "file": str(final.relative_to(ROOT)), "youtube_id": None, "publish_at": None,
        }
        (final.with_suffix(".json")).write_text(json.dumps(dict(entry, description=description, tags=pkg["tags"]),
                                                           ensure_ascii=False, indent=2), encoding="utf-8")

        if not dry_run and cfg["upload"]["enabled"] and youtube_upload.credentials_present():
            slot = youtube_upload.next_slots(cfg, state.taken_slots(), 1)[0]
            entry["youtube_id"] = youtube_upload.upload(cfg, str(final), title, description, pkg["tags"], slot)
            entry["publish_at"] = slot
        else:
            log.info("Upload saltato (dry-run o credenziali mancanti): %s", final)
        if not dry_run:   # il dry-run non consuma fonti né slot
            state.add_published(entry)
            state.save()
        results.append(entry)
    return results


# ------------------------------------------------------------------ run completo

def run(settings: Settings, dry_run: bool = False, max_new: int | None = None) -> list[dict]:
    state = State()
    room = _queue_room(settings.cfg, state)
    target = min(room, max_new) if max_new is not None else room
    log.info("Short da produrre in questo giro: %d", target)
    if target <= 0:
        return []

    sources: list[Source] = []
    for disc in (twitch.discover, youtube_discovery.discover):
        try:
            sources += disc(settings)
        except Exception as e:   # una piattaforma giù non deve fermare l'altra
            log.error("Discovery %s fallita: %s", disc.__module__, e)

    allowed, blocked = [], []
    for s in sources:
        if state.seen(s.key):
            continue
        ok, why = rights.check(settings.rights, s)
        s.rights_basis = why
        (allowed if ok else blocked).append(s)
    for s in blocked:
        state.mark_blocked(s.key, {"url": s.url, "creator": s.creator, "title": s.title,
                                   "views": s.views, "reason": s.rights_basis})
    _write_blocked_report(state)
    log.info("Fonti: %d consentite, %d bloccate dal controllo diritti", len(allowed), len(blocked))

    allowed = [s for s in allowed if 0 < s.duration <= MAX_SOURCE_SECONDS and s.duration >= 10]
    allowed.sort(key=lambda s: s.views, reverse=True)

    made: list[dict] = []
    for s in allowed:
        if len(made) >= target:
            break
        try:
            made += process_source(settings, state, s, dry_run)
        except Exception as e:
            log.exception("Errore su %s: %s", s.key, e)
        finally:
            if not dry_run:
                state.mark_seen(s.key, {"url": s.url, "creator": s.creator, "title": s.title})
                state.save()
            shutil.rmtree(WORK_DIR / s.key.replace(":", "_"), ignore_errors=True)
    state.save()
    return made


def _write_blocked_report(state: State) -> None:
    items = sorted(state.data["blocked"].values(), key=lambda x: x.get("views", 0), reverse=True)[:200]
    (DATA_DIR / "candidates_blocked.json").write_text(json.dumps(items, ensure_ascii=False, indent=2),
                                                      encoding="utf-8")
