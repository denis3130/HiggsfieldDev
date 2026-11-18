"""Stato persistente (JSON versionato nel repo): fonti viste, Short pubblicati, slot occupati."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from .config import DATA_DIR

STATE_FILE = DATA_DIR / "state.json"


class State:
    def __init__(self, path: Path = STATE_FILE):
        self.path = path
        if path.exists():
            self.data = json.loads(path.read_text(encoding="utf-8"))
        else:
            self.data = {"seen_sources": {}, "published": [], "blocked": {}}

    # --- fonti ---
    def seen(self, key: str) -> bool:
        return key in self.data["seen_sources"]

    def mark_seen(self, key: str, info: dict) -> None:
        info = dict(info, seen_at=_now())
        self.data["seen_sources"][key] = info

    def mark_blocked(self, key: str, info: dict) -> None:
        self.data["blocked"][key] = dict(info, at=_now())

    # --- pubblicati ---
    @property
    def published(self) -> list[dict]:
        return self.data["published"]

    def add_published(self, entry: dict) -> None:
        self.data["published"].append(dict(entry, created_at=_now()))

    def taken_slots(self) -> set[str]:
        return {p["publish_at"] for p in self.published if p.get("publish_at")}

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.data, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(self.path)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")
