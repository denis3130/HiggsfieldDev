"""Caricamento configurazione e percorsi."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CONFIG_DIR = ROOT / "config"
DATA_DIR = Path(os.environ.get("CLIPPER_DATA_DIR", ROOT / "data"))
WORK_DIR = Path(os.environ.get("CLIPPER_WORK_DIR", ROOT / "work"))


@dataclass
class Settings:
    cfg: dict
    rights: dict

    @property
    def twitch_client_id(self) -> str | None:
        return os.environ.get("TWITCH_CLIENT_ID")

    @property
    def twitch_client_secret(self) -> str | None:
        return os.environ.get("TWITCH_CLIENT_SECRET")

    @property
    def youtube_api_key(self) -> str | None:
        return os.environ.get("YOUTUBE_API_KEY")


def load_settings() -> Settings:
    with open(CONFIG_DIR / "config.yaml", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    with open(CONFIG_DIR / "rights.yaml", encoding="utf-8") as f:
        rights = yaml.safe_load(f)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    return Settings(cfg=cfg, rights=rights)
