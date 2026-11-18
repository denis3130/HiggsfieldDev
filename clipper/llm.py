"""Chiamate a Claude: selezione momenti, sottotitoli italiani, titoli/descrizioni/hashtag, commento."""
from __future__ import annotations

import base64
import json
import logging
from pathlib import Path

import anthropic

log = logging.getLogger(__name__)

_client: anthropic.Anthropic | None = None


def client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


def _image_blocks(frames: list[Path]) -> list[dict]:
    blocks = []
    for f in frames:
        blocks.append({"type": "text", "text": f"Frame a t={f.stem.split('_')[-1]}s:"})
        blocks.append({"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                                   "data": base64.b64encode(f.read_bytes()).decode()}})
    return blocks


def _ask_json(cfg: dict, system: str, content: list[dict], schema: dict, max_tokens: int = 16000) -> dict:
    resp = client().beta.messages.create(
        model=cfg["llm"]["model"],
        max_tokens=max_tokens,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=system,
        messages=[{"role": "user", "content": content}],
        output_config={"effort": cfg["llm"].get("effort", "medium"),
                       "format": {"type": "json_schema", "schema": schema}},
    )
    if resp.stop_reason == "refusal":
        raise RuntimeError(f"Claude ha rifiutato la richiesta: {resp.stop_details}")
    if resp.stop_reason == "max_tokens":
        raise RuntimeError("risposta troncata (max_tokens)")
    text = next(b.text for b in resp.content if b.type == "text")
    return json.loads(text)


# ---------------------------------------------------------------- selezione

MOMENTS_SCHEMA = {
    "type": "object",
    "properties": {
        "moments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "start": {"type": "number"},
                    "end": {"type": "number"},
                    "category": {"type": "string"},
                    "score": {"type": "number"},
                    "reason": {"type": "string"},
                },
                "required": ["start", "end", "category", "score", "reason"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["moments"],
    "additionalProperties": False,
}

SELECT_SYSTEM = """Sei l'editor di un canale YouTube Shorts italiano su GTA 6.
Individui i momenti migliori di una diretta/clip: divertenti, incidenti, inseguimenti, reazioni forti, momenti epici.
Un buon momento è autoconclusivo, ha un setup e una punchline/payoff riconoscibili anche senza contesto,
e funziona in verticale. Premia i picchi audio che coincidono con eventi nel gioco o reazioni vere.
Scarta: pause, menu, caricamenti, chiacchiere fuori tema, contenuti offensivi o sessuali, dati personali visibili.
Usa i punteggi 0–10 con severità: 8+ solo per scene che faresti davvero vedere a un amico."""


def select_moments(cfg: dict, meta: dict, transcript: str, peaks: list[dict], scenes: list[float],
                   frames: list[Path]) -> list[dict]:
    sel = cfg["selection"]
    text = (
        f"Fonte: {json.dumps(meta, ensure_ascii=False)}\n\n"
        f"Durata minima {sel['min_duration']}s, massima {sel['max_duration']}s per momento. "
        f"Categorie ammesse: {', '.join(sel['categories'])}.\n"
        f"Restituisci fino a 3 momenti non sovrapposti, ordinati per punteggio (secondi assoluti nel video).\n\n"
        f"Picchi di volume: {json.dumps(peaks)}\n"
        f"Cambi scena (s): {[round(s, 1) for s in scenes[:200]]}\n\n"
        f"Trascrizione con timestamp:\n{transcript[:60000]}"
    )
    out = _ask_json(cfg, SELECT_SYSTEM, [{"type": "text", "text": text}, *_image_blocks(frames)],
                    MOMENTS_SCHEMA, max_tokens=8000)
    return out["moments"]


# ---------------------------------------------------------------- pacchetto Short

PACKAGE_SCHEMA = {
    "type": "object",
    "properties": {
        "subtitles": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"id": {"type": "integer"}, "it": {"type": "string"}},
                "required": ["id", "it"], "additionalProperties": False,
            },
        },
        "hook": {"type": "string"},
        "commentary": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"start": {"type": "number"}, "end": {"type": "number"}, "text": {"type": "string"}},
                "required": ["start", "end", "text"], "additionalProperties": False,
            },
        },
        "zoom_points": {"type": "array", "items": {"type": "number"}},
        "title": {"type": "string"},
        "description": {"type": "string"},
        "hashtags": {"type": "array", "items": {"type": "string"}},
        "tags": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["subtitles", "hook", "commentary", "zoom_points", "title", "description", "hashtags", "tags"],
    "additionalProperties": False,
}

PACKAGE_SYSTEM = """Sei l'autore di un canale YouTube Shorts italiano su GTA 6.
Per ogni scena produci:
- subtitles: traduzione/adattamento in italiano colloquiale e naturale di OGNI riga (stesso id), brevi e leggibili;
  mantieni il senso e le battute, niente censura creativa ma niente insulti gratuiti aggiunti.
- hook: frase di apertura a schermo (max 6 parole, maiuscole consentite) che crea curiosità senza mentire.
- commentary: 0–2 brevi commenti ORIGINALI a schermo (max 8 parole) solo se aggiungono valore (contesto, ironia);
  tempi relativi all'inizio dello Short.
- zoom_points: 1–4 istanti (secondi relativi) dove un punch-in enfatizza reazione/impatto.
- title: max 70 caratteri, italiano, accattivante ma veritiero, contiene "GTA 6", niente clickbait ingannevole.
- description: 2–3 frasi in italiano. NON inserire tu il link della fonte (lo aggiunge il sistema).
- hashtags: 3–6, includi #GTA6 e #Shorts. tags: 8–15 parole chiave.
Il canale cita sempre il creator originale: valorizzalo, non attribuirti il suo contenuto."""


def package(cfg: dict, meta: dict, moment: dict, lines: list[dict], frames: list[Path]) -> dict:
    text = (
        f"Fonte: {json.dumps(meta, ensure_ascii=False)}\n"
        f"Momento scelto: {json.dumps(moment, ensure_ascii=False)}\n"
        f"Durata Short: {moment['end'] - moment['start']:.1f}s\n\n"
        f"Righe da sottotitolare (tempi relativi all'inizio dello Short):\n"
        + "\n".join(f"{l['id']}. [{l['start']:.1f}-{l['end']:.1f}] {l['text']}" for l in lines)
    )
    return _ask_json(cfg, PACKAGE_SYSTEM, [{"type": "text", "text": text}, *_image_blocks(frames)],
                     PACKAGE_SCHEMA, max_tokens=8000)
