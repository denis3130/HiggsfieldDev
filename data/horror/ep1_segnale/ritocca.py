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
    for z in zone:                                  # [x0, y0, x1, y1] oppure un poligono [[x, y], ...]; {"spegni": [x0, y0, x1, y1]} spegne un fuoco (via il rosso, più buio)
        if isinstance(z, dict) and "notte" in z:    # {"notte": [x0, y0, x1, y1]}: una finestra troppo chiara diventa notte (si scuriscono solo i pixel freddi e luminosi)
            x0, y0, x1, y1 = z["notte"]; roi = im[y0:y1, x0:x1].astype(np.float32); lum = roi.mean(-1)
            k = np.clip((roi[..., 0] - roi[..., 2] - 5) / 25, 0, 1) * np.clip((lum - 50) / 50, 0, 1)
            yy, xx = np.mgrid[0:y1 - y0, 0:x1 - x0].astype(np.float32); k = cv2.GaussianBlur(k, (0, 0), 2) * np.clip(np.minimum.reduce([xx, yy, x1 - x0 - 1 - xx, y1 - y0 - 1 - yy]) / 6, 0, 1)
            scuro = roi * np.float32(z.get("tinta", [0.50, 0.40, 0.30])) * z.get("luce", 1.0)                # resta un blu profondo, la neve si vede ancora
            im[y0:y1, x0:x1] = np.clip(roi * (1 - k[..., None]) + scuro * k[..., None], 0, 255).astype(np.uint8)
            continue
        if isinstance(z, dict):
            x0, y0, x1, y1 = z["spegni"]; roi = im[y0:y1, x0:x1].astype(np.float32); b_, g_, r_ = roi[..., 0], roi[..., 1], roi[..., 2]
            caldo = np.clip((r_ - 1.25 * b_ - 10) / 45, 0, 1)                                 # quanto il pixel è caldo: rosso, arancio o giallo di fiamma
            yy, xx = np.mgrid[0:y1 - y0, 0:x1 - x0].astype(np.float32); bordo = np.clip(np.minimum.reduce([xx, yy, x1 - x0 - 1 - xx, y1 - y0 - 1 - yy]) / 10, 0, 1)
            k = cv2.GaussianBlur(caldo, (0, 0), 3) * bordo; grigio = (z.get("luce", 0.25) * roi.mean(-1) + 6)[..., None] * np.float32(z.get("tinta", [1.08, 1.0, 0.94]))   # tinta [b, g, r]: es. vetro rosso spento
            im[y0:y1, x0:x1] = np.clip(roi * (1 - k[..., None]) + grigio * k[..., None], 0, 255).astype(np.uint8)
            continue
        if isinstance(z[0], list):
            cv2.fillPoly(mk, [np.int32(z)], 255)
        else:
            cv2.rectangle(mk, (z[0], z[1]), (z[2], z[3]), 255, -1)
    cv2.imwrite(str(D / "img" / nome), cv2.inpaint(im, mk, 5, cv2.INPAINT_TELEA)); print(nome, len(zone), "zone")
