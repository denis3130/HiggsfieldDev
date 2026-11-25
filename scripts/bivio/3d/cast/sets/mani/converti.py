# Converte la mano modellata «generic-hand» (WebXR Input Profiles, licenza MIT: LICENZA_MIT.md) da .glb a un modulo JS di soli numeri:
# vertici saldati (nel .glb sono doppi lungo le cuciture della texture), triangoli, pesi delle ossa, ossa a riposo.
# Uso: python3 converti.py destra.glb mano_destra.js
import json, struct, sys, numpy as np
b = open(sys.argv[1], 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; g = json.loads(b[20:20 + n]); bin0 = b[20 + n + 8:]
TIPI = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}; COMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
def acc(i):
    a = g['accessors'][i]; v = g['bufferViews'][a['bufferView']]; f, sz = TIPI[a['componentType']]; c = COMP[a['type']]; off = v.get('byteOffset', 0) + a.get('byteOffset', 0); passo = v.get('byteStride') or sz * c
    out = np.array([struct.unpack_from('<' + f * c, bin0, off + k * passo) for k in range(a['count'])], dtype=np.float64)
    if a.get('normalized'): out /= {5121: 255.0, 5123: 65535.0}[a['componentType']]
    return out
m = g['meshes'][0]['primitives'][0]; P = acc(m['attributes']['POSITION']); J = acc(m['attributes']['JOINTS_0']).astype(int); Wt = acc(m['attributes']['WEIGHTS_0']); I = acc(m['indices']).astype(int).reshape(-1, 3)
sk = g['skins'][0]; nomi = [g['nodes'][j]['name'] for j in sk['joints']]; INV = acc(sk['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)      # glTF: per colonne
for nd in g['nodes']:
    if nd.get('name') in ('Armature',) or 'mesh' in nd: assert not any(k in nd for k in ('translation', 'rotation', 'scale', 'matrix')), nd
def mat(nd):
    x, y, z, w = nd.get('rotation', [0, 0, 0, 1]); R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R * np.array(nd.get('scale', [1, 1, 1])); M[:3, 3] = nd.get('translation', [0, 0, 0]); return M
RIP = np.array([mat(g['nodes'][j]) for j in sk['joints']])
print('ossa', len(nomi), '| a riposo osso x inversa = identità, scarto massimo', float(np.abs(np.einsum('kij,kjl->kil', RIP, INV) - np.eye(4)).max()))
Wt = Wt / Wt.sum(1, keepdims=True)
# saldatura per posizione
chiave = {}; mappa = np.zeros(len(P), int); uni = []
for i, p in enumerate(P):
    k = tuple(np.round(p / 1e-6).astype(np.int64)); 
    if k not in chiave: chiave[k] = len(uni); uni.append(i)
    mappa[i] = chiave[k]
uni = np.array(uni); P2 = P[uni]; J2 = J[uni]; W2 = Wt[uni]; I2 = mappa[I]; I2 = I2[(I2[:, 0] != I2[:, 1]) & (I2[:, 1] != I2[:, 2]) & (I2[:, 0] != I2[:, 2])]
# bordi aperti (il taglio del polso)
from collections import Counter
lati = Counter(tuple(sorted((int(t[a]), int(t[(a + 1) % 3])))) for t in I2 for a in range(3)); bordo = [e for e, c in lati.items() if c == 1]; strani = [e for e, c in lati.items() if c > 2]
print('vertici', len(P), '->', len(P2), '| triangoli', len(I), '->', len(I2), '| lati', len(lati), '| lati di bordo', len(bordo), '| lati con più di 2 facce', len(strani))
print('ingombro', P2.min(0).round(4), P2.max(0).round(4)); vb = sorted({v for e in bordo for v in e}); print('bordo: y da %.4f a %.4f' % (P2[vb, 1].min(), P2[vb, 1].max()) if vb else 'nessun bordo')
r = lambda a, d: [round(float(x), d) for x in np.asarray(a).ravel()]
dati = {'pos': r(P2, 6), 'idx': [int(x) for x in I2.ravel()], 'ji': [int(x) for x in J2.ravel()], 'jw': r(W2, 5), 'ossa': nomi, 'riposo': [r(M.T, 7) for M in RIP], 'inversa': [r(M.T, 7) for M in INV]}     # matrici per colonne, come three.js
open(sys.argv[2], 'w').write('// Generato da converti.py dalla mano «generic-hand» (WebXR Input Profiles, MIT). Dita verso -y, dorso verso +x, pollice verso -z; metri.\nexport default ' + json.dumps(dati, separators=(',', ':')) + ';\n')
print('scritto', sys.argv[2], round(len(open(sys.argv[2]).read()) / 1024), 'kB')
