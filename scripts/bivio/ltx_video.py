"""Video con LTX-Video 2B (int8, OpenVINO) in locale, solo CPU: gratis, nessun servizio esterno.
Può partire da un'immagine (la prima inquadratura resta quella, poi la scena si muove) o solo dal testo.
Fa a mano quello che fa diffusers (LTXImageToVideoPipeline), caricando un pezzo del modello alla volta
per stare nei 15 GB di RAM, e decodifica il video a tessere (tutto insieme non entra in memoria).

Uso: python ltx_video.py lavori.json
lavori.json = [{"out": "clip.mp4", "prompt": "...", "image": "img.png" (facoltativa), "w": 512, "h": 896,
                "frames": 97, "steps": 25, "seed": 1, "cfg": 3.0, "fps": 24}]"""
import gc, json, math, os, subprocess, sys, time
from pathlib import Path

import numpy as np
import openvino as ov
import openvino_tokenizers  # noqa: F401  (registra i tokenizer OpenVINO)
from PIL import Image

M = Path(os.environ.get("LTX_DIR") or Path(__file__).resolve().parent / "ltx-int8")   # cartella del modello (vedi data/horror/PRODUZIONE.md)
core = ov.Core()
SCH = json.load(open(M / "scheduler/scheduler_config.json"))
VAE = json.load(open(M / "vae_decoder/config.json"))
LMEAN = np.array(VAE["latents_mean_data"], np.float32).reshape(1, -1, 1, 1, 1)
LSTD = np.array(VAE["latents_std_data"], np.float32).reshape(1, -1, 1, 1, 1)
SCALA = float(VAE.get("scaling_factor", 1.0))
NEG = "worst quality, inconsistent motion, blurry, jittery, distorted, deformed, morphing, watermark, text"
MAXLEN = 128
T0 = time.time()


def log(*a):
    print(f"[{time.time() - T0:6.0f}s]", *a, flush=True)


def pack(x):            # [B, C, F, H, W] -> [B, F*H*W, C]
    b, c, f, h, w = x.shape
    return x.transpose(0, 2, 3, 4, 1).reshape(b, f * h * w, c)


def unpack(x, f, h, w):  # [B, F*H*W, C] -> [B, C, F, H, W]
    b, n, c = x.shape
    return x.reshape(b, f, h, w, c).transpose(0, 4, 1, 2, 3)


def sigma(n, seq):
    """Tempi del campionatore FlowMatchEuler come in diffusers: spostamento esponenziale secondo la lunghezza del video e coda fino a shift_terminal."""
    s = np.linspace(1.0, 1.0 / n, n)
    m = (SCH["max_shift"] - SCH["base_shift"]) / (SCH["max_image_seq_len"] - SCH["base_image_seq_len"])
    mu = seq * m + (SCH["base_shift"] - m * SCH["base_image_seq_len"])
    s = math.exp(mu) / (math.exp(mu) + (1.0 / s - 1.0))
    if SCH.get("shift_terminal"):
        um = 1.0 - s
        s = 1.0 - um / (um[-1] / (1.0 - SCH["shift_terminal"]))
    return np.append(s, 0.0).astype(np.float32)


def testi(prompts):
    tok = core.compile_model(str(M / "tokenizer/openvino_tokenizer.xml"), "CPU")
    enc = core.compile_model(str(M / "text_encoder/openvino_model.xml"), "CPU")
    out = {}
    for p in prompts:
        r = tok([p])
        ids = np.asarray(r["input_ids"], np.int64)[:, :MAXLEN]
        n = ids.shape[1]
        ids = np.pad(ids, ((0, 0), (0, MAXLEN - n)))
        mask = np.zeros((1, MAXLEN), np.int64); mask[:, :n] = 1
        out[p] = (np.asarray(enc(ids)[0], np.float32), mask)
    del tok, enc; gc.collect()
    return out


def immagine(path, w, h):
    im = Image.open(path).convert("RGB")
    k = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    x0, y0 = (im.width - w) // 2, (im.height - h) // 2
    a = np.asarray(im.crop((x0, y0, x0 + w, y0 + h)), np.float32) / 127.5 - 1.0
    return a.transpose(2, 0, 1)[None, :, None]      # [1, 3, 1, H, W]


def rampa(n, bordo, prima, dopo):
    r = np.ones(n, np.float32)
    if prima:
        r[:bordo] = np.linspace(0, 1, bordo + 2)[1:-1]
    if dopo:
        r[-bordo:] = np.linspace(1, 0, bordo + 2)[1:-1]
    return r


def decodifica(vae, lat, tessera=8, sovrapp=2):
    """Decodifica a tessere sovrapposte (in latente) con dissolvenza lineare sui bordi: tutto il fotogramma insieme non sta in RAM."""
    _, _, f, h, w = lat.shape
    passo = tessera - sovrapp
    ys = list(range(0, max(h - tessera, 0) + 1, passo)); xs = list(range(0, max(w - tessera, 0) + 1, passo))
    if ys[-1] + tessera < h: ys.append(h - tessera)
    if xs[-1] + tessera < w: xs.append(w - tessera)
    out = somma = None
    for y0 in ys:
        for x0 in xs:
            px = np.asarray(vae(lat[:, :, :, y0:y0 + tessera, x0:x0 + tessera])[0], np.float32)[0]   # [3, T, th, tw]
            px = px.transpose(1, 2, 3, 0)
            s = px.shape[1] // min(tessera, h)       # pixel per cella latente (32)
            if out is None:
                out = np.zeros((px.shape[0], h * s, w * s, 3), np.float32); somma = np.zeros((h * s, w * s), np.float32)
            wy = rampa(px.shape[1], sovrapp * s, y0 > 0, y0 + tessera < h); wx = rampa(px.shape[2], sovrapp * s, x0 > 0, x0 + tessera < w)
            peso = wy[:, None] * wx[None, :]
            out[:, y0 * s:y0 * s + px.shape[1], x0 * s:x0 * s + px.shape[2]] += px * peso[None, :, :, None]
            somma[y0 * s:y0 * s + px.shape[1], x0 * s:x0 * s + px.shape[2]] += peso
            del px; gc.collect()
    return out / somma[None, :, :, None]


def main():
    lavori = json.load(open(sys.argv[1]))
    for L in lavori:
        L.setdefault("w", 512); L.setdefault("h", 896); L.setdefault("frames", 97); L.setdefault("steps", 25)
        L.setdefault("seed", 1); L.setdefault("cfg", 3.0); L.setdefault("fps", 24); L.setdefault("neg", NEG)
        assert L["w"] % 32 == 0 and L["h"] % 32 == 0 and (L["frames"] - 1) % 8 == 0, "w, h multipli di 32; frames = 8k+1"

    log("testo")
    emb = testi({p for L in lavori for p in (L["prompt"], L["neg"])})

    cond = {}
    if any(L.get("image") for L in lavori):
        log("immagini di partenza")
        enc = core.compile_model(str(M / "vae_encoder/openvino_model.xml"), "CPU")
        for i, L in enumerate(lavori):
            if L.get("image"):
                z = np.asarray(enc(immagine(L["image"], L["w"], L["h"]))[0], np.float32)[:, :128]    # media della distribuzione
                cond[i] = (z - LMEAN) * SCALA / LSTD
        del enc; gc.collect()

    log("movimento (transformer)")
    tr = core.compile_model(str(M / "transformer/openvino_model.xml"), "CPU")
    req = tr.create_infer_request()
    finali = {}
    for i, L in enumerate(lavori):
        f, h, w = (L["frames"] - 1) // 8 + 1, L["h"] // 32, L["w"] // 32
        n = f * h * w
        rng = np.random.default_rng(L["seed"])
        lat = rng.standard_normal((1, 128, f, h, w), dtype=np.float32)
        maschera = np.zeros((1, 1, f, h, w), np.float32)
        if i in cond:
            lat[:, :, :1] = cond[i]; maschera[:, :, 0] = 1.0
        maschera = pack(maschera)[..., 0]                                   # [1, N]
        sig = sigma(L["steps"], n)
        (ep, mp), (en, mn) = emb[L["prompt"]], emb[L["neg"]]
        enc_h = np.concatenate([en, ep]); enc_m = np.concatenate([mn, mp])
        lp = pack(lat)
        cn = float(L.get("cond_noise", 0.0))          # rumore sul fotogramma di partenza (come image_cond_noise_scale di LTX 0.9.5+): più libertà di movimento
        pulito = pack(np.repeat(cond[i], f, axis=2)) if i in cond else None
        t_passo = time.time()
        for k in range(L["steps"]):
            t = sig[k] * 1000.0
            if pulito is not None and cn > 0:
                lp = np.where(maschera[..., None] > 0.5, pulito + cn * rng.standard_normal(lp.shape, dtype=np.float32) * sig[k] ** 2, lp)
            ts = np.repeat(t * (1.0 - maschera), 2, axis=0).astype(np.float32)        # [2, N]: il primo fotogramma (immagine) resta pulito
            req.infer({"hidden_states": np.concatenate([lp, lp]), "encoder_hidden_states": enc_h, "timestep": ts,
                       "encoder_attention_mask": enc_m, "num_frames": np.array(f, np.int64), "height": np.array(h, np.int64),
                       "width": np.array(w, np.int64), "rope_interpolation_scale": np.array([8.0 / L["fps"], 32.0, 32.0], np.float32)})
            pr = np.asarray(req.get_output_tensor(0).data, np.float32)
            v = pr[:1] + L["cfg"] * (pr[1:] - pr[:1])
            nuovo = lp + (sig[k + 1] - sig[k]) * v
            lp = np.where(maschera[..., None] > 0.5, lp, nuovo)
            if k == 0:
                log(f"  clip {i + 1}: primo passo in {time.time() - t_passo:.0f}s ({n} gettoni)")
        if pulito is not None:
            lp = np.where(maschera[..., None] > 0.5, pulito, lp)
        log(f"  clip {i + 1}: {L['steps']} passi in {time.time() - t_passo:.0f}s")
        finali[i] = unpack(lp, f, h, w) * LSTD / SCALA + LMEAN
    del req, tr; gc.collect()

    log("decodifica")
    vae = core.compile_model(str(M / "vae_decoder/openvino_model.xml"), "CPU")
    for i, L in enumerate(lavori):
        t1 = time.time()
        v = decodifica(vae, finali[i], tessera=8 if L["frames"] <= 49 else 6)
        v = (np.clip(v / 2 + 0.5, 0, 1) * 255).round().astype(np.uint8)
        fr, hh, ww, _ = v.shape
        p = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{ww}x{hh}", "-r", str(L["fps"]),
                              "-i", "-", "-c:v", "libx264", "-crf", "15", "-pix_fmt", "yuv420p", L["out"]], stdin=subprocess.PIPE)
        p.stdin.write(v.tobytes()); p.stdin.close(); p.wait()
        log(f"  {L['out']}: {fr} fotogrammi {ww}x{hh}, decodifica {time.time() - t1:.0f}s")
    log("fatto")


if __name__ == "__main__":
    main()
