"""Scrive in episodio.json la lista dei suoni dell'Ep. 1 (registrazioni vere CC0, vedi licenze_suoni.json), con le durate
prese da tempi.json: si rilancia ogni volta che cambia la voce. Uso: python suoni.py  (dalla cartella dell'episodio)"""
import json
from pathlib import Path

D = Path(__file__).resolve().parent
ep = json.loads((D / "episodio.json").read_text()); tm = json.loads((D / "tempi.json").read_text())
R = {r["id"]: r for r in tm["righe"]}
ini = lambda k: R[k]["inizio"]; vfine = lambda k: R[k]["voce_fine"]
S = []


def s(file, riga, vol, **kw):
    S.append({"file": file, "riga": riga, "vol": vol, **kw})


# 1-2 fuori: vento, passi sul selciato, stoviglie dietro una finestra, un cane lontano; la lettera e la borsa degli attrezzi
s("vento.mp3", 1, 0.30, da=0.0, dur=round(ini(3) - ini(1) + 0.4, 2), sfuma=0.5)
s("passi.mp3", 1, 0.30, dopo=0.1, dur=4.2, sfuma=0.3)
s("stoviglie.mp3", 1, 0.10, dopo=1.3)
s("cane.mp3", 1, 0.10, dopo=2.7)
s("carta.mp3", 2, 0.35, dopo=0.05)
s("attrezzi.mp3", 2, 0.22, dopo=1.7)
# 3-6 dentro la locanda: porta che cigola, pendola, vento appena udibile; chiave; biglietto; stufa; respiro
s("cigolio.mp3", 3, 0.28, dopo=-0.2)
s("pendola.mp3", 3, 0.20, dur=round(ini(5) - ini(3) + 0.6, 2), sfuma=0.6)
s("vento.mp3", 3, 0.07, da=12.0, dur=round(ini(7) - ini(3), 2), sfuma=0.8)
s("chiave.mp3", 4, 0.40, parola="chiave", dopo=0.05)
s("carta.mp3", 4, 0.30, parola="Qualunque", dopo=-0.4)
s("stufa.mp3", 5, 0.35, dur=round(ini(7) - ini(5) + 0.4, 2), sfuma=0.5)
s("respiro.mp3", 6, 0.35, dopo=0.15, dur=2.6)
# 7-8 la campana delle nove, poi scuri, travi e chiavistelli; l'ultimo rintocco si spegne nel silenzio
s("vento.mp3", 7, 0.16, da=30.0, dur=round(vfine(8) - ini(7) + 0.2, 2), sfuma=0.4)
s("campana.mp3", 7, 0.50, parola="nove", dopo=0.12, dur=round(vfine(8) - ini(7) - 0.4, 2), sfuma=0.5)
s("scuri.mp3", 8, 0.40, dopo=0.15, dur=round(vfine(8) - ini(8) - 0.2, 2), sfuma=0.3)
s("chiavistello.mp3", 8, 0.35, dopo=0.9)
s("trave.mp3", 8, 0.35, dopo=1.6)
s("chiavistello.mp3", 8, 0.30, dopo=2.7)
s("rintocco.mp3", 8, 0.50, dopo=round(vfine(8) - ini(8) - 0.1, 2), dur=round(ini(9) - vfine(8) + 0.9, 2), sfuma=0.6)
# 9 silenzio totale. 10-12 i campanacci dalla nebbia, sempre più vicini; si fermano sotto la finestra; il cuore
s("vento.mp3", 10, 0.15, da=40.0, fino_alla_fine=True, sfuma=0.6)
s("campanacci.mp3", 10, 0.45, dopo=0.2, dur=round(ini(12) - ini(10) + 0.5, 2), cresce=[0.12, 1.0], sfuma=0.4)
s("stoffa.mp3", 11, 0.25, dopo=0.6)
s("heart60.mp3", 12, 0.40, dopo=1.2, fino_alla_fine=True, cresce=[0.25, 1.0], sfuma=0.4)
s("respiro.mp3", 13, 0.22, dopo=0.1, dur=2.0)
# 14 i tre colpi al portone nel silenzio. 15 scheda finale
s("tre_colpi.mp3", 14, 0.90, dopo=0.25)
s("colpo.mp3", 15, 0.60)
s("rise_long.mp3", 15, 0.22, fino_alla_fine=True, cresce=[0.2, 1.0], sfuma=0.3)
s("pendola.mp3", 15, 0.10, da=5.0, fino_alla_fine=True, sfuma=0.5)
ep["suoni"] = S
ep["ambiente"] = [{"file": "amb_slow.mp3", "vol": [0.05, 0.16]}]
(D / "episodio.json").write_text(json.dumps(ep, indent=1, ensure_ascii=False))
print(len(S), "suoni; totale", tm["totale"], "s")
