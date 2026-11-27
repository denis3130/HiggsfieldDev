// Personaggi «adulti» (variante più realistica dello stile vettoriale 3D): teste piccole (un corpo di 7 teste e mezza),
// spalle e proporzioni vere, facce meno da cartone (occhi più piccoli, naso lungo, mascella definita).
// Per «Il testimone»: testimone() = tu, ispettore() = l'ispettore Dario Riva (cappotto, cravatta, graffi sulla guancia, distintivo).
// Stesse pose degli altri personaggi: pos, yaw, lean, twist, breathe, headYaw/Pitch/Roll, armL/armR, sit, gambe + espressione.
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
import { THREE, V, rnd, tex, mat, piatto as basic, sfera, add, loft, tra, ombre, alone } from './stile.js';
import { testa, capelli, chioma, ciuffi, braccio, gamba, chiavi, mix } from './pupazzi.js';
import { CORPI, misure, vesti, texture, oggettoInMano } from './corpo_mesh.js';
import { sbarra } from './prese.js';
import { posaDaPupazzo } from './mano_mesh.js';

// mondo: il punto da raggiungere in coordinate della scena. Le direzioni dita/dorso/gomito sono nel verso del PERSONAGGIO (z = davanti a lui);
// per darle nel verso della scena si usano ditaM/dorsoM/gomitoM (se il personaggio è girato le due cose non coincidono).
const _qi = new THREE.Quaternion(), _e = V(0, 0, 0);
function locale(upper, q) {
  if (!(q.mondo || q.ditaM || q.dorsoM || q.gomitoM)) return q;
  const r = { ...q }; upper.getWorldQuaternion(_qi).invert();
  if (q.mondo) { const v = upper.worldToLocal(V(...q.mondo)); r.a = [v.x, v.y, v.z]; }
  for (const [k, km] of [['dita', 'ditaM'], ['dorso', 'dorsoM'], ['gomito', 'gomitoM']]) if (q[km]) { const d = V(...q[km]).applyQuaternion(_qi); r[k] = [d.x, d.y, d.z]; }
  return r;
}
// sbarra: { a, b, r, u, v, lungo, piega } = la mano stringe una sbarra della scena (il corrimano; vedi prese.js). Il rollio attorno alla sbarra
// non lo sceglie la scena: si prende quello che lascia il polso più dritto (la mano in linea con l'avambraccio), più `piega` gradi se si vuole.
function suSbarra(upper, A, q) {
  const s = q.sbarra, prova = (rollio) => { const r = locale(upper, { ...q, ...sbarra(A, s.a, s.b, { ...s, rollio }) }); A.a(r); _e.copy(A.gH.position).sub(A.gF.position).normalize(); const d = V(...r.dita).normalize(); return [d.dot(_e), r, rollio]; };
  let m = null; for (let g = -90; g <= 90; g += 15) { const x = prova(g); if (!m || x[0] > m[0]) m = x; }
  for (const g of [m[2] - 10, m[2] - 5, m[2] + 5, m[2] + 10]) { const x = prova(g); if (x[0] > m[0]) m = x; }
  return s.piega ? prova(m[2] + s.piega)[1] : m[1];
}
// Un braccio può dire `k` (0..1) = quanto del gesto è fatto, e `da` = la posa da cui parte (un'altra descrizione di braccio; senza `da`, il braccio
// a riposo lungo il fianco). Polso, gomito, mano e dita passano dall'una all'altra senza scatti: la mano che lascia il corrimano, il braccio che
// si posa sul ginocchio mentre ci si siede, le dita che si stringono. Senza `k` tutto resta com'era.
const DITA5 = ['indice', 'medio', 'anulare', 'mignolo', 'pollice'];
export function mixMano(a, b, k) {
  const A = posaDaPupazzo(a || 'rilassata'), B = posaDaPupazzo(b || 'rilassata'), Q = {};
  for (const f of DITA5) { Q[f] = {}; for (const c of new Set([...Object.keys(A[f] || {}), ...Object.keys(B[f] || {})])) Q[f][c] = ((A[f] || {})[c] ?? 0) * (1 - k) + ((B[f] || {})[c] ?? 0) * k; }
  return Q;
}
const risolvi = (upper, A, q) => (q.sbarra ? suSbarra(upper, A, q) : locale(upper, q));
function sfuma(A, r0, r1, k) {
  const L = (x, y) => [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k], g0 = [A.side * 0.6, -0.3, -0.75], giu = [0, -1, 0.05];
  const d0 = r0.dita || (r1.dita ? giu : null), d1 = r1.dita || (r0.dita ? giu : null);
  return { a: L(r0.a || A.riposo, r1.a || A.riposo), gomito: L(r0.gomito || g0, r1.gomito || g0), dita: d0 ? L(d0, d1) : undefined, dorso: L(r0.dorso || [0, 0, 1], r1.dorso || [0, 0, 1]), mano: mixMano(r0.mano, r1.mano, k) };
}
function braccia(upper, AL, AR, p) {
  for (const [A, q] of [[AL, p.armL], [AR, p.armR]]) {
    if (!q) { A.a({}); continue; }
    const k = q.k === undefined ? 1 : M.clamp(q.k);
    if (k >= 1) { A.a(risolvi(upper, A, q)); continue; }
    const r0 = q.da ? risolvi(upper, A, q.da) : {};
    A.a(k <= 0 ? r0 : sfuma(A, r0, risolvi(upper, A, q), k));
  }
}

// o: { k (statura: 1 = 1,78 m), largo (spalle), C (colori), F (faccia), torso (materiale), manica, manica2, polsino, capelli(T), extra(parti), cappotto, mano,
//      polso, polsoZ (mezza larghezza e mezzo spessore del polso), gomitoM + orlo (maniche al gomito: gomito di pelle e orlo della manica),
//      corpo (nome del corpo MODELLATO in corpi/: pelle, vestiti e scarpe veri al posto dei pezzi a pupazzo, che restano come ossa), materiali (del corpo modellato) }
function uomo(o) {
  const k = o.k || 1, L = o.largo || 1, C = o.C, root = new THREE.Group();
  const mis = o.corpo && CORPI[o.corpo] ? misure(o.corpo, 1.406 * k) : null;                // le misure del corpo modellato alla statura del personaggio
  const skinM = mat(C.skin), nailM = mat(C.unghie || '#EBC6B3'), pantM = mat(C.pant);
  const fianchi = new THREE.Group(); root.add(fianchi);
  add(fianchi, loft([{ y: 0.8 * k, rx: 0.1 * k, rz: 0.09 * k }, { y: 0.87 * k, rx: 0.165 * k, rz: 0.115 * k }, { y: 0.96 * k, rx: 0.172 * k, rz: 0.118 * k }, { y: 1.07 * k, rx: 0.165 * k, rz: 0.112 * k }], 40), pantM);
  const go = mis ? { hx: mis.hx, hy: mis.T1 + mis.T2 + mis.caviglia, T1: mis.T1, T2: mis.T2 } : { hx: 0.09 * k, hy: 0.93 * k, T1: 0.43 * k, T2: 0.42 * k }; Object.assign(go, { r0: 0.085 * k, r1: 0.062 * k, r2: 0.046 * k, mat: pantM, scarpa: mat(C.scarpa), suola: mat(C.suola), piede: k });
  const GL = gamba(fianchi, -1, go), GR = gamba(fianchi, 1, go);
  const upper = new THREE.Group(); upper.position.y = 1.05 * k; fianchi.add(upper);
  const sec = [[-0.1, 0.178, 0.124, 0.124, 2], [0.05, 0.167, 0.112, 0.112, 2], [0.2, 0.185 * L, 0.125, 0.118, 2.2], [0.33, 0.21 * L, 0.13, 0.12, 2.4], [0.405, 0.218 * L, 0.115, 0.115, 2.8], [0.44, 0.16 * L, 0.1, 0.1, 2], [0.462, 0.075, 0.075, 0.075, 2], [0.47, 0.055, 0.06, 0.06, 2]];
  add(upper, loft(sec.map(([y, rx, rzf, rzb, n]) => ({ y: y * k, rx: rx * k, rzf: rzf * k, rzb: rzb * k, n })), 64), o.torso);
  if (o.cappotto) add(upper, loft([{ y: -0.52 * k, rx: 0.205 * k, rz: 0.155 * k, pieghe: 0.012, nPieghe: 6 }, { y: -0.3 * k, rx: 0.192 * k, rz: 0.142 * k }, { y: -0.07 * k, rx: 0.172 * k, rz: 0.119 * k }], 48), o.cappotto);
  if (o.cappotto) { const fondo = add(upper, new THREE.CircleGeometry(1, 28), pantM, V(0, -0.5 * k, 0), [0.2 * k, 0.15 * k, 1]); fondo.rotation.x = Math.PI / 2; fondo.material = mat(C.pant, { side: THREE.DoubleSide }); }   // il fondo del cappotto, per non vederci dentro
  tra(upper, V(0, 0.455 * k, 0.004), V(0, 0.54 * k, 0.012), 0.052 * k, 0.048 * k, mat(mix(C.skin, '#8E553F', 0.22)));
  const collo = new THREE.Group(); collo.position.set(0, 0.505 * k, mis ? mis.colloZ(1.555 * k) : 0.008); upper.add(collo);
  const T = testa(o.F); T.head.position.set(0, 0.094 * k, 0.012); T.head.scale.setScalar(k * (o.testa || 1)); collo.add(T.head);
  if (o.capelli) o.capelli(T);
  const bo = { sx: 0.196 * L * k, sy: 0.356 * k, sz: mis ? mis.spallaZ : 0, L1: 0.3 * k, L2: 0.265 * k, r0: 0.054 * k, r1: 0.045 * k, r2: (o.polso ?? 0.037) * k, polsoZ: o.polsoZ ? o.polsoZ * k : 0, gomitoM: o.gomitoM, orlo: o.orlo, manica: o.manica, manica2: o.manica2, polsino: o.polsino, skin: o.guanti ? mat(o.guanti) : skinM, nail: o.guanti ? mat(o.guanti) : nailM, mano: 1.05 * k };
  const AL = braccio(upper, -1, bo), AR = braccio(upper, 1, bo);
  const parti = { root, fianchi, upper, collo, T, AL, AR, GL, GR, k, C };
  let abito = null;
  if (mis) {                                             // il corpo modellato: i pezzi a pupazzo (tranne la testa) restano solo come ossa
    fianchi.traverse((x) => { if (!x.isMesh) return; for (let p = x; p; p = p.parent) if (p === T.head) return; x.visible = false; });
    abito = vesti(parti, o.corpo, { materiali: o.materiali || {}, skin: C.skin, unghia: C.unghie || '#EBC6B3', pelleMani: o.guanti || null, ombraMento: o.ombraMento || 0 }); parti.abito = abito;
  }
  if (o.extra) o.extra(parti);
  ombre(root);
  function pose(p = {}) {
    const br = p.breathe ?? 0, sit = M.clamp(p.sit || 0);
    upper.rotation.set(p.lean || 0, p.twist || 0, p.side || 0);
    upper.scale.set(1 + 0.007 * br, 1 + 0.004 * br, 1 + 0.011 * br);
    collo.rotation.set(p.headPitch || 0, p.headYaw || 0, p.headRoll || 0);
    T.face(p);
    const g = p.gambe || {};
    GL.set({ avanti: 1.5 * sit + (g.aL || 0), ginocchio: 1.5 * sit + (g.gL || 0), apri: 0.05 * sit + (g.oL || 0), piede: g.pL || 0 });      // oL/oR: gamba aperta di lato; pL/pR: piede
    GR.set({ avanti: 1.5 * sit + (g.aR || 0), ginocchio: 1.5 * sit + (g.gR || 0), apri: 0.05 * sit + (g.oR || 0), piede: g.pR || 0 });
    const pos = p.pos || [0, 0, 0];
    root.position.set(pos[0], pos[1] - sit * (go.hy - (p.sedile ?? 0.46) - 0.085), pos[2]); root.rotation.y = p.yaw || 0; root.updateMatrixWorld(true);
    // un braccio può puntare a un punto del proprio corpo: { proprio: 'ginocchioD' | 'ginocchioS', delta: [x, y, z] nel mondo } (la mano appoggiata sul ginocchio)
    const mio = (a) => { if (a && a.da) a = { ...a, da: mio(a.da) }; if (!a || !a.proprio) return a; const gk = a.proprio === 'ginocchioD' ? GL.knee : GR.knee, w = gk.getWorldPosition(V(0, 0, 0)), d = a.delta || [0, 0, 0]; return { ...a, mondo: [w.x + d[0], w.y + d[1], w.z + d[2]] }; };
    p = { ...p, armL: mio(p.armL), armR: mio(p.armR) };
    braccia(upper, AL, AR, p);
    if (o.posa) o.posa(p, parti);
    parti.borsa = p.borsa || null;
    if (abito) { abito.aggiorna(); if (o.dopo) o.dopo(p, parti); }
  }
  pose({});
  return { group: root, pose, head: T.head, upper, AL, AR, parti, abito, altezza: 1.78 * k };
}

// ------------------------------------------------------------------ TU, il testimone
export function testimone({ modellato = true } = {}) {
  const C = { skin: '#D9A583', pant: '#27304A', scarpa: '#8E9099', suola: '#7C7E86', maglia: '#A9ADB3', magliaDk: '#8B8F96', capelli: '#2E221B' };
  const F = { S: [0.08, 0.116, 0.096], forma: { jaw: 0.2, jawP: 1.9, cheek: 0.015, chinIn: 0.08 }, skin: C.skin, ombra: '#BF8869', linea: '#8A5743',
    eye: { x: 0.0325, y: 0.006, w: 0.0158, h: 0.0092, hl: 0.0048, tilt: 0.03, ir: 0.0064, iris: '#5E4330', lash: '#2A1C16', lashW: 0.002, open0: 0.84 },
    brow: { dx: 0.001, y: 0.0205, len: 0.037, arch: 0.0032, thick: 0.0062, t0: 1, t1: 0.5, color: '#2E2018' },
    nose: { tipo: 'vero', y: -0.027, w: 0.0118, h: 0.0145, d: 0.0165, ombra: 0.3 },
    mouth: { y: -0.066, w: 0.0225, lip: '#A8695A', lipA: 0.5, line: '#6E3C30', lineW: 0.0014, lipU: 0.001, lipL: 0.0024, pieghe: 0.12 },
    blush: { x: 0.047, y: -0.03, r: 0.024, color: 'rgba(205,115,95,0.16)' }, barba: 'rgba(55,38,28,0.9)', orecchie: { y: -0.012, h: 0.028, w: 0.017 } };
  const magliaT = tex(512, 512, (c, w, h) => { c.fillStyle = C.maglia; c.fillRect(0, 0, w, h); const r = rnd(8); for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '60,62,70'},${r(0.03, 0.09)})`; c.fillRect(r() * w, r() * h, r(2, 7), 1.5); }
    c.fillStyle = 'rgba(0,0,0,0.1)'; c.fillRect(0, h - 22, w, 22); });
  // capelli: lati e nuca corti con la sfumatura, sopra ciuffi in rilievo pettinati di lato (dalla riga a sinistra di chi guarda) con un po' di volume davanti
  const l1 = chiavi([[-3.15, 2.25], [-2.2, 2.2], [-1.85, 1.95], [-1.6, 1.56], [-1.42, 1.76], [-1.2, 1.6], [-0.98, 1.42], [-0.74, 1.02], [-0.45, 0.93], [0, 0.97], [0.45, 0.93], [0.74, 1.02], [0.98, 1.42], [1.2, 1.6], [1.42, 1.76], [1.6, 1.56], [1.85, 1.95], [2.2, 2.2], [3.15, 2.25]]);
  const pettina = (T) => {
    capelli(T, { polo: [0.2, 0.85, -0.5], scala: 1.03, limite: l1, netto: (f) => { const a = Math.abs(f); return a < 1.0 ? 70 : a > 1.5 ? 9 : 70 - 61 * (a - 1.0) / 0.5; }, base: C.capelli, chiaro: '#4A3728', scuro: '#17100C', n: 700, seme: 7 });
    const l2 = chiavi([[0, 0.97], [0.45, 0.93], [0.72, 1.0], [1.0, 1.02], [1.4, 0.98], [1.9, 1.04], [2.5, 1.14], [3.15, 1.2]]);
    chioma(T, { limite: (ph) => l2(Math.abs(ph)), bordo: (ph) => { const a = Math.abs(ph); return a < 0.8 ? 0.05 : a < 1.7 ? 0.1 : 0.2; }, dir: -0.45,
      spessore: (th, ph) => 0.05 + 0.095 * Math.exp(-(((th - 0.72) / 0.36) ** 2)) * Math.exp(-(((ph - 0.18) / 0.8) ** 2)) + 0.02 * Math.exp(-((th / 0.5) ** 2)),
      solchi: { k: 38, amp: 0.014 }, base: C.capelli, chiaro: '#4E3A2B', scuro: '#17100C', n: 260, seme: 9 });
  };
  return uomo({ k: 1, C, F, corpo: modellato ? 'testimone' : null, ombraMento: 0.2,
    polso: 0.0295, polsoZ: 0.0205, torso: mat(0xffffff, { map: magliaT }), manica: mat(C.maglia), manica2: mat(C.skin), gomitoM: mat(C.skin), orlo: mat(C.magliaDk), polsino: null,
    capelli: pettina,
    extra: ({ upper, k, abito }) => { if (abito) return; const cl = add(upper, new THREE.TorusGeometry(0.054 * k, 0.007 * k, 10, 36), mat(C.magliaDk), V(0, 0.463 * k, 0.008)); cl.rotation.x = Math.PI / 2 + 0.2; cl.scale.set(1.08, 1, 1); } });
}

// un fazzoletto di stoffa appallottolato in mano: non una palla liscia, ma pieghe larghe e grinze (la forma si schiaccia poi con la scala)
function stoffaInPugno() {
  const g = new THREE.SphereGeometry(1, 36, 26), p = g.attributes.position, n = V(0, 0, 0);
  for (let i = 0; i < p.count; i++) { n.fromBufferAttribute(p, i).normalize(); const a = Math.atan2(n.z, n.x), b = Math.asin(Math.max(-1, Math.min(1, n.y))), c = Math.cos(b);
    const d = 0.17 * Math.sin(3 * a + 1.3 * Math.sin(2 * b)) * c + 0.09 * Math.sin(7 * a + 4 * b + 0.7) * c + 0.06 * Math.sin(5 * b + 2 * a) * c + 0.05 * Math.sin(11 * a - 3 * b) * c * c;
    p.setXYZ(i, n.x * (1 + d), n.y * (1 + d), n.z * (1 + d)); }
  g.computeVertexNormals(); return g;
}

// ------------------------------------------------------------------ L'ISPETTORE DARIO RIVA
export function ispettore({ guanti = false, modellato = true } = {}) {
  const C = { skin: '#D2A07E', pant: '#22242B', scarpa: '#17171A', suola: '#0D0D0F', cappotto: '#30323A', cappottoDk: '#1E2026', camicia: '#B9C2CC', cravatta: '#141519', oro: '#D2A842' };
  const F = { S: [0.083, 0.12, 0.1], forma: { jaw: 0.14, jawP: 2.2, cheek: 0, chinIn: 0.06 }, skin: C.skin, ombra: '#B58263', linea: '#7E4E3C',
    eye: { x: 0.033, y: 0.008, w: 0.0152, h: 0.0078, hl: 0.0042, tilt: -0.02, ir: 0.006, iris: '#4E6A78', lash: '#241A16', lashW: 0.002, hood: true, borse: true, open0: 0.72 },
    brow: { dx: 0, y: 0.0178, len: 0.038, arch: 0.002, thick: 0.007, t0: 1, t1: 0.55, color: '#4A4540' },
    nose: { tipo: 'vero', y: -0.029, w: 0.0132, h: 0.0168, d: 0.0205, ombra: 0.34 },
    mouth: { y: -0.069, w: 0.024, lip: '#9E6557', lipA: 0.45, line: '#5E332A', lineW: 0.0015, lipU: 0.0008, lipL: 0.002, pieghe: 0.7 },
    blush: { x: 0.048, y: -0.03, r: 0.024, color: 'rgba(190,105,90,0.1)' }, rughe: 0.6, barba: 'rgba(75,70,66,0.9)', orecchie: { y: -0.01, h: 0.03, w: 0.018 },
    graffi: { x: 0.047, y: -0.036, ang: -1.0, len: 0.034 } };
  const cappT = tex(512, 512, (c, w, h) => { c.fillStyle = C.cappotto; c.fillRect(0, 0, w, h);
    c.fillStyle = C.camicia; c.beginPath(); c.moveTo(w / 2 - 66, 0); c.lineTo(w / 2 + 66, 0); c.lineTo(w / 2, 232); c.closePath(); c.fill();
    c.fillStyle = '#E3E8EE'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(w / 2 + s * 4, 0); c.lineTo(w / 2 + s * 44, 0); c.lineTo(w / 2 + s * 30, 52); c.closePath(); c.fill(); }      // colletto
    c.fillStyle = C.cravatta; c.beginPath(); c.moveTo(w / 2 - 13, 26); c.lineTo(w / 2 + 13, 26); c.lineTo(w / 2 + 9, 44); c.lineTo(w / 2 + 12, 196); c.lineTo(w / 2, 222); c.lineTo(w / 2 - 12, 196); c.lineTo(w / 2 - 9, 44); c.closePath(); c.fill();
    c.strokeStyle = C.cappottoDk; c.lineWidth = 16; c.lineJoin = 'round'; c.beginPath(); c.moveTo(w / 2 - 70, 0); c.lineTo(w / 2, 236); c.lineTo(w / 2 + 70, 0); c.stroke();        // revers
    c.lineWidth = 5; c.beginPath(); c.moveTo(w / 2 - 4, 236); c.lineTo(w / 2 - 4, h); c.stroke();
    c.fillStyle = '#0F1013'; for (const y of [282, 372]) { c.beginPath(); c.arc(w / 2 + 16, y, 8, 0, 7); c.fill(); }
    c.lineWidth = 4; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(w / 2 + s * 44, 420); c.lineTo(w / 2 + s * 96, 412); c.stroke(); } });
  const capM = mat(C.cappotto), capD = mat(C.cappottoDk);
  const lim = chiavi([[0, 0.82], [0.25, 0.76], [0.52, 0.6], [0.78, 0.84], [1.0, 1.36], [1.2, 1.56], [1.42, 1.7], [1.6, 1.5], [1.85, 1.95], [2.2, 2.2], [3.15, 2.22]]);
  return uomo({ k: 1.05, largo: 1.06, C, F, corpo: modellato ? 'ispettore' : null, torso: mat(0xffffff, { map: cappT }), manica: capM, manica2: capM, polsino: capD, cappotto: mat(C.cappotto, { side: THREE.DoubleSide }), guanti: guanti ? '#17171A' : null,
    capelli: (T) => capelli(T, { polo: [0.15, 0.85, -0.5], scala: 1.03, limite: (ph) => lim(Math.abs(ph)), base: '#6E6C69', chiaro: '#A9A6A1', scuro: '#3B3A38', n: 760, seme: 15 }),
    extra: ({ upper, AL, AR, k, abito }) => {
      // colletto del cappotto alzato dietro al collo
      if (!abito) add(upper, loft([{ y: 0.43 * k, rx: 0.12 * k, rz: 0.1 * k }, { y: 0.5 * k, rx: 0.085 * k, rz: 0.088 * k }], 20, { a0: 1.9, a1: Math.PI * 2 - 1.9 }), mat(C.cappottoDk, { side: THREE.DoubleSide }));
      // distintivo in un portafoglio di pelle (di base nascosto): sta davanti alle dita, il pollice lo ferma sul davanti (posa della mano «tessera»)
      const d = new THREE.Group(); d.visible = false; AL.gH.add(d);
      if (abito) { const di = new THREE.Group(); di.position.set(0, 0.1425, 0.02); d.add(di); d.userData.dentro = di; }      // con la mano modellata il portafoglio si appoggia alle dita (vedi dopo)
      const dd = d.userData.dentro || d;
      add(dd, new THREE.BoxGeometry(0.084, 0.125, 0.008), mat('#3A2416'), V(0, -0.1425, -0.02));
      const sc = add(dd, new THREE.PlaneGeometry(0.062, 0.078), mat(0xffffff, { map: tex(128, 160, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = C.oro; c.beginPath(); c.moveTo(64, 8); c.lineTo(112, 26); c.lineTo(108, 92); c.quadraticCurveTo(100, 136, 64, 154); c.quadraticCurveTo(28, 136, 20, 92); c.lineTo(16, 26); c.closePath(); c.fill();
        c.strokeStyle = '#8A6A1E'; c.lineWidth = 5; c.stroke(); c.fillStyle = '#8A6A1E'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 11 : 26; c.lineTo(64 + Math.cos(a) * rr, 72 + Math.sin(a) * rr); } c.closePath(); c.fill();
        c.fillStyle = '#5E4712'; c.font = '700 15px Display'; c.textAlign = 'center'; c.fillText('POLIZIA', 64, 124); }), transparent: true }), V(0, -0.152, -0.0245)); sc.rotation.set(0, Math.PI, Math.PI);
      upper.userData.distintivo = d;
      if (abito) oggettoInMano(AL, { g: d, varianti: { base: { posa: 'tessera', spessore: 0.004, verso: 0.0, inclina: 0.1 } } });      // la mano modellata tiene il portafoglio: dita dietro, pollice davanti
      // nell'altra mano: il fazzoletto bianco, la radio, il bagliore di una lama (solo un luccichio: la violenza resta lontana)
      const fz = add(AR.gH, stoffaInPugno(), mat('#F3F1EA'), V(0, -0.085, -0.035), [0.064, 0.078, 0.034]); fz.visible = false;
      const rd = new THREE.Group(); rd.visible = false; AR.gH.add(rd);
      add(rd, new THREE.BoxGeometry(0.062, 0.13, 0.034), mat('#3B3F47'), V(0, -0.125, -0.04)); add(rd, new THREE.CylinderGeometry(0.006, 0.006, 0.1, 8), mat('#16181C'), V(0.02, -0.235, -0.04)); add(rd, sfera(0.008, 8), basic('#FF3B30'), V(-0.018, -0.175, -0.058));
      const lama = new THREE.Sprite(new THREE.SpriteMaterial({ map: alone(), color: '#FFFFFF', transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })); lama.position.set(0, -0.2, -0.03); lama.scale.set(0.42, 0.42, 1); lama.visible = false; AR.gH.add(lama);
      Object.assign(upper.userData, { fazzoletto: fz, radio: rd, lama });
    },
    posa: (p, { upper }) => { const u = upper.userData; u.distintivo.visible = !!p.distintivo; u.fazzoletto.visible = !!p.fazzoletto; u.radio.visible = !!p.radio; u.lama.visible = (p.lama || 0) > 0.01; u.lama.material.opacity = M.clamp(p.lama || 0); } });
}

// ------------------------------------------------------------------ ELENA MARCHI (si vede solo da lontano, nel parcheggio): cappotto rosso, capelli lunghi, borsa a tracolla
export function elena({ modellato = true } = {}) {
  const C = { skin: '#E3B596', pant: '#1E1F26', scarpa: '#16161A', suola: '#0C0C0E', cappotto: '#B5252C', cappottoDk: '#861A20', capelli: '#5E3F26' };
  const F = { S: [0.076, 0.11, 0.092], forma: { jaw: 0.3, jawP: 1.7, cheek: 0.02, chinIn: 0.1 }, skin: C.skin, ombra: '#C99072', linea: '#96604C',
    eye: { x: 0.031, y: 0.004, w: 0.0165, h: 0.0105, hl: 0.005, tilt: 0.06, ir: 0.0068, iris: '#5A4632', lash: '#221612', lashW: 0.0024, ala: true, open0: 0.9 },
    brow: { dx: 0.001, y: 0.021, len: 0.034, arch: 0.004, thick: 0.004, t0: 1, t1: 0.45, color: '#4E3520' },
    nose: { tipo: 'vero', y: -0.027, w: 0.0098, h: 0.0125, d: 0.013, ombra: 0.25 },
    mouth: { y: -0.062, w: 0.02, lip: '#B8545A', lipA: 0.85, line: '#7A3036', lineW: 0.0013, lipU: 0.002, lipL: 0.0034 },
    blush: { x: 0.045, y: -0.03, r: 0.024, color: 'rgba(225,120,110,0.28)' }, orecchie: { y: -0.012, h: 0.024, w: 0.014 } };
  const capT = tex(512, 512, (c, w, h) => { c.fillStyle = C.cappotto; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2A2B31'; c.beginPath(); c.moveTo(w / 2 - 44, 0); c.lineTo(w / 2 + 44, 0); c.lineTo(w / 2, 150); c.closePath(); c.fill();                 // maglia scura sotto
    c.strokeStyle = C.cappottoDk; c.lineWidth = 15; c.lineJoin = 'round'; c.beginPath(); c.moveTo(w / 2 - 52, 0); c.lineTo(w / 2, 158); c.lineTo(w / 2 + 52, 0); c.stroke();
    c.lineWidth = 5; c.beginPath(); c.moveTo(w / 2 + 4, 158); c.lineTo(w / 2 + 4, h); c.stroke(); c.fillStyle = C.cappottoDk; c.fillRect(0, 372, w, 26);    // cintura
    c.fillStyle = '#3A0D10'; for (const y of [210, 300]) { c.beginPath(); c.arc(w / 2 - 14, y, 7, 0, 7); c.fill(); } });
  const capM = mat(C.cappotto), capD = mat(C.cappottoDk), hairM = mat(C.capelli);
  const lim = chiavi([[0, 0.98], [0.5, 0.96], [0.8, 1.2], [1.05, 1.95], [1.4, 2.35], [3.15, 2.55]]);
  return uomo({ k: 0.93, largo: 0.84, C, F, corpo: modellato ? 'elena' : null, torso: mat(0xffffff, { map: capT }), manica: capM, manica2: capM, polsino: capD, cappotto: mat(C.cappotto, { side: THREE.DoubleSide }),
    capelli: (T) => { capelli(T, { polo: [-0.2, 0.9, -0.4], scala: 1.05, limite: (ph) => lim(Math.abs(ph)), base: C.capelli, chiaro: '#8A6240', scuro: '#3A2616', n: 700, seme: 31 });
      add(T.head, sfera(1, 22), hairM, V(0, -0.085, -0.05), [0.086, 0.16, 0.058]); },
    extra: ({ upper, k, abito }) => { if (abito) return; const bg = mat('#3B2A1E');      // col corpo modellato la borsa a tracolla è una parte del modello (corpi/converti_corpo.py, tracolla)
      add(upper, new THREE.BoxGeometry(0.06, 0.2, 0.26), bg, V(-0.21 * k, -0.12 * k, 0.02)); tra(upper, V(-0.2 * k, -0.02 * k, 0.03), V(0.14 * k, 0.4 * k, 0.05), 0.008, 0.008, bg); } });
}

// ------------------------------------------------------------------ LA SIGNORA ADA (interno 11, la porta di fronte alla tua): ottant'anni, vestaglia trapuntata
// color malva, capelli bianchi raccolti in una crocchia, occhiali di metallo sottile. Il corpo modellato è quello di Elena (corpi/elena), con la vestaglia
// ridipinta dalla stessa texture (cuciture e tasche restano, sopra le trapuntature), le pantofole al posto delle scarpe, senza la borsa.
function ridipingi(file, scuro, chiaro, { trapunta = 0, rif = 0.36 } = {}) {
  const t = texture(file); if (!t || !t.image) return null;
  const im = t.image, cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const c = cv.getContext('2d'); c.drawImage(im, 0, 0);
  const d = c.getImageData(0, 0, cv.width, cv.height), a = new THREE.Color(scuro), b = new THREE.Color(chiaro), q = new THREE.Color();
  for (let i = 0; i < d.data.length; i += 4) { const L = (0.3 * d.data[i] + 0.59 * d.data[i + 1] + 0.11 * d.data[i + 2]) / 255; q.copy(a).lerp(b, M.clamp(L / rif * 0.75)); d.data[i] = q.r * 255; d.data[i + 1] = q.g * 255; d.data[i + 2] = q.b * 255; }
  c.putImageData(d, 0, 0);
  if (trapunta) { const p = trapunta; c.lineWidth = 2; for (let k = -cv.height; k < cv.width + cv.height; k += p) { for (const [s, col] of [[1, 'rgba(60,40,50,0.28)'], [-1, 'rgba(60,40,50,0.28)']]) { c.strokeStyle = col; c.beginPath(); c.moveTo(k, 0); c.lineTo(k + s * cv.height, cv.height); c.stroke(); } }
    c.fillStyle = 'rgba(255,240,245,0.35)'; for (let x = 0; x < cv.width; x += p) for (let y = 0; y < cv.height; y += p) { c.beginPath(); c.arc(x + p / 2, y, 1.6, 0, 7); c.fill(); } }
  const nt = new THREE.CanvasTexture(cv); nt.colorSpace = THREE.SRGBColorSpace; nt.anisotropy = 8; nt.flipY = t.flipY; return new THREE.MeshLambertMaterial({ map: nt, side: THREE.DoubleSide });
}
// gli occhiali: due montature di filo (un tubo lungo un rettangolo arrotondato), il ponte, le aste fino alle orecchie e le lenti appena visibili
function occhiali(head, F) {
  const g = new THREE.Group(), filo = new THREE.MeshPhongMaterial({ color: '#B8A78A', specular: '#FFF4DC', shininess: 70 }), e = F.eye, z = F.S[2] * 1.02, y = e.y - 0.0015;
  const rett = (cx) => { const P = []; for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), ex = 2 / 5; P.push(V(cx + 0.0205 * Math.sign(c) * Math.abs(c) ** ex, y + 0.0145 * Math.sign(s) * Math.abs(s) ** ex, z - 0.006 * Math.abs(cx + 0.0205 * c) / 0.06)); } return new THREE.CatmullRomCurve3(P, true); };
  for (const s of [-1, 1]) { const cv = rett(s * e.x); add(g, new THREE.TubeGeometry(cv, 64, 0.0011, 6, true), filo);
    const l = add(g, new THREE.CircleGeometry(1, 24), new THREE.MeshPhongMaterial({ color: '#DDE6F0', specular: '#FFFFFF', shininess: 120, transparent: true, opacity: 0.12, depthWrite: false }), V(s * e.x, y, z - 0.003), [0.02, 0.0138, 1]);
    tra(g, V(s * (e.x + 0.0205), y + 0.006, z - 0.006), V(s * 0.071, y + 0.004, -0.004), 0.0009, 0.0009, filo); }
  tra(g, V(-e.x + 0.0205 - 0.0005, y + 0.004, z), V(e.x - 0.0205 + 0.0005, y + 0.004, z), 0.0010, 0.0010, filo);
  head.add(g); return g;
}
// la crocchia: una treccia avvolta a spirale (un tubo che gira su se stesso stringendosi), con le ciocche disegnate lungo il tubo
function crocchia(head, colore) {
  const P = []; for (let i = 0; i <= 120; i++) { const u = i / 120, a = u * Math.PI * 2 * 2.6, r = 0.034 * (1 - 0.72 * u); P.push(V(Math.cos(a) * r, Math.sin(a) * r, 0.012 * u)); }
  const t = tex(512, 64, (c, w, h) => { c.fillStyle = colore; c.fillRect(0, 0, w, h); const q = rnd(17); for (let i = 0; i < 260; i++) { c.strokeStyle = q() < 0.5 ? 'rgba(255,252,246,0.55)' : 'rgba(120,114,106,0.45)'; c.lineWidth = q(0.8, 2); const y = q() * h; c.beginPath(); c.moveTo(q() * w, y); c.lineTo(q() * w + q(40, 160), y + q(-6, 6)); c.stroke(); } });
  const g = new THREE.Group(); g.position.set(0, 0.062, -0.072); g.rotation.set(-0.95, 0, 0.2); head.add(g);
  add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), 160, 0.0135, 10, false), new THREE.MeshLambertMaterial({ map: t }));
  add(g, sfera(0.009, 12), new THREE.MeshLambertMaterial({ color: colore }), V(0, 0, 0.012)); return g;
}
export function ada({ modellato = true } = {}) {
  const C = { skin: '#E1B9A2', pant: '#6E5A66', scarpa: '#B99A9E', suola: '#8E7478', capelli: '#D3CEC5', unghie: '#EBD3C6' };
  const F = { S: [0.074, 0.104, 0.09], forma: { jaw: 0.36, jawP: 1.6, cheek: 0.035, chinIn: 0.12 }, skin: C.skin, ombra: '#C79A84', linea: '#9C705E',
    eye: { x: 0.0305, y: 0.006, w: 0.0142, h: 0.0084, hl: 0.0044, tilt: -0.05, ir: 0.0058, iris: '#6E7E8A', lash: '#6A5A50', lashW: 0.0012, hood: true, borse: true, open0: 0.76 },
    brow: { dx: 0.001, y: 0.0205, len: 0.031, arch: 0.0045, thick: 0.0034, t0: 1, t1: 0.4, color: '#BDB5AA' },
    nose: { tipo: 'vero', y: -0.026, w: 0.0116, h: 0.0148, d: 0.0165, ombra: 0.28 },
    mouth: { y: -0.064, w: 0.0192, lip: '#B47E78', lipA: 0.35, line: '#7E5048', lineW: 0.0013, lipU: 0.0006, lipL: 0.0014, pieghe: 0.95 },
    blush: { x: 0.045, y: -0.028, r: 0.025, color: 'rgba(215,125,115,0.24)' }, rughe: 1.15, orecchie: { y: -0.012, h: 0.027, w: 0.016 } };
  const vest = modellato ? ridipingi('elena_male_elegantsuit01.png', '#5E4352', '#D9BFCB', { trapunta: 26 }) : null, pant = modellato ? ridipingi('elena_shoes03.png', '#8E6E74', '#E6CBCB') : null;
  const materiali = modellato ? { ...(vest ? { vestito: vest } : {}), ...(pant ? { scarpa: pant } : {}), borsa: new THREE.MeshBasicMaterial({ visible: false }) } : {};
  const vm = mat('#B58FA2'), lim = chiavi([[0, 0.94], [0.5, 0.92], [0.85, 1.12], [1.1, 1.5], [1.45, 1.62], [2.2, 1.7], [3.15, 1.76]]);
  return uomo({ k: 0.87, largo: 0.88, C, F, corpo: modellato ? 'elena' : null, materiali, torso: vm, manica: vm, manica2: vm, polsino: vm, cappotto: mat('#B58FA2', { side: THREE.DoubleSide }),
    capelli: (T) => { capelli(T, { polo: [0, 0.92, -0.38], scala: 1.04, limite: (ph) => lim(Math.abs(ph)), base: C.capelli, chiaro: '#F3EFEA', scuro: '#9E978E', n: 900, seme: 43 }); crocchia(T.head, C.capelli); occhiali(T.head, F); } });
}

// il telefono in mano (schermo acceso verso chi lo tiene): torna { g, schermo }
export function telefono(P, lato = 'AR', colore = '#BFD6FF', dy = 0) {
  const A = P[lato], g = new THREE.Group(); A.gH.add(g); let d = g, gp = null, gr = null;
  // Con la mano modellata il telefono si appoggia alle dita (dal lato del palmo) col pollice sullo schermo. Le scene continuano a comandare g
  // (acceso/spento, girato di traverso per filmare), ma le posizioni che gli danno erano per la mano a pezzi: g resta fermo e il posto lo decide la presa.
  if (A.manoMesh) { g.matrixAutoUpdate = false; gp = new THREE.Group(); gr = new THREE.Group(); d = new THREE.Group(); g.add(gp); gp.add(gr); gr.add(d); d.position.set(0, 0.085 - dy, 0.03); }
  add(d, new THREE.BoxGeometry(0.072, 0.148, 0.009), mat('#15171B'), V(0, -0.085 + dy, -0.03));
  const schermo = add(d, new THREE.PlaneGeometry(0.064, 0.136), basic(colore), V(0, -0.085 + dy, -0.0352)); schermo.rotation.y = Math.PI;
  add(d, new THREE.CircleGeometry(0.011, 16), basic('#2C3038'), V(-0.018, -0.135 + dy, -0.0252)); add(d, new THREE.CircleGeometry(0.006, 12), basic('#0A0B0E'), V(-0.018, -0.135 + dy, -0.0251));   // l'obiettivo sul retro
  // tre prese: dritto (in mano, per guardarlo), traverso (la scena lo gira per filmare), orecchio (posa della mano «orecchio»: la telefonata)
  // (traverso: le punte delle dita agganciano il bordo lontano, «aggancia»; orecchio: il pollice si chiude lungo il bordo lungo, «bordo»)
  if (A.manoMesh) oggettoInMano(A, { g, gp, gr, scegli: () => (A.posaMano === 'orecchio' ? 'orecchio' : Math.abs(g.rotation.z) > 0.1 ? 'traverso' : 'dritto'), varianti: {
    dritto: { posa: 'telefono', spessore: 0.0045, largo: 0.072, alto: 0.148, verso: 0.012, dove: 0.3, inclina: 0.2 },
    traverso: { posa: 'filma', spessore: 0.0045, largo: 0.148, alto: 0.072, verso: -0.005, dove: 0.15, inclina: 0.04, lato: -0.028, rz: Math.PI / 2, aggancia: 72 },
    orecchio: { posa: 'orecchio', spessore: 0.0045, largo: 0.072, alto: 0.148, verso: 0.03, inclina: 0.1, bordo: 1 } } });
  return { g, schermo };
}
