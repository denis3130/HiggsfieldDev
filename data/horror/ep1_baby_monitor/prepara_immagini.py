"""Baby Monitor ep. 1 — immagini derivate, fatte col codice a partire da quelle generate (si rilancia dopo flux_locale.py).
  scala_flux.png → s04_scala.png      la scala al buio (tolta la striscia di luce che il modello aveva messo sopra la porta)
                 → s12_scala_luce.png la stessa scala, con la riga di luce ambrata sotto la porta della cameretta
Uso: python prepara_immagini.py   (dalla cartella dell'episodio)"""
from pathlib import Path
import cv2
import numpy as np

D = Path(__file__).resolve().parent / "img"
im = cv2.imread(str(D / "scala_flux.png"))
H, W = im.shape[:2]

# 1) via la striscia rossa sopra la porta e i suoi riflessi sulle pareti: si ricostruisce il buio intorno
b, g, r = [im[..., k].astype(np.int16) for k in range(3)]
rosso = ((r - np.maximum(g, b)) > 8).astype(np.uint8)
rosso[:140] = 0; rosso[215:] = 0
rosso = cv2.dilate(rosso, np.ones((9, 9), np.uint8))
buia = cv2.inpaint(im, rosso * 255, 7, cv2.INPAINT_TELEA)
cv2.imwrite(str(D / "s04_scala.png"), buia)

# 2) la riga di luce sotto la porta: cuore chiaro, alone stretto, riverbero sul pianerottolo e sui primi gradini
x0, x1, y = 252, 345, 456
f = buia.astype(np.float32)
riga = np.zeros((H, W), np.float32)
cv2.line(riga, (x0, y), (x1, y), 1.0, 2, cv2.LINE_AA)
alone = cv2.GaussianBlur(riga, (0, 0), 3.5) * 3.2 + cv2.GaussianBlur(riga, (0, 0), 12) * 5.0
giu = np.zeros((H, W), np.float32)
cv2.fillPoly(giu, [np.array([[x0, y], [x1, y], [x1 + 46, y + 70], [x0 - 46, y + 70]], np.int32)], 1.0)
giu = cv2.GaussianBlur(giu, (0, 0), 14) * np.clip(1 - (np.arange(H, dtype=np.float32)[:, None] - y) / 80, 0, 1)
ambra = np.float32([40, 150, 255])                       # BGR
f += (np.clip(alone, 0, 1.4)[..., None] * ambra * 0.85) + giu[..., None] * ambra * 0.22 + (cv2.GaussianBlur(riga, (0, 0), 1.0)[..., None] * np.float32([150, 225, 255]))
cv2.imwrite(str(D / "s12_scala_luce.png"), np.clip(f, 0, 255).astype(np.uint8))
print("fatte s04_scala.png e s12_scala_luce.png")
