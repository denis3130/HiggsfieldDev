# controlla_voce.py <vo.wav> <episodio.json>: riascolta la voce GIÀ preparata (con le pause inserite) e la confronta col copione, parola per parola
import sys, json, re, unicodedata, subprocess, difflib
import numpy as np
from faster_whisper import WhisperModel
norm = lambda s: re.sub(r"[^a-z0-9 ]", " ", "".join(c for c in unicodedata.normalize("NFKD", s.lower()) if not unicodedata.combining(c))).split()
x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", sys.argv[1], "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout, np.float32)
segs, _ = WhisperModel("medium", device="cpu", compute_type="int8").transcribe(x, language="it", beam_size=5, condition_on_previous_text=False)
sent = norm(" ".join(s.text for s in segs)); cop = norm(" ".join(r["voce"] for r in json.load(open(sys.argv[2]))["righe"]))
print(len(cop), "parole nel copione,", len(sent), "sentite")
for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(a=cop, b=sent, autojunk=False).get_opcodes():
    if tag != "equal": print(f"  {tag}: copione «{' '.join(cop[i1:i2])}» -> sentito «{' '.join(sent[j1:j2])}» (dopo «{' '.join(cop[max(0, i1 - 3):i1])}»)")
