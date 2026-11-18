"""Ricerca su YouTube Data API: video GTA 6 Creative Commons + upload dei canali configurati."""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone

import requests

from .models import Source

log = logging.getLogger(__name__)
API = "https://www.googleapis.com/youtube/v3"


def _iso_duration(s: str) -> float:
    m = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", s or "")
    if not m:
        return 0.0
    d, h, mi, se = (int(x or 0) for x in m.groups())
    return d * 86400 + h * 3600 + mi * 60 + se


def _get(path: str, key: str, **params) -> dict:
    r = requests.get(f"{API}/{path}", params=dict(params, key=key), timeout=20)
    r.raise_for_status()
    return r.json()


def _details(ids: list[str], key: str) -> list[dict]:
    out = []
    for i in range(0, len(ids), 50):
        out += _get("videos", key, part="snippet,contentDetails,status,statistics",
                    id=",".join(ids[i:i + 50]))["items"]
    return out


def discover(settings) -> list[Source]:
    key = settings.youtube_api_key
    if not key:
        log.warning("YOUTUBE_API_KEY mancante: salto la ricerca YouTube")
        return []
    cfg = settings.cfg
    disc = cfg["discovery"]
    after = (datetime.now(timezone.utc) - timedelta(days=disc["youtube_lookback_days"])).isoformat().replace("+00:00", "Z")
    ids: set[str] = set()

    if disc.get("youtube_creative_commons_search", True):
        for term in cfg["game"]["search_terms"][:2]:   # 100 unità di quota per ricerca
            res = _get("search", key, part="id", q=term, type="video", videoLicense="creativeCommon",
                       publishedAfter=after, maxResults=disc["youtube_max_results"], order="viewCount")
            ids |= {it["id"]["videoId"] for it in res.get("items", [])}

    for s in cfg["streamers"]["italian"]:
        ch = s.get("youtube_channel_id")
        if ch:
            res = _get("search", key, part="id", channelId=ch, q="GTA 6", type="video",
                       publishedAfter=after, maxResults=10, order="date")
            ids |= {it["id"]["videoId"] for it in res.get("items", [])}

    out: list[Source] = []
    for v in _details(sorted(ids), key):
        sn, st = v["snippet"], v["status"]
        out.append(Source(
            platform="youtube", source_id=v["id"], url=f"https://www.youtube.com/watch?v={v['id']}",
            title=sn["title"], creator=sn["channelTitle"], creator_handle=sn["channelId"],
            language=sn.get("defaultAudioLanguage") or sn.get("defaultLanguage") or "",
            duration=_iso_duration(v["contentDetails"]["duration"]),
            views=int(v.get("statistics", {}).get("viewCount", 0)), published_at=sn["publishedAt"],
            license=st.get("license", "youtube"),
        ))
    log.info("YouTube: %d video candidati", len(out))
    return out
