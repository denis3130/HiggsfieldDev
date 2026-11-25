// Pupazzi del Bivio (versione 3, stile «vettoriale 3D»): i pezzi comuni a tutti i personaggi.
//  - testa(F): testa liscia con la FACCIA DISEGNATA a ogni fotogramma su una pellicola (occhi con palpebre, iride e riflesso,
//    sopracciglia, bocca con denti e lingua, guance, rughe, lentiggini, barba corta): face(p) con p = espressione.
//  - capelli(head, F, o): calotta con l'attaccatura vera (maschera calcolata sulla testa) e le ciocche che convergono in un punto.
//  - mano(): palmo, quattro dita a tre falangi con le unghie, pollice; pose con nome (rilassata, presa, indice, pugno…).
//  - braccio(): spalla-gomito-polso risolti da un punto da raggiungere (cinematica inversa), con il dorso della mano orientabile.
//  - gamba(): anca e ginocchio (per sedersi).
// Tutto è una funzione pura dei parametri: nessuno stato tra un fotogramma e l'altro.
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
import { THREE, V, DOWN, UP, rnd, tex, mat, sfera, add, segmento } from './stile.js';

export const mix = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ forma della testa
const DEF = { jaw: 0.24, jawP: 1.3, chinIn: 0.1, cheek: 0.04, back: 1.05 };
function fattori(uy, k) {                              // quanto si stringe (x) e rientra (z) la faccia a quell'altezza
  let fx = 1, fz = 1;
  if (uy < 0.12) { const t = Math.pow((0.12 - uy) / 1.12, k.jawP); fx = 1 - k.jaw * t; fz = 1 - k.chinIn * t; }
  fx *= 1 + k.cheek * Math.exp(-(((uy + 0.3) / 0.28) ** 2));
  return [fx, fz];
}
function deforma(geo, k, r = 1) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i) / r, y = p.getY(i) / r, z = p.getZ(i) / r;
    const [fx, fz] = fattori(y, k);
    x *= z > 0 ? fx : 1 - (1 - fx) * 0.85; z *= z > 0 ? fz : k.back;
    p.setXYZ(i, x * r, y * r, z * r);
  }
  geo.computeVertexNormals(); return geo;
}
// funzione liscia per punti chiave [[x, y], …] (x crescente)
export function chiavi(pts) {
  return (x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const k = (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]), s = k * k * (3 - 2 * k); return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * s; }
    return pts[pts.length - 1][1];
  };
}

// ------------------------------------------------------------------ la faccia disegnata (metri, y verso l'alto, origine al centro della testa)
function occhio(c, F, p, s) {
  const e = F.eye, cx = s * e.x, cy = e.y, P = (lx, ly) => [cx + s * lx, cy + ly];
  const blink = M.clamp(p.blink || 0), smile = M.clamp(p.smile || 0), fear = M.clamp(p.fear || 0), angry = M.clamp(p.angry || 0), sad = M.clamp(p.sad || 0);
  const open = M.clamp((p.open ?? e.open0 ?? 0.85) + 0.5 * fear - 0.16 * smile - 0.12 * angry, 0, 1.6) * (1 - blink);
  const w = e.w * (1 + 0.06 * fear), hu = e.h * open, hl = e.hl * (1 - 1.3 * smile) * (0.45 + 0.55 * Math.min(1, open * 1.4)) * (1 + 0.5 * fear);
  const tin = -0.0012 - 0.0042 * angry + 0.0022 * sad, tout = (e.tilt || 0) * w + 0.003 * angry - 0.0042 * sad;
  const I = P(-w, tin), O = P(w, tout);
  const U1 = P(-w * 0.5, tin + hu * (1.3 - 0.95 * angry + 0.3 * sad)), U2 = P(w * 0.42, tout + hu * (1.3 + 0.15 * angry - 0.6 * sad));
  const L1 = P(w * 0.5, tout - hl * 1.3), L2 = P(-w * 0.45, tin - hl * 1.3);
  const upper = () => { c.moveTo(...I); c.bezierCurveTo(...U1, ...U2, ...O); };
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (open < 0.13) {                                   // occhio chiuso: una linea (ad arco in su se sorride)
    c.beginPath(); c.moveTo(...I); c.quadraticCurveTo(...P(0, (tin + tout) / 2 + (smile > 0.5 ? 0.0045 : -0.0038)), ...O);
    c.lineWidth = e.lashW * 1.1; c.strokeStyle = e.lash; c.stroke();
    return;
  }
  c.save(); c.beginPath(); upper(); c.bezierCurveTo(...L1, ...L2, ...I); c.closePath();
  c.fillStyle = e.white || '#F6F1E9'; c.fill(); c.clip();
  const ix = cx + (p.gazeX || 0) * w * 0.4, iy = cy + (p.gazeY || 0) * e.h * 0.45 + (hu - e.h) * 0.22 + 0.001, ir = e.ir;
  const g = c.createRadialGradient(ix, iy - ir * 0.25, ir * 0.1, ix, iy, ir);
  g.addColorStop(0, e.iris2 || mix(e.iris, '#ffffff', 0.25)); g.addColorStop(0.75, e.iris); g.addColorStop(1, e.irisRim || mix(e.iris, '#000000', 0.45));
  c.beginPath(); c.arc(ix, iy, ir, 0, TAU); c.fillStyle = g; c.fill();
  c.beginPath(); c.arc(ix, iy, ir * 0.46, 0, TAU); c.fillStyle = '#17100e'; c.fill();
  c.beginPath(); upper(); c.lineWidth = e.h * 0.6; c.strokeStyle = 'rgba(70,40,45,0.2)'; c.stroke();     // ombra della palpebra
  c.fillStyle = '#ffffff';
  c.beginPath(); c.arc(ix - ir * 0.34, iy + ir * 0.36, ir * 0.25, 0, TAU); c.fill();
  c.globalAlpha = 0.7; c.beginPath(); c.arc(ix + ir * 0.34, iy - ir * 0.34, ir * 0.11, 0, TAU); c.fill(); c.globalAlpha = 1;
  c.restore();
  if (e.hood && open > 0.3) {                          // palpebra pesante: pelle più scura tra la piega e le ciglia
    c.beginPath(); upper(); c.lineTo(...P(w * 0.98, tout + hu * 0.5 + 0.0035)); c.bezierCurveTo(...P(w * 0.4, tout + hu * 1.3 + 0.0062), ...P(-w * 0.5, tin + hu * 1.3 + 0.0058), ...P(-w * 0.95, tin + 0.0035)); c.closePath();
    c.fillStyle = F.ombra; c.globalAlpha = 0.5; c.fill(); c.globalAlpha = 1;
  }
  c.beginPath(); upper(); c.lineWidth = e.lashW; c.strokeStyle = e.lash; c.stroke();                         // ciglia
  if (e.ala) { c.beginPath(); c.moveTo(...O); c.quadraticCurveTo(...P(w * 1.12, tout + 0.0012), ...P(w * 1.24, tout + 0.0042)); c.lineWidth = e.lashW * 0.8; c.stroke(); }
  if (open > 0.35 && !e.hood) { c.beginPath(); c.moveTo(...P(-w * 0.8, tin + hu * 0.75 + 0.003)); c.bezierCurveTo(...P(-w * 0.4, tin + hu * 1.3 + 0.0048), ...P(w * 0.4, tout + hu * 1.3 + 0.0048), ...P(w * 0.92, tout + hu * 0.6 + 0.003));
    c.lineWidth = 0.0009; c.strokeStyle = F.linea; c.globalAlpha = 0.5; c.stroke(); c.globalAlpha = 1; }
  c.beginPath(); c.moveTo(...O); c.bezierCurveTo(...L1, ...L2, ...I); c.lineWidth = e.lashW * 0.42; c.strokeStyle = F.linea; c.globalAlpha = 0.55; c.stroke(); c.globalAlpha = 1;   // palpebra inferiore
  if (e.borse) { c.beginPath(); c.moveTo(...P(-w * 0.75, tin - e.hl * 1.5 - 0.0028)); c.quadraticCurveTo(...P(0, tin - e.hl * 1.5 - 0.0062), ...P(w * 0.8, tout - e.hl * 1.2 - 0.003));
    c.lineWidth = 0.001; c.strokeStyle = F.linea; c.globalAlpha = 0.4 + 0.3 * smile; c.stroke(); c.globalAlpha = 1; }
}
function sopracciglio(c, F, p, s) {
  const b = F.brow, e = F.eye, ang = M.clamp(p.angry || 0), sad = M.clamp((p.sad || 0) + 0.5 * (p.fear || 0));
  const up = (p.browUp || 0) * 0.0062 + (p.fear || 0) * 0.005 - ang * 0.0035;
  const P = (lx, ly) => [s * (e.x + b.dx + lx), e.y + b.y + ly + up];
  const A = P(-b.len / 2, -0.0012 - 0.005 * ang + 0.0046 * sad), Bm = P(-b.len * 0.05, b.arch + 0.0012 * ang), Cc = P(b.len / 2, -0.0022 + 0.0022 * ang - 0.0032 * sad);
  const N = 16, top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const k = i / N, m = 1 - k, x = m * m * A[0] + 2 * m * k * Bm[0] + k * k * Cc[0], y = m * m * A[1] + 2 * m * k * Bm[1] + k * k * Cc[1];
    const tx = 2 * m * (Bm[0] - A[0]) + 2 * k * (Cc[0] - Bm[0]), ty = 2 * m * (Bm[1] - A[1]) + 2 * k * (Cc[1] - Bm[1]), l = Math.hypot(tx, ty) || 1;
    const th = b.thick * (b.t0 + (b.t1 - b.t0) * k) * Math.sin(Math.PI * (0.12 + 0.88 * (1 - k * 0.55))) / 2;
    top.push([x - (ty / l) * th * s, y + (tx / l) * th * s]); bot.push([x + (ty / l) * th * s, y - (tx / l) * th * s]);
  }
  c.beginPath(); top.forEach((q, i) => (i ? c.lineTo(...q) : c.moveTo(...q))); bot.reverse().forEach((q) => c.lineTo(...q)); c.closePath();
  c.fillStyle = b.color; c.fill();
}
function bocca(c, F, p) {
  const m = F.mouth, open = M.clamp(p.mouth || 0), smile = M.clamp(p.smile || 0, -1, 1), wide = p.wide || 0, round = M.clamp(p.round || 0), grin = M.clamp(p.grin || 0);
  const w = m.w * (1 + 0.22 * wide - 0.34 * round + 0.16 * Math.max(0, smile) + 0.25 * grin), y0 = m.y, yc = y0 + 0.0068 * smile + 0.002 * grin;
  c.lineCap = 'round'; c.lineJoin = 'round';
  // pieghe ai lati della bocca (più marcate col sorriso)
  const fold = (m.pieghe || 0) + 0.5 * Math.max(0, smile) * (m.pieghe ? 1 : 0.5) + 0.4 * grin;
  if (fold > 0.05) for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * (F.nose.w + 0.004), F.nose.y - 0.002); c.quadraticCurveTo(s * (w + 0.011), y0 + 0.012, s * (w + 0.0085), yc - 0.006);
    c.lineWidth = 0.0011; c.strokeStyle = F.linea; c.globalAlpha = Math.min(0.8, 0.45 * fold); c.stroke(); c.globalAlpha = 1; }
  if (open < 0.06 && grin < 0.1) {
    const dip = y0 - 0.0052 * smile - 0.0006;
    c.beginPath(); c.moveTo(-w * 0.7, dip - 0.0016); c.quadraticCurveTo(0, dip - m.lipL * 2.6, w * 0.7, dip - 0.0016); c.quadraticCurveTo(0, dip - 0.0016 - 0.0012 * smile, -w * 0.7, dip - 0.0016);
    c.fillStyle = m.lip; c.globalAlpha = m.lipA ?? 0.9; c.fill(); c.globalAlpha = 1;                                   // labbro inferiore
    if (m.lipU > 0.0012) { c.beginPath(); c.moveTo(-w * 0.92, yc - 0.0004); c.bezierCurveTo(-w * 0.4, dip + m.lipU * 2.2, -w * 0.08, dip + m.lipU * 1.6, 0, dip + m.lipU * 1.1);
      c.bezierCurveTo(w * 0.08, dip + m.lipU * 1.6, w * 0.4, dip + m.lipU * 2.2, w * 0.92, yc - 0.0004); c.bezierCurveTo(w * 0.45, dip, -w * 0.45, dip, -w * 0.92, yc - 0.0004);
      c.fillStyle = m.lip; c.globalAlpha = m.lipA ?? 0.9; c.fill(); c.globalAlpha = 1; }                                  // labbro superiore
    c.beginPath(); c.moveTo(-w, yc); c.bezierCurveTo(-w * 0.45, dip, w * 0.45, dip, w, yc); c.lineWidth = m.lineW; c.strokeStyle = m.line; c.stroke();
    for (const s of [-1, 1]) { c.beginPath(); c.arc(s * w, yc, m.lineW * 0.75, 0, TAU); c.fillStyle = m.line; c.fill(); }
    return;
  }
  const Hh = 0.022 * Math.max(open, 0.3 * grin) * (1 + 0.25 * round - 0.12 * wide), top = y0 + 0.0016 + 0.001 * round - 0.0026 * Math.max(0, smile) + 0.0012 * grin, bot = y0 - Hh - 0.002 * Math.max(0, smile);
  const shape = () => { c.beginPath(); c.moveTo(-w, yc); c.bezierCurveTo(-w * 0.5, top + 0.0012, w * 0.5, top + 0.0012, w, yc);
    c.bezierCurveTo(w * (0.94 - 0.2 * round), bot + Hh * 0.35, w * 0.55, bot, 0, bot); c.bezierCurveTo(-w * 0.55, bot, -w * (0.94 - 0.2 * round), bot + Hh * 0.35, -w, yc); c.closePath(); };
  c.save(); shape(); c.fillStyle = '#3a1114'; c.fill(); c.clip();
  if (grin > 0.3) {                                    // denti stretti, sopra e sotto
    c.fillStyle = '#f4efe6'; c.fillRect(-w, bot, 2 * w, top - bot + 0.004);
    c.strokeStyle = 'rgba(120,100,95,0.55)'; c.lineWidth = 0.0005;
    for (let i = -5; i <= 5; i++) { c.beginPath(); c.moveTo(i * w * 0.19, top + 0.003); c.lineTo(i * w * 0.19, bot); c.stroke(); }
    c.beginPath(); c.moveTo(-w, (top + bot) / 2 + 0.0008); c.quadraticCurveTo(0, (top + bot) / 2 - 0.0012 * Math.max(0, smile), w, (top + bot) / 2 + 0.0008); c.lineWidth = 0.0009; c.strokeStyle = 'rgba(90,60,60,0.8)'; c.stroke();
  } else {
    c.beginPath(); c.ellipse(0, bot + Hh * 0.22, w * 0.62, Hh * 0.46, 0, 0, TAU); c.fillStyle = '#c8616c'; c.fill();                 // lingua
    if (open > 0.16) { c.fillStyle = '#f4efe6'; c.beginPath(); c.moveTo(-w, top + 0.004); c.lineTo(w, top + 0.004); c.lineTo(w * 0.86, top - 0.0036 - 0.001 * open); c.quadraticCurveTo(0, top - 0.0052 - 0.001 * open, -w * 0.86, top - 0.0036 - 0.001 * open); c.closePath(); c.fill(); }
  }
  c.restore();
  c.strokeStyle = m.lip; c.globalAlpha = m.lipA ?? 0.9;
  c.beginPath(); c.moveTo(-w, yc); c.bezierCurveTo(-w * 0.5, top + 0.0012, w * 0.5, top + 0.0012, w, yc); c.lineWidth = Math.max(0.0012, m.lipU * 1.5); c.stroke();
  c.beginPath(); c.moveTo(w * 0.93, yc - 0.001); c.bezierCurveTo(w * (0.94 - 0.2 * round), bot + Hh * 0.35, w * 0.55, bot, 0, bot); c.bezierCurveTo(-w * 0.55, bot, -w * (0.94 - 0.2 * round), bot + Hh * 0.35, -w * 0.93, yc - 0.001); c.lineWidth = m.lipL * 1.15; c.stroke();
  c.globalAlpha = 1;
}
// strato fisso: guance, rughe, ombre del naso, lentiggini, barba corta
function fisso(c, F) {
  const blob = (x, y, r, col) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
  const line = (pts, wd, a = 0.5) => { c.beginPath(); c.moveTo(pts[0], pts[1]); if (pts.length === 6) c.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); else c.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]); c.lineWidth = wd; c.strokeStyle = F.linea; c.globalAlpha = a; c.lineCap = 'round'; c.stroke(); c.globalAlpha = 1; };
  const e = F.eye, n = F.nose, m = F.mouth;
  for (const s of [-1, 1]) blob(s * F.blush.x, F.blush.y, F.blush.r, F.blush.color);
  blob(0, n.y - n.h * 0.2, n.w * 1.9, F.blush.color.replace(/[\d.]+\)$/, '0.16)'));
  // ombra sotto il naso e narici
  c.fillStyle = F.ombra; c.globalAlpha = 0.5; c.beginPath(); c.ellipse(0, n.y - n.h * 0.92, n.w * 1.05, n.h * 0.26, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
  if (F.rughe) {
    const a = 0.42 * F.rughe;
    const fy = e.y + F.brow.y + 0.02; line([-0.04, fy, 0, fy + 0.005, 0.04, fy], 0.0011, a); line([-0.044, fy + 0.011, 0, fy + 0.017, 0.044, fy + 0.011], 0.0011, a); line([-0.036, fy + 0.022, 0, fy + 0.027, 0.036, fy + 0.022], 0.001, a * 0.8);
    for (const s of [-1, 1]) {
      for (let i = -1; i <= 1; i++) line([s * (e.x + e.w + 0.004), e.y + i * 0.0035, s * (e.x + e.w + 0.009), e.y + i * 0.0058, s * (e.x + e.w + 0.0135), e.y + i * 0.0092 - 0.001], 0.0009, a);
      line([s * 0.012, m.y - 0.02, s * 0.0135, m.y - 0.026, s * 0.011, m.y - 0.032], 0.0009, a * 0.6);
    }
    line([-0.012, m.y - 0.024, 0, m.y - 0.0275, 0.012, m.y - 0.024], 0.001, a);
    for (const s of [-1, 1]) line([s * 0.006, e.y + F.brow.y + 0.004, s * 0.0048, e.y + F.brow.y + 0.009, s * 0.0058, e.y + F.brow.y + 0.014], 0.0009, a * 0.55);
  }
  if (F.lentiggini) { const r = rnd(11); c.fillStyle = F.lentiggini; for (let i = 0; i < 46; i++) { const s = i % 2 ? 1 : -1, x = s * r(0.012, 0.062), y = n.y + r(-0.004, 0.02); c.globalAlpha = r(0.35, 0.75); c.beginPath(); c.arc(x * (i < 8 ? 0.25 : 1), y, r(0.0006, 0.0011), 0, TAU); c.fill(); } c.globalAlpha = 1; }
  if (F.barba) { const r = rnd(4); c.fillStyle = F.barba; for (let i = 0; i < 3000; i++) { const x = r(-0.08, 0.08), y = r(-0.125, -0.03), ax = Math.abs(x);
      const jaw = y < m.y - 0.012 || ax > 0.045 + (y - m.y) * 0.4, baffi = ax < m.w + 0.006 && y > m.y + 0.004 && y < n.y - n.h * 0.9;
      if (!(jaw || baffi) || (ax < m.w * 0.9 && Math.abs(y - m.y) < 0.006)) continue;
      c.globalAlpha = r(0.08, 0.26) * M.clamp((-0.03 - y) / 0.02 + (baffi ? 1 : 0)); c.fillRect(x, y, 0.0009, 0.0009); } c.globalAlpha = 1; }
  if (F.neo) { c.fillStyle = 'rgba(110,60,45,0.8)'; c.beginPath(); c.arc(F.neo[0], F.neo[1], 0.0011, 0, TAU); c.fill(); }
}

// ------------------------------------------------------------------ testa
// F: { S:[rx,ry,rz], forma, skin, ombra, linea, eye, brow, nose, mouth, blush, rughe, lentiggini, barba, orecchie }
export function testa(F) {
  const head = new THREE.Group(), S = F.S, k = { ...DEF, ...(F.forma || {}) };
  const skinM = mat(F.skin);
  const cr = new THREE.SphereGeometry(1, 88, 60); cr.rotateY(-Math.PI / 2); deforma(cr, k);
  add(head, cr, skinM, null, S);
  const zAt = (x, y) => { const uy = y / S[1], [fx, fz] = fattori(uy, k), q = 1 - (x / (S[0] * fx)) ** 2 - uy ** 2; return S[2] * fz * Math.sqrt(Math.max(0, q)); };
  // pellicola della faccia: proiezione frontale (il disegno è la faccia vista di fronte)
  const W = 768, H = Math.round((768 * S[1]) / S[0] / 2) * 2, kpx = W / (2 * S[0]);
  const ft = G.canvasTexture(W, H);
  const dg = new THREE.SphereGeometry(1.005, 72, 56, Math.PI - 1.5, 3.0, 0.38, 2.6); dg.rotateY(-Math.PI / 2); deforma(dg, k, 1.005);
  { const p = dg.attributes.position, uv = dg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / 2.01, 0.5 + p.getY(i) / 2.01); }
  const decal = add(head, dg, new THREE.MeshLambertMaterial({ map: ft, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), null, S);
  decal.renderOrder = 1;
  const st = document.createElement('canvas'); st.width = W; st.height = H;
  { const c = st.getContext('2d'); c.setTransform(kpx, 0, 0, -kpx, W / 2, H / 2); fisso(c, F); }
  let last = '';
  function face(p = {}) {
    const key = ['blink', 'smile', 'fear', 'angry', 'sad', 'open', 'gazeX', 'gazeY', 'browUp', 'mouth', 'wide', 'round', 'grin'].map((n) => (p[n] ?? 0).toFixed?.(3) ?? p[n]).join('|');
    if (key === last) return; last = key;
    ft.draw((c) => { c.drawImage(st, 0, 0); c.setTransform(kpx, 0, 0, -kpx, W / 2, H / 2);
      for (const s of [-1, 1]) { occhio(c, F, p, s); sopracciglio(c, F, p, s); }
      bocca(c, F, p); });
  }
  // naso in rilievo (piccolo, un po' più roseo della pelle), narici
  const n = F.nose, ng = new THREE.SphereGeometry(1, 24, 18);
  { const p = ng.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > -0.2) { const t = (y + 0.2) / 1.2; p.setX(i, p.getX(i) * (1 - 0.62 * t)); p.setZ(i, p.getZ(i) * (1 - 0.45 * t) - 0.35 * t); } } ng.computeVertexNormals(); }
  const noseM = mat(mix(F.skin, n.tinta || '#d9897a', n.t ?? 0.16));
  add(head, ng, noseM, V(0, n.y, zAt(0, n.y) + n.d * 0.28), [n.w, n.h, n.d]);
  for (const s of [-1, 1]) add(head, sfera(1, 12), noseM, V(s * n.w * 0.72, n.y - n.h * 0.42, zAt(0, n.y) + n.d * 0.08), [n.w * 0.5, n.h * 0.36, n.d * 0.5]);
  // orecchie
  const o = F.orecchie || {}, ey = o.y ?? -0.01, [efx] = fattori(ey / S[1], k);
  for (const s of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(s * S[0] * efx * 0.97, ey, o.z ?? -0.012); ear.rotation.set(0, s * -0.35, s * -0.08); head.add(ear);
    add(ear, sfera(1, 18), skinM, null, [0.0075, o.h ?? 0.027, o.w ?? 0.017]);
    add(ear, sfera(1, 14), mat(mix(F.skin, '#b5644f', 0.35)), V(s * 0.0035, -0.001, 0.002), [0.005, (o.h ?? 0.027) * 0.62, (o.w ?? 0.017) * 0.55]);
  }
  face({});
  return { head, face, S, k, zAt, skinM, F };
}

// ------------------------------------------------------------------ capelli: calotta con l'attaccatura calcolata
// o: { polo:[x,y,z], scala, limite(phi) → theta massimo (0 = cima; phi = 0 davanti, positivo verso +x), base, chiaro, scuro, n, seme }
export function capelli(T, o) {
  const { head, S, k } = T, pole = V(...o.polo).normalize(), q = new THREE.Quaternion().setFromUnitVectors(UP, pole);
  const t = tex(1536, 768, (c, w, h) => {
    c.fillStyle = o.base; c.fillRect(0, 0, w, h);
    const r = rnd(o.seme || 3);
    for (let i = 0; i < (o.n || 560); i++) {
      const x = r() * w, y0 = r(0, 0.75) * h, len = r(0.12, 0.5) * h;
      c.strokeStyle = r() < 0.5 ? o.scuro : o.chiaro; c.globalAlpha = r(0.25, 0.65); c.lineWidth = r(1, 2.8);
      c.beginPath(); c.moveTo(x, y0); c.bezierCurveTo(x + r(-7, 7), y0 + len * 0.33, x + r(-7, 7), y0 + len * 0.66, x + r(-4, 4), y0 + len); c.stroke();
    }
    c.globalAlpha = 1;
    const img = c.getImageData(0, 0, w, h), d = img.data, p = V(0, 0, 0);
    for (let j = 0; j < h; j++) { const th = ((j + 0.5) / h) * Math.PI, sn = Math.sin(th), cs = Math.cos(th);
      for (let i = 0; i < w; i++) { const ph = ((i + 0.5) / w) * TAU;
        p.set(-Math.cos(ph) * sn, cs, Math.sin(ph) * sn).applyQuaternion(q);
        d[(j * w + i) * 4 + 3] = Math.round(255 * M.clamp((o.limite(Math.atan2(p.x, p.z)) - Math.acos(M.clamp(p.y, -1, 1))) * 70 + 0.5));
      } }
    c.putImageData(img, 0, 0);
  });
  const g = new THREE.SphereGeometry(1, 88, 60); g.applyQuaternion(q); deforma(g, { ...k, jaw: k.jaw * 0.6 });
  const sc = o.scala || 1.045, m = add(head, g, new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.04, side: THREE.DoubleSide }), V(0, o.dy || 0, o.dz || 0), [S[0] * sc * (o.sx || 1), S[1] * sc * (o.sy || 1), S[2] * sc * (o.sz || 1)]);
  m.renderOrder = o.ordine || 2;
  return m;
}
// texture di ciocche (per crocchie, code, ciuffi)
export const ciocche = (base, chiaro, scuro, n = 90, seme = 5) => tex(256, 256, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); const r = rnd(seme);
  for (let i = 0; i < n; i++) { const x = r() * w; c.strokeStyle = r() < 0.5 ? scuro : chiaro; c.globalAlpha = r(0.3, 0.7); c.lineWidth = r(1.2, 3); c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + r(-10, 10), h * 0.33, x + r(-10, 10), h * 0.66, x + r(-6, 6), h); c.stroke(); } });

// ------------------------------------------------------------------ mano
// A riposo: polso all'origine, dita verso -y, dorso verso +z, pollice verso -x (mano del braccio a +x; l'altra è specchiata).
const POSE_MANO = {
  rilassata: { dita: [0.2, 0.26, 0.32, 0.4], pollice: 0.25, apri: 0.3 }, aperta: { dita: [0.03, 0.02, 0.03, 0.05], pollice: 0, apri: 1 }, piatta: { dita: [0.05, 0.05, 0.06, 0.08], pollice: 0.12, apri: 0.2 },
  pugno: { dita: [1, 1, 1, 1], pollice: 0.9, apri: 0 }, indice: { dita: [0.02, 1, 1, 1], pollice: 0.9, apri: 0 }, presa: { dita: [0.5, 0.56, 0.6, 0.66], pollice: 0.4, apri: 0.2 }, pizzico: { dita: [0.62, 0.78, 0.86, 0.92], pollice: 0.72, apri: 0 },
};
export function mano(skinM, nailM, s = 1) {
  const g = new THREE.Group(), h = new THREE.Group(); g.add(h); h.scale.setScalar(s);
  add(h, sfera(1, 24), skinM, V(0, -0.046, 0), [0.04, 0.05, 0.0155]);
  add(h, sfera(1, 16), skinM, V(-0.014, -0.032, -0.005), [0.02, 0.027, 0.0135]);
  const X = [-0.0255, -0.0085, 0.0085, 0.0245], Y = [-0.086, -0.091, -0.088, -0.08], L = [[0.031, 0.021, 0.018], [0.034, 0.023, 0.019], [0.031, 0.021, 0.018], [0.024, 0.016, 0.015]], R = [0.0088, 0.009, 0.0086, 0.0076];
  const Fg = X.map((x, i) => { let p = h; return L[i].map((len, j) => { const jg = new THREE.Group(); jg.position.set(j ? 0 : x, j ? -L[i][j - 1] : Y[i], 0); p.add(jg);
    segmento(jg, len, R[i] * (1 - 0.07 * j), R[i] * (1 - 0.07 * (j + 1)), skinM, { seg: 12 });
    if (j === 2) add(jg, sfera(1, 10), nailM, V(0, -len * 0.6, R[i] * 0.66), [R[i] * 0.7, len * 0.36, R[i] * 0.26]);
    p = jg; return jg; }); });
  const t0 = new THREE.Group(); t0.position.set(-0.031, -0.03, -0.004); h.add(t0); segmento(t0, 0.03, 0.0115, 0.0105, skinM, { seg: 12 });
  const t1 = new THREE.Group(); t1.position.y = -0.03; t0.add(t1); segmento(t1, 0.026, 0.0102, 0.0092, skinM, { seg: 12 });
  const t2 = new THREE.Group(); t2.position.y = -0.026; t1.add(t2); segmento(t2, 0.02, 0.009, 0.008, skinM, { seg: 12 });
  add(t2, sfera(1, 10), nailM, V(-0.0062, -0.012, 0.0015), [0.0024, 0.0075, 0.006]);
  g.userData.pose = (p = 'rilassata') => {
    const P = typeof p === 'string' ? POSE_MANO[p] || POSE_MANO.rilassata : { ...POSE_MANO.rilassata, ...p };
    Fg.forEach((js, i) => { const c = P.dita[i]; js[0].rotation.set(c * 1.35, 0, (i - 1.5) * 0.075 * (P.apri ?? 0.3)); js[1].rotation.x = c * 1.5; js[2].rotation.x = c * 1.1; });
    const tc = P.pollice; t0.rotation.set(0.25 + 0.55 * tc, 0.5 * tc, -0.85 + 0.45 * tc); t1.rotation.set(0.12 + 0.5 * tc, 0, 0.25 * tc); t2.rotation.set(0.1 + 0.7 * tc, 0, 0);
  };
  g.userData.pose('rilassata');
  return g;
}

// ------------------------------------------------------------------ braccio con cinematica inversa
// o: { sx, sy, sz, L1, L2, r0, r1, r2, manica, polsino, skin, nail, mano (scala) }; side: -1 = x negativo
export function braccio(upper, side, o) {
  const S = V(side * o.sx, o.sy, o.sz || 0), { L1, L2 } = o;
  const gU = segmento(upper, L1, o.r0, o.r1, o.manica), gF = segmento(upper, L2, o.r1, o.r2, o.manica2 || o.manica);
  if (o.polsino) add(gF, new THREE.CylinderGeometry(o.r2 * 1.14, o.r2 * 1.2, 0.03, 20), o.polsino, V(0, -L2 + 0.012, 0));
  if (o.gomitoM) add(gF, sfera(o.r1 * 1.03, 18), o.gomitoM);
  const gH = new THREE.Group(); upper.add(gH);
  const hand = mano(o.skin, o.nail, o.mano || 1); if (side < 0) hand.scale.x = -1; gH.add(hand);
  const riposo = [side * (o.sx + 0.035), o.sy - (L1 + L2) * 0.985, (o.sz || 0) + 0.035];
  const B = new THREE.Matrix4();
  function a(q = {}) {
    const T = V(...(q.a || riposo)), d = T.clone().sub(S), len = M.clamp(d.length(), Math.abs(L1 - L2) + 0.01, L1 + L2 - 0.003), dir = d.normalize();
    const aa = (L1 * L1 - L2 * L2 + len * len) / (2 * len), hh = Math.sqrt(Math.max(0, L1 * L1 - aa * aa));
    const pole = V(...(q.gomito || [side * 0.6, -0.3, -0.75])); pole.addScaledVector(dir, -pole.dot(dir)).normalize();
    const E = S.clone().addScaledVector(dir, aa).addScaledVector(pole, hh), Wp = S.clone().addScaledVector(dir, len);
    gU.position.copy(S); gU.quaternion.setFromUnitVectors(DOWN, E.clone().sub(S).normalize());
    const fd = Wp.clone().sub(E).normalize();
    gF.position.copy(E); gF.quaternion.setFromUnitVectors(DOWN, fd);
    const yh = (q.dita ? V(...q.dita).normalize() : fd.clone()).negate(), zh = V(...(q.dorso || [0, 0, 1]));
    zh.addScaledVector(yh, -zh.dot(yh)); if (zh.lengthSq() < 1e-6) { zh.set(1, 0, 0); zh.addScaledVector(yh, -zh.dot(yh)); } zh.normalize();
    gH.position.copy(Wp); gH.quaternion.setFromRotationMatrix(B.makeBasis(yh.clone().cross(zh), yh, zh));
    hand.userData.pose(q.mano || 'rilassata');
  }
  a({});
  return { a, gH, hand, S, riposo, side };
}

// ------------------------------------------------------------------ gamba (anca + ginocchio) con la scarpa
export function gamba(root, side, o) {
  const hip = new THREE.Group(); hip.position.set(side * o.hx, o.hy, 0); root.add(hip);
  segmento(hip, o.T1, o.r0, o.r1, o.mat);
  const knee = new THREE.Group(); knee.position.y = -o.T1; hip.add(knee);
  segmento(knee, o.T2, o.r1, o.r2, o.mat, { capB: false });
  const foot = new THREE.Group(); foot.position.y = -o.T2; knee.add(foot);
  add(foot, sfera(1, 20), o.scarpa, V(0, -0.028, 0.04), [o.r2 * 1.25, 0.05, 0.105 * (o.piede || 1)]);
  add(foot, sfera(1, 18), o.scarpa, V(0, 0.0, 0), [o.r2 * 1.2, 0.05, o.r2 * 1.25]);
  add(foot, sfera(1, 18), o.suola, V(0, -0.064, 0.04), [o.r2 * 1.3, 0.015, 0.11 * (o.piede || 1)]);
  return { hip, knee, foot, set(a = {}) { hip.rotation.set(-(a.avanti || 0), 0, side * (a.apri || 0)); knee.rotation.x = a.ginocchio || 0; foot.rotation.x = a.piede || 0; } };
}

// battiti di ciglia a tempi fissi (seme), chiusura rapida e riapertura più lenta
export function battito(t, seme = 1) {
  let b = 0, tb = 0.7 + 1.3 * M.hash01(0, seme);
  for (let kq = 0; tb < t + 0.3 && kq < 400; kq++) { const d = t - tb; if (d >= 0 && d <= 0.24) b = Math.max(b, d < 0.06 ? d / 0.06 : Math.max(0, 1 - (d - 0.06) / 0.17)); tb += 2.1 + 2.6 * M.hash01(kq + 1, seme); }
  return b;
}
