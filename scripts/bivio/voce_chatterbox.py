"""Voce narrante espressiva in italiano, gratis e in locale: Chatterbox multilingue (licenza MIT) con onnxruntime, senza torch.
Il timbro si prende da un audio di riferimento (qui una voce sintetica, non una persona reale).
Uso: from voce_chatterbox import Voce; v = Voce("riferimento.wav"); wav24k = v.dici("Apri gli occhi. È notte.")"""
import os, subprocess
import numpy as np
import onnxruntime as ort

os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
from huggingface_hub import hf_hub_download
from tokenizers import Tokenizer

REPO = "onnx-community/chatterbox-multilingual-ONNX"; SR = 24000; START = 6561; STOP = 6562


def audio(path, sr=SR):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


class Voce:
    def __init__(self, riferimento=None, modello="language_model"):
        g = lambda f: hf_hub_download(REPO, f)
        for n in ("speech_encoder", "embed_tokens", "conditional_decoder", modello):
            g(f"onnx/{n}.onnx_data")
        so = ort.SessionOptions(); so.intra_op_num_threads = os.cpu_count()
        s = lambda n: ort.InferenceSession(g(f"onnx/{n}.onnx"), so, providers=["CPUExecutionProvider"])
        self.enc, self.emb, self.lm, self.dec = s("speech_encoder"), s("embed_tokens"), s(modello), s("conditional_decoder")
        self.tok = Tokenizer.from_file(g("tokenizer.json"))
        self.timbro(riferimento or g("default_voice.wav"))

    def timbro(self, riferimento):
        self.cond = self.enc.run(None, {"audio_values": audio(riferimento)[None]})

    def dici(self, testo, enfasi=0.6, temp=0.8, top_p=0.95, seme=0, max_tok=600, lingua="it"):
        rng = np.random.default_rng(seme)
        ids = np.array([self.tok.encode(f"[{lingua}]{testo}").ids], np.int64)
        pos = np.where(ids >= START, 0, np.arange(ids.shape[1])[None] - 1).astype(np.int64)
        ex = np.array([enfasi], np.float32)
        cond_emb, prompt_token, xvec, feat = self.cond
        x = np.concatenate((cond_emb, self.emb.run(None, {"input_ids": ids, "position_ids": pos, "exaggeration": ex})[0]), 1)
        past = {f"past_key_values.{l}.{kv}": np.zeros([1, 16, 0, 64], np.float32) for l in range(30) for kv in ("key", "value")}
        mask = np.ones((1, x.shape[1]), np.int64); gen = [START]
        for i in range(max_tok):
            logits, *pres = self.lm.run(None, dict(inputs_embeds=x, attention_mask=mask, **past))
            lg = logits[0, -1].astype(np.float64)
            idx = np.array(gen); sc = lg[idx]; lg[idx] = np.where(sc < 0, sc * 1.2, sc / 1.2)
            lg = lg / temp; p = np.exp(lg - lg.max()); p /= p.sum()
            o = np.argsort(-p); k = int(np.searchsorted(np.cumsum(p[o]), top_p)) + 1; o = o[:k]
            nt = int(rng.choice(o, p=p[o] / p[o].sum())); gen.append(nt)
            if nt == STOP:
                break
            x = self.emb.run(None, {"input_ids": np.array([[nt]], np.int64), "position_ids": np.array([[i + 1]], np.int64), "exaggeration": ex})[0]
            mask = np.concatenate([mask, np.ones((1, 1), np.int64)], 1)
            for j, kk in enumerate(past):
                past[kk] = pres[j]
        sp = np.array([gen[1:-1] if gen[-1] == STOP else gen[1:]], np.int64)
        wav = self.dec.run(None, {"speech_tokens": np.concatenate([prompt_token, sp], 1), "speaker_embeddings": xvec, "speaker_features": feat})[0][0]
        return wav.astype(np.float32)
