"""Monitoraggio Twitch via Helix API: top live GTA VI e clip più viste degli streamer configurati."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import requests

from .models import Source

log = logging.getLogger(__name__)
HELIX = "https://api.twitch.tv/helix"


class Twitch:
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        r = requests.post(
            "https://id.twitch.tv/oauth2/token",
            data={"client_id": client_id, "client_secret": client_secret,
                  "grant_type": "client_credentials"},
            timeout=20,
        )
        r.raise_for_status()
        self.token = r.json()["access_token"]

    def _get(self, path: str, **params) -> dict:
        r = requests.get(
            f"{HELIX}/{path}", params=params, timeout=20,
            headers={"Client-Id": self.client_id, "Authorization": f"Bearer {self.token}"},
        )
        r.raise_for_status()
        return r.json()

    def game_id(self, name: str) -> str | None:
        data = self._get("games", name=name)["data"]
        return data[0]["id"] if data else None

    def top_live(self, game_id: str, language: str, count: int) -> list[dict]:
        """Stream live ordinati per spettatori (Helix li restituisce già in ordine decrescente)."""
        return self._get("streams", game_id=game_id, language=language, first=max(count, 1))["data"][:count]

    def users(self, logins: list[str]) -> dict[str, dict]:
        if not logins:
            return {}
        data = self._get("users", login=logins)["data"]
        return {u["login"].lower(): u for u in data}

    def clips(self, broadcaster_id: str, game_id: str | None, hours: int, first: int) -> list[dict]:
        started = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat().replace("+00:00", "Z")
        data = self._get("clips", broadcaster_id=broadcaster_id, started_at=started, first=min(first, 100))["data"]
        if game_id:
            data = [c for c in data if c.get("game_id") == game_id]
        return sorted(data, key=lambda c: c.get("view_count", 0), reverse=True)


def discover(settings) -> list[Source]:
    cfg = settings.cfg
    if not (settings.twitch_client_id and settings.twitch_client_secret):
        log.warning("TWITCH_CLIENT_ID/SECRET mancanti: salto Twitch")
        return []
    tw = Twitch(settings.twitch_client_id, settings.twitch_client_secret)
    gid = tw.game_id(cfg["game"]["name"])
    if not gid:
        log.warning("Categoria Twitch '%s' non trovata", cfg["game"]["name"])

    logins = [s["twitch"].lower() for s in cfg["streamers"]["italian"] if s.get("twitch")]
    us = cfg["streamers"]["us_top_live"]
    if gid:
        top = tw.top_live(gid, us.get("language", "en"), us.get("count", 3))
        log.info("Top live US su GTA VI: %s", [(s["user_login"], s["viewer_count"]) for s in top])
        logins += [s["user_login"].lower() for s in top]

    users = tw.users(sorted(set(logins)))
    disc = cfg["discovery"]
    out: list[Source] = []
    for login, u in users.items():
        for c in tw.clips(u["id"], gid, disc["twitch_clips_lookback_hours"], disc["twitch_clips_per_streamer"]):
            out.append(Source(
                platform="twitch_clip", source_id=c["id"], url=c["url"], title=c["title"],
                creator=u["display_name"], creator_handle=login, language=c.get("language", ""),
                duration=float(c.get("duration", 0)), views=int(c.get("view_count", 0)),
                published_at=c.get("created_at", ""),
                extra={"vod_offset": c.get("vod_offset"), "video_id": c.get("video_id")},
            ))
    log.info("Twitch: %d clip candidate", len(out))
    return out
