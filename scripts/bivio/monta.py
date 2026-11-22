"""Monta un episodio de «Il Bivio» (Short 1080x1920) da immagini fisse, tutto col codice:
movimento di camera 2,5D con la profondità, nebbia che scorre, fiato dalle cavità, grana, palpebre che si aprono,
schermo del telefono disegnato, scheda di scelta, sottotitoli parola per parola, mix con suoni reali.
Uso: python monta.py cartella_episodio  (dentro: episodio.json, tempi.json, parole.json, voce.wav, img/)"""
import glob, json, subprocess, sys
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
import soundfile as sf
from PIL import Image, ImageDraw, ImageFont

D = Path(sys.argv[1]); B = Path(__file__).resolve().parent
W, H, FPS = 1080, 1920, 30
SW, SH, M = 1296, 2304, 1.06
ep = json.loads((D / "episodio.json").read_text()); tm = json.loads((D / "tempi.json").read_text())
parole = json.loads((D / "parole.json").read_text()); righe = ep["righe"]; T = tm["righe"]; TOT = tm["totale"]
rng = np.random.default_rng(5)


def font(peso, size):
    for pat in (f"/usr/share/fonts/**/Roboto-{peso}.ttf", "/usr/share/fonts/**/DejaVuSans-Bold.ttf"):
        f = glob.glob(pat, recursive=True)
        if f:
            return ImageFont.truetype(f[0], size)


# ---------- profondità e immagini
sess = ort.InferenceSession(str(B / "modelli/depth_small.onnx"), providers=["CPUExecutionProvider"])


def carica(nome):
    im = cv2.imread(str(D / "img" / nome))
    big = cv2.resize(im, (SW, SH), interpolation=cv2.INTER_LANCZOS4)
    big = cv2.addWeighted(big, 1.35, cv2.GaussianBlur(big, (0, 0), 2.0), -0.35, 0)
    x = cv2.cvtColor(cv2.resize(im, (294, 518)), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    x = ((x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]).transpose(2, 0, 1)[None].astype(np.float32)
    d = sess.run(None, {sess.get_inputs()[0].name: x})[0][0]
    d = (d - d.min()) / (d.max() - d.min() + 1e-6)
    return big, cv2.GaussianBlur(cv2.resize(d, (W, H)), (0, 0), 6)


IMG = {r["img"]: carica(r["img"]) for r in righe if r.get("img")}
for r in righe:
    if r.get("scelta"):
        for k in ("img_a", "img_b"):
            IMG.setdefault(r["scelta"][k], carica(r["scelta"][k]))
GX, GY = np.meshgrid(np.arange(W, dtype=np.float32) - W / 2, np.arange(H, dtype=np.float32) - H / 2)
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32); XN, YN = XX / W, YY / H
VIGN = (1 - 0.55 * np.clip(((XN - .5) ** 2 + (YN - .5) ** 2) * 2.2, 0, 1) ** 1.4)[..., None].astype(np.float32)


def rumore(h, w, s):
    n = rng.standard_normal((h // 8, w // 8)).astype(np.float32)
    n = cv2.GaussianBlur(np.tile(n, (1, 2)), (0, 0), s)[:, : w // 8]
    n = cv2.resize(n, (w, h), interpolation=cv2.INTER_CUBIC)
    return (n - n.min()) / (n.max() - n.min())


FOG = rumore(H, W * 4, 9) ** 1.8
PUFF = rumore(H * 2, W, 5)
MOV = {"avanza": (1.0, 1.10, 0.07, 0, 0), "avanza_lento": (1.0, 1.06, 0.05, 0, 0), "apri_occhi": (1.0, 1.07, 0.05, 0, 0),
       "arretra": (1.13, 1.0, -0.07, 0, 0), "scendi": (1.0, 1.09, 0.06, 0, 0), "panoramica": (1.04, 1.04, 0, 60, 26),
       "mano": (1.03, 1.06, 0.03, 0, 10), "fermo": (1.02, 1.02, 0, 0, 0)}
ease = lambda u: u * u * (3 - 2 * u)


def muovi(nome, mov, u, tau, seme):
    big, dep = IMG[nome]
    z0, z1, kd, pan, par = MOV[mov]
    uu = 1 - (1 - u) ** 2 if mov == "arretra" else ease(u)
    z = z0 + (z1 - z0) * uu
    px = pan * (2 * uu - 1); py = 0.0
    if mov == "mano":
        px += 7 * np.sin(2.1 * tau + seme) + 4 * np.sin(5.3 * tau + 2 * seme); py += 6 * np.sin(1.7 * tau + 3 * seme) + 3 * np.sin(4.4 * tau + seme)
    k = (SW / W) / (M * z)
    dd = dep - 0.5
    mx = SW / 2 + GX * k * (1 - kd * dd * uu) + px + par * dd * (2 * uu - 1 if pan else np.sin(1.3 * tau + seme))
    my = SH / 2 + GY * k * (1 - kd * dd * uu) + py
    return cv2.remap(big, mx.astype(np.float32), my.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT).astype(np.float32)


def atmosfera(fr, t, nebbia=0.13):
    o1 = int(t * 14) % (W * 3); o2 = int(W * 3 - (t * 8) % (W * 3))
    fog = (FOG[:, o1:o1 + W] * 0.6 + FOG[:, o2:o2 + W] * 0.4)[..., None]
    fr = fr + fog * nebbia * np.array([150, 140, 105], np.float32)
    g = cv2.resize(rng.standard_normal((H // 2, W // 2)).astype(np.float32), (W, H))[..., None]
    return np.clip((fr + g * 6.5) * VIGN * (1 + 0.012 * np.sin(31 * t)), 0, 255)


def vapore(fr, tau, cx=0.5, cy=0.62, r=0.2):
    o = int(tau * 90) % H
    tex = PUFF[o:o + H]
    m = np.exp(-(((XN - cx) / r) ** 2 + ((YN - cy + 0.06 * tau / 3) / (r * 1.5)) ** 2))
    a = (m * tex * (0.55 + 0.45 * np.sin(2 * np.pi * tau / 2.3 - 1.2)))[..., None]
    return fr + a * 150


def palpebre(fr, tau):
    o = np.interp(tau, [0, 0.35, 0.6, 0.75, 1.5], [0.0, 0.34, 0.08, 0.3, 1.7])
    r = np.sqrt(((XN - .5) / (0.9 + o)) ** 2 + ((YN - .5) / max(o * 0.9, 1e-3)) ** 2)
    return fr * np.clip((1 - r) / 0.3, 0, 1)[..., None]


# ---------- schermo del telefono
def schermo(messaggio, slide=1.0):
    im = Image.new("RGB", (W, H), (4, 6, 8)); d = ImageDraw.Draw(im)
    for i in range(0, H, 4):
        d.line([(0, i), (W, i)], fill=(4 + i // 320, 7 + i // 240, 10 + i // 200))
    d.text((W // 2, 560), "03:17", font=font("Thin", 300), fill=(235, 240, 245), anchor="mm")
    d.text((W // 2, 760), "domenica 22 novembre", font=font("Light", 52), fill=(190, 198, 205), anchor="mm")
    d.rounded_rectangle([842, 96, 930, 136], 9, outline=(200, 205, 210), width=3); d.rectangle([932, 108, 938, 124], fill=(200, 205, 210))
    d.rectangle([848, 102, 854, 130], fill=(235, 60, 50)); d.text((828, 116), "3%", font=font("Medium", 40), fill=(235, 80, 70), anchor="rm")
    d.text((90, 116), "Nessun servizio", font=font("Regular", 36), fill=(150, 158, 165), anchor="lm")
    if messaggio:
        y = int(980 + (1 - slide) * 260); card = Image.new("RGBA", (W, H), (0, 0, 0, 0)); c = ImageDraw.Draw(card)
        a = int(255 * min(1, slide * 1.4))
        c.rounded_rectangle([60, y, W - 60, y + 300], 44, fill=(38, 42, 48, a))
        c.ellipse([100, y + 44, 172, y + 116], fill=(90, 98, 108, a))
        c.text((200, y + 60), "Numero sconosciuto", font=font("Medium", 46), fill=(240, 242, 245, a), anchor="lm")
        c.text((W - 100, y + 60), "adesso", font=font("Regular", 36), fill=(150, 156, 164, a), anchor="rm")
        c.text((100, y + 170), "Non rispondere", font=font("Regular", 58), fill=(255, 255, 255, a), anchor="lm")
        c.text((100, y + 244), "a chi ti chiama.", font=font("Regular", 58), fill=(255, 255, 255, a), anchor="lm")
        im.paste(card, (0, 0), card)
    for p in ([(1080, 150), (930, 60), (860, 0)], [(930, 60), (990, 0)], [(1080, 150), (1010, 210), (1080, 300)]):
        d.line(p, fill=(120, 128, 135), width=3)
    return cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR).astype(np.float32)


S_BLOCCO = schermo(False); S_MSG = schermo(True)
SFONDO = cv2.GaussianBlur(cv2.resize(IMG["s12_luce_buio.png"][0], (W, H)), (0, 0), 30).astype(np.float32) * 0.35


def telefono(scr, tau, seme):
    ang = 1.1 * np.sin(0.9 * tau + seme); s = 0.86 + 0.012 * np.sin(1.3 * tau)
    A = cv2.getRotationMatrix2D((W / 2, H / 2), ang, s); A[0, 2] += 6 * np.sin(2 * tau + seme); A[1, 2] += 5 * np.sin(1.6 * tau)
    ph = cv2.warpAffine(scr, A, (W, H), borderValue=(0, 0, 0)); mk = cv2.warpAffine(np.ones((H, W), np.float32), A, (W, H))
    mk = cv2.GaussianBlur(mk, (0, 0), 3)[..., None]
    out = SFONDO * (1 - mk) + ph * mk
    return out + cv2.GaussianBlur(ph, (0, 0), 40) * 0.35


def scheda(sc, u, tau):
    a = muovi(sc["img_a"], "avanza_lento", u, tau, 1.0)[H // 4:H // 4 + H // 2]; b = muovi(sc["img_b"], "avanza_lento", u, tau, 2.0)[H // 4:H // 4 + H // 2]
    fr = np.concatenate([a, b], 0) * 0.72
    fr[H // 2 - 4:H // 2 + 4] = 0
    return fr


# ---------- fotogrammi
import os
RIUSA = bool(os.environ.get("RIUSA")) and (D / "_muto.mp4").exists()      # RIUSA=1: non rifà i fotogrammi, solo sottotitoli e audio
out = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "15", "-pix_fmt", "yuv420p", str(D / ("_scarta.mp4" if RIUSA else "_muto.mp4"))], stdin=subprocess.PIPE)
N = 0 if RIUSA else int(TOT * FPS)
for f in range(N):
    t = f / FPS
    i = max(k for k in range(len(T)) if T[k]["inizio"] <= t or k == 0)
    r, tr = righe[i], T[i]; fine = T[i + 1]["inizio"] if i + 1 < len(T) else TOT
    tau = max(0.0, t - tr["inizio"]); u = min(1.0, tau / max(fine - tr["inizio"], 1e-3))
    if r.get("scelta"):
        fr = atmosfera(scheda(r["scelta"], u, tau), t, 0.08)
    elif r.get("schermo") and tau >= r.get("schermo_dopo", 0):
        if r["schermo"] == "messaggio":
            sl = min(1.0, tau / 0.4); scr = S_MSG if sl >= 1 else schermo(True, 1 - (1 - sl) ** 3)
        else:
            scr = S_BLOCCO
        fr = np.clip(telefono(scr, t, 0.7) * VIGN + rng.standard_normal((H, W, 1)).astype(np.float32) * 3, 0, 255)
    else:
        fr = muovi(r["img"], r.get("mov", "avanza_lento"), u, tau, float(i))
        if r.get("scurisci"):
            cx, cy, rx, ry = r["scurisci"]; fr = fr * (1 - 0.85 * np.exp(-(((XN - cx) / rx) ** 2 + ((YN - cy) / ry) ** 2)))[..., None]
        if r.get("vapore"):
            fr = vapore(fr, tau)
        fr = atmosfera(fr, t, 0.05 if r.get("mov") == "fermo" else 0.13)
        if r.get("mov") == "apri_occhi":
            fr = palpebre(fr, tau)
    out.stdin.write(fr.astype(np.uint8).tobytes())
out.stdin.close(); out.wait()

# ---------- sottotitoli
ts = lambda t: f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"
esc = lambda s: s.replace("{", "(").replace("}", ")")
ass = [f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Roboto,84,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,6,3,5,60,60,0,1
Style: Serie,Roboto,58,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,14,0,1,3,0,8,60,60,170,1
Style: Sotto,Roboto,40,&H00C8C8C8,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,6,0,1,2,0,8,60,60,250,1
Style: Opz,Roboto,66,&H00FFFFFF,&H00FFFFFF,&H00000000,&HB4000000,1,0,0,0,100,100,0,0,3,16,0,5,40,40,0,1
Style: Vota,Roboto,54,&H0000D7FF,&H00FFFFFF,&H00000000,&HB4000000,1,0,0,0,100,100,0,0,3,14,0,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""]
ass.append(f"Dialogue: 3,{ts(0.3)},{ts(3.4)},Serie,,0,0,0,,{{\\fad(500,600)}}{esc(ep['serie'])}")
ass.append(f"Dialogue: 3,{ts(0.6)},{ts(3.4)},Sotto,,0,0,0,,{{\\fad(500,600)}}DECIDI TU COME CONTINUA")
for r, ws in zip(righe, parole):
    if r.get("scelta"):
        continue
    gr = [ws[i:i + 3] for i in range(0, len(ws), 3)]
    for gi, g in enumerate(gr):
        gfine = gr[gi + 1][0][0] if gi + 1 < len(gr) else g[-1][1] + 0.3
        for wi, (a, b, _) in enumerate(g):
            b2 = g[wi + 1][0] if wi + 1 < len(g) else gfine
            txt = " ".join((f"{{\\c&H003C3CFF&}}{esc(x[2].upper())}{{\\c&H00FFFFFF&}}" if k == wi else esc(x[2].upper())) for k, x in enumerate(g))
            ass.append(f"Dialogue: 1,{ts(a)},{ts(b2)},Cap,,0,0,0,,{{\\pos({W // 2},{int(H * 0.74)})}}{txt}")
riga_sc = next(r for r in righe if r.get("scelta")); t0 = T[righe.index(riga_sc)]["inizio"]; sc = riga_sc["scelta"]
ass.append(f"Dialogue: 2,{ts(t0)},{ts(TOT)},Opz,,0,0,0,,{{\\pos({W // 2},{int(H * 0.25)})\\fad(250,0)}}A · {esc(sc['a'])}")
ass.append(f"Dialogue: 2,{ts(t0)},{ts(TOT)},Opz,,0,0,0,,{{\\pos({W // 2},{int(H * 0.75)})\\fad(250,0)}}B · {esc(sc['b'])}")
ass.append(f"Dialogue: 2,{ts(t0 + 1.2)},{ts(TOT)},Vota,,0,0,0,,{{\\pos({W // 2},{int(H * 0.5)})\\fad(300,0)}}SCRIVI A O B NEI COMMENTI")
(D / "sub.ass").write_text("\n".join(ass) + "\n", encoding="utf-8")

# ---------- audio
SR = 48000


def suono(nome, da=0.0, dur=None):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(da)] + (["-t", str(dur)] if dur else []) + ["-i", str(B / "sfx" / nome), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32).copy()
    return x / (np.abs(x).max() + 1e-9)


n = int(TOT * SR); voce, _ = sf.read(D / "voce.wav", dtype="float32"); voce = np.pad(voce, (0, max(0, n - len(voce))))[:n]
fx = np.zeros(n, np.float32); R = {r["id"]: x for r, x in zip(righe, T)}


def metti(x, t, g, sfuma=0.05):
    i = int(t * SR); x = x[: max(0, n - i)].copy(); k = int(sfuma * SR)
    if len(x) > 2 * k:
        x[:k] *= np.linspace(0, 1, k); x[-k:] *= np.linspace(1, 0, k)
    fx[i:i + len(x)] += x * g


amb = np.resize(suono("amb_bosco.mp3", 20), n) * 0.20 + np.resize(suono("amb_slow.mp3"), n) * np.linspace(0.05, 0.16, n)
a, b = int(R[6]["voce_fine"] * SR), int(R[8]["inizio"] * SR)          # dopo il grido: silenzio totale (qui l'eco non esiste)
amb[a:b] = 0; amb[b:b + SR] *= np.linspace(0, 1, SR); amb[a - 2400:a] *= np.linspace(1, 0, 2400)
metti(suono("gocce.mp3"), R[2]["inizio"] + 0.2, 0.22)
metti(suono("respiro.mp3", 0, 2.4), R[3]["inizio"], 0.30)
metti(suono("scivolata.mp3"), R[4]["inizio"] + 1.3, 0.55); metti(suono("stoffa.mp3"), R[4]["inizio"] + 2.2, 0.30)
metti(suono("stoffa.mp3"), R[5]["inizio"] + 0.1, 0.25)
metti(suono("phone_table.mp3", 0, 1.5), R[9]["inizio"] + 0.1, 0.5)
metti(suono("notifica.mp3"), R[10]["inizio"] + 0.05, 0.45)
metti(suono("respiro.mp3", 3, 2.6), R[11]["inizio"], 0.5); metti(suono("legno.mp3", 0, 2.4), R[11]["inizio"] + 0.3, 0.4)
hb = suono("heart60.mp3", 0, TOT - R[13]["inizio"]); metti(hb * np.linspace(0.3, 1, len(hb)), R[13]["inizio"], 0.5, 0.4)
metti(suono("colpo.mp3"), R[14]["inizio"], 0.6); rl = suono("rise_long.mp3", 0, TOT - R[14]["inizio"]); metti(rl * np.linspace(0.2, 1, len(rl)), R[14]["inizio"], 0.3, 0.3)
env = np.convolve(np.abs(voce), np.ones(4800) / 4800, mode="same"); duck = 1 - 0.4 * np.clip(env / 0.05, 0, 1)
mix = voce * 0.95 + (fx + amb) * duck
sf.write(D / "mix.wav", np.clip(mix / (np.abs(mix).max() + 1e-9) * 0.97, -1, 1), SR)
finale = D / f"il_bivio_ep{ep['episodio']}.mp4"
sub = str((D / "sub.ass").resolve()).replace(":", "\\:").replace("'", "\\'")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(D / "_muto.mp4"), "-i", str(D / "mix.wav"), "-vf", f"subtitles='{sub}',format=yuv420p",
                "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "aac", "-b:a", "192k",
                "-ar", "48000", "-movflags", "+faststart", "-shortest", str(finale)], check=True)
print("ok", finale, round(TOT, 1), "s")
