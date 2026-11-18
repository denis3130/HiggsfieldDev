"""CLI: python -m clipper {run,doctor,slots}"""
from __future__ import annotations

import argparse
import logging
import os
import shutil
import sys

from .config import load_settings


def doctor(settings) -> int:
    """Verifica strumenti e credenziali: dice cosa manca."""
    checks = []
    for tool in ("ffmpeg", "ffprobe"):
        checks.append((tool, bool(shutil.which(tool)), "installa ffmpeg (apt-get install ffmpeg)"))
    for mod, hint in (("anthropic", "pip install anthropic"), ("yt_dlp", "pip install yt-dlp"),
                      ("faster_whisper", "pip install faster-whisper"),
                      ("googleapiclient", "pip install google-api-python-client google-auth-oauthlib")):
        try:
            __import__(mod)
            checks.append((mod, True, ""))
        except ImportError:
            checks.append((mod, False, hint))
    for env, hint in (("ANTHROPIC_API_KEY", "chiave da platform.claude.com"),
                      ("TWITCH_CLIENT_ID", "app su dev.twitch.tv/console"),
                      ("TWITCH_CLIENT_SECRET", "app su dev.twitch.tv/console"),
                      ("YOUTUBE_API_KEY", "Google Cloud Console → Credenziali → Chiave API"),
                      ("YT_CLIENT_ID", "OAuth client 'Desktop' in Google Cloud"),
                      ("YT_CLIENT_SECRET", "OAuth client 'Desktop' in Google Cloud"),
                      ("YT_REFRESH_TOKEN", "python scripts/youtube_auth.py")):
        checks.append((env, bool(os.environ.get(env)), hint))
    granted = [c["name"] for c in settings.rights.get("creators", []) if c.get("status") == "granted"]
    checks.append(("permessi creator", bool(granted),
                   "nessun creator con status: granted in config/rights.yaml → solo fonti CC BY"))
    ok = True
    for name, good, hint in checks:
        print(f"{'✔' if good else '✘'} {name:22s} {'' if good else '→ ' + hint}")
        ok &= good
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(prog="clipper")
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run", help="esegue un giro completo")
    r.add_argument("--dry-run", action="store_true", help="produce gli Short ma non carica")
    r.add_argument("--max", type=int, default=None, help="massimo Short in questo giro")
    sub.add_parser("doctor", help="controlla strumenti e credenziali")
    sub.add_parser("slots", help="mostra i prossimi slot di pubblicazione")
    a = ap.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    settings = load_settings()
    if a.cmd == "doctor":
        return doctor(settings)
    if a.cmd == "slots":
        from .state import State
        from .youtube_upload import next_slots
        print("\n".join(next_slots(settings.cfg, State().taken_slots(), 8)))
        return 0
    from .pipeline import run
    made = run(settings, dry_run=a.dry_run, max_new=a.max)
    for m in made:
        print(f"• {m['title']}  ←  {m['source_url']}  [{m.get('youtube_id') or 'non caricato'} {m.get('publish_at') or ''}]")
    return 0


if __name__ == "__main__":
    sys.exit(main())
