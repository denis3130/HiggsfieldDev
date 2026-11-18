"""Caricamento e programmazione Shorts con YouTube Data API v3 (OAuth refresh token)."""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

log = logging.getLogger(__name__)
SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"]


def _service():
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    creds = Credentials(
        token=None,
        refresh_token=os.environ["YT_REFRESH_TOKEN"],
        client_id=os.environ["YT_CLIENT_ID"],
        client_secret=os.environ["YT_CLIENT_SECRET"],
        token_uri="https://oauth2.googleapis.com/token",
        scopes=SCOPES,
    )
    return build("youtube", "v3", credentials=creds, cache_discovery=False)


def credentials_present() -> bool:
    return all(os.environ.get(k) for k in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"))


def next_slots(cfg: dict, taken: set[str], n: int, now: datetime | None = None) -> list[str]:
    """Prossimi `n` slot liberi (ISO UTC), rispettando shorts_per_day al giorno."""
    up = cfg["upload"]
    tz = ZoneInfo(up["timezone"])
    now = (now or datetime.now(tz)).astimezone(tz)
    per_day = cfg["selection"]["shorts_per_day"]
    slots_cfg = up["publish_slots"][:per_day]
    taken_local = [datetime.fromisoformat(t).astimezone(tz) for t in taken]
    out: list[str] = []
    day = now.date()
    while len(out) < n:
        used_today = sum(1 for t in taken_local if t.date() == day) + sum(
            1 for t in out if datetime.fromisoformat(t).astimezone(tz).date() == day)
        for hm in slots_cfg:
            if used_today >= per_day or len(out) >= n:
                break
            h, m = map(int, hm.split(":"))
            dt = datetime(day.year, day.month, day.day, h, m, tzinfo=tz)
            iso = dt.astimezone(ZoneInfo("UTC")).isoformat().replace("+00:00", "Z")
            if dt > now + timedelta(minutes=20) and iso not in taken and all(
                    abs((dt - t).total_seconds()) > 3600 for t in taken_local):
                out.append(iso)
                used_today += 1
        day += timedelta(days=1)
    return out


def upload(cfg: dict, path: str, title: str, description: str, tags: list[str], publish_at: str) -> str:
    from googleapiclient.http import MediaFileUpload

    up = cfg["upload"]
    body = {
        "snippet": {
            "title": title[:100], "description": description[:5000], "tags": tags[:30],
            "categoryId": up["category_id"], "defaultLanguage": up["default_language"],
            "defaultAudioLanguage": up["default_language"],
        },
        "status": {
            "privacyStatus": up["privacy_until_publish"],   # deve essere "private" per usare publishAt
            "publishAt": publish_at,
            "selfDeclaredMadeForKids": up["made_for_kids"],
            "containsSyntheticMedia": False,
        },
    }
    req = _service().videos().insert(part="snippet,status", body=body,
                                     media_body=MediaFileUpload(path, mimetype="video/mp4", resumable=True,
                                                                chunksize=8 * 1024 * 1024))
    resp = None
    while resp is None:
        status, resp = req.next_chunk()
        if status:
            log.info("upload %d%%", int(status.progress() * 100))
    log.info("Caricato %s, pubblicazione programmata %s", resp["id"], publish_at)
    return resp["id"]
