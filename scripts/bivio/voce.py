"""Voce narrante di un episodio de «Il Bivio» con Chatterbox (gratis, in locale) + tempi parola per parola.
Uso: RIF=voce_di_riferimento.wav python voce.py cartella_episodio      (senza RIF usa voci/narratore.wav)
Ogni pezzo (frase del narratore, grido, messaggio letto, voce lontana, opzione A, opzione B, chiusura) si genera da solo
e si riascolta con Whisper: se non corrisponde al copione o ha una durata strana si rigenera con un altro seme.
Scrive voce.wav (24 kHz), tempi.json (righe con i loro pezzi) e parole.json (parole del copione con i tempi)."""
import difflib, hashlib, json, os, re, sys, unicodedata
from pathlib import Path

import numpy as np
import soundfile as sf

B = Path(__file__).resolve().parent; D = Path(sys.argv[1]); sys.path.insert(0, str(B))
from voce_chatterbox import Voce
from faster_whisper import WhisperModel

SR = 24000; SEMI = int(os.environ.get("SEMI", 8)); CODA = 2.0
ENF = float(os.environ.get("ENFASI", 0.6))      # espressività del narratore: 0,5 per una voce clonata più naturale, 0,6 per la voce sintetica
RIF = os.environ.get("RIF") or str(B / "voci/narratore.wav"); RIF_ID = hashlib.sha1(Path(RIF).read_bytes()).hexdigest()[:10]
CACHE = D / "_voce"; CACHE.mkdir(exist_ok=True)
import time; _t = time.time()
v = Voce(RIF); wq = WhisperModel("medium", device="cpu", compute_type="int8"); print("modelli pronti in", round(time.time() - _t), "s", flush=True)
NUM = {"0": "zero", "1": "uno", "2": "due", "3": "tre", "4": "quattro", "5": "cinque", "6": "sei", "7": "sette", "8": "otto", "9": "nove", "10": "dieci"}
r16 = lambda a: np.interp(np.arange(0, len(a), 1.5), np.arange(len(a)), a).astype(np.float32)


def norm(s):
    s = unicodedata.normalize("NFKD", s.lower().replace("%", " per cento")); s = "".join(c for c in s if not unicodedata.combining(c))
    return [NUM.get(w, w) for w in re.sub(r"[^a-z0-9 ]", " ", s).split()]


def align(text, heard):
    """Mette il testo esatto del copione sui tempi delle parole sentite da Whisper (che può sbagliare qualche parola)."""
    script = text.split(); a = ["".join(norm(w)) for w in script]; b = ["".join(norm(w[2])) for w in heard]; times = [None] * len(script)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                times[i1 + k] = heard[j1 + k][:2]
        elif j2 > j1 and i2 > i1:                      # parole diverse: si dividono il tempo di quelle sentite
            t0, t1 = heard[j1][0], heard[j2 - 1][1]; n = i2 - i1
            for k in range(n):
                times[i1 + k] = (t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n)
    known = [i for i, t in enumerate(times) if t]
    for i, t in enumerate(times):                      # parole non sentite affatto: tra la precedente e la successiva
        if t is None:
            p = max([k for k in known if k < i], default=None); q = min([k for k in known if k > i], default=None)
            s0 = times[p][1] if p is not None else (heard[0][0] if heard else 0.0)
            s1 = times[q][0] if q is not None else s0 + 0.3
            times[i] = (s0, max(s1, s0 + 0.05))
    return [(s, e, w) for (s, e), w in zip(times, script)]


def lowpass(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X / (1 + (f / fc) ** 4), len(x)).astype(np.float32)


def prepara(t):
    """Testo come lo vuole il modello: minuscolo, punteggiatura semplice, punto finale, accenti scomposti (NFKD)."""
    t = " ".join(t.split()).lower()
    for a, b in (("...", ", "), ("…", ", "), (":", ","), (";", ","), (" - ", ", "), ("—", ", "), ("–", ", "), ("«", ""), ("»", ""), ("“", ""), ("”", ""), ("’", "'"), (" ,", ",")):
        t = t.replace(a, b)
    t = " ".join(t.split()).rstrip(" ,")
    return unicodedata.normalize("NFKD", t if t[-1:] in ".!?" else t + ".")      # accenti scomposti: con quelli uniti il modello sbaglia («già lì» → «gelù»)


def dici(testo, enfasi=0.6, scritto=None, pause=0.42, lungo=False):
    """Genera un pezzo e tiene il seme migliore. Ritorna (audio a picco 0,9, parole del copione con tempi relativi al pezzo).
    Si ferma al primo seme in cui Whisper risente esattamente le parole del copione; i pezzi buoni restano in _voce/ e non si rifanno.
    lungo=True (gridi): prova 5 semi e tra quelli giusti tiene il più lungo, perché un grido tirato via non fa paura."""
    chiave = hashlib.sha1(f"{RIF_ID}|{enfasi}|{testo}".encode()).hexdigest()[:16]; f = CACHE / f"{chiave}.npz"
    if f.exists():
        z = np.load(f, allow_pickle=True); a, heard = z["a"], [tuple(h) for h in z["heard"].tolist()]
        pt = float(z["punti"]) if "punti" in z else 1.0
        print(f"  già fatto{'' if pt >= 0.999 else ' (era QUASI: controllare)'} «{testo}» → «{' '.join(h[2] for h in heard)}»", flush=True)
        w = align(scritto or testo, [(float(s), float(e), w) for s, e, w in heard])
        return respiro(a, w, pause) if pause else (a, w)
    atteso = norm(testo); meglio = None; att = 0.3 + len(testo) / 14          # durata attesa: circa 14 caratteri al secondo
    for seme in range(SEMI):
        a = v.dici(prepara(testo), enfasi=enfasi, seme=seme)
        nz = np.where(np.abs(a) > 0.012)[0]
        if not len(nz):
            continue
        a = a[max(0, nz[0] - 700):nz[-1] + 2200]; a = a / (np.abs(a).max() + 1e-9) * 0.9
        segs, _ = wq.transcribe(r16(a), language="it", word_timestamps=True, beam_size=5)
        heard = [(w.start, w.end, w.word.strip()) for s in segs for w in s.words]
        if not heard:
            continue
        i0, i1 = max(0, int((heard[0][0] - 0.25) * SR)), min(len(a), int((heard[-1][1] + 0.35) * SR))      # via fiati e rumori prima e dopo le parole
        if i1 - i0 < len(a) - int(0.3 * SR):
            a = a[i0:i1].copy(); k = int(0.05 * SR); a[:k] *= np.linspace(0, 1, k); a[-k:] *= np.linspace(1, 0, k)
            heard = [(s - i0 / SR, e - i0 / SR, w) for s, e, w in heard]
        sim = difflib.SequenceMatcher(a=atteso, b=norm(" ".join(h[2] for h in heard)), autojunk=False).ratio(); dur = len(a) / SR
        punti = sim - 0.6 * max(0.0, dur / att - 1.5) - 0.6 * max(0.0, 0.6 - dur / att)
        if lungo and punti >= 0.999:
            punti += 0.1 * min(dur / att, 1.5)
        if meglio is None or punti > meglio[0]:
            meglio = (punti, a, heard, seme, sim, dur)
        if punti >= 0.999 and not lungo or lungo and seme >= 4 and meglio[0] >= 0.999:
            break
    punti, a, heard, seme, sim, dur = meglio
    print(f"  {'ok ' if punti >= 0.999 else 'quasi ' if punti >= 0.85 else 'DA RIFARE '}seme {seme} somiglianza {sim:.2f} {dur:.1f}s (attesi {att:.1f}) «{testo}» → «{' '.join(h[2] for h in heard)}»", flush=True)
    if punti >= 0.85:
        np.savez(f, a=a, heard=np.array(heard, dtype=object), punti=punti)
    w = align(scritto or testo, heard)
    return respiro(a, w, pause) if pause else (a, w)


def respiro(a, parole, minimo=0.42):
    """Allunga fino a `minimo` secondi le pause dopo punto, due punti, domanda ed esclamazione dentro un pezzo: il modello
    legge le frasi di fila, un narratore horror le lascia cadere. Il silenzio si inserisce nel punto più quieto tra le due parole."""
    parole = [list(p) for p in parole]; win = int(0.02 * SR)
    for i in range(len(parole) - 2, -1, -1):
        if parole[i][2][-1:] not in ".!?:…":
            continue
        j0, j1 = max(0, int((parole[i][1] - 0.1) * SR)), min(len(a), int((parole[i + 1][0] + 0.1) * SR))
        if j1 - j0 < 2 * win:
            continue
        en = np.sqrt(np.convolve(a[j0:j1] ** 2, np.ones(win) / win, mode="same")); k = int(np.argmin(en))
        if en[k] > 0.03:                                  # nessun vero stacco tra le parole: tagliare qui si sentirebbe
            continue
        quieto = en < max(0.012, 2.5 * en[k]); x0 = k
        while x0 > 0 and quieto[x0 - 1]:
            x0 -= 1
        x1 = k
        while x1 < len(en) - 1 and quieto[x1 + 1]:
            x1 += 1
        manca = minimo - (x1 - x0) / SR
        if manca < 0.03:
            continue
        c = j0 + k; f = int(0.004 * SR); prima, dopo = a[:c].copy(), a[c:].copy()
        prima[-f:] *= np.linspace(1, 0, f); dopo[:f] *= np.linspace(0, 1, f)
        a = np.concatenate([prima, np.zeros(int(manca * SR), np.float32), dopo])
        for p in parole[i + 1:]:
            p[0] += manca; p[1] += manca
    return a.astype(np.float32), [tuple(p) for p in parole]


def forte(a):
    """Volume uniforme tra i pezzi: stessa energia sul parlato, picchi ammorbiditi."""
    rms = np.sqrt(np.mean(a[np.abs(a) > 0.03] ** 2)) if np.any(np.abs(a) > 0.03) else 1.0
    return (np.tanh(a / rms * 0.16 * 1.25) / 1.25).astype(np.float32)


ep = json.loads((D / "episodio.json").read_text()); tempi = []; parole = []; t = 0.5; buf = [np.zeros(int(t * SR), np.float32)]
for r in ep["righe"]:
    print("riga", r["id"], flush=True); pz = []                    # pezzi: (tipo, audio, parole, pausa prima, pausa dopo)
    if r.get("voce"):
        a, w = dici(r["voce"], ENF); pz.append(("voce", forte(a), w, 0.0, 0.3 if r.get("opzioni") else 0.12))
    if r.get("grido"):                                            # urlo: enfasi al massimo (1,4), più forte, saturato, asciutto. Scriverlo con tre esclamazioni: «Sono qui! Sono qui! Aiuto!»
        a, w = dici(r["grido"], 1.4, r.get("sottotitolo_grido"), pause=None, lungo=True); pz.append(("grido", (np.tanh(a * 2.4) * 0.6).astype(np.float32), w, 0.0, 0.0))
    if r.get("citazione"):                                        # messaggio o scritta letta dal narratore
        a, w = dici(r["citazione"], 0.5); pz.append(("citazione", forte(a), w, 0.2, 0.1))
    if r.get("lontana"):                                          # una voce lontana la dice sempre il narratore: piano e ovattata
        a, w = dici(r["lontana"], 0.4); pz.append(("lontana", lowpass(forte(a), 2200) * 0.6, w, 0.4, 0.1))
    if r.get("opzioni"):
        for k in ("a", "b"):
            a, w = dici(r["opzioni"][k]["voce"], ENF - 0.05); pz.append((k, forte(a), w, 0.0, 0.4))
        a, w = dici(r["chiusura"], ENF); pz.append(("chiusura", forte(a), w, 0.0, 0.2))
    st = t; info = []; pr = []; riga = []
    for tipo, a, w, prima, dopo in pz:
        t0 = st + sum(len(x) for x in riga) / SR + prima
        riga += [np.zeros(int(prima * SR), np.float32), a, np.zeros(int(dopo * SR), np.float32)]
        info.append({"tipo": tipo, "inizio": round(t0, 3), "fine": round(t0 + len(a) / SR, 3), "n": len(w)})
        pr += [[round(t0 + s, 3), round(t0 + e, 3), x] for s, e, x in w]
    a = np.concatenate(riga) if riga else np.zeros(int(r.get("silenzio", 2) * SR), np.float32)
    pausa = 0.0 if r.get("grido") else 0.25
    buf += [a, np.zeros(int(pausa * SR), np.float32)]; t += len(a) / SR + pausa
    tempi.append({"id": r["id"], "inizio": round(st, 3), "fine": round(t, 3), "voce_fine": round(st + len(a) / SR, 3), "pezzi": info}); parole.append(pr)
buf.append(np.zeros(int(CODA * SR), np.float32)); voce = np.concatenate(buf)
sf.write(D / "voce.wav", voce, SR)
(D / "tempi.json").write_text(json.dumps({"righe": tempi, "totale": round(len(voce) / SR, 3)}, indent=1))
(D / "parole.json").write_text(json.dumps(parole, ensure_ascii=False))
print("totale", round(len(voce) / SR, 1), "s")
