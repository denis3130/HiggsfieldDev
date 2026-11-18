"""Autorizzazione una tantum del canale YouTube: genera il refresh token da salvare come secret.

Uso (sul tuo computer, non nel cloud):
    pip install google-auth-oauthlib
    python scripts/youtube_auth.py percorso/client_secret.json
Poi copia i tre valori stampati nei secret del repository GitHub.
"""
import json
import sys

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"]


def main() -> None:
    path = sys.argv[1] if len(sys.argv) > 1 else "client_secret.json"
    flow = InstalledAppFlow.from_client_secrets_file(path, SCOPES)
    creds = flow.run_local_server(port=0, prompt="consent", access_type="offline")
    info = json.load(open(path))["installed"]
    print("\nSalva questi secret su GitHub (Settings → Secrets and variables → Actions):")
    print(f"YT_CLIENT_ID={info['client_id']}")
    print(f"YT_CLIENT_SECRET={info['client_secret']}")
    print(f"YT_REFRESH_TOKEN={creds.refresh_token}")


if __name__ == "__main__":
    main()
