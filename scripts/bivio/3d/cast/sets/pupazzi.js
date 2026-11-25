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
import { THREE, V, DOWN, UP, rnd, tex, mat, sfera, add, segmento, loft } from './stile.js';

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
  if (n.tipo === 'vero') {                             // naso adulto: ombra corta sotto la punta e le pieghe delle due narici
    c.fillStyle = F.ombra; c.globalAlpha = n.ombra ?? 0.3; c.beginPath(); c.ellipse(0, n.y - n.h * 1.07, n.w * 0.78, n.h * 0.15, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
    for (const s of [-1, 1]) line([s * n.w * 1.06, n.y - n.h * 0.16, s * n.w * 1.34, n.y - n.h * 0.56, s * n.w * 0.96, n.y - n.h * 0.9], 0.001, n.pieghe ?? 0.42);
  } else {
    blob(0, n.y - n.h * 0.2, n.w * 1.9, F.blush.color.replace(/[\d.]+\)$/, '0.16)'));
    // ombra sotto il naso e narici
    c.fillStyle = F.ombra; c.globalAlpha = n.ombra ?? 0.5; c.beginPath(); c.ellipse(0, n.y - n.h * 0.92, n.w * 1.05, n.h * 0.26, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
  }
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
  if (F.graffi) {                                      // tre graffi freschi: { x, y, ang, len }
    const g = F.graffi; c.save(); c.translate(g.x, g.y); c.rotate(g.ang || 0); c.lineCap = 'round';
    for (let i = -1; i <= 1; i++) { const y = i * 0.0052, l = (g.len || 0.03) * (1 - 0.18 * Math.abs(i));
      c.strokeStyle = 'rgba(214,120,110,0.5)'; c.lineWidth = 0.0034; c.beginPath(); c.moveTo(-l / 2, y); c.quadraticCurveTo(0, y + 0.0016, l / 2, y - 0.0008); c.stroke();
      c.strokeStyle = '#A3261F'; c.lineWidth = 0.0013; c.beginPath(); c.moveTo(-l / 2, y); c.quadraticCurveTo(0, y + 0.0016, l / 2, y - 0.0008); c.stroke(); }
    c.restore(); }
}

// naso adulto: dorso stretto dalla radice (tra gli occhi) alla punta, narici. Le normali sono mescolate con quelle della
// faccia (n.piatto), così di fronte resta un rilievo morbido e non un cono, mentre di profilo la sagoma c'è tutta.
// n: { tipo:'vero', y (centro), w (mezza larghezza alle narici), h, d (sporgenza), alto (radice, in unità di h), piatto, t, tinta }
function nasoVero(head, F, zAt) {
  const n = F.nose, NU = 22, NV = 40, top = n.alto ?? 1.9, giu = 0.0012;
  const wS = chiavi([[-1, 0.5], [-0.52, 1], [0.0, 0.66], [0.6, 0.46], [top, 0.54]]);
  const dS = chiavi([[-1, 0], [-0.84, 0.6], [-0.52, 1], [-0.1, 0.86], [0.6, 0.52], [1.25, 0.22], [top, 0]]);
  const pos = [], fn = [], idx = [], e = 0.0008;
  const sup = (u, s) => { const x = u * wS(s) * n.w, y = n.y + s * n.h; return [x, y, zAt(x, y) - giu + dS(s) * n.d * Math.pow(Math.max(0, 1 - u * u), 0.8)]; };
  for (let j = 0; j <= NV; j++) { const s = -1 + ((top + 1) * j) / NV;
    for (let i = 0; i <= NU; i++) { const q = sup(-1 + (2 * i) / NU, s), [x, y] = q; pos.push(...q);
      const gx = (zAt(x + e, y) - zAt(x - e, y)) / (2 * e), gy = (zAt(x, y + e) - zAt(x, y - e)) / (2 * e), l = Math.hypot(gx, gy, 1); fn.push(-gx / l, -gy / l, 1 / l); } }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + 1, c2 = a + NU + 1; idx.push(a, b, c2 + 1, a, c2 + 1, c2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const N = g.attributes.normal, kf = n.piatto ?? 0.6;
  for (let i = 0; i < N.count; i++) { const x = N.getX(i) * (1 - kf) + fn[i * 3] * kf, y = N.getY(i) * (1 - kf) + fn[i * 3 + 1] * kf, z = N.getZ(i) * (1 - kf) + fn[i * 3 + 2] * kf, l = Math.hypot(x, y, z) || 1; N.setXYZ(i, x / l, y / l, z / l); }
  const m = mat(mix(F.skin, n.tinta || '#d9897a', n.t ?? 0.04)), nose = new THREE.Mesh(g, m); head.add(nose);
  const buio = mat(mix(F.skin, '#3E1A14', n.narici ?? 0.62));
  for (const s of [-1, 1]) { const q = sup(s * 0.46, -0.88); add(head, sfera(1, 10), buio, V(q[0], q[1] + n.h * 0.02, q[2] - n.d * 0.1), [n.w * 0.2, n.h * 0.1, n.d * 0.16]); }
  return nose;
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
  const n = F.nose;
  if (n.tipo === 'vero') nasoVero(head, F, zAt); else {
  const ng = new THREE.SphereGeometry(1, 24, 18);
  { const p = ng.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > -0.2) { const t = (y + 0.2) / 1.2; p.setX(i, p.getX(i) * (1 - 0.62 * t)); p.setZ(i, p.getZ(i) * (1 - 0.45 * t) - 0.35 * t); } } ng.computeVertexNormals(); }
  const noseM = mat(mix(F.skin, n.tinta || '#d9897a', n.t ?? 0.16));
  add(head, ng, noseM, V(0, n.y, zAt(0, n.y) + n.d * 0.28), [n.w, n.h, n.d]);
  for (const s of [-1, 1]) add(head, sfera(1, 12), noseM, V(s * n.w * 0.72, n.y - n.h * 0.42, zAt(0, n.y) + n.d * 0.08), [n.w * 0.5, n.h * 0.36, n.d * 0.5]);
  }
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
        const fi = Math.atan2(p.x, p.z); d[(j * w + i) * 4 + 3] = Math.round(255 * M.clamp((o.limite(fi) - Math.acos(M.clamp(p.y, -1, 1))) * (o.netto ? o.netto(fi) : 70) + 0.5));
      } }
    c.putImageData(img, 0, 0);
  });
  const g = new THREE.SphereGeometry(1, 88, 60); g.applyQuaternion(q); deforma(g, { ...k, jaw: k.jaw * 0.6 });
  const sc = o.scala || 1.045, m = add(head, g, new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.04, side: THREE.DoubleSide }), V(0, o.dy || 0, o.dz || 0), [S[0] * sc * (o.sx || 1), S[1] * sc * (o.sy || 1), S[2] * sc * (o.sz || 1)]);
  m.renderOrder = o.ordine || 2;
  return m;
}
// chioma scolpita: una massa unica sopra la calotta corta. Lo spessore dipende dalla direzione (volume davanti, niente ai lati) e la superficie
// ha i solchi della pettinata, così la luce disegna le ciocche. th = angolo dalla cima, ph = 0 davanti (positivo verso +x).
// o: { limite(ph) → fin dove arriva, spessore(th, ph) (frazione del raggio), bordo(ph) (rad in cui sale dal bordo), dir (verso della pettinata: 0 = +x, negativo = all'indietro),
//      solchi: { k, amp }, base, chiaro, scuro, n, seme }
export function chioma(T, o) {
  const { head, S, k } = T, NT = 64, NP = 160, pos = [], uv = [], idx = [], be = o.dir ?? -0.4, cb = Math.cos(be), sb = Math.sin(be), so = o.solchi || { k: 40, amp: 0 };
  for (let j = 0; j <= NT; j++) for (let i = 0; i <= NP; i++) {
    const ph = -Math.PI + (TAU * i) / NP, lim = o.limite(ph), th = (lim * j) / NT, u = th * Math.sin(ph), v = th * Math.cos(ph), lungo = u * cb + v * sb, trav = -u * sb + v * cb;
    const e0 = M.clamp((lim - th) / (o.bordo ? o.bordo(ph) : 0.08)), e = e0 * e0 * (3 - 2 * e0);
    const onda = 0.5 + 0.5 * Math.sin(trav * so.k + 1.6 * Math.sin(lungo * 2.7 + 0.6) + 0.8 * Math.sin(trav * 6.1 + 1.3));
    const sc = 1.034 + e * (o.spessore(th, ph) + so.amp * (onda - 0.5) * 2);
    const x = Math.sin(th) * Math.sin(ph), y = Math.cos(th), z = Math.sin(th) * Math.cos(ph);
    pos.push(x * S[0] * sc, y * S[1] * sc, z * S[2] * sc * (z < 0 ? k.back : 1)); uv.push(0.5 + trav * 0.3, 0.5 + lungo * 0.3);
  }
  for (let j = 0; j < NT; j++) for (let i = 0; i < NP; i++) { const a = j * (NP + 1) + i, c2 = a + NP + 1; idx.push(a, c2, a + 1, a + 1, c2, c2 + 1); }
  const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); ge.setIndex(idx); ge.computeVertexNormals();
  const t = tex(1024, 1024, (c, w, h) => { c.fillStyle = o.base; c.fillRect(0, 0, w, h); const r = rnd(o.seme || 5);
    for (let i = 0; i < (o.n || 240); i++) { const x = r() * w, y0 = r(-0.2, 0.8) * h, len = r(0.2, 0.6) * h; c.strokeStyle = r() < 0.5 ? o.scuro : o.chiaro; c.globalAlpha = r(0.18, 0.5); c.lineWidth = r(1.5, 4.5);
      c.beginPath(); c.moveTo(x, y0); c.bezierCurveTo(x + r(-9, 9), y0 + len * 0.33, x + r(-9, 9), y0 + len * 0.66, x + r(-5, 5), y0 + len); c.stroke(); } });
  const m = new THREE.Mesh(ge, new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide })); head.add(m);
  return m;
}
// ciuffi in rilievo sopra la calotta: ognuno segue la curva della testa da (th, ph) a (th + dth, ph + dph) e si stacca dal cuoio capelluto.
// th = angolo dalla cima, ph = 0 davanti (positivo verso +x). lista: [{ th, ph, dth, dph, s0, s1 (distanza dal cranio: 1 = pelle), w, h, c (indice colore) }]
// colori: [[base, chiaro, scuro], …]
export function ciuffi(T, { lista, colori, righe = 22 }) {
  const { head, S, k } = T, g = new THREE.Group(); head.add(g);
  const mats = colori.map((c, i) => new THREE.MeshLambertMaterial({ map: ciocche(c[0], c[1], c[2], righe, 11 + i * 7) }));
  const P = (th, ph, sc) => { const x = Math.sin(th) * Math.sin(ph), y = Math.cos(th), z = Math.sin(th) * Math.cos(ph); return V(x * S[0] * sc, y * S[1] * sc, z * S[2] * sc * (z < 0 ? k.back : 1)); };
  const NS = 12, NU = 10;
  for (const q of lista) {
    const C = (s) => P(q.th + q.dth * s, q.ph + q.dph * s, q.s0 + (q.s1 - q.s0) * Math.sin(Math.min(1, s / 0.8) * Math.PI / 2) ** 1.3 - (q.giu || 0) * Math.max(0, s - 0.8) / 0.2);
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= NS; j++) { const s = j / NS, c = C(s), t = C(Math.min(1, s + 0.02)).sub(C(Math.max(0, s - 0.02))).normalize();
      const n = c.clone().normalize(); n.addScaledVector(t, -n.dot(t)).normalize(); const b = t.clone().cross(n).normalize();
      const r = Math.sin(Math.PI * (0.14 + 0.86 * s)) ** 0.85;
      for (let i = 0; i <= NU; i++) { const a = (i / NU) * TAU; pos.push(c.x + r * (Math.cos(a) * q.w * b.x + Math.sin(a) * q.h * n.x), c.y + r * (Math.cos(a) * q.w * b.y + Math.sin(a) * q.h * n.y), c.z + r * (Math.cos(a) * q.w * b.z + Math.sin(a) * q.h * n.z)); uv.push(0.15 + 0.7 * (i / NU) + (q.u || 0), s); } }
    for (let j = 0; j < NS; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, c2 = a + NU + 1; idx.push(a, c2, a + 1, a + 1, c2, c2 + 1); }
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); ge.setIndex(idx); ge.computeVertexNormals();
    const m = new THREE.Mesh(ge, mats[(q.c || 0) % mats.length]); m.material.side = THREE.DoubleSide; g.add(m);
  }
  return g;
}
// texture di ciocche (per crocchie, code, ciuffi)
export const ciocche = (base, chiaro, scuro, n = 90, seme = 5) => tex(256, 256, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); const r = rnd(seme);
  for (let i = 0; i < n; i++) { const x = r() * w; c.strokeStyle = r() < 0.5 ? scuro : chiaro; c.globalAlpha = r(0.3, 0.7); c.lineWidth = r(1.2, 3); c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + r(-10, 10), h * 0.33, x + r(-10, 10), h * 0.66, x + r(-6, 6), h); c.stroke(); } });

// ------------------------------------------------------------------ mano
// A riposo: polso all'origine, dita verso -y, dorso verso +z, pollice verso -x (mano del braccio a +x; l'altra è specchiata).
// Palmo a sezioni (largo alle nocche, stretto al polso, dorso più piatto del palmo), nocche in rilievo, dita rastremate a tre falangi,
// pollice che parte dal polso dentro il suo monte e si oppone alle dita.
// Posa: { dita: [indice, medio, anulare, mignolo] 0..1, pollice 0 (aperto di lato) .. 1 (chiuso davanti al palmo), apri (dita allargate),
//         k: [nocca, falange, punta] (quanto piega ogni giuntura, in radianti a dita = 1), fletti (pieghe del pollice, se diverse da pollice),
//         pv: [metacarpo, falange, punta] (le direzioni dei tre pezzi del pollice, nello spazio della mano, per le prese precise), pb (verso dell'unghia) }
const POSE_MANO = {
  rilassata: { dita: [0.2, 0.26, 0.32, 0.4], pollice: 0.3, apri: 0.3 }, aperta: { dita: [0.03, 0.02, 0.03, 0.05], pollice: 0, apri: 1 }, piatta: { dita: [0.05, 0.05, 0.06, 0.08], pollice: 0.14, apri: 0.15 },
  pugno: { dita: [1, 1, 1, 1], pollice: 0.95, apri: 0 }, indice: { dita: [0.02, 1, 1, 1], pollice: 0.95, apri: 0 }, presa: { dita: [0.5, 0.56, 0.6, 0.66], pollice: 0.45, apri: 0.2 }, pizzico: { dita: [0.62, 0.78, 0.86, 0.92], pollice: 0.72, apri: 0 },
  // le dita avvolgono una sbarra orizzontale (maniglia, ringhiera): la sbarra passa sotto le nocche, a y = -0.095 e z = -0.0245 della mano; il pollice chiude da sotto
  // un telefono tenuto dritto per filmare, di traverso dietro le dita: le punte agganciano il bordo lontano, il mignolo resta disteso, il pollice è sullo schermo
  filma: { dita: [1, 1, 1, 0.12], pollice: 1, apri: 0.1, k: [0, 0.05, 1.3], pv: [[-0.25, -0.62, -0.74], [0.106, -0.984, 0.138], [0.2, -0.97, 0.06]], pb: [-0.3, 0, -1] },
  // un tesserino o un portafoglio tenuto dritto contro le dita, dal lato del palmo: dita distese dietro, pollice davanti in basso
  tessera: { dita: [0.03, 0.02, 0.03, 0.05], pollice: 1, apri: 0.05, pv: [[-0.3, -0.6, -0.74], [0.279, -0.953, 0.114], [0.35, -0.93, 0.05]], pb: [-0.2, 0, -1] },
  leva: { dita: [0.95, 1, 1, 1], pollice: 1, apri: 0, k: [0.72, 1.62, 1.0], pv: [[-0.42, -0.62, -0.66], [-0.083, -0.639, -0.766], [0.3, -0.93, 0.05]], pb: [-0.8, 0.1, -0.3] },
};
const K_DITA = [1.35, 1.5, 1.1];
const D_POLLICE = [V(-0.76, -0.64, -0.1), V(-0.3, -0.76, -0.58)], B_POLLICE = [V(-0.28, 0.12, 0.95), V(-0.88, 0.1, 0.46)];
export function mano(skinM, nailM, s = 1) {
  const g = new THREE.Group(), h = new THREE.Group(); g.add(h); h.scale.setScalar(s);
  add(h, loft([{ y: -0.1005, rx: 0.0006, rz: 0.0003 }, { y: -0.1, rx: 0.031, rz: 0.0045, n: 2.4 }, { y: -0.097, rx: 0.0375, rzf: 0.0088, rzb: 0.0088, n: 2.8 }, { y: -0.09, rx: 0.0405, rzf: 0.0118, rzb: 0.0122, n: 3 },
    { y: -0.075, rx: 0.042, rzf: 0.0128, rzb: 0.0146, n: 2.9 }, { y: -0.05, rx: 0.0405, rzf: 0.0138, rzb: 0.0166, n: 2.7 }, { y: -0.025, rx: 0.036, rzf: 0.0148, rzb: 0.0186, n: 2.5 },
    { y: -0.006, rx: 0.0305, rzf: 0.0166, rzb: 0.019, n: 2.3 }, { y: 0.008, rx: 0.027, rzf: 0.017, rzb: 0.018, n: 2.1 }, { y: 0.016, rx: 0.018, rz: 0.011 }, { y: 0.0165, rx: 0.0006, rz: 0.0003 }], 40), skinM);
  const X = [-0.0285, -0.0096, 0.0094, 0.0272], Y = [-0.0925, -0.096, -0.0935, -0.0865], L = [[0.037, 0.0235, 0.0205], [0.0405, 0.0265, 0.0215], [0.0375, 0.0245, 0.0205], [0.0295, 0.0185, 0.0185]], R = [0.0097, 0.01, 0.0095, 0.0085];
  const RR = [1, 0.93, 0.86, 0.77];
  const Fg = X.map((x, i) => { let p = h; return L[i].map((len, j) => { const jg = new THREE.Group(); jg.position.set(j ? 0 : x, j ? -L[i][j - 1] : Y[i], 0); p.add(jg);
    segmento(jg, len, R[i] * RR[j], R[i] * RR[j + 1], skinM, { seg: 14 });
    if (!j) add(jg, sfera(1, 16), skinM, V(0, 0, 0.0028), [R[i] * 1.07, R[i] * 1.2, R[i] * 1.0]);      // la nocca
    if (j === 2) add(jg, sfera(1, 12), nailM, V(0, -len * 0.6, R[i] * 0.5 + 0.0005), [R[i] * 0.6, len * 0.34, R[i] * 0.3]);
    p = jg; return jg; }); });
  const t0 = new THREE.Group(); t0.position.set(-0.02, -0.019, -0.007); h.add(t0); segmento(t0, 0.041, 0.0168, 0.0132, skinM, { seg: 24 });
  add(t0, sfera(1, 24), skinM, V(0.0065, -0.02, -0.0035), [0.0165, 0.028, 0.0158]);      // il monte del pollice
  const t1 = new THREE.Group(); t1.position.y = -0.041; t0.add(t1); segmento(t1, 0.031, 0.0126, 0.0114, skinM, { seg: 16 });
  const t2 = new THREE.Group(); t2.position.y = -0.031; t1.add(t2); segmento(t2, 0.0255, 0.0114, 0.0099, skinM, { seg: 16 });
  add(t2, sfera(1, 12), nailM, V(0, -0.0155, 0.0061), [0.0068, 0.0088, 0.0036]);
  const d = V(0, 0, 0), b = V(0, 0, 0), B = new THREE.Matrix4(), q0 = new THREE.Quaternion();
  g.userData.pose = (p = 'rilassata') => {
    const P = typeof p === 'string' ? POSE_MANO[p] || POSE_MANO.rilassata : { ...POSE_MANO.rilassata, ...p }, k = P.k || K_DITA;
    Fg.forEach((js, i) => { const c = P.dita[i]; js[0].rotation.set(c * k[0], 0, (i - 1.5) * 0.075 * (P.apri ?? 0.3)); js[1].rotation.x = c * k[1]; js[2].rotation.x = c * k[2]; });
    const tc = P.pollice, fl = P.fletti ?? tc;
    if (P.pv) d.set(...P.pv[0]).normalize().negate(), b.set(...(P.pb || [-0.88, 0.1, 0.46])); else d.lerpVectors(D_POLLICE[0], D_POLLICE[1], tc).normalize().negate(), b.lerpVectors(B_POLLICE[0], B_POLLICE[1], tc);
    b.addScaledVector(d, -b.dot(d)).normalize(); t0.quaternion.setFromRotationMatrix(B.makeBasis(d.clone().cross(b), d, b));
    if (P.pv) { q0.copy(t0.quaternion).invert(); t1.quaternion.setFromUnitVectors(DOWN, d.set(...P.pv[1]).normalize().applyQuaternion(q0));
      q0.copy(t0.quaternion).multiply(t1.quaternion).invert(); t2.quaternion.setFromUnitVectors(DOWN, d.set(...P.pv[2]).normalize().applyQuaternion(q0)); }
    else { t1.rotation.set(0.08 + 0.75 * fl, 0, 0); t2.rotation.set(0.06 + 0.95 * fl, 0, 0); }
  };
  g.userData.pose('rilassata');
  return g;
}

// ------------------------------------------------------------------ braccio con cinematica inversa
// o: { sx, sy, sz, L1, L2, r0, r1, r2, manica, manica2, polsino, gomitoM, orlo, skin, nail, mano (scala), polsoZ }; side: -1 = x negativo
// polsoZ (per gli avambracci nudi): mezzo spessore del polso; l'avambraccio si appiattisce verso la mano e ruota con lei, come quello vero.
export function braccio(upper, side, o) {
  const S = V(side * o.sx, o.sy, o.sz || 0), { L1, L2 } = o, mF = o.manica2 || o.manica;
  const gU = segmento(upper, L1, o.r0, o.r1, o.manica);
  let gF;
  if (o.polsoZ) { gF = new THREE.Group(); upper.add(gF); const N = 8, rA = o.r1 * 0.94;       // il gomito è la sfera del braccio (l'avambraccio parte un filo più stretto: due superfici uguali sfarfallano)
    add(gF, loft(Array.from({ length: N + 1 }, (_, i) => { const u = 1 - i / N, e = u * u * (3 - 2 * u), pancia = 0.0035 * Math.sin(Math.PI * Math.min(1, u * 1.6)) ** 2; return { y: -L2 * u, rx: rA + (o.r2 - rA) * u + pancia, rz: rA + (o.polsoZ - rA) * e + pancia * 0.6 }; }), 28), mF);
    add(gF, sfera(1, 18), mF, V(0, -L2, 0), [o.r2, Math.min(o.r2, o.polsoZ) * 0.95, o.polsoZ]);
  } else gF = segmento(upper, L2, o.r1 * 0.94, o.r2, mF, { capA: false });
  if (o.polsino) add(gF, new THREE.CylinderGeometry(o.r2 * 1.14, o.r2 * 1.2, 0.03, 20), o.polsino, V(0, -L2 + 0.012, 0));
  if (o.gomitoM) add(gF, sfera(o.r1 * 1.03, 28), o.gomitoM);                 // maniche corte: il gomito è di pelle e la manica finisce netta poco sopra
  if (o.orlo) add(gU, new THREE.CylinderGeometry(o.r1 * 1.085, o.r1 * 1.07, 0.014, 28), o.orlo, V(0, -L1 + 0.016, 0));
  const gH = new THREE.Group(); upper.add(gH);
  const hand = mano(o.skin, o.nail, o.mano || 1); if (side < 0) hand.scale.x = -1; gH.add(hand);
  const riposo = [side * (o.sx + 0.035), o.sy - (L1 + L2) * 0.985, (o.sz || 0) + 0.035];
  const B = new THREE.Matrix4(), zf = V(0, 0, 0), yf = V(0, 0, 0);
  function a(q = {}) {
    const T = V(...(q.a || riposo)), d = T.clone().sub(S), len = M.clamp(d.length(), Math.abs(L1 - L2) + 0.01, L1 + L2 - 0.003), dir = d.normalize();
    const aa = (L1 * L1 - L2 * L2 + len * len) / (2 * len), hh = Math.sqrt(Math.max(0, L1 * L1 - aa * aa));
    const pole = V(...(q.gomito || [side * 0.6, -0.3, -0.75])); pole.addScaledVector(dir, -pole.dot(dir)).normalize();
    const E = S.clone().addScaledVector(dir, aa).addScaledVector(pole, hh), Wp = S.clone().addScaledVector(dir, len);
    gU.position.copy(S); gU.quaternion.setFromUnitVectors(DOWN, E.clone().sub(S).normalize());
    const fd = Wp.clone().sub(E).normalize();
    const yh = (q.dita ? V(...q.dita).normalize() : fd.clone()).negate(), zh = V(...(q.dorso || [0, 0, 1]));
    zh.addScaledVector(yh, -zh.dot(yh)); if (zh.lengthSq() < 1e-6) { zh.set(1, 0, 0); zh.addScaledVector(yh, -zh.dot(yh)); } zh.normalize();
    // l'avambraccio gira su se stesso insieme alla mano (il lato piatto del polso segue il dorso)
    yf.copy(fd).negate(); zf.copy(zh).addScaledVector(yf, -zh.dot(yf)); if (zf.lengthSq() < 1e-4) { zf.copy(yh).addScaledVector(yf, -yh.dot(yf)); } zf.normalize();
    gF.position.copy(E); gF.quaternion.setFromRotationMatrix(B.makeBasis(yf.clone().cross(zf), yf, zf));
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
