"""Strutture dati condivise."""
from __future__ import annotations

from dataclasses import asdict, dataclass, field


@dataclass
class Source:
    platform: str            # "twitch_clip" | "youtube"
    source_id: str           # id univoco sulla piattaforma
    url: str
    title: str
    creator: str             # nome visualizzato del canale
    creator_handle: str      # login twitch o channel id youtube
    language: str = ""
    duration: float = 0.0
    views: int = 0
    published_at: str = ""
    license: str = "standard"  # "creativeCommon" | "standard" | "permission"
    rights_basis: str = ""     # motivo per cui è (o non è) riutilizzabile
    extra: dict = field(default_factory=dict)

    @property
    def key(self) -> str:
        return f"{self.platform}:{self.source_id}"

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Moment:
    start: float
    end: float
    category: str
    score: float
    reason: str

    @property
    def duration(self) -> float:
        return self.end - self.start


@dataclass
class ShortPackage:
    source: Source
    moment: Moment
    video_path: str
    title: str
    description: str
    hashtags: list[str]
    tags: list[str]
    phash: list[str]
