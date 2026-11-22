"""Baby Monitor ep. 1 — scrive in episodio.json ambiente, silenzi e suoni, partendo dai tempi veri della voce (tempi.json, parole.json).
Si rilancia ogni volta che si rifà la voce:  python prepara_suoni.py   (dalla cartella dell'episodio), poi monta.py.

La ninna nanna canticchiata (sfx/ninna.mp3) parte al secondo zero e continua senza salti da un'inquadratura all'altra:
cambia solo il volume (forte quando si vede il monitor, lontana fuori dalla villa) e si spezza di colpo quando la luce si accende.
Le sue voci hanno "led": true: extra.py ci legge il volume per accendere i led e il misuratore dello schermino."""
import json
from pathlib import Path

D = Path(__file__).resolve().parent
ep = json.loads((D / "episodio.json").read_text()); T = {r["id"]: r for r in json.loads((D / "tempi.json").read_text())["righe"]}
parole = dict(zip([r["id"] for r in ep["righe"]], json.loads((D / "parole.json").read_text())))
ini = lambda i: T[i]["inizio"]
lung = lambda a, b=None: round(T[b or a]["fine"] - T[a]["inizio"], 2)
detta = lambda riga, testo: next(w[0] for w in parole[riga] if testo.lower() in w[2].lower())

# la ninna nanna: (prima riga del tratto, volume)
tratti = [(1, 0.20), (2, 0.07), (5, 0.18), (6, 0.16), (8, 0.07), (9, 0.16)]
taglio = detta(9, "accende")                                    # la luce si accende: il canto si interrompe a metà nota
canto = []
for k, (riga, vol) in enumerate(tratti):
    t0 = 0.0 if k == 0 else ini(riga); t1 = taglio if k == len(tratti) - 1 else ini(tratti[k + 1][0]) + 0.15
    canto.append({"file": "ninna.mp3", "riga": riga, "dopo": round(t0 - ini(riga), 3), "da": round(t0, 3), "dur": round(t1 - t0, 3), "vol": vol,
                  "sfuma": 0.03 if k == len(tratti) - 1 else 0.15, "led": True})

ep["ambiente"] = [{"file": "amb_slow.mp3", "vol": [0.05, 0.16]}, {"file": "fruscio.mp3", "vol": 0.035}]
ep["silenzi"] = [{"da_riga": 10, "a_riga": 12}]                # silenzio totale intorno a «La mamma è qui»
sussurro = next(p for p in T[11]["pezzi"] if p["tipo"] == "lontana")
ep["suoni"] = canto + [
    {"file": "lago.mp3", "riga": 2, "dopo": -0.1, "dur": lung(2) + 0.3, "vol": 0.42, "sfuma": 0.35},
    {"file": "pendolo.mp3", "riga": 3, "dur": lung(3, 4), "vol": 0.30, "sfuma": 0.2},
    {"file": "legno.mp3", "riga": 4, "dopo": 0.5, "dur": 1.8, "vol": 0.28},
    {"file": "clic.mp3", "riga": 5, "parola": "Ninna", "dopo": -0.14, "vol": 0.26},                      # il tasto dell'altra unità
    {"file": "fruscio.mp3", "riga": 5, "parola": "Ninna", "dopo": -0.1, "dur": 4.6, "vol": 0.05, "sfuma": 0.2},
    {"file": "respiro_bimbo.mp3", "riga": 6, "dur": lung(6, 7), "vol": 0.26, "sfuma": 0.3},
    {"file": "squillo.mp3", "riga": 8, "vol": 0.13},
    {"file": "squillo.mp3", "riga": 8, "parola": "squilla", "dopo": 0.25, "vol": 0.13},
    {"file": "bip.mp3", "riga": 8, "parola": "spento", "dopo": 0.05, "vol": 0.14},
    {"file": "bip.mp3", "riga": 8, "parola": "spento", "dopo": 0.47, "vol": 0.14},
    {"file": "bip.mp3", "riga": 8, "parola": "spento", "dopo": 0.89, "vol": 0.14},
    {"file": "respiro_bimbo.mp3", "riga": 9, "da": 4.0, "dur": lung(9), "vol": 0.20, "sfuma": 0.3},
    {"file": "clic.mp3", "riga": 9, "parola": "accende", "vol": 0.45},                                    # la luce notturna
    {"file": "clic.mp3", "riga": 11, "dopo": round(sussurro["inizio"] - ini(11) - 0.16, 3), "vol": 0.30},
    {"file": "fruscio.mp3", "riga": 11, "dopo": round(sussurro["inizio"] - ini(11) - 0.12, 3), "dur": round(sussurro["fine"] - sussurro["inizio"] + 0.5, 2), "vol": 0.08, "sfuma": 0.12},
    {"file": "respiro_bimbo.mp3", "riga": 11, "da": 0.5, "dur": lung(11), "vol": 0.20, "sfuma": 0.3},
    {"file": "pendolo.mp3", "riga": 12, "dur": lung(12) + 0.4, "vol": 0.34, "sfuma": 0.15},
    # scheda finale: gli stessi suoni comuni di tutta la serie
    {"file": "heart60.mp3", "riga": 12, "fino_alla_fine": True, "cresce": [0.3, 1], "vol": 0.45, "sfuma": 0.4},
    {"file": "colpo.mp3", "riga": 13, "vol": 0.6},
    {"file": "rise_long.mp3", "riga": 13, "fino_alla_fine": True, "cresce": [0.2, 1], "vol": 0.22, "sfuma": 0.3},
]
(D / "episodio.json").write_text(json.dumps(ep, indent=1, ensure_ascii=False))
print(f"suoni scritti: {len(ep['suoni'])} · il canto si spezza a {taglio:.2f} s")
