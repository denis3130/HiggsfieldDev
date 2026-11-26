// prese.js — la mano MODELLATA del corpo (quella di vesti(): A.manoMesh) che stringe una sbarra della scena: il corrimano di una ringhiera, un bordo.
// sbarra(A, a, b, opzioni) torna quello che serve al braccio: { mondo, ditaM, dorsoM, mano }, cioè dove va il polso, come è girata la mano
// e le dita chiuse attorno alla sbarra finché la toccano (afferra + avvolgiPollice, come la mano sulla maniglia dell'episodio 1).
//   a = estremo dal lato del pollice, b = dal lato del mignolo (punti del mondo); r = raggio della sbarra;
//   u, v = dove passa l'asse nella mano (u verso le punte, v verso il palmo, metri del modello); rollio = gradi attorno alla sbarra
//   (0 = dorso in su, negativo = dita in giù); lungo = 0..1 dove sta la mano lungo la sbarra.
// Per la mano del lato +1 (AR: la sinistra del personaggio) il conto si fa allo specchio. Le dita dipendono solo da r, u, v: si calcolano una volta.
import { THREE, V } from './stile.js';
import { presaSu, presaNocche, afferra, avvolgiPollice } from './mano_mesh.js';

const STRETTE = {};
export function stretta(r, { u = 0.016, v = 0.036, scala = 1.1, pollice = true, rollioPollice = 75, zona = null, base = {} } = {}) {
  const ch = JSON.stringify([r, u, v, scala, pollice, rollioPollice, zona, base]); if (STRETTE[ch]) return STRETTE[ch];
  const { c, d } = presaNocche(u, v), og = { a: [c[0] - d[0] * 0.09, c[1] - d[1] * 0.09, c[2] - d[2] * 0.09], b: [c[0] + d[0] * 0.09, c[1] + d[1] * 0.09, c[2] + d[2] * 0.09], r: r / scala };
  let P = afferra(base, og, { pollice: false }); if (pollice) P = avvolgiPollice(P, og, { rollio: rollioPollice, zona });
  return (STRETTE[ch] = P);
}
export function sbarra(A, a, b, { r = 0.021, u = 0.016, v = 0.036, rollio = 0, lungo = 0.5, ...altro } = {}) {
  const sp = A.side > 0, m = (p) => (sp ? [-p[0], p[1], p[2]] : p), scala = (A.manoMesh && A.manoMesh.userData.scalaMano) || 1.1;
  const g = presaSu(m(a), m(b), { ...presaNocche(u, v), rollio, lungo }, scala);
  return { mondo: m(g.polso), ditaM: m(g.dita), dorsoM: m(g.dorso), mano: stretta(r, { u, v, scala, ...altro }) };
}
