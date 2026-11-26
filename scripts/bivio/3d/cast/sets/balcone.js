// «Il testimone», episodio 2 — i balconi doppi del palazzo. Su ogni piano, a destra e a sinistra, il balcone di un appartamento e quello
// dell'appartamento accanto (un'altra scala), divisi da un pannello di vetro retinato. Al quarto piano, a destra, ci sono il TUO (portafinestra
// vera che si apre verso l'interno, tenda, soggiorno dietro, le piante che la vicina ti annaffia) e quello dell'appartamento VUOTO
// (tapparella giù, cartello AFFITTASI sulla ringhiera, una pianta secca).
// Geometria vera, niente piani con la trasparenza: corrimano in tubo piegato agli angoli, bacchette e montanti, piatti saldati, soletta con le
// piastrelle di gres bagnate verso il bordo, divisorio con il telaio di ferro. La pioggia è fatta di gocce nello spazio (fuori dalla soletta
// di sopra, che ripara il balcone) più lo sgocciolio dal bordo della soletta di sopra.
// balconi({ scene, amb, fuori, FY }) → { update(t, o), ... }.  o: porta 0..1 (anta di destra aperta verso l'interno), casa: { corridoio, soggiorno } 0..1 (luci),
//   pioggia3 0..1, vento 0..1 (la tenda che esce dall'anta socchiusa)
import * as M from '../lib/motion.js';
import { THREE, V, rnd, tex, mat, piatto as basic, sfera, add, loft, alone, PI } from './stile.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// misure (metri; x e z nel mondo, y dal pavimento del balcone): XA..XD il tuo balcone, XD..XB quello vuoto; ZR asse della ringhiera, ZS bordo della soletta;
// HR asse del corrimano, RT il suo raggio; PX la tua portafinestra, NX quella dell'appartamento vuoto, HP la loro altezza, SP lo spessore della soletta
export const BAL = { XA: 3.25, XD: 6.0, XB: 8.75, ZR: 1.03, ZS: 1.13, HR: 1.0, RT: 0.021, PX0: 3.9, PX1: 5.1, NX0: 6.9, NX1: 8.1, HP: 2.25, SP: 0.2, ZT: -0.14 };
const TAU = Math.PI * 2, FERRO = '#2B2F36', RUGGINE = '#5E3D2A';

// una barra di ferro (scatola) col colore sui vertici: un po' diversa dalle altre, più ruggine in basso e dove dice `ruggine`
function barra(w, h, d, x, y, z, r, ruggine = 0) {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z);
  const p = g.attributes.position, c = new Float32Array(p.count * 3), base = new THREE.Color(FERRO).multiplyScalar(r(0.88, 1.1)), rug = new THREE.Color(RUGGINE), col = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const k = M.clamp(ruggine + 0.5 * M.clamp(1 - p.getY(i) / 0.14)); col.copy(base).lerp(rug, k * 0.75); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}
// un tubo lungo una spezzata orizzontale (il corrimano): sezione tonda, riferimento con l'alto fisso
function tubo(pts, r, n = 14) {
  const P = [], N = [], I = [], up = V(0, 1, 0), t = V(0, 0, 0), s = V(0, 0, 0), q = V(0, 0, 0);
  pts.forEach((p, i) => { t.subVectors(pts[Math.min(pts.length - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize(); s.crossVectors(up, t).normalize();
    for (let j = 0; j <= n; j++) { const a = (j / n) * TAU; q.set(0, 0, 0).addScaledVector(up, Math.cos(a)).addScaledVector(s, Math.sin(a)); P.push(p.x + q.x * r, p.y + q.y * r, p.z + q.z * r); N.push(q.x, q.y, q.z); } });
  for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < n; j++) { const a = i * (n + 1) + j, b = a + 1, c = a + n + 2, d = a + n + 1; I.push(a, d, c, a, c, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(I); return g;
}
// la ringhiera di un balcone doppio: bacchette quadre da 12 ogni 10 cm, piatto in basso e in alto, montanti, piastre; il corrimano è a parte (tubo)
function ringhiera() {
  const { XA, XB, XD, ZR, HR, RT } = BAL, r = rnd(77), G = [], yB = 0.1, yT = HR - RT - 0.004, passo = 0.105, z0 = 0.04;
  const n = Math.round((XB - XA) / passo); for (let i = 1; i < n; i++) { const x = XA + ((XB - XA) * i) / n; if (Math.abs(x - XD) > 0.04) G.push(barra(0.012, yT - yB, 0.012, x, (yT + yB) / 2, ZR, r)); }
  G.push(barra(XB - XA, 0.008, 0.03, (XA + XB) / 2, yB, ZR, r, 0.3), barra(XB - XA, 0.006, 0.032, (XA + XB) / 2, yT, ZR, r));
  for (const x of [XA, XB]) { const m = Math.round((ZR - z0) / passo); for (let i = 1; i < m; i++) G.push(barra(0.012, yT - yB, 0.012, x, (yT + yB) / 2, z0 + ((ZR - z0) * i) / m, r));
    G.push(barra(0.03, 0.008, ZR - z0, x, yB, (ZR + z0) / 2, r, 0.3), barra(0.032, 0.006, ZR - z0, x, yT, (ZR + z0) / 2, r)); }
  for (const [x, z] of [[XA, ZR], [XB, ZR], [XD, ZR], [(XA + XD) / 2, ZR], [(XD + XB) / 2, ZR], [XA, z0], [XB, z0]]) G.push(barra(0.03, yT + 0.02, 0.03, x, (yT - 0.02) / 2, z, r, 0.12), barra(0.09, 0.008, 0.09, x, 0.004, z, r, 0.6));
  const pts = [], R = 0.07, arco = (cx, cz, a0, a1) => { for (let i = 0; i <= 10; i++) { const a = a0 + ((a1 - a0) * i) / 10; pts.push(V(cx + R * Math.cos(a), HR, cz + R * Math.sin(a))); } };
  pts.push(V(XA, HR, -0.01)); for (let z = 0.2; z < ZR - R - 0.05; z += 0.2) pts.push(V(XA, HR, z)); arco(XA + R, ZR - R, Math.PI, Math.PI / 2);
  for (let x = XA + R + 0.25; x < XB - R - 0.05; x += 0.25) pts.push(V(x, HR, ZR)); arco(XB - R, ZR - R, Math.PI / 2, 0);
  for (let z = ZR - R - 0.2; z > 0.05; z -= 0.2) pts.push(V(XB, HR, z)); pts.push(V(XB, HR, -0.01));
  return { ferro: mergeGeometries(G), corrimano: tubo(pts, RT) };
}
// una tapparella abbassata: stecche curve una sopra l'altra (larghezza w, altezza h, da y = 0 in su), colore sui vertici (più scuro nelle gole, colature)
function tapparella(w, h, colore = '#66756B', passo = 0.047, seme = 5) {
  const r = rnd(seme), P = [], C = [], I = [], n = Math.ceil(h / passo), prof = [[0, 0, 0.55], [0.22, 0.007, 0.92], [0.5, 0.009, 1], [0.8, 0.007, 0.95], [1, 0, 0.6]], c0 = new THREE.Color(colore), col = new THREE.Color(), NX = 12;
  const sporco = Array.from({ length: NX + 1 }, () => r(0.82, 1));
  for (let i = 0; i < n; i++) { const b = P.length / 3, ks = r(0.94, 1.04);
    prof.forEach(([v, z, k]) => { for (let j = 0; j <= NX; j++) { const y = Math.min(h, (i + v) * passo); P.push(-w / 2 + (w * j) / NX, y, z); col.copy(c0).multiplyScalar(k * ks * sporco[j] * (0.86 + 0.14 * (y / h))); C.push(col.r, col.g, col.b); } });
    for (let a = 0; a < prof.length - 1; a++) for (let j = 0; j < NX; j++) { const p = b + a * (NX + 1) + j, q = p + 1, s = p + NX + 1, t = s + 1; I.push(p, q, t, p, t, s); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals(); return g;
}
// vaso di terracotta tornito (bordo, pareti svasate), con la terra
function vaso(p, x, z, R = 0.13, H = 0.22, colore = '#A9593A') {
  const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
  const pr = [[R * 0.62, 0], [R * 0.66, 0.01], [R * 0.93, H * 0.84], [R * 1.04, H * 0.85], [R * 1.06, H], [R * 0.95, H], [R * 0.9, H * 0.86], [R * 0.86, H * 0.84]].map(([a, b]) => new THREE.Vector2(a, b));
  add(g, new THREE.LatheGeometry(pr, 28), mat(colore, { side: THREE.DoubleSide })); const terra = add(g, new THREE.CircleGeometry(R * 0.88, 24), mat('#3A2A20'), V(0, H * 0.86, 0)); terra.rotation.x = -Math.PI / 2;
  return g;
}
// una foglia: striscia rastremata e curva, due facce, colore sui vertici (c0 alla base, c1 in punta, bordo)
function foglia(L, W, piega, { c0 = '#2E5A37', c1 = '#3F7A45', bordo = null, fasce = 0, n = 8, punta = 1.6 } = {}) {
  const P = [], C = [], I = [], a = new THREE.Color(c0), b = new THREE.Color(c1), e = bordo ? new THREE.Color(bordo) : null, col = new THREE.Color();
  for (let i = 0; i <= n; i++) { const u = i / n, w = W * Math.sin(Math.PI * Math.min(1, 0.12 + 0.88 * u) ** (1 / punta)) ** 0.8 * (1 - u ** 6), y = L * u * Math.cos(piega * u), z = L * u * Math.sin(piega * u);
    for (const s of [-1, 0, 1]) { P.push(s * w, y, z - Math.abs(s) * w * 0.35); col.copy(a).lerp(b, u); if (fasce) col.multiplyScalar(0.82 + 0.3 * (0.5 + 0.5 * Math.sin(u * fasce * TAU))); if (e && s) col.lerp(e, 0.75); C.push(col.r, col.g, col.b); } }
  for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { const p = i * 3 + j, q = p + 1, s = p + 3, t = s + 1; I.push(p, q, t, p, t, s); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals(); return g;
}
const verde = () => new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
// sansevieria: foglie a spada dritte, a fasce, col bordo giallo
function sansevieria(p, x, z, seme = 3) {
  const r = rnd(seme), g = vaso(p, x, z, 0.14, 0.24), G = [];
  for (let i = 0; i < 11; i++) { const f = foglia(r(0.42, 0.78), r(0.028, 0.04), r(-0.16, 0.16), { c0: '#27482F', c1: '#3E6B43', bordo: '#B9B45A', fasce: r(5, 8), n: 9, punta: 2.2 }); f.rotateX(r(-0.16, 0.16)); f.rotateY(r(0, TAU)); f.translate(r(-0.05, 0.05), 0.2, r(-0.05, 0.05)); G.push(f); }
  add(g, mergeGeometries(G), verde()); return g;
}
// geranio in una fioriera: foglie tonde su steli corti, due grappoli di fiori rossi
function geranio(p, x, z, seme = 9) {
  const r = rnd(seme), g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
  add(g, loft([{ y: 0, rx: 0.27, rz: 0.075, n: 5 }, { y: 0.012, rx: 0.285, rz: 0.082, n: 5 }, { y: 0.155, rx: 0.31, rz: 0.095, n: 5 }, { y: 0.17, rx: 0.325, rz: 0.105, n: 5 }, { y: 0.175, rx: 0.31, rz: 0.095, n: 5 }, { y: 0.15, rx: 0.295, rz: 0.083, n: 5 }], 40), mat('#9A4E33', { side: THREE.DoubleSide }));
  const terra = add(g, new THREE.PlaneGeometry(0.58, 0.16), mat('#3A2A20'), V(0, 0.15, 0)); terra.rotation.x = -Math.PI / 2;
  const F = [], S = [], Fi = [];
  for (let i = 0; i < 26; i++) { const bx = r(-0.25, 0.25), h = r(0.1, 0.3), ang = r(0, TAU), out = r(0.02, 0.1), f = foglia(r(0.055, 0.08), r(0.05, 0.065), r(0.2, 0.6), { c0: '#2C5A30', c1: '#4C8A47', n: 5, punta: 0.9 });
    f.rotateX(Math.PI / 2 - r(0.2, 0.8)); f.rotateY(ang); f.translate(bx + Math.sin(ang) * out, 0.17 + h, Math.cos(ang) * out); F.push(f);
    const st = new THREE.CylinderGeometry(0.003, 0.004, h, 5); st.translate(bx, 0.17 + h / 2, 0); S.push(st); }
  for (const [fx, fh] of [[-0.14, 0.4], [0.1, 0.36], [0.2, 0.44]]) { const st = new THREE.CylinderGeometry(0.003, 0.004, fh, 5); st.translate(fx, 0.17 + fh / 2, 0.01); S.push(st);
    for (let k = 0; k < 12; k++) { const pt = new THREE.SphereGeometry(r(0.012, 0.018), 7, 5); pt.scale(1, 0.7, 1); pt.translate(fx + r(-0.035, 0.035), 0.17 + fh + r(-0.015, 0.03), 0.01 + r(-0.035, 0.035)); Fi.push(pt); } }
  add(g, mergeGeometries(F), verde()); add(g, mergeGeometries(S), mat('#4E6B3A')); add(g, mergeGeometries(Fi), mat('#C2362E'));
  return g;
}
// una pianta morta da mesi: rametti secchi e qualche foglia accartocciata
function secca(p, x, z, seme = 4) {
  const r = rnd(seme), g = vaso(p, x, z, 0.12, 0.2, '#8E5138'), S = [], F = [];
  for (let i = 0; i < 9; i++) { const h = r(0.15, 0.42), st = new THREE.CylinderGeometry(0.002, 0.004, h, 5); st.translate(0, h / 2, 0); st.rotateZ(r(-0.5, 0.5)); st.rotateY(r(0, TAU)); st.translate(r(-0.04, 0.04), 0.17, r(-0.04, 0.04)); S.push(st);
    if (i % 2) { const f = foglia(r(0.04, 0.07), 0.02, r(0.9, 1.6), { c0: '#6E5536', c1: '#8A6A40', n: 5 }); f.rotateX(r(0.6, 1.6)); f.rotateY(r(0, TAU)); f.translate(r(-0.1, 0.1), 0.17 + h * r(0.5, 0.95), r(-0.1, 0.1)); F.push(f); } }
  add(g, mergeGeometries(S), mat('#5C4630')); add(g, mergeGeometries(F), verde()); return g;
}

export function balconi({ scene, amb, fuori, FY }) {
  const B = BAL, r = rnd(402), { XA, XD, XB, ZR, ZS, HR, RT, PX0, PX1, NX0, NX1, HP, SP, ZT } = B;
  const RG = ringhiera(), ferroM = new THREE.MeshLambertMaterial({ vertexColors: true }), corrM = new THREE.MeshPhongMaterial({ color: '#30353D', specular: '#5F6E8C', shininess: 55 });
  // piastrelle di gres rosso, più scure e lucide (bagnate) verso il bordo; fughe grigie; la v della texture va dal muro (0) al bordo (1)
  const gres = tex(2048, 512, (c, w, h) => { c.fillStyle = '#6F6A62'; c.fillRect(0, 0, w, h); const tw = (0.2 / (XB - XA + 0.12)) * w, th = (0.1 / ZS) * h;
    for (let j = 0; j * th < h; j++) for (let i = -1; i * tw < w; i++) { const x = i * tw + (j % 2 ? tw / 2 : 0), y = j * th, k = r(0.86, 1.06); c.fillStyle = `rgb(${Math.round(128 * k)},${Math.round(64 * k)},${Math.round(50 * k)})`; c.fillRect(x + 1.5, y + 1.5, tw - 3, th - 3); }
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(10,12,20,0)'); g.addColorStop(0.45, 'rgba(10,12,20,0.08)'); g.addColorStop(0.72, 'rgba(10,12,20,0.38)'); g.addColorStop(1, 'rgba(10,12,20,0.55)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 130; i++) { const x = r() * w, y = h * (0.62 + 0.38 * r()), rr = r(8, 44), q = c.createRadialGradient(x, y, 0, x, y, rr); q.addColorStop(0, 'rgba(150,170,205,0.16)'); q.addColorStop(1, 'rgba(150,170,205,0)'); c.fillStyle = q; c.save(); c.translate(x, y); c.scale(1.8, 0.5); c.translate(-x, -y); c.beginPath(); c.arc(x, y, rr, 0, 7); c.fill(); c.restore(); }
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(0,0,0,${r(0.05, 0.14)})`; const x = r() * w; c.fillRect(x, 0, r(20, 90), h * r(0.1, 0.5)); } });
  const bordo = tex(2048, 64, (c, w, h) => { c.fillStyle = '#857C6F'; c.fillRect(0, 0, w, h); const g0 = c.createLinearGradient(0, 0, 0, h); g0.addColorStop(0, 'rgba(40,36,32,0.28)'); g0.addColorStop(0.5, 'rgba(40,36,32,0.05)'); g0.addColorStop(1, 'rgba(40,36,32,0.22)'); c.fillStyle = g0; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 150; i++) { const x = r() * w, ww = r(1.5, 5), g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, `rgba(34,32,30,${r(0.08, 0.3)})`); g.addColorStop(r(0.35, 0.95), 'rgba(34,32,30,0)'); c.fillStyle = g; c.fillRect(x, 0, ww, h); }
    for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '30,28,26' : '160,150,135'},${r(0.03, 0.08)})`; c.fillRect(r() * w, r() * h, r(2, 9), r(1, 4)); } });
  const intonaco = mat('#8E8578'), sopraM = mat(0xffffff, { map: gres }), bordoM = mat(0xffffff, { map: bordo });
  // vetro retinato del divisorio: lastra smerigliata verdina con la rete di fili dentro e le colature
  const retinato = tex(512, 1024, (c, w, h) => { c.fillStyle = '#C6D0CA'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '120,140,135'},${r(0.03, 0.09)})`; c.beginPath(); c.arc(r() * w, r() * h, r(2, 9), 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(60,70,68,0.3)'; c.lineWidth = 1; for (let x = 0; x < w; x += 7) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y < h; y += 7) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h, rr = r(40, 150), g = c.createRadialGradient(x, y, 0, x, y, rr); const k = r() < 0.5 ? '255,255,255' : '80,95,88'; g.addColorStop(0, `rgba(${k},0.07)`); g.addColorStop(1, `rgba(${k},0)`); c.fillStyle = g; c.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
    const gb = c.createLinearGradient(0, 0, 0, h); gb.addColorStop(0, 'rgba(60,66,60,0.1)'); gb.addColorStop(0.12, 'rgba(60,66,60,0)'); gb.addColorStop(0.8, 'rgba(60,66,60,0)'); gb.addColorStop(1, 'rgba(60,66,60,0.3)'); c.fillStyle = gb; c.fillRect(0, 0, w, h); });
  const vetroA = mat('#A9B0AC', { map: retinato }), vetroB = mat('#6F7672', { map: retinato });      // B: la faccia che lascia passare la luce (più scura)

  // ------------------------------------------------------------------ un vano della facciata (portafinestra o finestra) con la tapparella vera:
  // spallette (lo spessore del muro), soglia o davanzale di marmo, guide, tapparella abbassata di `tap` (0..1) e, se resta aperto, il vetro buio dietro.
  // Le geometrie sono condivise tra i vani uguali; il colore della tapparella è la tinta del materiale (le stecche hanno già chiari e scuri sui vertici).
  const GV = {}, geo = (k, f) => (GV[k] ||= f()), sc = (w, h, d, x, y, z) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); return b; };
  const muroV = mat('#9C9284'), marmoV = mat('#B9B4A8'), guidaV = mat('#8D8E86'), rv = rnd(733);
  const TINTE = ['#8FA397', '#8FA397', '#A08064', '#A3A39B', '#C9C2AE'].map((c) => new THREE.MeshLambertMaterial({ vertexColors: true, color: c }));
  const vetroBuio = basic(0xffffff, { map: tex(128, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0B111D'); g.addColorStop(0.5, '#182236'); g.addColorStop(0.56, '#0E1524'); g.addColorStop(1, '#0A0F1A'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.strokeStyle = '#A9A69D'; c.lineWidth = 7; c.strokeRect(3, 3, w - 6, h - 6); c.lineWidth = 5; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke(); }) });
  function vano(p, x0, x1, y0, y1, { tap = 1, tinta = 0, finestra = false } = {}) {
    const w = +(x1 - x0).toFixed(3), h = +(y1 - y0).toFixed(3), g = new THREE.Group(); g.position.set((x0 + x1) / 2, y0, 0); p.add(g);
    add(g, geo(`m${w}_${h}_${finestra}`, () => mergeGeometries([sc(0.3, h + 0.6, 0.3, -w / 2 - 0.15, h / 2, -0.151), sc(0.3, h + 0.6, 0.3, w / 2 + 0.15, h / 2, -0.151), sc(w + 0.6, 0.3, 0.3, 0, h + 0.15, -0.151)].concat(finestra ? [sc(w + 0.6, 0.3, 0.3, 0, -0.15, -0.151)] : []))), muroV);
    add(g, geo(`s${w}_${finestra}`, () => (finestra ? sc(w + 0.16, 0.045, 0.36, 0, -0.012, -0.1) : sc(w + 0.08, 0.03, 0.26, 0, 0.014, -0.09))), marmoV);
    add(g, geo(`g${w}_${h}`, () => mergeGeometries([sc(0.024, h, 0.03, -w / 2 + 0.012, h / 2, -0.06), sc(0.024, h, 0.03, w / 2 - 0.012, h / 2, -0.06)])), guidaV);
    const ht = +(Math.max(0.14, h * tap) - 0.02).toFixed(3); add(g, geo(`t${w}_${ht}`, () => tapparella(w - 0.04, ht, '#B9B9B0', 0.047, Math.round(w * 100 + ht * 10))), TINTE[tinta], V(0, h - ht, -0.066));
    if (tap < 0.98) add(g, new THREE.PlaneGeometry(w - 0.05, h), vetroBuio, V(0, h / 2, -0.14));
    return g;
  }
  const stato = () => { const q = rv(); return { tap: q < 0.7 ? 1 : q < 0.85 ? 0.62 : 0.3, tinta: Math.floor(rv(0, TINTE.length)) }; };
  // le finestre della colonna della cucina e di quella accanto al portone (la tua, al quarto piano, è quella vera del set)
  for (const x of [-1.5, 1.5]) for (let f = 1; f <= 5; f++) { const st = stato(); if (!(x === 1.5 && f === 4)) vano(amb, x - 0.6, x + 0.6, 3 * f + 0.9, 3 * f + 2.3, { ...st, finestra: true }); }

  // ------------------------------------------------------------------ un balcone doppio (soletta, ringhiera, divisorio); lato = 1 a destra, -1 allo specchio
  const DIV = { z0: 0.03, z1: ZR - 0.05, y0: 0.13, y1: 1.95 };
  function doppio(y, lato) {
    const g = new THREE.Group(); g.position.y = y; g.scale.x = lato; amb.add(g);
    const sx = XB - XA + 0.12, cx = (XA + XB) / 2;
    const top = add(g, new THREE.PlaneGeometry(sx, ZS), sopraM, V(cx, 0.001, ZS / 2)); top.rotation.x = -Math.PI / 2; top.receiveShadow = true;
    add(g, new THREE.BoxGeometry(sx, SP, ZS), intonaco, V(cx, -SP / 2, ZS / 2)).receiveShadow = true;
    add(g, new THREE.PlaneGeometry(sx, SP), bordoM, V(cx, -SP / 2, ZS + 0.001));
    add(g, RG.ferro, ferroM).receiveShadow = true; add(g, RG.corrimano, corrM);
    // divisorio: telaio di angolari e due lastre di vetro retinato. La faccia verso l'appartamento di destra (x maggiore) ha le normali girate dall'altra parte:
    // prende la luce e le ombre che arrivano sull'altra faccia, come un vetro smerigliato che lascia passare la sagoma di chi sta dietro.
    const tel = [];
    for (const z of [DIV.z0, DIV.z1]) tel.push(barra(0.035, DIV.y1, 0.035, XD, DIV.y1 / 2, z, r, 0.1));
    for (const yy of [DIV.y0, 1.03, DIV.y1]) tel.push(barra(0.03, 0.03, DIV.z1 - DIV.z0, XD, yy, (DIV.z0 + DIV.z1) / 2, r, yy < 0.5 ? 0.4 : 0.05));
    add(g, mergeGeometries(tel), ferroM).receiveShadow = true;
    const lastre = [];
    for (const [a, b] of [[DIV.y0 + 0.015, 1.015], [1.045, DIV.y1 - 0.015]]) {
      const w = DIV.z1 - DIV.z0 - 0.035, gA = new THREE.PlaneGeometry(w, b - a); gA.rotateY(-Math.PI / 2); gA.translate(XD - 0.003, (a + b) / 2, (DIV.z0 + DIV.z1) / 2);
      const gB = new THREE.PlaneGeometry(w, b - a); gB.rotateY(Math.PI / 2); gB.translate(XD + 0.003, (a + b) / 2, (DIV.z0 + DIV.z1) / 2); const nn = gB.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, -1, 0, 0);
      for (const [gg, mm] of [[gA, vetroA], [gB, vetroB]]) { const m = add(g, gg, mm); m.receiveShadow = true; lastre.push(m); } }
    if (!(y === FY && lato === 1)) { vano(g, PX0, PX1, 0, HP, stato()); vano(g, NX0, NX1, 0, HP, stato()); }      // le portefinestre degli altri (le due del tuo piano sono fatte più sotto)
    return { g, lastre };
  }
  const piani = [];
  for (const lato of [1, -1]) for (let f = 1; f <= 5; f++) piani.push(doppio(3 * f, lato));
  // il parapetto del tetto fa da soletta sopra il quinto piano: sopra il quarto c'è la soletta del quinto (già fatta dal ciclo)

  // ------------------------------------------------------------------ quarto piano a destra: le due portefinestre vere
  const Q = new THREE.Group(); Q.position.y = FY; scene.add(Q);
  const muroM = mat('#9C9284'), telaioM = mat('#CFCBC0'), marmo = mat('#B9B4A8');
  const qb = (w, h, d, m, x, y, z, p = Q) => { const o = add(p, new THREE.BoxGeometry(w, h, d), m, V(x, y, z)); o.receiveShadow = true; return o; };
  // lo spessore del muro attorno ai due vani (si vede come spalletta; fa ombra alla luce di casa)
  for (const [x0, x1] of [[PX0, PX1], [NX0, NX1]]) {            // (a sinistra 0,6: fino alla parete del soggiorno, senza entrare in cucina; a destra 0,85: oltre la parete)
    qb(0.6, HP + 0.5, 0.3, muroM, x0 - 0.3, (HP + 0.5) / 2, -0.151).castShadow = true; qb(0.85, HP + 0.5, 0.3, muroM, x1 + 0.425, (HP + 0.5) / 2, -0.151).castShadow = true;
    qb(x1 - x0 + 1.45, 0.5, 0.3, muroM, (x0 + x1) / 2 + 0.125, HP + 0.25, -0.151).castShadow = true;
    qb(x1 - x0 + 0.08, 0.03, 0.26, marmo, (x0 + x1) / 2, 0.014, -0.09);                                             // soglia di marmo
    for (const s of [x0 + 0.012, x1 - 0.012]) qb(0.024, HP, 0.03, mat('#8D8E86'), s, HP / 2, -0.06);                 // guide della tapparella
  }
  // --- l'appartamento vuoto: tapparella giù, sporca
  const tapN = add(Q, tapparella(NX1 - NX0 - 0.04, HP - 0.02, '#66756B', 0.047, 11), new THREE.MeshLambertMaterial({ vertexColors: true }), V((NX0 + NX1) / 2, 0.02, -0.066)); tapN.receiveShadow = true;
  // --- la tua: cassonetto con tre stecche che sporgono, telaio fisso, due ante (quella di destra si apre verso l'interno), vetri, maniglia dentro
  add(Q, tapparella(PX1 - PX0 - 0.04, 0.13, '#7C8A80', 0.047, 12), new THREE.MeshLambertMaterial({ vertexColors: true }), V((PX0 + PX1) / 2, HP - 0.13, -0.066));
  for (const x of [PX0 + 0.025, PX1 - 0.025]) qb(0.05, HP - 0.03, 0.06, telaioM, x, (HP + 0.03) / 2, ZT).castShadow = true;
  qb(PX1 - PX0, 0.05, 0.06, telaioM, (PX0 + PX1) / 2, HP - 0.025, ZT).castShadow = true;
  const LW = (PX1 - PX0 - 0.1) / 2, LH = HP - 0.05 - 0.035, vetroM = new THREE.MeshBasicMaterial({ color: '#0C1422', transparent: true, opacity: 0.34, depthWrite: false, map: tex(64, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#5A6C8C'); g.addColorStop(0.35, '#232C40'); g.addColorStop(0.5, '#6A7C9C'); g.addColorStop(0.56, '#1C2434'); g.addColorStop(1, '#0E1422'); c.fillStyle = g; c.fillRect(0, 0, w, h); }) });
  function anta(lato) {                    // lato = -1: cerniera a sinistra (x = PX0), +1: cerniera a destra (x = PX1). L'anta va dalla cerniera verso il centro.
    const g = new THREE.Group(); g.position.set(lato < 0 ? PX0 + 0.05 : PX1 - 0.05, 0.033, ZT); Q.add(g); const d = -lato, P = [];
    const pz = (w, h, x, y) => { const b = new THREE.BoxGeometry(w, h, 0.05); b.translate(d * x, y, 0); P.push(b); };
    pz(0.065, LH, 0.0325, LH / 2); pz(0.065, LH, LW - 0.0325, LH / 2); pz(LW, 0.07, LW / 2, LH - 0.035); pz(LW, 0.12, LW / 2, 0.06); pz(LW - 0.1, 0.035, LW / 2, 1.02);
    const m = add(g, mergeGeometries(P), telaioM); m.castShadow = true; m.receiveShadow = true;
    const v = add(g, new THREE.PlaneGeometry(LW - 0.13, LH - 0.19), vetroM, V(d * LW / 2, LH / 2 + 0.025, 0.005)); v.renderOrder = 4;
    return g;
  }
  const antaS = anta(-1), antaD = anta(1);
  // la maniglia (martellina) sul montante libero dell'anta di destra, dal lato di casa
  { const mg = mat('#B8B4A6'), m1 = new THREE.CylinderGeometry(0.008, 0.008, 0.045, 10); m1.rotateX(Math.PI / 2); m1.translate(-(LW - 0.0325), 1.05, -0.045); const m2 = new THREE.CylinderGeometry(0.0075, 0.0065, 0.11, 10); m2.translate(-(LW - 0.0325), 1.0, -0.066); add(antaD, mergeGeometries([m1, m2]), mg); }
  // la tenda: un velo a pieghe dietro i vetri. Le normali guardano la stanza: così il velo prende la luce e le ombre di dentro (la sagoma di chi passa)
  const TX0 = PX0 - 0.02, TX1 = PX1 + 0.02, TNX = 40, TNY = 10, tendaG = new THREE.PlaneGeometry(TX1 - TX0, HP - 0.06, TNX, TNY); tendaG.translate((TX0 + TX1) / 2, (HP - 0.06) / 2 + 0.04, 0);
  const tendaM = new THREE.MeshLambertMaterial({ color: '#B9B2A2', transparent: true, opacity: 0.74, side: THREE.DoubleSide, depthWrite: false, vertexColors: true }), tenda = add(Q, tendaG, tendaM); tenda.receiveShadow = true; tenda.renderOrder = 2;
  tendaG.setAttribute('color', new THREE.BufferAttribute(new Float32Array(tendaG.attributes.position.count * 3).fill(1), 3));
  const tc = tendaG.attributes.color, tp = tendaG.attributes.position, tx0 = Float32Array.from({ length: tp.count }, (_, i) => tp.getX(i)), ty0 = Float32Array.from({ length: tp.count }, (_, i) => tp.getY(i));
  function muoviTenda(t, apre, vento, scosta = 0) {
    const tn = tendaG.attributes.normal, cx = (PX0 + PX1) / 2;
    for (let i = 0; i < tp.count; i++) { const xr = tx0[i], y = ty0[i], h = 1 - y / HP, x = xr > cx ? TX1 - (TX1 - xr) * (1 - 0.78 * scosta * (0.35 + 0.65 * h)) : xr;                                  // h: 0 in alto (bastone), 1 in basso (libera)
      const pieghe = 0.014 * Math.sin(x * 34) + 0.006 * Math.sin(x * 71 + 1.3);
      const g = Math.exp(-(((x - (PX0 + PX1) / 2 + 0.03) / 0.3) ** 2)) * h ** 1.4 * apre * vento;                        // il vento la spinge fuori dall'anta socchiusa
      const fuoriZ = g * (0.17 + 0.09 * Math.sin(t * 2.3 + y * 2.1) + 0.05 * Math.sin(t * 5.1 + x * 9));
      tp.setXYZ(i, x + 0.02 * g * Math.sin(t * 1.7 + y * 3), y, ZT - 0.075 + pieghe + fuoriZ + 0.006 * h * Math.sin(t * 1.3 + x * 6) * vento); const lc = 1 + 9 * M.clamp(fuoriZ / 0.12); tc.setXYZ(i, lc, lc, lc * 1.08); }
    tc.needsUpdate = true;
    tp.needsUpdate = true; tendaG.computeVertexNormals(); for (let i = 0; i < tn.count; i++) tn.setXYZ(i, -tn.getX(i), -tn.getY(i), -Math.abs(tn.getZ(i))); tn.needsUpdate = true;
  }
  add(Q, new THREE.CylinderGeometry(0.009, 0.009, PX1 - PX0 + 0.2, 8).rotateZ(Math.PI / 2), mat('#6B5A45'), V((PX0 + PX1) / 2, HP + 0.02, ZT - 0.075));

  // ------------------------------------------------------------------ il tuo soggiorno, dietro la portafinestra (si vede dai vetri e dall'anta aperta)
  const SX0 = 3.3, SX1 = 5.9, SZ = -3.75, SH = 2.7, pm = mat('#A89F8A'), S = new THREE.Group(); Q.add(S);
  const sp = (w, h, m, x, y, z, ry = 0, rx = 0) => { const o = add(S, new THREE.PlaneGeometry(w, h), m, V(x, y, z)); o.rotation.set(rx, ry, 0); o.receiveShadow = true; if (m.isMeshLambertMaterial) { o.castShadow = true; m.shadowSide = THREE.DoubleSide; } return o; };      // le pareti fermano la luce del lampadario: esce solo dalla portafinestra
  sp(SX1 - SX0, -SZ, mat(0xffffff, { map: tex(256, 256, (c, w, h) => { c.fillStyle = '#8A6B4A'; c.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '60,40,24' : '170,130,90'},0.18)`; c.fillRect(0, (i * h) / 8, w, h / 8 - 2); } c.strokeStyle = 'rgba(40,26,16,0.6)'; c.lineWidth = 2; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(0, (i * h) / 8); c.lineTo(w, (i * h) / 8); c.stroke(); } }, [3, 3]) }), (SX0 + SX1) / 2, 0.004, SZ / 2, 0, -Math.PI / 2);
  sp(SX1 - SX0, -SZ, mat('#B5AE9C'), (SX0 + SX1) / 2, SH, SZ / 2, 0, Math.PI / 2); sp(SX1 - SX0, SH, pm, (SX0 + SX1) / 2, SH / 2, SZ);
  sp(-SZ, SH, pm, SX0, SH / 2, SZ / 2, Math.PI / 2); sp(-SZ, SH, pm, SX1, SH / 2, SZ / 2, -Math.PI / 2);
  // la porta verso il corridoio (in fondo a sinistra): buia; quando in corridoio si accende la luce diventa un rettangolo chiaro
  const portaC = sp(0.85, 2.05, new THREE.MeshBasicMaterial({ color: '#07090E' }), SX0 + 0.75, 1.025, SZ + 0.012); for (const s of [-1, 1]) add(S, new THREE.BoxGeometry(0.06, 2.1, 0.05), mat('#C9BFA8'), V(SX0 + 0.75 + s * 0.455, 1.05, SZ + 0.03)); add(S, new THREE.BoxGeometry(0.97, 0.06, 0.05), mat('#C9BFA8'), V(SX0 + 0.75, 2.1, SZ + 0.03));
  // divano contro la parete di destra, tappeto, lampadario
  { const dv = mat('#5C6B63'), g = new THREE.Group(); g.position.set(SX1 - 0.48, 0, -2.0); g.rotation.y = -Math.PI / 2; S.add(g);
    add(g, loft([{ y: 0.12, rx: 0.95, rz: 0.42, n: 5 }, { y: 0.3, rx: 0.97, rz: 0.44, n: 5 }, { y: 0.43, rx: 0.95, rz: 0.42, n: 4 }, { y: 0.45, rx: 0.9, rz: 0.38, n: 4 }, { y: 0.45, rx: 0.01, rz: 0.01, n: 4 }], 40), dv);
    add(g, loft([{ y: 0.3, rx: 0.95, rz: 0.12, n: 5, cz: -0.34 }, { y: 0.7, rx: 0.95, rz: 0.11, n: 5, cz: -0.37 }, { y: 0.84, rx: 0.92, rz: 0.08, n: 4, cz: -0.39 }, { y: 0.85, rx: 0.01, rz: 0.01, cz: -0.39 }], 40), dv);
    for (const s of [-1, 1]) add(g, loft([{ y: 0.3, rx: 0.11, rz: 0.42, n: 5, cx: s * 0.9 }, { y: 0.58, rx: 0.11, rz: 0.42, n: 4, cx: s * 0.9 }, { y: 0.62, rx: 0.08, rz: 0.38, n: 4, cx: s * 0.9 }, { y: 0.62, rx: 0.01, rz: 0.01, cx: s * 0.9 }], 28), dv);
    const tp2 = add(S, new THREE.PlaneGeometry(1.5, 2.0), mat('#7A3E36'), V(4.45, 0.008, -1.9)); tp2.rotation.x = -Math.PI / 2; tp2.receiveShadow = true; ombre2(g); }
  function ombre2(g) { g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
  const LP = [4.1, SH - 0.32, -1.45];                                                  // il lampadario: verso sinistra, così dalla portafinestra la luce arriva fino al divisorio
  add(S, new THREE.CylinderGeometry(0.004, 0.004, 0.2, 6), mat('#222'), V(LP[0], SH - 0.1, LP[2])); const globo = add(S, sfera(0.11, 20), new THREE.MeshBasicMaterial({ color: '#30343C' }), V(...LP));
  const alS = new THREE.Sprite(new THREE.SpriteMaterial({ map: alone(), color: '#FFD08A', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); alS.position.set(...LP); alS.scale.set(1.3, 1.3, 1); S.add(alS);
  // luci di casa: il lampadario (con le ombre: sul velo della tenda, sul pavimento del balcone, sul vetro del divisorio), il chiarore che esce dalla portafinestra, il corridoio
  const LS = new THREE.SpotLight('#FFD3A0', 0, 9, 0.86, 0.55, 1.0); LS.position.set(LP[0], FY + LP[1] - 0.05, LP[2]); LS.target.position.set(5.0, FY + 0.75, 0.6); scene.add(LS, LS.target);
  LS.castShadow = true; LS.shadow.mapSize.set(2048, 2048); LS.shadow.camera.near = 0.3; LS.shadow.camera.far = 8; LS.shadow.bias = -0.0012; LS.shadow.normalBias = 0.015; LS.shadow.radius = 5;
  const LG = new THREE.PointLight('#FFCF98', 0, 3.4, 1.5); LG.position.set((PX0 + PX1) / 2, FY + 1.5, 0.22); scene.add(LG);
  // la luce che esce dalla portafinestra accesa e corre lungo il balcone fino al divisorio: fa l'ombra di chi sta sul balcone (sul vetro retinato, sulla ringhiera, a terra)
  const LD = new THREE.SpotLight('#FFCC92', 0, 6.5, 1.05, 0.8, 1.2); LD.position.set(PX0 + 0.08, FY + 1.75, 0.05); LD.target.position.set(XD, FY + 0.9, 0.72); scene.add(LD, LD.target);
  LD.castShadow = true; LD.shadow.mapSize.set(2048, 2048); LD.shadow.camera.near = 0.15; LD.shadow.camera.far = 6.5; LD.shadow.bias = -0.002; LD.shadow.normalBias = 0.02; LD.shadow.radius = 7;
  // la parte bassa della portafinestra: una lama di luce radente che passa sotto il divisorio e allunga sul pavimento l'ombra di chi sta sul balcone
  const LB = new THREE.SpotLight('#FFC68A', 0, 7, 0.5, 0.7, 1.0); LB.position.set(PX0 + 0.3, FY + 0.3, 0.12); LB.target.position.set(XD + 0.9, FY, 0.6); scene.add(LB, LB.target);
  LB.castShadow = true; LB.shadow.mapSize.set(2048, 2048); LB.shadow.camera.near = 0.15; LB.shadow.camera.far = 7; LB.shadow.bias = -0.002; LB.shadow.normalBias = 0.02; LB.shadow.radius = 5;
  const LC = new THREE.PointLight('#FFD9A6', 0, 5, 1.3); LC.position.set(SX0 + 0.75, FY + 1.4, SZ + 0.35); scene.add(LC);

  // ------------------------------------------------------------------ le tue piante; dall'altra parte la pianta secca, il cartello, le foglie
  const P4 = new THREE.Group(); P4.position.y = FY; scene.add(P4);
  sansevieria(P4, XA + 0.3, 0.3); geranio(P4, XA + 0.62, ZR - 0.2).rotation.y = 0.04; vaso(P4, XA + 0.72, 0.24, 0.1, 0.17); secca(P4, XB - 0.35, 0.3);
  { const g = P4.children[2], G2 = [], rr = rnd(8); for (let i = 0; i < 16; i++) { const f = foglia(rr(0.07, 0.12), rr(0.025, 0.04), rr(0.3, 1.1), { c0: '#2C5A30', c1: '#5C9A4E', n: 5, punta: 1.1 }); f.rotateX(rr(0.2, 1.0)); f.rotateY(rr(0, TAU)); f.translate(rr(-0.03, 0.03), 0.15, rr(-0.03, 0.03)); G2.push(f); } add(g, mergeGeometries(G2), verde()); }     // basilico
  P4.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // cartello AFFITTASI legato alla ringhiera dell'appartamento vuoto, verso la strada (da dentro se ne vede il retro bianco)
  const cart = tex(512, 256, (c, w, h) => { c.fillStyle = '#E8C63A'; c.fillRect(0, 0, w, h); c.fillStyle = '#B5341F'; c.fillRect(0, 0, w, 16); c.fillRect(0, h - 16, w, 16); c.fillStyle = '#1B1B1B'; c.font = '900 92px Display, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('AFFITTASI', w / 2, h * 0.42); c.font = '700 40px Display, sans-serif'; c.fillText('tel. 02 55 51 84', w / 2, h * 0.76);
    for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(90,80,60,${r(0.04, 0.12)})`; c.fillRect(r() * w, 0, r(3, 20), h); } });
  const cg = new THREE.Group(); cg.position.set(7.75, FY + 0.56, ZR + 0.022); cg.rotation.z = -0.03; scene.add(cg);
  add(cg, new THREE.PlaneGeometry(0.8, 0.4), mat(0xffffff, { map: cart })); const retro = add(cg, new THREE.PlaneGeometry(0.8, 0.4), mat('#C9C6B8'), V(0, 0, -0.002)); retro.rotation.y = Math.PI;
  // foglie secche e polvere nell'angolo dell'appartamento vuoto
  { const G3 = [], rr = rnd(21); for (let i = 0; i < 46; i++) { const f = foglia(rr(0.04, 0.075), rr(0.014, 0.024), rr(-0.5, 0.5), { c0: '#5E4526', c1: '#8A6A3A', n: 4 }); f.rotateX(-Math.PI / 2 + rr(-0.25, 0.25)); f.rotateY(rr(0, TAU)); const k = rr() ** 2; f.translate(XD + 0.1 + k * 2.3, 0.006 + rr(0, 0.012), 0.06 + rr() ** 1.7 * 0.8); G3.push(f); }
    const m = add(P4, mergeGeometries(G3), verde()); m.receiveShadow = true; }

  // ------------------------------------------------------------------ il corrimano bagnato: perle d'acqua sopra il tubo, gocce appese sotto
  { const rr = rnd(64), NP = 620, gm = new THREE.MeshPhongMaterial({ color: '#8FA3BF', specular: '#FFFFFF', shininess: 90, transparent: true, opacity: 0.72 }), im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), gm, NP), mm = new THREE.Matrix4(), q = new THREE.Quaternion(), sc3 = V(1, 1, 1), ps = V(0, 0, 0);
    for (let i = 0; i < NP; i++) { const sotto = i % 4 === 0, x = rr(XA + 0.08, XB - 0.08), a = sotto ? Math.PI + rr(-0.25, 0.25) : rr(-1.15, 1.15), s = sotto ? rr(0.0028, 0.0045) : rr(0.0014, 0.0034);
      ps.set(x, FY + HR + Math.cos(a) * (RT + s * (sotto ? 0.9 : 0.35)), ZR + Math.sin(a) * (RT + s * 0.35)); sc3.set(s * rr(1, 1.6), s * (sotto ? 1.7 : 0.55), s); im.setMatrixAt(i, mm.compose(ps, q, sc3)); }
    im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; scene.add(im); }

  // ------------------------------------------------------------------ la pioggia: gocce nello spazio davanti al palazzo e sgocciolio dalla soletta di sopra
  const NG = 2600, VOL = { x0: -1, x1: 13, z0: ZS + 0.03, z1: 11, y0: FY - 8, y1: FY + 6 }, gp = new Float32Array(NG * 6), gc = new Float32Array(NG * 6), semi = [];
  { const rr = rnd(55); for (let i = 0; i < NG; i++) { const zz = rr() ** 1.5; semi.push([rr(VOL.x0, VOL.x1), VOL.z0 + zz * (VOL.z1 - VOL.z0), rr(), rr(8.2, 10.4), rr(0.6, 1)]); } }
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(gp, 3)); gg.setAttribute('color', new THREE.BufferAttribute(gc, 3));
  const gocce = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })); gocce.frustumCulled = false; gocce.renderOrder = 6; scene.add(gocce);
  // sgocciolio: dal bordo della soletta del quinto piano (e del tuo, verso il terzo) cadono gocce grosse, sempre negli stessi punti
  const NS = 150, sg = [], sp2 = new Float32Array(NS * 6), sc2 = new Float32Array(NS * 6);
  { const rr = rnd(91); for (let i = 0; i < NS; i++) sg.push([rr(XA - 0.05, XB + 0.05), i % 3 ? FY + 3 - SP : FY - SP, rr(0.5, 1.7), rr(), rr(0.7, 1)]); }
  const sgG = new THREE.BufferGeometry(); sgG.setAttribute('position', new THREE.BufferAttribute(sp2, 3)); sgG.setAttribute('color', new THREE.BufferAttribute(sc2, 3));
  const sgoccia = new THREE.LineSegments(sgG, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sgoccia.frustumCulled = false; sgoccia.renderOrder = 6; scene.add(sgoccia);
  const FREDDO = [0.5, 0.58, 0.74], CALDO = [1.0, 0.74, 0.42];
  function piove(t, k, luceCasa, vento) {
    gocce.visible = sgoccia.visible = k > 0.01; if (!gocce.visible) return;
    const H = VOL.y1 - VOL.y0, dx = 0.07 + 0.05 * vento, cxp = (PX0 + PX1) / 2;
    for (let i = 0; i < NG; i++) { const [x, z, f, v, lum] = semi[i], d = (f * H + t * v) % H, y = VOL.y1 - d, L = v * 0.03, xx = x + dx * d * 0.2, o = i * 6;
      gp[o] = xx; gp[o + 1] = y; gp[o + 2] = z; gp[o + 3] = xx + dx * L * 0.2; gp[o + 4] = y - L; gp[o + 5] = z;
      // luce: poca e fredda dappertutto; calda davanti alla portafinestra accesa; un po' di più vicino alla camera
      const q = Math.exp(-(((xx - cxp) / 1.5) ** 2) - (((y - FY - 1.1) / 1.6) ** 2) - ((z - ZS) / 2.6) ** 2) * luceCasa, b = 0.085 * lum * k;
      for (let e = 0; e < 2; e++) { const a = e ? 0.25 : 1; gc[o + e * 3] = a * (b * FREDDO[0] + 0.5 * q * CALDO[0] * lum * k); gc[o + e * 3 + 1] = a * (b * FREDDO[1] + 0.5 * q * CALDO[1] * lum * k); gc[o + e * 3 + 2] = a * (b * FREDDO[2] + 0.5 * q * CALDO[2] * lum * k); } }
    gg.attributes.position.needsUpdate = true; gg.attributes.color.needsUpdate = true;
    for (let i = 0; i < NS; i++) { const [x, y0, per, f, lum] = sg[i], tau = (t / per + f) % 1, tt = tau * per * 1.25, d = 4.9 * tt * tt, y = y0 - d, vel = 9.8 * tt, L = Math.max(0.012, vel * 0.03), o = i * 6, vis = d < 9 ? 1 : 0;
      sp2[o] = x; sp2[o + 1] = y; sp2[o + 2] = ZS + 0.01; sp2[o + 3] = x; sp2[o + 4] = y - L; sp2[o + 5] = ZS + 0.01;
      const q = Math.exp(-(((x - cxp) / 1.3) ** 2) - (((y - FY - 1.1) / 1.5) ** 2)) * luceCasa, b = 0.2 * lum * k * vis;
      for (let e = 0; e < 2; e++) { const a = e ? 0.4 : 1; sc2[o + e * 3] = a * (b * FREDDO[0] + 0.9 * q * CALDO[0] * vis * k); sc2[o + e * 3 + 1] = a * (b * FREDDO[1] + 0.9 * q * CALDO[1] * vis * k); sc2[o + e * 3 + 2] = a * (b * FREDDO[2] + 0.9 * q * CALDO[2] * vis * k); } }
    sgG.attributes.position.needsUpdate = true; sgG.attributes.color.needsUpdate = true;
  }

  const cBuio = new THREE.Color('#07090E'), cLuce = new THREE.Color('#E9C58A'), gSp = new THREE.Color('#30343C'), gAc = new THREE.Color('#FFF2CC');
  muoviTenda(0, 0, 0);
  const montante = (ap, y = 1.1) => { const th = 1.75 * M.clamp(ap), d = LW - 0.0325; return [PX1 - 0.05 - d * Math.cos(th), FY + 0.033 + y, ZT - d * Math.sin(th)]; };
  return { Q, S, antaD, antaS, tenda, LS, LG, LC, LD, piani, DIV, montante,
    update(t, o = {}) {
      const ap = M.clamp(o.porta ?? 0), casa = o.casa || {}, ks = M.clamp(casa.soggiorno ?? 0), kc = M.clamp(casa.corridoio ?? 0), vento = o.vento ?? 1;
      antaD.rotation.y = -1.75 * ap; muoviTenda(t, Math.min(1, ap * 6) * (1 - M.clamp(o.tendaScosta ?? 0)), vento, M.clamp(o.tendaScosta ?? 0));
      LS.intensity = 11 * ks; LG.intensity = 0.8 * ks + 0.1 * kc; LD.intensity = (o.luceBalcone ?? 5) * ks; LB.intensity = (o.luceBassa ?? 0) * ks; LC.intensity = 2.2 * kc * (1 - 0.6 * ks);
      globo.material.color.copy(gSp).lerp(gAc, ks); alS.material.opacity = 0.7 * ks; portaC.material.color.copy(cBuio).lerp(cLuce, kc);
      piove(t, o.pioggia3 ?? 1, ks, vento);
    } };
}
