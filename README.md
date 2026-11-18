# GTA 6 Auto-Clipper

Pipeline automatica che trova i momenti migliori delle dirette/video di GTA 6, li monta in **Shorts verticali 1080×1920 (15–45 s)** con sottotitoli italiani, zoom e commenti originali, e li **carica e programma su YouTube**: 3–5 al giorno, senza conferme manuali.
Gira su **GitHub Actions** ogni 6 ore, quindi funziona anche a computer e Claude Code spenti.

```
Twitch Helix (clip più viste di Blur, Favij, Delux + top 3 live USA su GTA VI)
YouTube Data API (video GTA 6 con licenza CC BY + canali configurati)
        │
        ▼
 controllo diritti (config/rights.yaml)  ── bloccati → data/candidates_blocked.json
        │ consentiti
        ▼
 download (yt-dlp) → picchi audio + cambi scena + trascrizione (faster-whisper) + frame
        ▼
 Claude: sceglie i momenti (divertente / incidente / inseguimento / reazione / epico), voto 0–10
        ▼
 anti-duplicati (stessa fonte, stesso momento del VOD, hash dei frame, titoli simili)
        ▼
 tagli dinamici (via i silenzi) → layout verticale con sfondo sfocato → zoom punch-in
 → sottotitoli italiani + hook + commento originale + credito fonte → loudnorm -14 LUFS
        ▼
 Claude: titolo, descrizione, hashtag, tag  (+ link della fonte e base legale aggiunti dal codice)
        ▼
 YouTube Data API: upload privato + publishAt nello slot libero successivo
        ▼
 data/state.json salvato nel repo (memoria anti-duplicati)
```

## Regola sui diritti (importante)

Il sistema pubblica **solo** fonti che superano `clipper/rights.py`:

1. video YouTube con licenza **Creative Commons Attribution**;
2. creator con `status: granted` **e** una prova del permesso in `config/rights.yaml`;
3. il tuo canale (`own_channels`).

Le clip di Twitch e i normali video YouTube sono di proprietà degli streamer: essere pubblici non ne autorizza il ricaricamento. Senza permesso il sistema le **elenca** in `data/candidates_blocked.json` (ordinate per visualizzazioni, utile per sapere a chi chiedere) ma non le pubblica. Blur, Favij e Delux sono già nel file con `status: pending`.

## Setup (una volta)

| # | Cosa | Dove |
|---|------|------|
| 1 | `ANTHROPIC_API_KEY` | platform.claude.com → API Keys |
| 2 | `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | dev.twitch.tv/console → Register app (categoria "Application Integration", redirect `http://localhost`) |
| 3 | Progetto Google Cloud con **YouTube Data API v3** abilitata | console.cloud.google.com |
| 4 | `YOUTUBE_API_KEY` | stesso progetto → Credenziali → Chiave API |
| 5 | Client OAuth tipo **Desktop** → scarica `client_secret.json`; schermata consenso con scope `youtube.upload` e il tuo account come test user | stesso progetto |
| 6 | `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN` | sul tuo PC: `pip install google-auth-oauthlib && python scripts/youtube_auth.py client_secret.json` |
| 7 | Salva i 7 secret | GitHub → repo → Settings → Secrets and variables → Actions |
| 8 | Porta il workflow sul branch di default (merge) | i cron di GitHub girano solo dal branch di default |
| 9 | Prova: Actions → *GTA6 Auto-Clipper* → Run workflow con `dry_run` attivo; gli Short finiscono negli artifact | |

**Audit API YouTube:** i progetti Google non verificati possono caricare solo video che restano bloccati come *privati*. Per pubblicare davvero con `publishAt` serve l'audit di conformità delle YouTube API Services (modulo "YouTube API Services – Audit and Quota Extension"). Finché l'audit non è approvato, gli Short restano privati e li pubblichi tu da YouTube Studio.

> **Nota sul token:** se la schermata di consenso OAuth resta in modalità "Testing", il refresh token scade dopo 7 giorni. Pubblica l'app (anche senza verifica, se è solo per uso personale) per avere un token permanente.

## Uso locale

```bash
pip install -r requirements.txt     # serve anche ffmpeg
python -m clipper doctor            # cosa manca
python -m clipper run --dry-run --max 1
python -m clipper slots             # prossimi orari di pubblicazione
python -m pytest -q
```

## Configurazione

- `config/config.yaml`: streamer, numero di Short al giorno (`shorts_per_day`), soglia qualità (`min_score`), orari (`publish_slots`, fuso Europe/Rome), modello Whisper, layout.
- `config/rights.yaml`: permessi dei creator. Quando uno streamer ti autorizza: `status: granted`, `scope`, `proof` (dove hai salvato la prova), `expires` facoltativa.

## Limiti noti

- **Download da YouTube su GitHub Actions:** YouTube spesso blocca gli IP dei datacenter con "Sign in to confirm you're not a bot". Le clip Twitch di solito si scaricano senza problemi. Se succede, usa un runner self-hosted (anche un mini-PC o una VPS), oppure passa a yt-dlp i cookie di un account secondario.
- **Quota YouTube:** 10.000 unità al giorno per progetto; ogni ricerca costa 100 unità e gli upload ne consumano molte. Per non far competere ricerche e upload, crea `YOUTUBE_API_KEY` in un **secondo progetto Google** (quota separata) e lascia l'OAuth di upload nel primo. Oltre 6 Short al giorno serve un aumento di quota, da chiedere insieme all'audit.
- **Volume:** i video GTA 6 su YouTube con licenza CC BY sono pochi. Per arrivare stabilmente a 3–5 Short al giorno servono i permessi di almeno 2–3 streamer.
- **Costo Claude:** due chiamate per fonte analizzata (selezione + pacchetto), con frame a bassa risoluzione. Ordine di grandezza: pochi centesimi di dollaro per Short.
