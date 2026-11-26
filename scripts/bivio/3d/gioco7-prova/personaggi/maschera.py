# maschera.py <mpfb2> : la maschera dell'uomo nel televisore (26/11, dopo «la maschera fa schifo»: era un uovo bianco con due buchi).
# Una maschera vera da viso intero, del tipo «volto» veneziano: la forma di un viso umano neutro (MakeHuman, metà uomo e metà donna,
# senza espressione), fronte, arcate, naso, zigomi, labbra chiuse, mento; i fori a mandorla per gli occhi; spessa 3 mm con il bordo.
# Come si fa: dal viso si prende la superficie più avanti (una mappa delle altezze: niente narici, niente bocca aperta, il naso scende
# dritto come nelle maschere vere), la si liscia un poco, la si porta 4 mm davanti alla pelle e la si ritaglia a ovale; dietro la stessa
# superficie 3 mm più indietro, e il bordo che le unisce: UNA superficie chiusa.
# È la PRIMA versione, quella che l'utente ha scelto («questa andava bene»): con le ombre dure della lampadina sotto il naso e sotto le
# labbra e i fori un po' irregolari. Le versioni lisciate dopo (rampe al posto delle pareti, fori tagliati puliti, luce di riempimento)
# gli piacevano meno: non rifarle.
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
PASSO = 0.015; X0, X1, Y0, Y1 = -0.85, 0.85, -0.95, 1.35
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
_, (ii, jj) = ndi.distance_transform_edt(vuoto, return_indices=True); Z = Z[ii, jj]          # i buchi (gli occhi della pelle) chiusi col vicino
Z = ndi.gaussian_filter(Z, 1.6)                                                              # liscia: via i pori e le pieghe piccole, restano le forme
Z += 0.04                                                                                    # 4 mm davanti alla pelle
gx, gy = np.meshgrid(X0 + PASSO * np.arange(nx), Y0 + PASSO * np.arange(ny))
# ---- il ritaglio: ovale del viso (dalla fronte al mento), i due fori a mandorla per gli occhi (l'angolo esterno un po' più su)
ov = (gx / 0.76) ** 2 + ((gy - 0.22) / 1.02) ** 2 < 1
def mandorla(e, s):
    dx, dy = gx - e[0], gy - (e[1] - 0.01); dy2 = dy - 0.05 * dx * s
    return (dx / 0.19) ** 2 + (dy2 / (0.085 * (1 - 0.35 * (dx * s / 0.19)))) ** 2 < 1
dentro = ov & ~mandorla(eS, 1) & ~mandorla(eD, -1)
# solo le celle con i quattro angoli dentro
C = dentro[:-1, :-1] & dentro[1:, :-1] & dentro[:-1, 1:] & dentro[1:, 1:]
lab, n = ndi.label(C); C = lab == (np.bincount(lab.ravel())[1:].argmax() + 1)
usati = np.zeros_like(dentro); usati[:-1, :-1] |= C; usati[1:, :-1] |= C; usati[:-1, 1:] |= C; usati[1:, 1:] |= C
idx = -np.ones(dentro.shape, int); idx[usati] = np.arange(usati.sum()); nv = usati.sum()
davanti = np.stack([gx[usati], gy[usati], Z[usati]], 1)
# dietro: 3 mm più indietro lungo la normale della superficie
gzy, gzx = np.gradient(Z, PASSO); N = np.stack([-gzx, -gzy, np.ones_like(Z)], -1); N /= np.linalg.norm(N, axis=-1, keepdims=True)
dietro = davanti - 0.03 * N[usati]
facce = []
js, is_ = np.nonzero(C)
for j, i in zip(js, is_):
    a, b, c, d = idx[j, i], idx[j, i + 1], idx[j + 1, i + 1], idx[j + 1, i]
    facce += [[a, b, c], [a, c, d], [nv + a, nv + c, nv + b], [nv + a, nv + d, nv + c]]
# il bordo: i lati delle celle che stanno su una cella sola
lati = {}
for j, i in zip(js, is_):
    q = [idx[j, i], idx[j, i + 1], idx[j + 1, i + 1], idx[j + 1, i]]
    for k in range(4):
        u, v = q[k], q[(k + 1) % 4]; key = (min(u, v), max(u, v)); lati[key] = None if key in lati else (u, v)
for key, uv in lati.items():
    if uv is None: continue
    u, v = uv; facce += [[v, u, nv + u], [v, nv + u, nv + v]]
POS = (np.vstack([davanti, dietro]) * 0.1).astype('<f4'); IDX = np.array(facce, '<u4').ravel()
OUT = os.path.join(QUI, 'maschera'); os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'maschera.bin'), 'wb').write(POS.tobytes() + IDX.tobytes())
json.dump(dict(vertici=len(POS), indici=len(IDX), occhi={'S': (eS * 0.1).tolist(), 'D': (eD * 0.1).tolist()}, ordine=['pos f4 vertici*3', 'idx u4 indici'],
               nota='maschera «volto»: viso MakeHuman neutro (CC0), mappa delle altezze lisciata, 4 mm sopra la pelle, spessa 3 mm'), open(os.path.join(OUT, 'maschera.json'), 'w'))
print('maschera:', len(POS), 'vertici', len(IDX) // 3, 'triangoli', 'z naso', float(Z[usati].max()) * 0.1, 'm')
