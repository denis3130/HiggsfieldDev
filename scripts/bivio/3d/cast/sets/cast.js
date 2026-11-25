// Il cast de «La nonna» (versione 3): la nonna, tu (il nipote), Sara (la cugina).
// Ognuno: { group, pose(p), head, AL, AR } con pose(p) funzione pura dei parametri:
//   pos, yaw, lean, twist, breathe, headYaw/headPitch/headRoll, mani ('giunte' | 'lungo'), armL/armR ({ a:[x,y,z], gomito, dorso, dita, mano }),
//   sit, gambe, e l'espressione: open, blink, smile, grin, fear, angry, sad, gazeX, gazeY, browUp, mouth, wide, round.
// Le coordinate delle braccia sono nel busto del personaggio (x verso la sua sinistra = destra dello schermo, y in su dalla vita, z in avanti).
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
import { THREE, V, rnd, tex, mat, piatto, sfera, add, loft, segmento, tra, ombre } from './stile.js';
import { testa, capelli, ciocche, braccio, gamba, chiavi, mix } from './pupazzi.js';

const maglia = (base, righe = 64, scuro = 'rgba(0,0,0,0.08)', chiaro = 'rgba(255,255,255,0.06)', extra = null) => tex(512, 512, (c, w, h) => {
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  for (let i = 0; i < righe; i++) { c.fillStyle = i % 2 ? scuro : chiaro; c.fillRect((i * w) / righe, 0, w / righe / 2, h); }
  if (extra) extra(c, w, h);
});
function fiori(c, w, h, n, r, colori = ['#B8545C', '#5F86B0', '#D9A441']) {
  for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h, s = r(0.8, 1.25), col = colori[i % colori.length];
    c.fillStyle = '#6E8F5A'; for (const a of [0.6, 2.6]) { c.beginPath(); c.ellipse(x + Math.cos(a) * 9 * s, y + Math.sin(a) * 9 * s, 6 * s, 2.6 * s, a, 0, 7); c.fill(); }
    c.fillStyle = col; for (let p = 0; p < 5; p++) { const a = (p / 5) * 6.283 + i; c.beginPath(); c.arc(x + Math.cos(a) * 5 * s, y + Math.sin(a) * 5 * s, 3.6 * s, 0, 7); c.fill(); }
    c.fillStyle = '#F5E3A0'; c.beginPath(); c.arc(x, y, 2.4 * s, 0, 7); c.fill(); }
}
const cucito = (c, pts, col = 'rgba(120,95,70,0.75)') => { c.setLineDash([9, 7]); c.strokeStyle = col; c.lineWidth = 2.2; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.setLineDash([]); };

// braccia: { a:[x,y,z] nel busto } oppure { mondo:[x,y,z] } (punto della scena); senza niente pendono lungo i fianchi
function braccia(upper, AL, AR, p) {
  for (const [A, q] of [[AL, p.armL], [AR, p.armR]]) {
    if (q && q.mondo) { const v = upper.worldToLocal(V(...q.mondo)); A.a({ ...q, a: [v.x, v.y, v.z] }); } else A.a(q || {});
  }
}
// mani giunte in grembo (la posa di riposo della nonna)
export const GIUNTE = { R: { a: [0.03, 0.03, 0.2], gomito: [1, -0.5, -0.2], dita: [-0.92, -0.35, 0.12], dorso: [0.1, 0.25, 1], mano: 'presa' }, L: { a: [-0.028, 0.046, 0.214], gomito: [-1, -0.5, -0.2], dita: [0.92, -0.35, 0.12], dorso: [-0.1, 0.25, 1], mano: 'presa' } };

// ------------------------------------------------------------------ LA NONNA
export function nonna3() {
  const root = new THREE.Group(), r = rnd(5);
  const C = { skin: '#EFC4A8', card: '#8E7CB6', cardDk: '#6E5C97', dress: '#262C46', apron: '#F0E7D4', apronDk: '#D9CDB4', calze: '#3A3442', slip: '#7C2733', oro: '#C9A247', pizzo: '#F6F1E6' };
  const skinM = mat(C.skin), nailM = mat('#F8DDD2');
  const F = { S: [0.097, 0.122, 0.107], forma: { jaw: 0.3, cheek: 0.055 }, skin: C.skin, ombra: '#D9A083', linea: '#A66A55',
    eye: { x: 0.0365, y: 0.002, w: 0.0195, h: 0.0118, hl: 0.006, tilt: -0.06, ir: 0.0086, iris: '#6C8796', lash: '#5E4138', lashW: 0.0023, hood: true, borse: true, open0: 0.74 },
    brow: { dx: 0.002, y: 0.027, len: 0.04, arch: 0.005, thick: 0.005, t0: 1, t1: 0.6, color: '#AFA9A1' },
    nose: { y: -0.031, w: 0.0115, h: 0.0125, d: 0.013, t: 0.2 },
    mouth: { y: -0.069, w: 0.022, lip: '#B5646A', line: '#7B3C3F', lineW: 0.0016, lipU: 0.0018, lipL: 0.003, pieghe: 0.9 },
    blush: { x: 0.052, y: -0.037, r: 0.03, color: 'rgba(228,118,108,0.5)' }, rughe: 1, orecchie: { y: -0.018 } };
  // tessuti
  const dressT = tex(256, 256, (c, w, h) => { c.fillStyle = C.dress; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(226,220,208,0.6)'; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.beginPath(); c.arc(x * 32 + (y % 2) * 16 + 8, y * 32 + 8, 2.4, 0, 7); c.fill(); } }, [7, 4]);
  const apronT = tex(512, 640, (c, w, h) => { c.fillStyle = C.apron; c.fillRect(0, 0, w, h); fiori(c, w, h, 46, r);
    cucito(c, [[16, 0], [16, h - 16], [w - 16, h - 16], [w - 16, 0]]);
    c.fillStyle = 'rgba(240,231,212,0.92)'; c.beginPath(); c.roundRect(300, 150, 140, 150, 16); c.fill(); cucito(c, [[300, 150], [300, 300], [440, 300], [440, 150]]); c.strokeStyle = 'rgba(120,95,70,0.75)'; c.lineWidth = 3; c.beginPath(); c.moveTo(300, 152); c.lineTo(440, 152); c.stroke(); });
  const bibT = tex(256, 256, (c, w, h) => { c.fillStyle = C.apron; c.fillRect(0, 0, w, h); fiori(c, w, h, 12, r); cucito(c, [[10, h], [10, 10], [w - 10, 10], [w - 10, h]]); });
  const cardT = maglia(C.card, 72, 'rgba(0,0,0,0.07)', 'rgba(255,255,255,0.06)', (c, w, h) => { c.fillStyle = 'rgba(0,0,0,0.13)'; c.fillRect(0, h - 30, w, 30);
    c.fillStyle = C.dress; c.beginPath(); c.moveTo(w / 2 - 78, 0); c.lineTo(w / 2 + 78, 0); c.lineTo(w / 2, 170); c.closePath(); c.fill(); });
  const cardM = mat(0xffffff, { map: cardT }), manicaM = mat(0xffffff, { map: maglia(C.card, 20) }), cardDkM = mat(C.cardDk);
  // gonna, grembiule, fascia in vita (fermi rispetto ai piedi)
  add(root, loft([{ y: 0.3, rx: 0.255, rz: 0.215, pieghe: 0.03, nPieghe: 16 }, { y: 0.42, rx: 0.25, rz: 0.21, pieghe: 0.022, nPieghe: 16 }, { y: 0.6, rx: 0.232, rz: 0.195, pieghe: 0.01, nPieghe: 16 }, { y: 0.76, rx: 0.208, rz: 0.176 }, { y: 0.88, rx: 0.186, rz: 0.156 }, { y: 0.93, rx: 0.182, rz: 0.152 }], 96), mat(0xffffff, { map: dressT, side: THREE.DoubleSide }));
  add(root, loft([{ y: 0.37, rx: 0.268, rz: 0.228 }, { y: 0.6, rx: 0.246, rz: 0.209 }, { y: 0.76, rx: 0.221, rz: 0.189 }, { y: 0.9, rx: 0.198, rz: 0.168 }], 40, { a0: -1.02, a1: 1.02 }), mat(0xffffff, { map: apronT, side: THREE.DoubleSide }));
  add(root, loft([{ y: 0.872, rx: 0.2, rz: 0.17 }, { y: 0.906, rx: 0.196, rz: 0.166 }], 56), mat(C.apronDk));
  for (const s of [-1, 1]) { tra(root, V(s * 0.078, 0.33, 0), V(s * 0.078, 0.075, 0.004), 0.05, 0.036, mat(C.calze));
    add(root, sfera(1, 20), mat(C.slip), V(s * 0.082, 0.04, 0.05), [0.052, 0.04, 0.108]); add(root, sfera(1, 16), mat('#5A1B25'), V(s * 0.082, 0.014, 0.05), [0.054, 0.014, 0.112]);
    add(root, sfera(0.017, 12), mat('#A8414E'), V(s * 0.082, 0.068, 0.118)); }
  // busto (si piega e respira)
  const upper = new THREE.Group(); upper.position.y = 0.88; root.add(upper);
  add(upper, loft([{ y: -0.03, rx: 0.184, rz: 0.154 }, { y: 0.06, rx: 0.19, rzf: 0.172, rzb: 0.152 }, { y: 0.15, rx: 0.196, rzf: 0.186, rzb: 0.152 }, { y: 0.23, rx: 0.192, rzf: 0.176, rzb: 0.15 }, { y: 0.285, rx: 0.172, rzf: 0.15, rzb: 0.135 }, { y: 0.32, rx: 0.125, rzf: 0.115, rzb: 0.11 }, { y: 0.345, rx: 0.07, rz: 0.075 }, { y: 0.357, rx: 0.046, rz: 0.05 }], 72), cardM);
  const apM = mat(0xffffff, { map: bibT, side: THREE.DoubleSide });
  add(upper, loft([{ y: -0.02, rx: 0.194, rz: 0.164 }, { y: 0.06, rx: 0.2, rz: 0.182 }, { y: 0.15, rx: 0.206, rz: 0.196 }, { y: 0.228, rx: 0.202, rz: 0.186 }], 28, { a0: -0.6, a1: 0.6 }), apM);
  for (const s of [-1, 1]) add(upper, loft([{ y: 0.224, rx: 0.202, rz: 0.186 }, { y: 0.285, rx: 0.181, rz: 0.159 }, { y: 0.32, rx: 0.133, rz: 0.123 }, { y: 0.346, rx: 0.079, rz: 0.084 }], 6, { a0: s > 0 ? 0.36 : -0.6, a1: s > 0 ? 0.6 : -0.36 }), mat(C.apronDk, { side: THREE.DoubleSide }));
  const laceM = mat(C.pizzo);
  const col = add(upper, new THREE.TorusGeometry(0.052, 0.009, 10, 40), laceM, V(0, 0.352, 0.01)); col.rotation.x = Math.PI / 2 + 0.14; col.scale.set(1.1, 1, 0.8);
  for (let i = 0; i < 13; i++) { const a = -1.5 + i * 0.25; add(upper, sfera(0.0068, 10), laceM, V(Math.sin(a) * 0.064, 0.3455 - Math.cos(a) * 0.009, Math.cos(a) * 0.053 + 0.012)); }
  add(upper, sfera(1, 14), mat('#8C2734'), V(0, 0.33, 0.088), [0.011, 0.013, 0.006]); const sp = add(upper, new THREE.TorusGeometry(0.0125, 0.0022, 8, 20), mat(C.oro), V(0, 0.33, 0.089)); sp.scale.set(0.9, 1.08, 1);
  tra(upper, V(0, 0.335, 0.004), V(0, 0.41, 0.012), 0.044, 0.041, mat(mix(C.skin, '#b97a60', 0.18)));
  // testa
  const collo = new THREE.Group(); collo.position.set(0, 0.392, 0.008); upper.add(collo);
  const T = testa(F); T.head.position.set(0, 0.108, 0.014); T.head.scale.setScalar(1.1); collo.add(T.head);
  const lim = chiavi([[0, 0.96], [0.4, 0.98], [0.8, 1.1], [1.1, 1.3], [1.3, 1.55], [1.42, 1.62], [1.52, 1.44], [1.8, 1.42], [2.0, 1.9], [2.5, 2.08], [3.15, 2.12]]);
  capelli(T, { polo: [0, 0.55, -0.83], scala: 1.05, limite: (ph) => lim(Math.abs(ph)), base: '#DDDBD7', chiaro: '#F6F5F2', scuro: '#B4B1AC', n: 640 });
  const hairM = mat(0xffffff, { map: ciocche('#DDDBD7', '#F6F5F2', '#B4B1AC') });
  add(T.head, sfera(0.05, 28), hairM, V(0, 0.082, -0.108), [1.12, 0.95, 1.0]);
  const tor = add(T.head, new THREE.TorusGeometry(0.034, 0.012, 10, 28), hairM, V(0, 0.082, -0.112)); tor.rotation.x = 0.95;
  tra(T.head, V(-0.045, 0.118, -0.108), V(0.04, 0.1, -0.1), 0.0026, 0.0026, mat(C.oro));
  // occhiali tondi sottili, con un riflesso sulle lenti
  const oroM = mat(C.oro), gx = 0.0365, gy = -0.001, gz = T.zAt(gx, gy) + 0.012;
  const lente = tex(128, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0.16, 'rgba(255,255,255,0)'); g.addColorStop(0.24, 'rgba(255,255,255,0.2)'); g.addColorStop(0.3, 'rgba(255,255,255,0.02)'); g.addColorStop(0.36, 'rgba(255,255,255,0.1)'); g.addColorStop(0.42, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.fill(); });
  for (const s of [-1, 1]) { add(T.head, new THREE.TorusGeometry(0.0262, 0.0017, 8, 48), oroM, V(s * gx, gy, gz));
    const l = add(T.head, new THREE.CircleGeometry(0.0255, 32), new THREE.MeshBasicMaterial({ map: lente, transparent: true, depthWrite: false }), V(s * gx, gy, gz)); l.renderOrder = 4;
    tra(T.head, V(s * (gx + 0.0258), gy + 0.003, gz - 0.001), V(s * 0.096, gy + 0.008, -0.004), 0.0013, 0.0013, oroM); }
  tra(T.head, V(-(gx - 0.0258), gy + 0.003, gz + 0.001), V(gx - 0.0258, gy + 0.003, gz + 0.001), 0.0015, 0.0015, oroM);
  // braccia
  const bo = { sx: 0.152, sy: 0.268, L1: 0.235, L2: 0.205, r0: 0.05, r1: 0.043, r2: 0.035, manica: manicaM, polsino: cardDkM, skin: skinM, nail: nailM, mano: 1.02 };
  const AL = braccio(upper, -1, bo), AR = braccio(upper, 1, bo);
  ombre(root);
  function pose(p = {}) {
    const br = p.breathe ?? 0;
    upper.rotation.set(0.1 + (p.lean || 0), p.twist || 0, p.side || 0);
    upper.scale.set(1 + 0.008 * br, 1 + 0.005 * br, 1 + 0.012 * br);
    collo.rotation.set(-0.07 + (p.headPitch || 0), p.headYaw || 0, p.headRoll || 0);
    T.face(p);
    root.position.set(...(p.pos || [0, 0, 0])); root.rotation.y = p.yaw || 0; root.updateMatrixWorld(true);
    const giunte = (p.mani || 'giunte') === 'giunte';
    braccia(upper, AL, AR, { armL: p.armL || (giunte ? GIUNTE.L : {}), armR: p.armR || (giunte ? GIUNTE.R : {}) });
  }
  pose({});
  return { group: root, pose, head: T.head, upper, AL, AR, altezza: 1.5 };
}

// ------------------------------------------------------------------ TU (il nipote)
export function tu3() {
  const root = new THREE.Group();
  const C = { skin: '#DDA583', parka: '#2E6F73', parkaDk: '#1F5357', felpa: '#EDE3CF', jeans: '#3D5175', scarpa: '#6B4A2F', suola: '#2A2018', capelli: '#3A2A20' };
  const skinM = mat(C.skin), nailM = mat('#EDC7B4');
  const F = { S: [0.095, 0.122, 0.107], forma: { jaw: 0.26, jawP: 1.55, cheek: 0.02 }, skin: C.skin, ombra: '#C48A6B', linea: '#8E5A45',
    eye: { x: 0.037, y: 0.002, w: 0.0195, h: 0.0138, hl: 0.007, tilt: 0.03, ir: 0.0095, iris: '#6B4A32', lash: '#2A1C16', lashW: 0.0025, open0: 0.9 },
    brow: { dx: 0.001, y: 0.03, len: 0.045, arch: 0.004, thick: 0.0082, t0: 1, t1: 0.5, color: '#2E2018' },
    nose: { y: -0.032, w: 0.012, h: 0.0145, d: 0.016, t: 0.14 },
    mouth: { y: -0.071, w: 0.0235, lip: '#B0705F', lipA: 0.55, line: '#7A4336', lineW: 0.0017, lipU: 0, lipL: 0.0026, pieghe: 0 },
    blush: { x: 0.052, y: -0.036, r: 0.028, color: 'rgba(214,120,100,0.28)' }, barba: 'rgba(60,40,30,0.8)', orecchie: { y: -0.014 } };
  const jeansM = mat(C.jeans);
  // bacino e gambe
  const fianchi = new THREE.Group(); root.add(fianchi);
  add(fianchi, loft([{ y: 0.8, rx: 0.1, rz: 0.09 }, { y: 0.86, rx: 0.16, rz: 0.112 }, { y: 0.95, rx: 0.17, rz: 0.118 }, { y: 1.04, rx: 0.166, rz: 0.116 }], 40), jeansM);
  const go = { hx: 0.088, hy: 0.92, T1: 0.43, T2: 0.41, r0: 0.082, r1: 0.062, r2: 0.047, mat: jeansM, scarpa: mat(C.scarpa), suola: mat(C.suola) };
  const GL = gamba(fianchi, -1, go), GR = gamba(fianchi, 1, go);
  // busto: giacca a vento aperta sul collo, cerniera, tasche
  const upper = new THREE.Group(); upper.position.y = 1.02; fianchi.add(upper);
  const parkaT = tex(512, 512, (c, w, h) => { c.fillStyle = C.parka; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(0,0,0,0.14)'; c.fillRect(0, h - 34, w, 34);
    c.fillStyle = C.felpa; c.beginPath(); c.moveTo(w / 2 - 40, 0); c.lineTo(w / 2 + 40, 0); c.lineTo(w / 2, 150); c.closePath(); c.fill();
    c.strokeStyle = C.parkaDk; c.lineWidth = 7; c.beginPath(); c.moveTo(w / 2 - 40, 0); c.lineTo(w / 2, 150); c.lineTo(w / 2 + 40, 0); c.stroke();
    c.lineWidth = 6; c.beginPath(); c.moveTo(w / 2, 150); c.lineTo(w / 2, h); c.stroke(); c.strokeStyle = '#C9CCD0'; c.lineWidth = 2; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(w / 2, 150); c.lineTo(w / 2, h); c.stroke(); c.setLineDash([]);
    c.strokeStyle = C.parkaDk; c.lineWidth = 4; for (const s of [-1, 1]) { c.beginPath(); c.roundRect(w / 2 + s * 58 - 32, 330, 64, 78, 8); c.stroke(); c.beginPath(); c.moveTo(w / 2 + s * 58 - 32, 348); c.lineTo(w / 2 + s * 58 + 32, 348); c.stroke(); }
    c.strokeStyle = '#D9CFBA'; c.lineWidth = 4; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(w / 2 + s * 14, 60); c.lineTo(w / 2 + s * 18, 200); c.stroke(); c.fillStyle = '#B9AE98'; c.fillRect(w / 2 + s * 18 - 4, 196, 8, 16); } });
  const parkaM = mat(0xffffff, { map: parkaT }), parkaP = mat(C.parka), parkaD = mat(C.parkaDk);
  add(upper, loft([{ y: -0.1, rx: 0.178, rz: 0.128 }, { y: 0, rx: 0.176, rz: 0.126 }, { y: 0.14, rx: 0.182, rz: 0.128 }, { y: 0.28, rx: 0.2, rzf: 0.135, rzb: 0.125, n: 2.3 }, { y: 0.375, rx: 0.205, rz: 0.122, n: 2.6 }, { y: 0.415, rx: 0.16, rz: 0.105 }, { y: 0.44, rx: 0.085, rz: 0.08 }, { y: 0.452, rx: 0.055, rz: 0.06 }], 64), parkaM);
  add(upper, sfera(1, 24), parkaD, V(0, 0.405, -0.085), [0.15, 0.062, 0.075]);                                   // cappuccio abbassato dietro al collo
  const fel = add(upper, new THREE.TorusGeometry(0.056, 0.02, 10, 36), mat(C.felpa), V(0, 0.448, 0.004)); fel.rotation.x = Math.PI / 2 + 0.12; fel.scale.set(1.08, 1, 0.9);
  tra(upper, V(0, 0.435, 0.004), V(0, 0.505, 0.012), 0.05, 0.047, mat(mix(C.skin, '#a8684e', 0.2)));
  const collo = new THREE.Group(); collo.position.set(0, 0.487, 0.008); upper.add(collo);
  const T = testa(F); T.head.position.set(0, 0.108, 0.012); T.head.scale.setScalar(1.12); collo.add(T.head);
  // capelli corti ai lati, ciuffo sopra pettinato di lato
  const l1 = chiavi([[-3.15, 2.25], [-2.2, 2.2], [-1.85, 1.95], [-1.6, 1.56], [-1.42, 1.7], [-1.2, 1.36], [-0.9, 1.1], [-0.4, 0.97], [0, 0.97], [0.4, 1.02], [0.8, 1.12], [1.2, 1.36], [1.42, 1.7], [1.6, 1.56], [1.85, 1.95], [2.2, 2.2], [3.15, 2.25]]);
  capelli(T, { polo: [0.25, 0.8, -0.55], scala: 1.035, limite: l1, base: C.capelli, chiaro: '#5E4737', scuro: '#20150F', n: 700, seme: 7 });
  const l2 = chiavi([[-3.15, 1.0], [-1.7, 0.9], [-1.2, 0.95], [-0.8, 0.9], [-0.35, 0.96], [0.1, 1.08], [0.45, 1.2], [0.75, 1.12], [1.1, 0.96], [1.7, 0.88], [3.15, 1.0]]);
  capelli(T, { polo: [0.3, 0.75, -0.6], scala: 1.1, sy: 1.03, limite: l2, base: '#40302A', chiaro: '#6A5140', scuro: '#241812', n: 520, seme: 9, ordine: 3 });
  const bo = { sx: 0.182, sy: 0.35, L1: 0.3, L2: 0.26, r0: 0.056, r1: 0.048, r2: 0.04, manica: parkaP, polsino: parkaD, skin: skinM, nail: nailM, mano: 1.12 };
  const AL = braccio(upper, -1, bo), AR = braccio(upper, 1, bo);
  ombre(root);
  function pose(p = {}) {
    const br = p.breathe ?? 0, sit = M.clamp(p.sit || 0);
    upper.rotation.set((p.lean || 0), p.twist || 0, p.side || 0);
    upper.scale.set(1 + 0.008 * br, 1 + 0.004 * br, 1 + 0.012 * br);
    collo.rotation.set(p.headPitch || 0, p.headYaw || 0, p.headRoll || 0);
    T.face(p);
    const g = p.gambe || {};
    GL.set({ avanti: 1.5 * sit + (g.aL || 0), ginocchio: 1.5 * sit + (g.gL || 0), apri: 0.06 * sit });
    GR.set({ avanti: 1.5 * sit + (g.aR || 0), ginocchio: 1.5 * sit + (g.gR || 0), apri: 0.06 * sit });
    const pos = p.pos || [0, 0, 0];
    root.position.set(pos[0], pos[1] - sit * (0.92 - (p.sedile ?? 0.46) - 0.085), pos[2]); root.rotation.y = p.yaw || 0; root.updateMatrixWorld(true);
    braccia(upper, AL, AR, p);
  }
  pose({});
  return { group: root, pose, head: T.head, upper, AL, AR, altezza: 1.76 };
}

// ------------------------------------------------------------------ SARA (la cugina)
export function sara3() {
  const root = new THREE.Group();
  const C = { skin: '#F2CBB0', maglione: '#D9A441', maglioneDk: '#B7852E', jeans: '#4A4E60', scarpa: '#ECEAE4', suola: '#C9C6BE', capelli: '#9A4A2A', chiaro: '#C56E42', scuro: '#6A2D17' };
  const skinM = mat(C.skin), nailM = mat('#D9737F');
  const F = { S: [0.092, 0.121, 0.103], forma: { jaw: 0.3, cheek: 0.03 }, skin: C.skin, ombra: '#DDA78C', linea: '#A56B58',
    eye: { x: 0.0355, y: -0.002, w: 0.021, h: 0.0155, hl: 0.0075, tilt: 0.07, ir: 0.0104, iris: '#5E8A5A', lash: '#241714', lashW: 0.0029, ala: true, open0: 0.95 },
    brow: { dx: 0.001, y: 0.0315, len: 0.04, arch: 0.005, thick: 0.0048, t0: 1, t1: 0.5, color: '#7A3B22' },
    nose: { y: -0.033, w: 0.0092, h: 0.0115, d: 0.012, t: 0.14 },
    mouth: { y: -0.068, w: 0.0205, lip: '#C3595F', line: '#7A2F36', lineW: 0.0014, lipU: 0.0024, lipL: 0.0038 },
    blush: { x: 0.05, y: -0.036, r: 0.028, color: 'rgba(232,120,110,0.4)' }, lentiggini: 'rgba(170,95,60,1)', orecchie: { y: -0.018, h: 0.024, w: 0.015 } };
  const jeansM = mat(C.jeans);
  const fianchi = new THREE.Group(); root.add(fianchi);
  add(fianchi, loft([{ y: 0.74, rx: 0.095, rz: 0.085 }, { y: 0.8, rx: 0.155, rz: 0.11 }, { y: 0.88, rx: 0.162, rz: 0.115 }, { y: 0.97, rx: 0.15, rz: 0.108 }], 40), jeansM);
  const go = { hx: 0.082, hy: 0.86, T1: 0.4, T2: 0.385, r0: 0.078, r1: 0.056, r2: 0.042, mat: jeansM, scarpa: mat(C.scarpa), suola: mat(C.suola), piede: 0.92 };
  const GL = gamba(fianchi, -1, go), GR = gamba(fianchi, 1, go);
  const upper = new THREE.Group(); upper.position.y = 0.96; fianchi.add(upper);
  const magT = maglia(C.maglione, 80, 'rgba(0,0,0,0.07)', 'rgba(255,255,255,0.07)', (c, w, h) => { c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, h - 36, w, 36); c.fillRect(0, 0, w, 26);
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 5; for (const y of [200, 232]) { c.beginPath(); for (let x = 0; x <= w; x += 32) { c.lineTo(x, y + (x / 32 % 2 ? 10 : -10)); } c.stroke(); } });
  const magM = mat(0xffffff, { map: magT });
  add(upper, loft([{ y: -0.09, rx: 0.16, rz: 0.118 }, { y: 0, rx: 0.15, rz: 0.11 }, { y: 0.12, rx: 0.158, rzf: 0.125, rzb: 0.11 }, { y: 0.24, rx: 0.17, rzf: 0.132, rzb: 0.112 }, { y: 0.33, rx: 0.172, rz: 0.108, n: 2.4 }, { y: 0.365, rx: 0.13, rz: 0.095 }, { y: 0.39, rx: 0.07, rz: 0.07 }, { y: 0.402, rx: 0.048, rz: 0.052 }], 64), magM);
  const cl = add(upper, new THREE.TorusGeometry(0.052, 0.016, 10, 36), mat(C.maglioneDk), V(0, 0.4, 0.006)); cl.rotation.x = Math.PI / 2 + 0.1;
  tra(upper, V(0, 0.385, 0.004), V(0, 0.455, 0.01), 0.04, 0.038, mat(mix(C.skin, '#b97a60', 0.18)));
  const collo = new THREE.Group(); collo.position.set(0, 0.437, 0.006); upper.add(collo);
  const T = testa(F); T.head.position.set(0, 0.106, 0.012); T.head.scale.setScalar(1.13); collo.add(T.head);
  const lim = chiavi([[0, 1.16], [0.35, 1.17], [0.7, 1.14], [0.95, 1.25], [1.2, 1.6], [1.36, 2.0], [1.5, 1.55], [1.75, 1.62], [2.0, 2.1], [3.15, 2.25]]);
  capelli(T, { polo: [0, 0.35, -0.94], scala: 1.055, limite: (ph) => lim(Math.abs(ph)) + 0.1 * ph * Math.exp(-ph * ph * 1.2), base: C.capelli, chiaro: C.chiaro, scuro: C.scuro, n: 680, seme: 12 });
  const hairM = mat(0xffffff, { map: ciocche(C.capelli, C.chiaro, C.scuro, 110, 8) });
  const coda = [V(0, 0.045, -0.112), V(0, -0.02, -0.158), V(0, -0.11, -0.168), V(0, -0.2, -0.152), V(0, -0.27, -0.13)], cr = [0.03, 0.04, 0.037, 0.028, 0.012];
  for (let i = 0; i < coda.length - 1; i++) tra(T.head, coda[i], coda[i + 1], cr[i], cr[i + 1], hairM);
  const el = add(T.head, new THREE.TorusGeometry(0.03, 0.008, 8, 24), mat('#2E6F73'), V(0, 0.03, -0.128)); el.rotation.x = 0.9;
  const bo = { sx: 0.148, sy: 0.308, L1: 0.26, L2: 0.235, r0: 0.046, r1: 0.04, r2: 0.033, manica: mat(0xffffff, { map: maglia(C.maglione, 22) }), polsino: mat(C.maglioneDk), skin: skinM, nail: nailM, mano: 1.0 };
  const AL = braccio(upper, -1, bo), AR = braccio(upper, 1, bo);
  ombre(root);
  function pose(p = {}) {
    const br = p.breathe ?? 0, sit = M.clamp(p.sit || 0);
    upper.rotation.set((p.lean || 0), p.twist || 0, p.side || 0);
    upper.scale.set(1 + 0.008 * br, 1 + 0.004 * br, 1 + 0.012 * br);
    collo.rotation.set(p.headPitch || 0, p.headYaw || 0, p.headRoll || 0);
    T.face(p);
    const g = p.gambe || {};
    GL.set({ avanti: 1.5 * sit + (g.aL || 0), ginocchio: 1.5 * sit + (g.gL || 0), apri: 0.03 * sit });
    GR.set({ avanti: 1.5 * sit + (g.aR || 0), ginocchio: 1.5 * sit + (g.gR || 0), apri: 0.03 * sit });
    const pos = p.pos || [0, 0, 0];
    root.position.set(pos[0], pos[1] - sit * (0.86 - (p.sedile ?? 0.46) - 0.08), pos[2]); root.rotation.y = p.yaw || 0; root.updateMatrixWorld(true);
    braccia(upper, AL, AR, p);
  }
  pose({});
  return { group: root, pose, head: T.head, upper, AL, AR, altezza: 1.64 };
}
