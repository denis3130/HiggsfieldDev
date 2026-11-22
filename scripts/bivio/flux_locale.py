"""Immagini con FLUX.1-schnell (OpenVINO int4) su sola CPU e poca RAM: i pezzi del modello si caricano uno alla volta.
Uso: python flux_locale.py lavori.json   (lavori: [{"out": "a.png", "prompt": "...", "w": 576, "h": 1024, "seed": 7, "steps": 4}, ...])
Prima codifica tutti i testi (T5 + CLIP), li libera, poi carica il transformer una volta sola e genera tutte le immagini."""
import gc, json, os, resource, sys, time
import numpy as np
import openvino as ov
import openvino_tokenizers  # noqa: registra le operazioni dei tokenizer
from PIL import Image

M = os.environ.get("FLUX_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "flux-schnell-int4"))
core = ov.Core()
CFG = {"PERFORMANCE_HINT": "LATENCY", "CACHE_DIR": os.path.join(M, "_cache")}
ram = lambda: round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1e6, 1)


def ids(tok, text, n, pad):
    out = tok([text])
    a = np.asarray(out[tok.outputs[0]])[0].astype(np.int64)[:n]
    return np.concatenate([a, np.full(n - len(a), pad, np.int64)])[None]


def encode(prompts):
    t = time.time()
    tok1 = core.compile_model(f"{M}/tokenizer/openvino_tokenizer.xml", "CPU")
    tok2 = core.compile_model(f"{M}/tokenizer_2/openvino_tokenizer.xml", "CPU")
    clip = core.compile_model(f"{M}/text_encoder/openvino_model.xml", "CPU", CFG)
    pooled = [np.asarray(clip(ids(tok1, p, 77, 49407))["pooler_output"]).copy() for p in prompts]
    del clip; gc.collect()
    t5 = core.compile_model(f"{M}/text_encoder_2/openvino_model.xml", "CPU", CFG)
    emb = [np.asarray(t5(ids(tok2, p, 256, 0))["last_hidden_state"]).copy() for p in prompts]
    del t5, tok1, tok2; gc.collect()
    print(f"testi codificati in {time.time() - t:.0f} s, RAM max {ram()} GB", flush=True)
    return pooled, emb


def main():
    jobs = json.load(open(sys.argv[1]))
    pooled, emb = encode([j["prompt"] for j in jobs])
    t = time.time()
    tr = core.compile_model(f"{M}/transformer/openvino_model.xml", "CPU", CFG)
    vae = core.compile_model(f"{M}/vae_decoder/openvino_model.xml", "CPU", CFG)
    print(f"transformer caricato in {time.time() - t:.0f} s, RAM max {ram()} GB", flush=True)
    for j, pe, te in zip(jobs, pooled, emb):
        t = time.time()
        W, H, steps = j.get("w", 576), j.get("h", 1024), j.get("steps", 4)
        h, w = H // 8, W // 8
        lat = np.random.default_rng(j.get("seed", 0)).standard_normal((1, 16, h, w)).astype(np.float32)
        x = lat.reshape(1, 16, h // 2, 2, w // 2, 2).transpose(0, 2, 4, 1, 3, 5).reshape(1, (h // 2) * (w // 2), 64)
        img_ids = np.zeros((h // 2, w // 2, 3), np.float32)
        img_ids[..., 1] += np.arange(h // 2)[:, None]
        img_ids[..., 2] += np.arange(w // 2)[None, :]
        img_ids = img_ids.reshape(-1, 3)
        txt_ids = np.zeros((te.shape[1], 3), np.float32)
        sig = np.append(np.linspace(1.0, 1.0 / steps, steps), 0.0).astype(np.float32)
        for i in range(steps):
            v = np.asarray(tr({"hidden_states": x, "encoder_hidden_states": te, "pooled_projections": pe,
                               "timestep": np.array([sig[i]], np.float32), "img_ids": img_ids, "txt_ids": txt_ids})["out_sample"])
            x = x + (sig[i + 1] - sig[i]) * v
            print(f"  passo {i + 1}/{steps} a {time.time() - t:.0f} s", flush=True)
        lat = x.reshape(1, h // 2, w // 2, 16, 2, 2).transpose(0, 3, 1, 4, 2, 5).reshape(1, 16, h, w)
        img = np.asarray(vae(lat / 0.3611 + 0.1159)["sample"])[0].transpose(1, 2, 0)
        Image.fromarray(((img.clip(-1, 1) + 1) * 127.5).astype(np.uint8)).save(j["out"])
        print(f"{j['out']} fatta in {time.time() - t:.0f} s, RAM max {ram()} GB", flush=True)


if __name__ == "__main__":
    main()
