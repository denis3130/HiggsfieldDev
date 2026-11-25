// Personaggi «adulti» (variante più realistica dello stile vettoriale 3D): teste piccole (un corpo di 7 teste e mezza),
// spalle e proporzioni vere, facce meno da cartone (occhi più piccoli, naso lungo, mascella definita).
// Per «Il testimone»: testimone() = tu, ispettore() = l'ispettore Dario Riva (cappotto, cravatta, graffi sulla guancia, distintivo).
// Stesse pose degli altri personaggi: pos, yaw, lean, twist, breathe, headYaw/Pitch/Roll, armL/armR, sit, gambe + espressione.
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
import { THREE, V, rnd, tex, mat, piatto as basic, sfera, add, loft, tra, ombre } from './stile.js';
import { testa, capelli, braccio, gamba, chiavi, mix } from './pupazzi.js';

function braccia(upper, AL, AR, p) {
  for (const [A, q] of [[AL, p.armL], [AR, p.armR]]) {
    if (q && q.mondo) { const v = upper.worldToLocal(V(...q.mondo)); A.a({ ...q, a: [v.x, v.y, v.z] }); } else A.a(q || {});
  }
}

// o: { k (statura: 1 = 1,78 m), largo (spalle), C (colori), F (faccia), torso (materiale), manica, manica2, polsino, capelli(T), extra(parti), cappotto, mano }
function uomo(o) {
  const k = o.k || 1, L = o.largo || 1, C = o.C, root = new THREE.Group();
  const skinM = mat(C.skin), nailM = mat(C.unghie || '#EBC6B3'), pantM = mat(C.pant);
  const fianchi = new THREE.Group(); root.add(fianchi);
  add(fianchi, loft([{ y: 0.8 * k, rx: 0.1 * k, rz: 0.09 * k }, { y: 0.87 * k, rx: 0.165 * k, rz: 0.115 * k }, { y: 0.96 * k, rx: 0.172 * k, rz: 0.118 * k }, { y: 1.07 * k, rx: 0.165 * k, rz: 0.112 * k }], 40), pantM);
  const go = { hx: 0.09 * k, hy: 0.93 * k, T1: 0.43 * k, T2: 0.42 * k, r0: 0.085 * k, r1: 0.062 * k, r2: 0.046 * k, mat: pantM, scarpa: mat(C.scarpa), suola: mat(C.suola), piede: k };
  const GL = gamba(fianchi, -1, go), GR = gamba(fianchi, 1, go);
  const upper = new THREE.Group(); upper.position.y = 1.05 * k; fianchi.add(upper);
  const sec = [[-0.1, 0.178, 0.124, 0.124, 2], [0.05, 0.167, 0.112, 0.112, 2], [0.2, 0.185 * L, 0.125, 0.118, 2.2], [0.33, 0.21 * L, 0.13, 0.12, 2.4], [0.405, 0.218 * L, 0.115, 0.115, 2.8], [0.44, 0.16 * L, 0.1, 0.1, 2], [0.462, 0.075, 0.075, 0.075, 2], [0.47, 0.055, 0.06, 0.06, 2]];
  add(upper, loft(sec.map(([y, rx, rzf, rzb, n]) => ({ y: y * k, rx: rx * k, rzf: rzf * k, rzb: rzb * k, n })), 64), o.torso);
  if (o.cappotto) add(upper, loft([{ y: -0.52 * k, rx: 0.205 * k, rz: 0.155 * k, pieghe: 0.012, nPieghe: 6 }, { y: -0.3 * k, rx: 0.192 * k, rz: 0.142 * k }, { y: -0.07 * k, rx: 0.172 * k, rz: 0.119 * k }], 48), o.cappotto);
  tra(upper, V(0, 0.455 * k, 0.004), V(0, 0.54 * k, 0.012), 0.052 * k, 0.048 * k, mat(mix(C.skin, '#8E553F', 0.22)));
  const collo = new THREE.Group(); collo.position.set(0, 0.505 * k, 0.008); upper.add(collo);
  const T = testa(o.F); T.head.position.set(0, 0.094 * k, 0.012); T.head.scale.setScalar(k * (o.testa || 1)); collo.add(T.head);
  if (o.capelli) o.capelli(T);
  const bo = { sx: 0.196 * L * k, sy: 0.356 * k, L1: 0.3 * k, L2: 0.265 * k, r0: 0.054 * k, r1: 0.045 * k, r2: 0.037 * k, manica: o.manica, manica2: o.manica2, polsino: o.polsino, skin: o.guanti ? mat(o.guanti) : skinM, nail: o.guanti ? mat(o.guanti) : nailM, mano: 1.05 * k };
  const AL = braccio(upper, -1, bo), AR = braccio(upper, 1, bo);
  const parti = { root, fianchi, upper, collo, T, AL, AR, k };
  if (o.extra) o.extra(parti);
  ombre(root);
  function pose(p = {}) {
    const br = p.breathe ?? 0, sit = M.clamp(p.sit || 0);
    upper.rotation.set(p.lean || 0, p.twist || 0, p.side || 0);
    upper.scale.set(1 + 0.007 * br, 1 + 0.004 * br, 1 + 0.011 * br);
    collo.rotation.set(p.headPitch || 0, p.headYaw || 0, p.headRoll || 0);
    T.face(p);
    const g = p.gambe || {};
    GL.set({ avanti: 1.5 * sit + (g.aL || 0), ginocchio: 1.5 * sit + (g.gL || 0), apri: 0.05 * sit });
    GR.set({ avanti: 1.5 * sit + (g.aR || 0), ginocchio: 1.5 * sit + (g.gR || 0), apri: 0.05 * sit });
    const pos = p.pos || [0, 0, 0];
    root.position.set(pos[0], pos[1] - sit * (0.93 * k - (p.sedile ?? 0.46) - 0.085), pos[2]); root.rotation.y = p.yaw || 0; root.updateMatrixWorld(true);
    braccia(upper, AL, AR, p);
    if (o.posa) o.posa(p, parti);
  }
  pose({});
  return { group: root, pose, head: T.head, upper, AL, AR, parti, altezza: 1.78 * k };
}

// ------------------------------------------------------------------ TU, il testimone
export function testimone() {
  const C = { skin: '#D9A583', pant: '#27304A', scarpa: '#8E9099', suola: '#7C7E86', maglia: '#A9ADB3', magliaDk: '#8B8F96', capelli: '#2E221B' };
  const F = { S: [0.08, 0.116, 0.096], forma: { jaw: 0.2, jawP: 1.9, cheek: 0.015, chinIn: 0.08 }, skin: C.skin, ombra: '#BF8869', linea: '#8A5743',
    eye: { x: 0.0325, y: 0.006, w: 0.0158, h: 0.0092, hl: 0.0048, tilt: 0.03, ir: 0.0064, iris: '#5E4330', lash: '#2A1C16', lashW: 0.002, open0: 0.84 },
    brow: { dx: 0.001, y: 0.0205, len: 0.037, arch: 0.0032, thick: 0.0062, t0: 1, t1: 0.5, color: '#2E2018' },
    nose: { tipo: 'vero', y: -0.027, w: 0.0118, h: 0.0145, d: 0.0165, ombra: 0.3 },
    mouth: { y: -0.066, w: 0.0225, lip: '#A8695A', lipA: 0.5, line: '#6E3C30', lineW: 0.0014, lipU: 0.001, lipL: 0.0024, pieghe: 0.12 },
    blush: { x: 0.047, y: -0.03, r: 0.024, color: 'rgba(205,115,95,0.16)' }, barba: 'rgba(55,38,28,0.9)', orecchie: { y: -0.012, h: 0.028, w: 0.017 } };
  const magliaT = tex(512, 512, (c, w, h) => { c.fillStyle = C.maglia; c.fillRect(0, 0, w, h); const r = rnd(8); for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '60,62,70'},${r(0.03, 0.09)})`; c.fillRect(r() * w, r() * h, r(2, 7), 1.5); }
    c.fillStyle = 'rgba(0,0,0,0.1)'; c.fillRect(0, h - 22, w, 22); });
  const l1 = chiavi([[-3.15, 2.25], [-2.2, 2.2], [-1.85, 1.95], [-1.6, 1.56], [-1.42, 1.76], [-1.2, 1.6], [-0.98, 1.42], [-0.72, 1.04], [-0.4, 0.95], [0, 0.94], [0.4, 0.98], [0.72, 1.06], [0.98, 1.42], [1.2, 1.6], [1.42, 1.76], [1.6, 1.56], [1.85, 1.95], [2.2, 2.2], [3.15, 2.25]]);
  const l2 = chiavi([[-3.15, 1.0], [-1.7, 0.9], [-1.2, 0.96], [-0.8, 0.98], [-0.35, 1.06], [0.1, 1.1], [0.45, 1.04], [0.75, 1.0], [1.1, 0.94], [1.7, 0.88], [3.15, 1.0]]);
  return uomo({ k: 1, C, F, torso: mat(0xffffff, { map: magliaT }), manica: mat(C.maglia), manica2: mat(C.skin), polsino: null,
    capelli: (T) => { capelli(T, { polo: [0.25, 0.8, -0.55], scala: 1.035, limite: l1, base: C.capelli, chiaro: '#55402F', scuro: '#17100C', n: 700, seme: 7 });
      capelli(T, { polo: [0.3, 0.75, -0.6], scala: 1.1, sy: 1.03, limite: (ph) => l2(ph) + 0.05 * Math.sin(ph * 6.3 + 0.5) + 0.035 * Math.sin(ph * 13 + 2), base: '#34271F', chiaro: '#5E4737', scuro: '#1B130E', n: 560, seme: 9, ordine: 3 }); },
    extra: ({ upper, k }) => { const cl = add(upper, new THREE.TorusGeometry(0.054 * k, 0.007 * k, 10, 36), mat(C.magliaDk), V(0, 0.463 * k, 0.008)); cl.rotation.x = Math.PI / 2 + 0.2; cl.scale.set(1.08, 1, 1); } });
}

// ------------------------------------------------------------------ L'ISPETTORE DARIO RIVA
export function ispettore({ guanti = false } = {}) {
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
  return uomo({ k: 1.05, largo: 1.06, C, F, torso: mat(0xffffff, { map: cappT }), manica: capM, manica2: capM, polsino: capD, cappotto: mat(C.cappotto, { side: THREE.DoubleSide }), guanti: guanti ? '#17171A' : null,
    capelli: (T) => capelli(T, { polo: [0.15, 0.85, -0.5], scala: 1.03, limite: (ph) => lim(Math.abs(ph)), base: '#6E6C69', chiaro: '#A9A6A1', scuro: '#3B3A38', n: 760, seme: 15 }),
    extra: ({ upper, AL, k }) => {
      // colletto del cappotto alzato dietro al collo
      add(upper, loft([{ y: 0.43 * k, rx: 0.12 * k, rz: 0.1 * k }, { y: 0.5 * k, rx: 0.085 * k, rz: 0.088 * k }], 20, { a0: 1.9, a1: Math.PI * 2 - 1.9 }), mat(C.cappottoDk, { side: THREE.DoubleSide }));
      // distintivo in un portafoglio di pelle, nella mano (di base nascosto)
      const d = new THREE.Group(); d.visible = false; AL.gH.add(d);
      add(d, new THREE.BoxGeometry(0.075, 0.105, 0.008), mat('#3A2416'), V(0, -0.075, -0.03));
      const sc = add(d, new THREE.PlaneGeometry(0.062, 0.078), mat(0xffffff, { map: tex(128, 160, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = C.oro; c.beginPath(); c.moveTo(64, 8); c.lineTo(112, 26); c.lineTo(108, 92); c.quadraticCurveTo(100, 136, 64, 154); c.quadraticCurveTo(28, 136, 20, 92); c.lineTo(16, 26); c.closePath(); c.fill();
        c.strokeStyle = '#8A6A1E'; c.lineWidth = 5; c.stroke(); c.fillStyle = '#8A6A1E'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 11 : 26; c.lineTo(64 + Math.cos(a) * rr, 72 + Math.sin(a) * rr); } c.closePath(); c.fill();
        c.fillStyle = '#5E4712'; c.font = '700 15px Display'; c.textAlign = 'center'; c.fillText('POLIZIA', 64, 124); }), transparent: true }), V(0, -0.075, -0.0345)); sc.rotation.set(0, Math.PI, Math.PI);
      upper.userData.distintivo = d;
    },
    posa: (p, { upper }) => { upper.userData.distintivo.visible = !!p.distintivo; } });
}
