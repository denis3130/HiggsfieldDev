"""Toglie dalle immagini generate le finte scritte (etichette, cifre) che il modello mette da solo: le zone elencate in ritocchi.json
vengono ricostruite dai pixel vicini. Uso: python ritocca.py   (lavora su img/, tiene l'originale in img/_orig/ e riparte sempre da lì)."""
import json, shutil
from pathlib import Path
import cv2, numpy as np

D = Path(__file__).resolve().parent; (D / "img/_orig").mkdir(exist_ok=True)
for nome, zone in json.loads((D / "ritocchi.json").read_text()).items():
    src = D / "img/_orig" / nome
    if not src.exists():
        shutil.copy(D / "img" / nome, src)
    im = cv2.imread(str(src)); mk = np.zeros(im.shape[:2], np.uint8)
    for z in zone:                                  # [x0, y0, x1, y1] oppure un poligono [[x, y], ...]
        if isinstance(z[0], list):
            cv2.fillPoly(mk, [np.int32(z)], 255)
        else:
            cv2.rectangle(mk, (z[0], z[1]), (z[2], z[3]), 255, -1)
    cv2.imwrite(str(D / "img" / nome), cv2.inpaint(im, mk, 5, cv2.INPAINT_TELEA)); print(nome, len(zone), "zone")
