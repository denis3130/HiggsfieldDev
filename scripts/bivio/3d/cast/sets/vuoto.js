// «Il testimone», episodio 2 («Interno 11») — l'appartamento vuoto visto da dentro. Ci entri dal balcone rompendo un vetro della portafinestra
// (la tapparella è alzata), attraversi la stanza buia coi mobili sotto le lenzuola ed esci dalla porta d'ingresso sulla parete di destra, che dà
// sull'altra scala. Il muro di sinistra è quello in comune col tuo soggiorno: dentro è pieno e scuro, così la camera ci può passare attraverso.
// vuotoDentro({ scene, Q, FY, BAL, PS, P4 }) → { update(t, o), LEVA_PORTA, MANIGLIA, BUCO }
//   o.vuoto = { rotto: secondi dalla rottura del vetro (< 0: intero), anta 0..1 (l'anta di destra aperta verso dentro), maniglia 0..1 (la martellina girata),
//               porta 0..1 (la porta d'ingresso aperta), lampo 0..1 (il fulmine), luce (la luce fredda che entra dalla finestra, 1 di base) }
//   o.vaso = { pos: [x, y, z] nel mondo, rot: [x, y, z] }: il vaso della pianta secca (prima di romperci il vetro); dopo la rottura vola dentro da solo
// Tutto è modellato: le lenzuola sono una superficie sola calcolata sopra i mobili (appoggia sui piani, cade ai lati in pieghe, si posa per terra).
import * as M from '../lib/motion.js';
import { THREE, V, rnd, tex, mat, piatto as basic, sfera, add, tra } from './stile.js';
import { assi } from './cucina3.js';
import { porta } from './testimone_set.js';

export const VUOTO = { EX0: 6.1, EX1: 9.4, EZ: -3.75, EH: 2.7, FZ: -0.3, PZ: -2.55 };

// un lenzuolo buttato sopra un mobile: una superficie sola fatta come «altezza sopra il pavimento». Sopra i piani del mobile (sost(x, z) = la sua
// altezza) la stoffa appoggia; ai lati cade con la pendenza `pend` e si apre in pieghe; in fondo si posa per terra con l'orlo irregolare.
function lenzuolo(sost, x0, x1, z0, z1, { n = 96, pend = 3.2, pieghe = 0.028, seme = 1, colore = '#BDB7A8', bordo = 0.16 } = {}) {
  const r = rnd(seme), nx = n, nz = Math.max(10, Math.round((n * (z1 - z0)) / (x1 - x0))), dx = (x1 - x0) / nx, dz = (z1 - z0) / nz, W = nx + 1;
  const F = new Float32Array(W * (nz + 1)); for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) F[j * W + i] = sost(x0 + i * dx, z0 + j * dz);
  let Fm = 0; for (const f of F) Fm = Math.max(Fm, f);
  const R = Math.ceil(Fm / pend / Math.min(dx, dz)) + 2, H = new Float32Array(F.length);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { let h = -1;
    for (let b = -R; b <= R; b++) { const jj = j + b; if (jj < 0 || jj > nz) continue; for (let a = -R; a <= R; a++) { const ii = i + a; if (ii < 0 || ii > nx) continue; const f = F[jj * W + ii]; if (f <= 0) continue; const v = f - pend * Math.hypot(a * dx, b * dz); if (v > h) h = v; } }
    H[j * W + i] = h; }
  // pieghe: dove la stoffa pende (non appoggia) si sposta di lato, perpendicolare alla discesa, a onde lunghe e irregolari; per terra qualche grinza
  const ph = [r(0, 6), r(0, 6), r(0, 6)], P = new Float32Array(F.length * 3), C = new Float32Array(F.length * 3), base = new THREE.Color(colore), c = new THREE.Color();
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const k = j * W + i, x = x0 + i * dx, z = z0 + j * dz, h = H[k], hl = H[j * W + Math.max(0, i - 1)], hr = H[j * W + Math.min(nx, i + 1)], hd = H[Math.max(0, j - 1) * W + i], hu = H[Math.min(nz, j + 1) * W + i];
    const gx = (hr - hl) / (2 * dx), gz = (hu - hd) / (2 * dz), gl = Math.hypot(gx, gz) || 1, ripido = M.clamp(gl / pend), appoggia = h <= F[k] + 0.004 ? 1 : 0;
    const tx = -gz / gl, tz = gx / gl, s = x * tx + z * tz, onda = Math.sin(s * 26 + ph[0] + 1.7 * Math.sin(s * 7 + ph[1])) + 0.45 * Math.sin(s * 61 + ph[2]);
    const amp = pieghe * ripido * (1 - appoggia) * (0.45 + 0.75 * (1 - M.clamp(h / Fm))), y = Math.max(0.004, h) + (h < 0.01 ? 0.006 * Math.sin(x * 23 + z * 17) * Math.sin(x * 9 - z * 13) : 0);
    P[k * 3] = x - (gx / gl) * amp * onda * 0.6 + tx * 0.0; P[k * 3 + 1] = y; P[k * 3 + 2] = z - (gz / gl) * amp * onda * 0.6;
    const scuro = 1 - 0.18 * M.clamp(-onda) * ripido - 0.14 * M.clamp(1 - y / 0.25) - 0.06 * r(); c.copy(base).multiplyScalar(scuro); C[k * 3] = c.r; C[k * 3 + 1] = c.g; C[k * 3 + 2] = c.b; }
  // l'orlo: si tengono solo i quadrati dove la stoffa arriva (altezza «senza pavimento» sopra -bordo, con un po' di irregolarità)
  const I = [], dentro = (k) => H[k] > -bordo + 0.05 * Math.sin(P[k * 3] * 19 + P[k * 3 + 2] * 7) * Math.sin(P[k * 3] * 5 - P[k * 3 + 2] * 11);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * W + i, b = a + 1, cc = a + W + 1, d = a + W; if (dentro(a) && dentro(b) && dentro(cc) && dentro(d)) I.push(a, d, cc, a, cc, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); m.castShadow = true; m.receiveShadow = true; return m;
}
// rettangolo con gli spigoli arrotondati (per i mobili sotto le lenzuola): altezza h dentro, 0 fuori
const box2 = (x, z, x0, x1, z0, z1, h) => (x >= x0 && x <= x1 && z >= z0 && z <= z1 ? h : 0);

// il vetro sporco della portafinestra (texture col canale alfa): intero, oppure col buco vicino alla maniglia e le crepe intorno
function vetroTex(rotto, BUCO) {
  return tex(256, 1024, (c, w, h) => { const r = rnd(41);
    c.clearRect(0, 0, w, h); const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(120,132,150,0.55)'); g.addColorStop(0.4, 'rgba(40,46,58,0.5)'); g.addColorStop(0.55, 'rgba(110,122,140,0.5)'); g.addColorStop(1, 'rgba(30,34,44,0.55)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '150,140,120' : '60,64,70'},${r(0.04, 0.12)})`; const x = r() * w, y = r() * h; c.fillRect(x, y, r(1, 3), r(8, 60)); }      // colature di polvere e pioggia
    for (let i = 0; i < 18; i++) { const x = r() * w, y = r() * h, rr = r(20, 70), q = c.createRadialGradient(x, y, 0, x, y, rr); q.addColorStop(0, 'rgba(170,160,140,0.12)'); q.addColorStop(1, 'rgba(170,160,140,0)'); c.fillStyle = q; c.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
    if (!rotto) return;
    const cx = BUCO.u * w, cy = (1 - BUCO.v) * h, rx = BUCO.ru * w, ry = BUCO.rv * h, pts = [];
    for (let i = 0; i < 17; i++) { const a = (i / 17) * Math.PI * 2 + r(-0.12, 0.12), k = i % 2 ? r(0.55, 0.8) : r(0.85, 1.15); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    // crepe che partono dal buco, poi il buco (trasparente), poi il bordo chiaro delle schegge rimaste nel telaio
    c.lineCap = 'round';
    for (let i = 0; i < 11; i++) { const a = r(0, Math.PI * 2); let x = cx + Math.cos(a) * rx * 0.8, y = cy + Math.sin(a) * ry * 0.8; c.strokeStyle = `rgba(225,232,245,${r(0.35, 0.7)})`; c.lineWidth = r(1, 2.2); c.beginPath(); c.moveTo(x, y);
      for (let s = 0; s < 6; s++) { x += Math.cos(a + r(-0.4, 0.4)) * r(10, 34); y += Math.sin(a + r(-0.4, 0.4)) * r(18, 70); c.lineTo(x, y); } c.stroke(); }
    c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill();
    c.globalCompositeOperation = 'source-over'; c.strokeStyle = 'rgba(235,240,250,0.85)'; c.lineWidth = 2.5; c.stroke(); });
}

export function vuotoDentro({ scene, Q, FY, BAL, PS, P4 }) {
  const { NX0, NX1, HP, ZT } = BAL, { EX0, EX1, EZ, EH, FZ, PZ } = VUOTO, r = rnd(512);
  const D = new THREE.Group(); Q.add(D);
  const LW = (NX1 - NX0 - 0.1) / 2, LH = HP - 0.05 - 0.035;
  const piano = (w, h, m, x, y, z, ry = 0, rx = 0, p = D) => { const o = add(p, new THREE.PlaneGeometry(w, h), m, V(x, y, z)); o.rotation.set(rx, ry, 0); o.receiveShadow = true; o.castShadow = true; return o; };
  // ------------------------------------------------------------------ pavimento a listoni vecchi, pareti scolorite (i segni chiari dei quadri tolti), soffitto
  const pav = mat(0xffffff, { map: assi('#5E4B39', 9, { vert: true, rep: [1, 2], seme: 77, nodi: 0.3 }) });
  piano(EX1 - EX0, FZ - EZ, pav, (EX0 + EX1) / 2, 0.001, (FZ + EZ) / 2, 0, -Math.PI / 2);
  const parete = (w, seme, segni = []) => mat(0xffffff, { map: tex(Math.round(w * 160), 432, (c, ww, h) => { const q = rnd(seme);
    c.fillStyle = '#A9A08A'; c.fillRect(0, 0, ww, h);
    for (let i = 0; i < 40; i++) { const x = q() * ww, y = q() * h, rr = q(30, 140), g = c.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, `rgba(${q() < 0.5 ? '120,110,90' : '190,182,160'},0.14)`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
    for (const [x, y, sw, sh] of segni) { c.fillStyle = 'rgba(205,198,176,0.55)'; c.fillRect(x * ww, (1 - y) * h - sh * h, sw * ww, sh * h); c.strokeStyle = 'rgba(90,84,70,0.25)'; c.lineWidth = 2; c.strokeRect(x * ww, (1 - y) * h - sh * h, sw * ww, sh * h);
      c.fillStyle = '#3A342C'; c.beginPath(); c.arc((x + sw / 2) * ww, (1 - y) * h - sh * h - 9, 2.4, 0, 7); c.fill(); }      // il segno chiaro del quadro e il chiodo
    const gb = c.createLinearGradient(0, 0, 0, h); gb.addColorStop(0, 'rgba(60,56,48,0.25)'); gb.addColorStop(0.2, 'rgba(60,56,48,0)'); gb.addColorStop(0.85, 'rgba(60,56,48,0)'); gb.addColorStop(1, 'rgba(60,56,48,0.35)'); c.fillStyle = gb; c.fillRect(0, 0, ww, h);
    c.fillStyle = '#4A3D30'; c.fillRect(0, h - 14, ww, 14); }) });                                                    // il battiscopa
  piano(FZ - EZ, EH, parete(-EZ, 3, [[0.35, 0.55, 0.12, 0.17], [0.62, 0.6, 0.2, 0.12]]), EX0, EH / 2, (FZ + EZ) / 2, Math.PI / 2);                 // il muro in comune col tuo soggiorno
  piano(EX1 - EX0, EH, parete(EX1 - EX0, 5, [[0.2, 0.64, 0.14, 0.1], [0.55, 0.5, 0.28, 0.2]]), (EX0 + EX1) / 2, EH / 2, EZ);
  for (const [z0, z1] of [[EZ, PZ - 0.5], [PZ + 0.5, FZ]]) piano(z1 - z0, EH, parete(z1 - z0, 7 + z0), EX1, EH / 2, (z0 + z1) / 2, -Math.PI / 2);
  piano(1.0, EH - 2.14, parete(1.0, 9), EX1, (EH + 2.14) / 2, PZ, -Math.PI / 2);
  for (const [x0, x1] of [[EX0, NX0 - 0.6], [NX1 + 0.85, EX1]]) piano(x1 - x0, EH, parete(x1 - x0, 11 + x0), (x0 + x1) / 2, EH / 2, FZ, Math.PI);
  piano(EX1 - EX0, FZ - EZ, mat('#9C9584'), (EX0 + EX1) / 2, EH, (FZ + EZ) / 2, 0, Math.PI / 2);
  // il muro in comune, pieno: un blocco scuro poco dentro le due pareti (quando la camera lo attraversa, per un attimo è tutto buio; nello spaccato è il taglio)
  const muroComune = add(Q, new THREE.BoxGeometry(0.19, EH, FZ - EZ - 0.01), new THREE.MeshBasicMaterial({ color: '#0E0F12', side: THREE.DoubleSide }), V(6.0, EH / 2, (FZ + EZ) / 2 - 0.005));
  // ------------------------------------------------------------------ la portafinestra: telaio, due ante con i vetri sporchi; si apre quella di destra (la maniglia sta lì)
  const tel = mat('#BDB8AC'), qb = (w, h, d, x, y, z, p = Q) => { const o = add(p, new THREE.BoxGeometry(w, h, d), tel, V(x, y, z)); o.castShadow = true; o.receiveShadow = true; return o; };
  for (const x of [NX0 + 0.025, NX1 - 0.025]) qb(0.05, HP - 0.03, 0.06, x, (HP + 0.03) / 2, ZT); qb(NX1 - NX0, 0.05, 0.06, (NX0 + NX1) / 2, HP - 0.025, ZT);
  // il buco nel vetro dell'anta di destra, vicino alla maniglia (coordinate della texture: u da sinistra, v dal basso; raggi in frazioni)
  const PW = LW - 0.13, PH = LH - 0.19, BUCO = { u: 0.2, v: 0.46, ru: 0.32, rv: 0.065 };      // (v 0,46: il buco all'altezza della martellina, così il braccio ci entra dritto e la mano la stringe di traverso)
  const vInt = new THREE.MeshBasicMaterial({ map: vetroTex(false, BUCO), transparent: true, depthWrite: false, color: '#8892A4' }), vRot = new THREE.MeshBasicMaterial({ map: vetroTex(true, BUCO), transparent: true, depthWrite: false, color: '#8892A4' });
  const ante = [], vetri = [];
  for (const lato of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(lato < 0 ? NX0 + 0.05 : NX1 - 0.05, 0.033, ZT); Q.add(g); const d = -lato;
    for (const [w, h, x, y] of [[0.065, LH, 0.0325, LH / 2], [0.065, LH, LW - 0.0325, LH / 2], [LW, 0.07, LW / 2, LH - 0.035], [LW, 0.12, LW / 2, 0.06], [LW - 0.1, 0.035, LW / 2, 1.02]]) qb(w, h, 0.05, d * x, y, 0, g);
    const v = add(g, new THREE.PlaneGeometry(PW, PH), lato > 0 ? vInt : vInt.clone(), V(d * LW / 2, LH / 2 + 0.025, 0.005)); v.renderOrder = 4; vetri.push(v); ante.push(g);
  }
  // la martellina dentro, sul montante libero dell'anta di destra: gira attorno al perno (asse z)
  const mart = new THREE.Group(); mart.position.set(-(LW - 0.0325), 1.05, -0.045); ante[1].add(mart);
  { const mg = mat('#B8B4A6'); add(mart, new THREE.CylinderGeometry(0.008, 0.008, 0.045, 10).rotateX(Math.PI / 2), mg, V(0, 0, 0)); add(mart, new THREE.CylinderGeometry(0.0075, 0.0065, 0.11, 10), mg, V(0, -0.05, -0.021)); }
  // dove sta il buco nel mondo (centro), dove sta la martellina (per la mano che ci passa attraverso)
  const BUCO_W = [NX1 - 0.05 - LW / 2 - PW / 2 + BUCO.u * PW, FY + 0.033 + LH / 2 + 0.025 - PH / 2 + BUCO.v * PH, ZT + 0.005];
  const MANIGLIA = [NX1 - 0.05 - (LW - 0.0325), FY + 0.033 + 1.0, ZT - 0.066];
  // ------------------------------------------------------------------ i mobili lasciati sotto le lenzuola: divano, poltrona, tavolo con due sedie
  const divano = (x, z) => Math.max(box2(x, z, 6.95, 8.75, EZ + 0.02, EZ + 0.27, 0.86), box2(x, z, 6.95, 8.75, EZ + 0.27, EZ + 0.92, 0.46), box2(x, z, 6.95, 7.13, EZ + 0.27, EZ + 0.92, 0.62), box2(x, z, 8.57, 8.75, EZ + 0.27, EZ + 0.92, 0.62));
  D.add(lenzuolo(divano, 6.72, 8.98, EZ + 0.01, EZ + 1.25, { seme: 3, n: 110 }));
  const poltrona = (x, z) => Math.max(box2(x, z, 9.0, 9.22, -1.55, -0.8, 0.92), box2(x, z, 8.45, 9.0, -1.55, -0.8, 0.43), box2(x, z, 8.45, 9.0, -1.55, -1.4, 0.62), box2(x, z, 8.45, 9.0, -0.95, -0.8, 0.62));
  D.add(lenzuolo(poltrona, 8.2, EX1 - 0.02, -1.82, -0.52, { seme: 5, n: 70 }));
  const tavolo = (x, z) => Math.max(box2(x, z, 7.35, 8.25, -2.25, -1.45, 0.76), box2(x, z, 7.6, 8.0, -2.47, -2.43, 0.95), box2(x, z, 7.6, 8.0, -1.27, -1.23, 0.95));
  D.add(lenzuolo(tavolo, 7.05, 8.55, -2.75, -0.95, { seme: 9, n: 100, pend: 3.6 }));
  // la lampadina nuda che pende dal soffitto, spenta
  tra(D, V(7.75, EH, -1.9), V(7.75, EH - 0.62, -1.9), 0.004, 0.004, mat('#1E1E1E')); add(D, new THREE.CylinderGeometry(0.018, 0.016, 0.05, 12), mat('#2C2A27'), V(7.75, EH - 0.645, -1.9));
  add(D, sfera(0.034, 16), new THREE.MeshPhongMaterial({ color: '#5A5E66', specular: '#FFFFFF', shininess: 80, transparent: true, opacity: 0.85 }), V(7.75, EH - 0.7, -1.9));
  // ------------------------------------------------------------------ la porta d'ingresso sulla parete di destra (vista da dentro) e il pianerottolo dell'altra scala dietro
  const PD = new THREE.Group(); PD.position.set(EX1 - 0.03, 0, PZ); PD.rotation.y = -Math.PI / 2; D.add(PD); const pdg = porta(PD, { colore: '#4A3528' });
  const LEVA_PORTA = { a: [EX1 - 0.03 - 0.085, FY + 1.02, PZ + 0.225], b: [EX1 - 0.03 - 0.085, FY + 1.02, PZ + 0.365], r: 0.011 };
  const L2 = new THREE.Group(); D.add(L2);
  { const gran = mat(0xffffff, { map: tex(256, 256, (c, w, h) => { c.fillStyle = '#8E887B'; c.fillRect(0, 0, w, h); const q = rnd(3); for (let i = 0; i < 700; i++) { c.fillStyle = ['#6F695E', '#B3AC9C', '#5A554C'][i % 3]; c.globalAlpha = q(0.4, 0.9); c.beginPath(); c.arc(q() * w, q() * h, q(0.8, 2.4), 0, 7); c.fill(); } }, [3, 3]) });
    piano(2.4, 2.6, gran, EX1 + 1.2, 0.0, PZ, 0, -Math.PI / 2, L2);
    const due = mat(0xffffff, { map: tex(64, 256, (c, w, h) => { c.fillStyle = '#C9C0A0'; c.fillRect(0, 0, w, h); c.fillStyle = '#5F6E5A'; c.fillRect(0, h * 0.54, w, h * 0.46); }) });
    piano(2.6, EH, due, EX1 + 2.3, EH / 2, PZ, -Math.PI / 2, 0, L2); piano(2.4, EH, due, EX1 + 1.2, EH / 2, PZ - 1.3, 0, 0, L2); piano(2.4, EH, due, EX1 + 1.2, EH / 2, PZ + 1.3, Math.PI, 0, L2);
    tra(L2, V(EX1 + 0.6, 0.98, PZ + 1.1), V(EX1 + 2.2, 0.98, PZ + 1.1), 0.022, 0.022, mat('#4A3020')); for (let i = 0; i < 7; i++) tra(L2, V(EX1 + 0.7 + i * 0.24, 0, PZ + 1.1), V(EX1 + 0.7 + i * 0.24, 0.97, PZ + 1.1), 0.009, 0.009, mat('#2B2D2A')); }
  const LP2 = new THREE.PointLight('#7F96C8', 0, 4.5, 1.3); LP2.position.set(EX1 + 1.6, FY + 2.1, PZ - 0.4); scene.add(LP2);
  // ------------------------------------------------------------------ la luce fredda che entra dalla finestra (lampione e cielo): fa sul pavimento l'ombra del telaio e delle sbarre
  const LV = new THREE.SpotLight('#8EA6D6', 0, 14, 0.34, 0.45, 1.0); LV.position.set(7.45, FY + 2.5, 2.9); LV.target.position.set(7.5, FY + 0.1, -2.6); scene.add(LV, LV.target);
  LV.castShadow = true; LV.shadow.mapSize.set(2048, 2048); LV.shadow.camera.near = 0.8; LV.shadow.camera.far = 10; LV.shadow.bias = -0.0012; LV.shadow.normalBias = 0.02; LV.shadow.radius = 3;
  // ------------------------------------------------------------------ le schegge: alcune cadono fuori sul balcone, la maggior parte vola dentro col vaso
  const NSH = 64, shG = new THREE.BufferGeometry(); shG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.035, 0.008, 0, 0.012, 0.042, 0], 3)); shG.computeVertexNormals();
  const shards = new THREE.InstancedMesh(shG, new THREE.MeshPhongMaterial({ color: '#B4C2D6', specular: '#FFFFFF', shininess: 140, transparent: true, opacity: 0.7, side: THREE.DoubleSide }), NSH); shards.frustumCulled = false; scene.add(shards);
  const SH = []; { const q = rnd(66); for (let i = 0; i < NSH; i++) { const fuori = i < 14, a = q(0, Math.PI * 2), rr = q(0, 1) ** 0.5;
    SH.push({ p: [BUCO_W[0] + Math.cos(a) * 0.12 * rr, BUCO_W[1] + Math.sin(a) * 0.07 * rr, BUCO_W[2]], v: fuori ? [q(-0.4, 0.4), q(-0.3, 0.6), q(0.2, 1.0)] : [q(-0.9, 0.7), q(-0.2, 1.5), -q(1.0, 3.6)],
      s: q(0.5, 1.5), w: [q(-14, 14), q(-14, 14), q(-14, 14)], fin: [-Math.PI / 2 + q(-0.15, 0.15), q(0, 6.3), 0] }); } }
  const mm = new THREE.Matrix4(), qq = new THREE.Quaternion(), ee = new THREE.Euler(), pp = V(0, 0, 0), ss = V(1, 1, 1);
  const terra = add(D, new THREE.CircleGeometry(0.2, 20), new THREE.MeshLambertMaterial({ color: '#2B2119' }), V(0, 0.004, 0)); terra.rotation.x = -Math.PI / 2; terra.visible = false;
  const VASO0 = PS.position.clone(), RVASO0 = PS.rotation.clone();
  // volo: p(t) = p0 + v t + g t²/2 finché tocca terra (y = quota), poi striscia frenando
  function volo(p0, v, dt, quota) { const a = 4.9, tl = (v[1] + Math.sqrt(v[1] * v[1] + 4 * a * Math.max(0, p0[1] - quota))) / (2 * a);
    if (dt < tl) return [p0[0] + v[0] * dt, p0[1] + v[1] * dt - a * dt * dt, p0[2] + v[2] * dt, false, tl];
    const s = 0.16 * (1 - Math.exp(-(dt - tl) / 0.12)); return [p0[0] + v[0] * (tl + s), quota, p0[2] + v[2] * (tl + s), true, tl]; }
  return { LEVA_PORTA, MANIGLIA, BUCO: BUCO_W, ante, PD: pdg, LV, muroComune,
    update(t, o = {}) {
      const vu = o.vuoto || {}, rotto = vu.rotto ?? -1, lampo = M.clamp(vu.lampo ?? 0);
      vetri[1].material = rotto >= 0 ? vRot : vInt;
      ante[1].rotation.y = -1.6 * M.clamp(vu.anta ?? 0); mart.rotation.z = (Math.PI / 2) * M.clamp(vu.maniglia ?? 0);
      pdg.userData.anta.rotation.y = -1.35 * M.clamp(vu.porta ?? 0); LP2.intensity = 0.9 * (0.15 + 0.85 * M.clamp((vu.porta ?? 0) * 3));
      LV.intensity = 38 * (vu.luce ?? 1) + 420 * lampo; LV.visible = LV.intensity > 0.001;
      // le schegge
      shards.visible = rotto >= 0;
      if (rotto >= 0) SH.forEach((s, i) => { const dentro = s.v[2] < 0, [x, y, z, giu] = volo(s.p, s.v, rotto, dentro ? FY + 0.003 : FY + 0.004);
        pp.set(x, y, z); ss.setScalar(s.s); if (giu) ee.set(...s.fin); else ee.set(s.w[0] * rotto, s.w[1] * rotto, s.w[2] * rotto); qq.setFromEuler(ee); shards.setMatrixAt(i, mm.compose(pp, qq, ss)); });
      shards.instanceMatrix.needsUpdate = true;
      // il vaso: in mano (o.vaso), poi dopo la rottura vola dentro, rotola e si ferma su un fianco, con la terra sparsa
      terra.visible = false;
      if (rotto >= 0) { const p0 = [BUCO_W[0] + 0.02, BUCO_W[1] - 0.05, BUCO_W[2] + 0.12], [x, y, z, giu, tl] = volo(p0, [-1.1, 0.3, -1.4], rotto, FY + 0.12);
        PS.position.set(x, y - P4.position.y, z); const rot = giu ? 1 : rotto / tl; PS.rotation.set(-1.2 * rot - (giu ? 0.37 : 0), 0.4 * rot, giu ? Math.PI / 2 : 2.2 * rot);
        if (giu) { terra.visible = true; terra.position.set(x + 0.05, 0.004, z + 0.1); terra.scale.setScalar(M.clamp((rotto - tl) / 0.25) * 1.6 + 0.01); } }
      else if (o.vaso) { PS.position.set(o.vaso.pos[0], o.vaso.pos[1] - P4.position.y, o.vaso.pos[2]); PS.rotation.set(...(o.vaso.rot || [0, 0, 0])); }
      else { PS.position.copy(VASO0); PS.rotation.copy(RVASO0); }
    } };
}
