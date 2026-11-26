// I sette seduti a tavola (episodio 1): dove sta ciascuno (i posti di sala.js), la posa da seduto con le mani sul tavolo, e gli aiuti per
// le pose particolari (Victor in piedi e riverso, le teste che si girano). Il riferimento di ogni posto: origine al centro del cuscino della
// sedia sul pavimento, z verso la tavola (il davanti di chi siede), x la sua sinistra.
import { THREE, V } from './look.js';
import { personaggio } from './corpi7.js';
import { POSTI, TAVOLO } from './sala.js';

export const NOMI = ['leon', 'victor', 'elena', 'marcus', 'nora', 'adrian', 'sophie'];
const D2R = Math.PI / 180, SEDILE = 0.53;
export function posto(i) {
  const [px, pz, ang] = POSTI[i], d = i === 0 || i === 7 ? 0.5 : 0.58, a = ang * D2R, giro = ang + 180, t = giro * D2R;
  const c = V(px + Math.sin(a) * d, 0, pz + Math.cos(a) * d), avanti = V(Math.sin(t), 0, Math.cos(t)), sx = V(Math.cos(t), 0, -Math.sin(t));
  const L = (x, y, z) => c.clone().add(sx.clone().multiplyScalar(x)).add(avanti.clone().multiplyScalar(z)).setY(y).toArray();
  const dir = (x, y, z) => sx.clone().multiplyScalar(x).add(avanti.clone().multiplyScalar(z)).add(V(0, y, 0)).toArray();
  return { c, giro, avanti, sx, L, dir };
}
// la posa da seduto: busto un po' in avanti, cosce sul cuscino, piedi a terra, mani appoggiate sul tavolo col palmo in giù
export function seduto(i, o = {}) {
  const p = posto(i), { L, dir } = p, mani = o.mani ?? [0.2, 0.4], lat = mani[0], av = mani[1];
  return {
    dove: L(0, 0.64, o.avanti ?? 0.1), giro: p.giro,
    schiena: o.schiena || [7, 0, 0], collo: o.collo || [8, 0, 0], sguardo: o.sguardo,
    gamba: { S: { caviglia: L(0.11, 0.09, 0.47), polo: [0, 0.3, 1], punta: [0.05, -0.35, 1] }, D: { caviglia: L(-0.11, 0.09, 0.47), polo: [0, 0.3, 1], punta: [-0.05, -0.35, 1] } },
    braccio: o.braccio || {
      S: { polso: L(lat, TAVOLO.y + 0.03, av), dita: dir(-0.3, -0.1, 1), palmo: [0, -1, 0] },
      D: { polso: L(-lat, TAVOLO.y + 0.03, av), dita: dir(0.3, -0.1, 1), palmo: [0, -1, 0] },
    },
    ...(o.extra || {}),
  };
}
// mette in posa e poi lo abbassa (o alza) finché il punto più basso sotto il bacino tocca il cuscino
export function siedi(P, o) {
  P.posa(o); const d = o.dove, m = P.basso(d[0], d[2], 0.15), dy = SEDILE - m;
  if (Math.abs(dy) > 0.002) { o = { ...o, dove: [d[0], d[1] + dy, d[2]] }; P.posa(o); }
  return o;
}
export async function sette(scene, quali = NOMI) {
  const P = {};
  for (const n of quali) { P[n] = await personaggio(n); scene.add(P[n].g); }
  return P;
}
