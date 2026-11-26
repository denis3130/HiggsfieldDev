# maschera.py <mpfb2> : la maschera dell'uomo nel televisore (26/11, dopo «la maschera fa schifo»: era un uovo bianco con due buchi).
# Una maschera vera da viso intero, del tipo «volto» veneziano: la forma di un viso umano neutro (MakeHuman, metà uomo e metà donna,
# senza espressione), fronte, arcate, naso, zigomi, labbra chiuse, mento; i fori a mandorla per gli occhi; spessa 3 mm con il bordo.
# Come si fa: dal viso si prende la superficie più avanti (una mappa delle altezze: niente narici, niente bocca aperta, il naso scende
# dritto come nelle maschere vere), la si liscia un poco, la si porta 4 mm davanti alla pelle e la si ritaglia a ovale; dietro la stessa
# superficie 3 mm più indietro, e il bordo che le unisce: UNA superficie chiusa.
# Uscita: maschera.json + maschera.bin (pos f4, idx u4) in metri, origine nel giunto della testa, il viso guarda +z; occhi = centri dei fori.
import sys, os, json
import numpy as np
QUI = os.path.dirname(os.path.abspath(__file__)); sys.path[:0] = [QUI]
MP = sys.argv[1]; sys.argv = [sys.argv[0], MP, '/tmp']
import converti_teste as CT, mh
from scipy import ndimage as ndi

o = {'forma': {'macrodetails/caucasian-male-young': 0.5, 'macrodetails/caucasian-female-young': 0.5, 'nose/nose-scale-horiz-decr': 0.2}, 'testa': 1.12}
H, J = CT.forma_di(o); jt = J['testa']
eS = mh.giunto(H, CT.GRUPPI, 'joint-l-eye') - jt; eD = mh.giunto(H, CT.GRUPPI, 'joint-r-eye') - jt
P = H - jt                                                                   # decimetri, origine nel giunto della testa
w = np.clip(CT.W_TESTA, 0, 1)
F = CT.F0[CT.G0 == CT.ID_BODY]
F = F[(w[F] > 0.3).all(1) & (P[F][:, :, 2] > 0.1).all(1)]                     # le facce davanti della testa
TRI = np.concatenate([F[:, [0, 1, 2]], F[:, [0, 2, 3]]])
# ---- la mappa delle altezze: per ogni punto (x, y) la z più avanti
PASSO = 0.01; X0, X1, Y0, Y1 = -0.85, 0.85, -0.95, 1.35
nx, ny = int(round((X1 - X0) / PASSO)) + 1, int(round((Y1 - Y0) / PASSO)) + 1
Z = np.full((ny, nx), -9.0)
for t in TRI:
    a, b, c = P[t]
    xs, ys = [a[0], b[0], c[0]], [a[1], b[1], c[1]]
    i0, i1 = int(np.floor((min(xs) - X0) / PASSO)), int(np.ceil((max(xs) - X0) / PASSO)); j0, j1 = int(np.floor((min(ys) - Y0) / PASSO)), int(np.ceil((max(ys) - Y0) / PASSO))
    i0, j0 = max(i0, 0), max(j0, 0); i1, j1 = min(i1, nx - 1), min(j1, ny - 1)
    if i1 < i0 or j1 < j0: continue
    gx, gy = np.meshgrid(X0 + PASSO * np.arange(i0, i1 + 1), Y0 + PASSO * np.arange(j0, j1 + 1))
    d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    if abs(d) < 1e-12: continue
    l1 = ((b[1] - c[1]) * (gx - c[0]) + (c[0] - b[0]) * (gy - c[1])) / d; l2 = ((c[1] - a[1]) * (gx - c[0]) + (a[0] - c[0]) * (gy - c[1])) / d; l3 = 1 - l1 - l2
    dentro = (l1 >= -1e-6) & (l2 >= -1e-6) & (l3 >= -1e-6); z = l1 * a[2] + l2 * b[2] + l3 * c[2]
    blk = Z[j0:j1 + 1, i0:i1 + 1]; Z[j0:j1 + 1, i0:i1 + 1] = np.where(dentro & (z > blk), z, blk)
vuoto = Z < -8
_, (ii, jj) = ndi.distance_transform_edt(vuoto, return_indices=True); Z = Z[ii, jj]          # i buchi (gli occhi della pelle) chiusi col vicino...
# ...poi lisciati come una membrana tesa (niente fossette dove la pelle rientrava verso l'occhio)
buco = ndi.binary_dilation(vuoto, iterations=3)
gx0, gy0 = np.meshgrid(X0 + PASSO * np.arange(nx), Y0 + PASSO * np.arange(ny))
for e in (eS, eD):                                                           # e tutta la zona intorno all'occhio: niente fossette (l'angolo interno, le occhiaie)
    buco |= ((gx0 - e[0]) / 0.3) ** 2 + ((gy0 - e[1] + 0.02) / 0.17) ** 2 < 1
for _ in range(400): Zm = 0.25 * (np.roll(Z, 1, 0) + np.roll(Z, -1, 0) + np.roll(Z, 1, 1) + np.roll(Z, -1, 1)); Z = np.where(buco, Zm, Z)
Z = ndi.gaussian_filter(Z, 1.6)                                                              # liscia: via i pori e le pieghe piccole, restano le forme
for _ in range(60): Z = np.maximum(Z, ndi.grey_dilation(Z, size=3) - 1.6 * PASSO)            # niente pareti a picco (sotto il naso, sotto il labbro): al massimo 58 gradi
Z = ndi.gaussian_filter(Z, 1.0)
Z += 0.04                                                                                    # 4 mm davanti alla pelle
gx, gy = np.meshgrid(X0 + PASSO * np.arange(nx), Y0 + PASSO * np.arange(ny))
# ---- il ritaglio: ovale del viso (dalla fronte al mento), i due fori a mandorla per gli occhi (l'angolo esterno un po' più su)
def f_ovale(x, y): return np.sqrt((x / 0.76) ** 2 + ((y - 0.22) / 1.02) ** 2) - 1
def f_occhio(x, y, e, s):
    a = 0.14 * s; c, sn = np.cos(a), np.sin(a); dx, dy = x - e[0], y - (e[1] - 0.005); u, v = c * dx + sn * dy, -sn * dx + c * dy
    return np.sqrt((u / 0.2) ** 2 + (v / 0.088) ** 2) - 1
def f_tutto(x, y): return np.maximum(f_ovale(x, y), np.maximum(-f_occhio(x, y, eS, 1), -f_occhio(x, y, eD, -1)))
# la superficie un po' più larga dell'ovale; il contorno esatto (ovale e fori a mandorla) lo taglia la trasparenza in maschera (extra7.js),
# con le stesse forme: bordi puliti anche nei fori
dentro = f_ovale(gx, gy) < 0.035
C = dentro[:-1, :-1] & dentro[1:, :-1] & dentro[:-1, 1:] & dentro[1:, 1:]
usati = np.zeros_like(dentro); usati[:-1, :-1] |= C; usati[1:, :-1] |= C; usati[:-1, 1:] |= C; usati[1:, 1:] |= C
idx = -np.ones(dentro.shape, int); idx[usati] = np.arange(usati.sum()); nv = usati.sum()
davanti = np.stack([gx[usati], gy[usati], Z[usati]], 1); UV = np.stack([(gx[usati] - X0) / (X1 - X0), (gy[usati] - Y0) / (Y1 - Y0)], 1)
facce = []
for j_, i_ in zip(*np.nonzero(C)):
    a, b, c, d = idx[j_, i_], idx[j_, i_ + 1], idx[j_ + 1, i_ + 1], idx[j_ + 1, i_]; facce += [[a, b, c], [a, c, d]]
POS = (davanti * 0.1).astype('<f4'); IDX = np.array(facce, '<u4').ravel()
OUT = os.path.join(QUI, 'maschera'); os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'maschera.bin'), 'wb').write(POS.tobytes() + UV.astype('<f4').tobytes() + IDX.tobytes())
json.dump(dict(vertici=len(POS), indici=len(IDX), occhi={'S': (eS * 0.1).tolist(), 'D': (eD * 0.1).tolist()}, ordine=['pos f4 vertici*3', 'uv f4 vertici*2', 'idx u4 indici'],
               griglia=[X0, X1, Y0, Y1], ovale=[0.76, 1.02, 0.22], foro=[0.2, 0.088, 0.14, 0.005],
               nota='maschera «volto»: viso MakeHuman neutro (CC0), mappa delle altezze lisciata, 4 mm sopra la pelle, spessa 3 mm'), open(os.path.join(OUT, 'maschera.json'), 'w'))
print('maschera:', len(POS), 'vertici', len(IDX) // 3, 'triangoli')
