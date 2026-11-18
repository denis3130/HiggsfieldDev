"""Controllo dei diritti di riuso: nessuna fonte viene pubblicata senza una base legittima."""
from __future__ import annotations

from datetime import date

from .models import Source


def _creator_entry(rights: dict, src: Source) -> dict | None:
    handle = src.creator_handle.lower()
    for c in rights.get("creators") or []:
        plats = {k: str(v).lower() for k, v in (c.get("platforms") or {}).items()}
        if handle in plats.values() or src.creator.lower() == str(c.get("name", "")).lower():
            return c
    return None


def check(rights: dict, src: Source, today: date | None = None) -> tuple[bool, str]:
    """Ritorna (consentito, motivazione)."""
    today = today or date.today()

    if src.creator_handle in (rights.get("own_channels") or []):
        return True, "contenuto del proprio canale"

    entry = _creator_entry(rights, src)
    if entry and entry.get("status") == "granted":
        exp = entry.get("expires")
        if exp and date.fromisoformat(str(exp)) < today:
            return False, f"permesso di {entry['name']} scaduto il {exp}"
        if not entry.get("proof"):
            return False, f"permesso di {entry['name']} senza prova registrata (campo proof)"
        return True, f"permesso scritto di {entry['name']}: {entry.get('proof')}"
    if entry and entry.get("status") == "denied":
        return False, f"{entry['name']} ha negato il permesso"

    if src.platform == "youtube" and src.license in (rights.get("youtube_licenses_allowed") or []):
        return True, "licenza YouTube Creative Commons Attribution (CC BY)"

    return False, "nessuna licenza di riuso né permesso del creator"
