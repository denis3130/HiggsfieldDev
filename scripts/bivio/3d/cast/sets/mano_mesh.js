// Mano MODELLATA per i primi piani (25/11, dopo «la mano sulla porta è ancora fatta male»): non più pezzi incollati ma una mano
// vera, la «generic-hand» dei WebXR Input Profiles (licenza MIT, mani/LICENZA_MIT.md), convertita in numeri da mani/converti.py.
// Si piega osso per osso, può chiudersi da sola attorno a un oggetto finché lo tocca (afferra), poi la superficie viene lisciata
// (suddivisione di Loop) e dipinta: unghie, lati delle dita un po' più scuri (così dita vicine restano distinte), pieghe delle nocche.
// Spazio del modello (mano DESTRA): dita verso -y, dorso verso +x, pollice verso -z; il polso è in POLSO. Angoli in gradi.
import { THREE, V } from './stile.js';
import DATI from './mani/mano_destra.js';

const NOMI = DATI.ossa, K = Object.fromEntries(NOMI.map((n, i) => [n, i])), NO = NOMI.length, NV = DATI.pos.length / 3;
const m4 = (a) => new THREE.Matrix4().fromArray(a), RIP = DATI.riposo.map(m4), INV = DATI.inversa.map(m4);
const dito = (p) => ['metacarpal', 'phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'].map((s) => K[`${p}-finger-${s}`]);
export const CATENE = { pollice: ['metacarpal', 'phalanx-proximal', 'phalanx-distal', 'tip'].map((s) => K[`thumb-${s}`]), indice: dito('index'), medio: dito('middle'), anulare: dito('ring'), mignolo: dito('pinky') };
export const QUATTRO = ['indice', 'medio', 'anulare', 'mignolo'];
export const POLSO = new THREE.Vector3().setFromMatrixPosition(RIP[K.wrist]);
// Il moncone del polso finisce con un tappo a 2 cm dal polso (tutti vertici guidati dal solo osso del polso).
// Attaccata a un avambraccio a pezzi, lo si allunga e assottiglia perché il tappo sparisca dentro il braccio.
function posizioni(allunga = false) {
  const p = Float32Array.from(DATI.pos), Y0 = 0.058, AX = 0.0385, AZ = 0.0102; if (!allunga) return p;
  for (let v = 0; v < NV; v++) { const y = p[v * 3 + 1]; if (y <= Y0) continue; const k = 1 - 0.22 * Math.min(1, (y - Y0) / 0.0202);
    p[v * 3 + 1] = Y0 + (y - Y0) * 4.2; p[v * 3] = AX + (p[v * 3] - AX) * k; p[v * 3 + 2] = AZ + (p[v * 3 + 2] - AZ) * k; }
  return p;
}
// L'AVAMBRACCIO che continua la mano senza giunture (maniche corte, primi piani): una superficie nuova e fitta che parte dalla sezione
// vera del polso del modello (la si misura sulla maglia lisciata) e arriva al gomito allargandosi e arrotondandosi. av = { lungo, gomito }
// in metri del modello. Segue l'osso del polso. Parte combaciando con il moncone del polso (stessa sezione, stessa pendenza: niente
// scalino né riga) e pochi millimetri dopo il moncone viene ristretto (RITIRA) e resta nascosto dentro.
function avambraccioLiscio(av, fine, { anelli = 30, spicchi = 44 } = {}) {
  const YA = 0.0585, YB = 0.0625, AX = 0.0385, AZ = 0.0102, DUE = 2 * Math.PI;
  // la sezione vera del polso a due altezze (raggio per ogni direzione attorno all'asse): la superficie nuova parte SOPRA quella della mano
  // e ne continua la pendenza, così nel punto d'attacco le due combaciano
  const sezione = (yc) => { const so = new Float32Array(spicchi), qu = new Float32Array(spicchi);
    for (let v = 0; v < fine.length / 3; v++) { const y = fine[v * 3 + 1]; if (Math.abs(y - yc) > 0.0016) continue; const dx = fine[v * 3] - AX, dz = fine[v * 3 + 2] - AZ, i = ((Math.round(Math.atan2(dz, dx) / DUE * spicchi) % spicchi) + spicchi) % spicchi; so[i] += Math.hypot(dx, dz); qu[i]++; }
    let r = Array.from(so, (x, i) => (qu[i] ? x / qu[i] : 0)); const vic = (i, d) => r[(i + d + spicchi) % spicchi];
    for (let giro = 0; giro < spicchi; giro++) r = r.map((x, i) => x || (vic(i, 1) + vic(i, -1)) / ((vic(i, 1) ? 1 : 0) + (vic(i, -1) ? 1 : 0) || 1));
    for (let giro = 0; giro < 3; giro++) r = r.map((x, i) => 0.5 * x + 0.25 * (vic(i, 1) + vic(i, -1))); return r; };
  const r0 = sezione(YA), r1 = sezione(YB), cs = (i) => Math.cos(i / spicchi * DUE), sn = (i) => Math.sin(i / spicchi * DUE);
  const rx = Math.max(...r1.map((x, i) => Math.abs(x * cs(i)))), rz = Math.max(...r1.map((x, i) => Math.abs(x * sn(i))));
  const yg = POLSO.y + av.lungo, pos = [], idx = [], PRIMI = 3, N = PRIMI + anelli + 4;
  for (let j = 0; j <= N; j++) { let y, kx = 1, kz = 1, q = 1;                                  // q: 0 = sezione r0, 1 = sezione r1
    if (j < PRIMI) { q = j / PRIMI; y = YA + (YB - YA) * q; }
    else if (j <= PRIMI + anelli) { const t = (j - PRIMI) / anelli, pancia = Math.sin(Math.PI * t ** 0.75) ** 2; y = YB + t * (yg - YB); kx = 1 + (av.gomito / rx - 1) * t ** 1.45 + 0.05 * pancia; kz = 1 + (av.gomito / rz - 1) * t ** 1.2 + 0.03 * pancia; }
    else { const u = (j - PRIMI - anelli) / 4, c = Math.cos(u * Math.PI / 2); y = yg + av.gomito * 0.8 * Math.sin(u * Math.PI / 2); kx = av.gomito / rx * c; kz = av.gomito / rz * c; }
    for (let i = 0; i < spicchi; i++) { const r = r0[i] + (r1[i] - r0[i]) * q; pos.push(AX + r * kx * cs(i), y, AZ + r * kz * sn(i)); } }
  for (let j = 0; j < N; j++) for (let i = 0; i < spicchi; i++) { const a = j * spicchi + i, b = j * spicchi + (i + 1) % spicchi, c = a + spicchi, d = b + spicchi; idx.push(a, b, c, b, d, c); }      // un giro attorno a +y visto da fuori
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  // le facce devono guardare fuori: se la prima normale punta verso l'asse si rovescia il verso dei triangoli
  const n = g.attributes.normal, p0 = g.attributes.position; if (n.getX(0) * (p0.getX(0) - AX) + n.getZ(0) * (p0.getZ(0) - AZ) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}
const LOC = RIP.map(() => null);                                   // ogni osso rispetto a quello prima nella catena, a riposo
Object.values(CATENE).forEach((c) => c.forEach((k, i) => { if (i) LOC[k] = RIP[c[i - 1]].clone().invert().multiply(RIP[k]); }));
// spessori (m) misurati sul modello: raggio dal lato del palmo di falange, falangina, falangetta; la punta sporge oltre l'ultimo osso
const RAGGI = { indice: [0.0105, 0.0085, 0.007], medio: [0.0105, 0.0088, 0.0072], anulare: [0.01, 0.0084, 0.0069], mignolo: [0.0095, 0.007, 0.006], pollice: [0.016, 0.0108, 0.0095] }, PUNTA = 0.0095;

const G2R = Math.PI / 180, RX = new THREE.Matrix4(), RY = new THREE.Matrix4(), RZ = new THREE.Matrix4(), qp = new THREE.Quaternion(), vp = V(0, 0, 0), GIU = V(0, -1, 0);
const rx = (g) => RX.makeRotationX(g * G2R), ry = (g) => RY.makeRotationY(g * G2R), rz = (g) => RZ.makeRotationZ(g * G2R);
// In ogni osso -z va verso la punta e +y è il dorso: piegare un dito è ruotare attorno a x in negativo.
// Dita: { mcp, pip, dip (pieghe), ab (apertura laterale: + verso il pollice), arco (metacarpo) }. Pollice: { ab (davanti al palmo), fl, roll, mcp, ip }.
// avambraccio: [x, y, z] = verso gomito -> polso nello spazio del modello (a riposo è -y): il moncone del polso si gira per continuare il braccio.
export function cinematica(P = {}, POSA = RIP.map((m) => m.clone())) {
  POSA.forEach((m, i) => m.copy(RIP[i]));
  for (const f of QUATTRO) { const c = CATENE[f], a = P[f] || {};
    POSA[c[0]].copy(RIP[c[0]]).multiply(rx(-(a.arco || 0)));
    POSA[c[1]].copy(POSA[c[0]]).multiply(LOC[c[1]]).multiply(ry(a.ab || 0)).multiply(rx(-(a.mcp || 0)));
    POSA[c[2]].copy(POSA[c[1]]).multiply(LOC[c[2]]).multiply(rx(-(a.pip || 0)));
    POSA[c[3]].copy(POSA[c[2]]).multiply(LOC[c[3]]).multiply(rx(-(a.dip || 0)));
    POSA[c[4]].copy(POSA[c[3]]).multiply(LOC[c[4]]); }
  if (P.avambraccio) { qp.setFromUnitVectors(GIU, vp.set(...P.avambraccio).normalize()); POSA[K.wrist].makeRotationFromQuaternion(qp).setPosition(vp.copy(POLSO).applyQuaternion(qp).negate().add(POLSO)).multiply(RIP[K.wrist]); }
  const c = CATENE.pollice, a = P.pollice || {};
  POSA[c[0]].copy(RIP[c[0]]).multiply(ry(a.ab || 0)).multiply(rx(-(a.fl || 0))).multiply(rz(a.roll || 0));
  POSA[c[1]].copy(POSA[c[0]]).multiply(LOC[c[1]]).multiply(rx(-(a.mcp || 0)));
  POSA[c[2]].copy(POSA[c[1]]).multiply(LOC[c[2]]).multiply(rx(-(a.ip || 0)));
  POSA[c[3]].copy(POSA[c[2]]).multiply(LOC[c[3]]);
  return POSA;
}

// ---- distanza tra due segmenti (per sapere quando una falange tocca l'oggetto)
const d1 = V(0, 0, 0), d2 = V(0, 0, 0), rr = V(0, 0, 0), c1 = V(0, 0, 0), c2 = V(0, 0, 0);
function distSegmenti(p1, q1, p2, q2) {
  d1.subVectors(q1, p1); d2.subVectors(q2, p2); rr.subVectors(p1, p2); const a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(rr); let s, t;
  if (a < 1e-12 && e < 1e-12) return rr.length();
  if (a < 1e-12) { s = 0; t = THREE.MathUtils.clamp(f / e, 0, 1); } else { const c = d1.dot(rr);
    if (e < 1e-12) { t = 0; s = THREE.MathUtils.clamp(-c / a, 0, 1); } else { const b = d1.dot(d2), den = a * e - b * b; s = den > 1e-12 ? THREE.MathUtils.clamp((b * f - c * e) / den, 0, 1) : 0; t = (b * s + f) / e;
      if (t < 0) { t = 0; s = THREE.MathUtils.clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = THREE.MathUtils.clamp((b - c) / a, 0, 1); } } }
  c1.copy(p1).addScaledVector(d1, s); c2.copy(p2).addScaledVector(d2, t); return c1.distanceTo(c2);
}
const pa = V(0, 0, 0), pb = V(0, 0, 0), zz = V(0, 0, 0);
// quanto manca (m) perché la falange i (0, 1, 2) del dito f tocchi l'oggetto: negativo = ci entra dentro
function margine(POSA, f, i, og) {
  const c = CATENE[f], o = f === 'pollice' ? 0 : 1, k = c[o + i]; pa.setFromMatrixPosition(POSA[k]); pb.setFromMatrixPosition(POSA[c[o + i + 1]]);
  if (i === 2) { zz.setFromMatrixColumn(POSA[k], 2); pb.addScaledVector(zz, -PUNTA); }
  return distSegmenti(pa, pb, og.a, og.b) - og.r - RAGGI[f][i];
}
// Chiude le dita attorno a un oggetto a bastone { a, b (estremi, nello spazio del modello), r }: ogni giuntura si piega finché una falange
// da lì in giù lo tocca (o fino al suo limite). `stringe` (m) = di quanto la pelle si schiaccia sull'oggetto. Parte dalla posa P e la completa.
export function afferra(P, og, { dita = QUATTRO, pollice = true, stringe = 0.0012, limiti = { mcp: 88, pip: 108, dip: 72, fl: 55, tmcp: 60, ip: 78 }, passo = 0.5 } = {}) {
  const Q = JSON.parse(JSON.stringify(P)), POSA = RIP.map((m) => m.clone()), O = { a: V(...og.a), b: V(...og.b), r: og.r };
  const tocca = (f, da) => { cinematica(Q, POSA); for (let i = da; i < 3; i++) if (margine(POSA, f, i, O) < -stringe) return true; return false; };
  const chiudi = (f, chiave, da, max) => { Q[f] = Q[f] || {}; let g = Q[f][chiave] || 0; if (tocca(f, da)) return; while (g < max) { g += passo; Q[f][chiave] = g; if (tocca(f, da)) { Q[f][chiave] = g - passo; break; } } };
  for (const f of dita) { chiudi(f, 'mcp', 0, limiti.mcp); chiudi(f, 'pip', 1, limiti.pip); chiudi(f, 'dip', 2, limiti.dip); }
  if (pollice) { chiudi('pollice', 'fl', 0, limiti.fl); chiudi('pollice', 'mcp', 1, limiti.tmcp); chiudi('pollice', 'ip', 2, limiti.ip); }
  return Q;
}

// Il pollice nella presa «a pugno»: passa dal lato del palmo e si chiude sull'oggetto di fronte alle dita. Con il rollio il polpastrello guarda
// l'oggetto; si provano le posizioni della base (ab, fl), ogni volta chiudendo le due giunture finché toccano, e si tiene quella in cui la
// falangetta tocca l'oggetto dal lato del palmo senza entrare nelle dita. Q è la posa con le dita già chiuse (afferra).
const s1 = V(0, 0, 0), s2 = V(0, 0, 0), s3 = V(0, 0, 0), s4 = V(0, 0, 0), asse = V(0, 0, 0), w = V(0, 0, 0);
function segmentoDito(POSA, f, i, a, b) { const c = CATENE[f], o = f === 'pollice' ? 0 : 1; a.setFromMatrixPosition(POSA[c[o + i]]); b.setFromMatrixPosition(POSA[c[o + i + 1]]); if (i === 2) { zz.setFromMatrixColumn(POSA[c[o + i]], 2); b.addScaledVector(zz, -PUNTA); } }
export function avvolgiPollice(P, og, { rollio = 75, stringe = 0.001, zona = null, passo = 5, fine = 1 } = {}) {
  const Q = JSON.parse(JSON.stringify(P)), POSA = RIP.map((m) => m.clone()), O = { a: V(...og.a), b: V(...og.b), r: og.r }; asse.subVectors(O.b, O.a).normalize();
  const tocca = (da) => { cinematica(Q, POSA); for (let i = da; i < 3; i++) if (margine(POSA, 'pollice', i, O) < -stringe) return true; return false; };
  const chiudi = (chiave, da, max) => { let g = 0; Q.pollice[chiave] = 0; if (tocca(da)) return; while (g < max) { g += 1; Q.pollice[chiave] = g; if (tocca(da)) { Q.pollice[chiave] = g - 1; break; } } };
  const prova = (ab, fl) => { Q.pollice = { ab, fl, roll: rollio, mcp: 0, ip: 0 }; cinematica(Q, POSA); if (margine(POSA, 'pollice', 0, O) < -0.004) return null; chiudi('mcp', 1, 55); chiudi('ip', 2, 75); cinematica(Q, POSA);
    const m2 = margine(POSA, 'pollice', 2, O), m1 = margine(POSA, 'pollice', 1, O); let urto = 0;
    for (const f of QUATTRO) for (let i = 0; i < 3; i++) { segmentoDito(POSA, f, i, s3, s4); for (let j = 1; j < 3; j++) { segmentoDito(POSA, 'pollice', j, s1, s2); const d = distSegmenti(s1, s2, s3, s4) - RAGGI.pollice[j] - RAGGI[f][i]; if (d < -0.0025) urto += -0.0025 - d; } }
    segmentoDito(POSA, 'pollice', 2, s1, s2); const dir = s2.clone().sub(s1).normalize(), mid = s1.clone().lerp(s2, 0.5), t = mid.clone().sub(O.a).dot(asse); w.copy(O.a).addScaledVector(asse, t).sub(mid).normalize();        // dal pollice verso l'asse
    const sotto = w.x, dove = zona ? Math.max(0, zona[0] - mid.z, mid.z - zona[1]) : 0;                                                                // sotto > 0: la falangetta sta dal lato del palmo
    return { punti: 60 * Math.abs(m2) + 12 * Math.max(0, m1 - 0.004) + 30 * urto + 0.012 * (1 - sotto) + 0.004 * Math.abs(dir.dot(asse)) + 0.6 * dove + 0.00002 * (ab + Math.abs(fl)), posa: { ...Q.pollice }, m1, m2, urto, sotto };
  };
  let best = null; const giro = (A, F, st) => { for (let ab = A[0]; ab <= A[1]; ab += st) for (let fl = F[0]; fl <= F[1]; fl += st) { const r = prova(ab, fl); if (r && (!best || r.punti < best.punti)) best = r; } };
  giro([0, 75], [-15, 65], passo); if (best && fine < passo) giro([best.posa.ab - passo, best.posa.ab + passo], [best.posa.fl - passo, best.posa.fl + passo], fine);
  if (best) Q.pollice = best.posa; Q.infoPollice = best && { m1: +(best.m1 * 1000).toFixed(1), m2: +(best.m2 * 1000).toFixed(1), urto: +(best.urto * 1000).toFixed(1), sotto: +best.sotto.toFixed(2) };
  return Q;
}

// ---- suddivisione di Loop (maglia chiusa): ogni triangolo ne diventa quattro e la superficie si liscia
function topologia(idx, nv) {
  const nf = idx.length / 3, lati = new Map(), ev = [], eo = [], fe = new Int32Array(nf * 3), vic = Array.from({ length: nv }, () => []);
  for (let f = 0; f < nf; f++) for (let j = 0; j < 3; j++) { const a = idx[f * 3 + j], b = idx[f * 3 + (j + 1) % 3], c = idx[f * 3 + (j + 2) % 3], k = a < b ? a * nv + b : b * nv + a; let e = lati.get(k);
    if (e === undefined) { e = ev.length / 2; lati.set(k, e); ev.push(a, b); eo.push(c, -1); vic[a].push(b); vic[b].push(a); } else eo[e * 2 + 1] = c; fe[f * 3 + j] = e; }
  const ne = ev.length / 2, out = new Uint32Array(nf * 12);
  for (let f = 0; f < nf; f++) { const [a, b, c] = [idx[f * 3], idx[f * 3 + 1], idx[f * 3 + 2]], [ab, bc, ca] = [nv + fe[f * 3], nv + fe[f * 3 + 1], nv + fe[f * 3 + 2]]; out.set([a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca], f * 12); }
  return { nv, ne, ev, eo, vic, idx: out };
}
function suddividi(pos, T, out = new Float32Array((T.nv + T.ne) * 3)) {
  const { nv, ne, ev, eo, vic } = T;
  for (let v = 0; v < nv; v++) { const n = vic[v].length, be = n === 3 ? 3 / 16 : 3 / (8 * n), k = 1 - n * be; let x = 0, y = 0, z = 0; for (const u of vic[v]) { x += pos[u * 3]; y += pos[u * 3 + 1]; z += pos[u * 3 + 2]; }
    out[v * 3] = k * pos[v * 3] + be * x; out[v * 3 + 1] = k * pos[v * 3 + 1] + be * y; out[v * 3 + 2] = k * pos[v * 3 + 2] + be * z; }
  for (let e = 0; e < ne; e++) { const a = ev[e * 2] * 3, b = ev[e * 2 + 1] * 3, c = eo[e * 2] * 3, d = eo[e * 2 + 1] * 3, o = (nv + e) * 3; for (let j = 0; j < 3; j++) out[o + j] = 0.375 * (pos[a + j] + pos[b + j]) + 0.125 * (pos[c + j] + pos[d + j]); }
  return out;
}
const T0 = topologia(DATI.idx, NV), T1 = topologia(T0.idx, T0.nv + T0.ne), T2 = topologia(T1.idx, T1.nv + T1.ne);
const TOPO = [T0, T1, T2], INDICI = [Uint32Array.from(DATI.idx), T0.idx, T1.idx, T2.idx];
const liscia = (pos, livelli) => { let p = pos; for (let i = 0; i < livelli; i++) p = suddividi(p, TOPO[i]); return p; };

// ---- la pelle segue le ossa
const SK = RIP.map(() => new THREE.Matrix4());
function pelle(POSA, p, out = new Float32Array(NV * 3)) {
  for (let k = 0; k < NO; k++) SK[k].multiplyMatrices(POSA[k], INV[k]); const ji = DATI.ji, jw = DATI.jw;
  for (let v = 0; v < NV; v++) { const x = p[v * 3], y = p[v * 3 + 1], z = p[v * 3 + 2]; let X = 0, Y = 0, Z = 0;
    for (let j = 0; j < 4; j++) { const w = jw[v * 4 + j]; if (!w) continue; const e = SK[ji[v * 4 + j]].elements; X += w * (e[0] * x + e[4] * y + e[8] * z + e[12]); Y += w * (e[1] * x + e[5] * y + e[9] * z + e[13]); Z += w * (e[2] * x + e[6] * y + e[10] * z + e[14]); }
    out[v * 3] = X; out[v * 3 + 1] = Y; out[v * 3 + 2] = Z; }
  return out;
}

// ---- la pittura (una volta, sulla mano a riposo): unghie, lati delle dita più scuri, pieghe sul dorso delle nocche
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const FDITA = Object.keys(CATENE);
// quanto ogni vertice della maglia lisciata appartiene a ciascun dito (dalle falangi in giù): così la pittura di un dito non sporca quello accanto
function appartenenza(livelli) {
  const can = FDITA.map(() => new Float32Array(NV)), di = new Int8Array(NO).fill(-1); FDITA.forEach((f, i) => CATENE[f].slice(1).forEach((k) => { di[k] = i; }));
  for (let v = 0; v < NV; v++) for (let j = 0; j < 4; j++) { const d = di[DATI.ji[v * 4 + j]]; if (d >= 0) can[d][v] += DATI.jw[v * 4 + j]; }
  const out = [];
  for (let g = 0; g < 2; g++) { let a = new Float32Array(NV * 3); for (let v = 0; v < NV; v++) for (let j = 0; j < 3; j++) if (can[g * 3 + j]) a[v * 3 + j] = can[g * 3 + j][v]; a = liscia(a, livelli); for (let j = 0; j < 3; j++) if (can[g * 3 + j]) out[g * 3 + j] = { a, j }; }
  return (f, v) => out[f].a[v * 3 + out[f].j];
}
function pittura(livelli, skin, unghia, o = {}) {
  const pos = liscia(Float32Array.from(DATI.pos), livelli), n = pos.length / 3, col = new Float32Array(n * 3), cs = new THREE.Color(skin), cu = new THREE.Color(unghia), sc = new THREE.Color(skin).multiplyScalar(o.scuro ?? 0.66), p = V(0, 0, 0), c = new THREE.Color();
  const lati = o.lati ?? 0.5, pieghe = o.pieghe ?? 0.3, suo = appartenenza(livelli);
  for (let v = 0; v < n; v++) { let u = 0, s = 0;
    FDITA.forEach((f, fi) => { const mio = sm(0.3, 0.6, suo(fi, v)); if (!mio) return; const ch = CATENE[f], pol = f === 'pollice', o1 = pol ? 0 : 1;
      for (let i = pol ? 1 : 0; i < 3; i++) { const k = ch[o1 + i], lung = -LOC[ch[o1 + i + 1]].elements[14] + (i === 2 ? 0.0115 : 0); p.set(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]).applyMatrix4(INV[k]);
        if (p.z > 0.004 || p.z < -lung - 0.003) continue; const mz = RAGGI[f][i] * (pol ? 1.05 : 1.12), dentro = sm(0.004, -0.002, p.z) * sm(-lung - 0.003, -lung + 0.003, p.z);
        s = Math.max(s, mio * lati * dentro * sm(0.5 * mz, 0.98 * mz, Math.abs(p.x)) * (i === 0 ? sm(-0.004, -0.02, p.z) : 1));                                  // i fianchi
        if (i > 0) s = Math.max(s, mio * pieghe * sm(0.0018, 0.0002, Math.abs(p.z)) * sm(0.001, 0.004, p.y) * sm(1.1 * mz, 0.6 * mz, Math.abs(p.x)));            // la piega della nocca
        if (i === 2) { const a = pol ? [0.008, 0.0235, 0.0078, 0.0026] : [0.0088, 0.0212, RAGGI[f][2] * 0.86, 0.0031];
          u = Math.max(u, mio * sm(-a[0] + 0.0008, -a[0] - 0.0008, p.z) * sm(-a[1] - 0.0008, -a[1] + 0.0008, p.z) * sm(a[2] + 0.0006, a[2] - 0.0006, Math.abs(p.x)) * sm(a[3] - 0.0007, a[3] + 0.0007, p.y)); } } });
    c.copy(cs).lerp(sc, s).lerp(cu, u); col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; }
  return col;
}

// La mano pronta: un gruppo nello spazio del modello. userData.posa(P) la piega; userData.ossa = matrici delle ossa nella posa attuale.
export function manoMesh({ skin = '#D9A583', unghia = '#EBC6B3', livelli = 2, pittura: op = {}, materiale = null, avambraccio = null, allunga = false } = {}) {
  const g = new THREE.Group(), geo = new THREE.BufferGeometry(), POSA = RIP.map((m) => m.clone()), base = new Float32Array(NV * 3), P0 = posizioni(allunga && !avambraccio);
  let braccio = null, ritira = null; if (avambraccio) { const fine = liscia(Float32Array.from(DATI.pos), livelli); braccio = new THREE.Mesh(avambraccioLiscio(avambraccio, fine), new THREE.MeshLambertMaterial({ color: skin })); braccio.matrixAutoUpdate = false; braccio.frustumCulled = false; g.add(braccio);
    ritira = []; for (let v = 0; v < fine.length / 3; v++) { const y = fine[v * 3 + 1]; if (y > 0.064) { const k = 1 - 0.14 * sm(0.064, 0.068, y); ritira.push(v, 0.0385 + (fine[v * 3] - 0.0385) * k, y, 0.0102 + (fine[v * 3 + 2] - 0.0102) * k); } } }      // RITIRA: il moncone oltre l'attacco, ristretto
  let tmp = [new Float32Array((T0.nv + T0.ne) * 3), new Float32Array((T1.nv + T1.ne) * 3), new Float32Array((T2.nv + T2.ne) * 3)];
  const nfin = livelli ? TOPO[livelli - 1].nv + TOPO[livelli - 1].ne : NV, attr = new THREE.BufferAttribute(new Float32Array(nfin * 3), 3);
  geo.setAttribute('position', attr); geo.setAttribute('color', new THREE.BufferAttribute(pittura(livelli, skin, unghia, op), 3)); geo.setIndex(new THREE.BufferAttribute(INDICI[livelli], 1));
  const mesh = new THREE.Mesh(geo, materiale || new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true })); mesh.frustumCulled = false; g.add(mesh);
  g.userData.ossa = POSA; g.userData.mesh = mesh; g.userData.pezzi = braccio ? [mesh, braccio] : [mesh];
  g.userData.posa = (P = {}) => { cinematica(P, POSA); let p = pelle(POSA, P0, base); for (let i = 0; i < livelli; i++) p = suddividi(p, TOPO[i], tmp[i]); attr.array.set(p); if (ritira) { const e = SK[K.wrist].elements, a = attr.array; for (let i = 0; i < ritira.length; i += 4) { const v = ritira[i] * 3, x = ritira[i + 1], y = ritira[i + 2], z = ritira[i + 3]; a[v] = e[0] * x + e[4] * y + e[8] * z + e[12]; a[v + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; a[v + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]; } }
    attr.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere(); if (braccio) braccio.matrix.copy(SK[K.wrist]); return g; };
  g.userData.posa({});
  return g;
}
export const INFO = { vertici: NV, triangoli: DATI.idx.length / 3, lisciati: [T0.idx.length / 3, T1.idx.length / 3, T2.idx.length / 3] };

// ---- nella scena: la mano modellata al posto di quella a pezzi, e la presa su un oggetto vero
// Attacca la mano al polso di un braccio (A = AL o AR di un personaggio di pupazzi.js). Nel gruppo della mano del braccio le dita vanno verso -y
// e il dorso verso +z; il modello è la mano destra (braccio con side -1), l'altro braccio la usa allo specchio. Scala 1,1: una mano adulta di 19,5 cm.
// Con braccio: true (maniche corte) la mano modellata fa anche l'avambraccio, fino al gomito, e quello a pezzi sparisce: nessuna giuntura al polso.
export function attacca(A, { scala = 1.1, braccio = true, ...o } = {}) {
  if (braccio && A.liscio) { o.avambraccio = { lungo: A.L2 / scala, gomito: A.r1 * 0.94 / scala }; A.gF.children[0].visible = false; A.gF.children[1].visible = false; } else o.allunga = true;      // l'avambraccio lo fa la mano modellata
  const m = manoMesh(o), X = new THREE.Matrix4().makeBasis(V(0, 0, 1), V(0, 1, 0), V(-1, 0, 0)).scale(V(scala, scala, scala)); X.setPosition(POLSO.clone().applyMatrix4(X).negate());
  if (A.side > 0) X.premultiply(new THREE.Matrix4().makeScale(-1, 1, 1));
  m.matrixAutoUpdate = false; m.matrix.copy(X); A.gH.add(m); A.hand.visible = false; m.userData.scala = scala; m.userData.braccio = A;
  return m;
}
// Toglie la mano modellata e rimette il braccio com'era (per un set che serve anche ad altre inquadrature).
export function stacca(m) { const A = m.userData.braccio; A.gH.remove(m); A.hand.visible = true; if (A.liscio) { A.gF.children[0].visible = true; A.gF.children[1].visible = true; } for (const x of m.userData.pezzi) { x.geometry.dispose(); x.material.dispose(); } }
// La presa «a pugno» su un bastone: dove passa il suo asse rispetto alle nocche, per l'indice e (un po' meno, k) per il mignolo.
// u = verso le punte delle dita, v = verso il palmo (metri del modello). Più v è grande più le nocche si alzano e le dita avvolgono.
const N_INDICE = V(0.0318, -0.0328, -0.0144), N_MIGNOLO = V(0.0254, -0.0181, 0.0442);
export function presaNocche(u = 0.01, v = 0.035, k = 0.8) { const a = V(N_INDICE.x - v, N_INDICE.y - u, N_INDICE.z), b = V(N_MIGNOLO.x - v * k, N_MIGNOLO.y - u * k, N_MIGNOLO.z); return { c: a.clone().lerp(b, 0.5).toArray(), d: b.sub(a).normalize().toArray() }; }
// Come mettere la mano (destra) perché un bastone del mondo, da a (lato del pollice) a b (lato del mignolo), le passi dentro dove vuole la presa:
// presa = { c: punto dell'asse nel modello, d: direzione nel modello (verso il mignolo), rollio: gradi attorno al bastone (0 = dorso in su, negativo = dita in giù),
// lungo: 0..1 dove sta c lungo il bastone }. Torna polso, dita e dorso nel verso della SCENA (per mondo/ditaM/dorsoM del braccio).
export function presaSu(a, b, { c, d, rollio = 0, lungo = 0.5 }, scala = 1.1) {
  const A = V(...a), B = V(...b), dw = B.clone().sub(A).normalize(), dm = V(...d).normalize(), nm = V(1, 0, 0).addScaledVector(dm, -dm.x).normalize();
  const nw = V(0, 1, 0).addScaledVector(dw, -dw.y).normalize().applyAxisAngle(dw, rollio * G2R);
  const Q = new THREE.Matrix4().makeBasis(dw, nw, dw.clone().cross(nw)).multiply(new THREE.Matrix4().makeBasis(dm, nm, dm.clone().cross(nm)).transpose()), C = A.lerp(B, lungo), cm = V(...c);
  return { polso: POLSO.clone().sub(cm).multiplyScalar(scala).applyMatrix4(Q).add(C).toArray(), dita: V(0, -1, 0).applyMatrix4(Q).toArray(), dorso: V(1, 0, 0).applyMatrix4(Q).toArray() };
}
// Dopo che il personaggio è in posa: porta nel modello un bastone del mondo e la direzione dell'avambraccio (per afferra e per il polso).
const mi = new THREE.Matrix4(), e1 = V(0, 0, 0), e2 = V(0, 0, 0);
export function nelModello(m, a, b, r) {
  m.updateWorldMatrix(true, false); mi.copy(m.matrixWorld).invert(); const A = m.userData.braccio, s = m.userData.scala;
  A.gF.getWorldPosition(e1); A.gH.getWorldPosition(e2); const av = e2.sub(e1).normalize().transformDirection(mi).toArray();
  return { leva: a ? { a: V(...a).applyMatrix4(mi).toArray(), b: V(...b).applyMatrix4(mi).toArray(), r: r / s } : null, avambraccio: av };
}
