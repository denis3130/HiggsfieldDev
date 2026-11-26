// L'auto come MODELLO VERO (regola dei modelli: una superficie sola, niente pezzi incollati). La carrozzeria è una superficie liscia fatta di
// sezioni lungo l'auto (scocca e abitacolo fusi in un solo contorno); il cofano del bagagliaio è ritagliato dagli STESSI punti, ha il suo
// spessore ed è incernierato sotto il lunotto; sotto c'è il vano vero, con fondo e pareti. Ruote tonde con cerchio. Vetri, fanali, paraurti,
// passaruota, porte e targa sono dipinti sulla superficie, punto per punto, dalla posizione vera di ogni punto.
// Misure in metri: lunga lungo z (muso a +z), larga 1,76, alta 1,43. auto(colore) -> { group, cofano(k), suCofano(k, dietro, lato) }.
import * as M from '../lib/motion.js';
import { THREE, V, tex, mat, ombre } from './stile.js';

export const L = 2.15, WB = 0.88, YB0 = 0.2, YBELT = 0.93;
export const ZC0 = -1.3, ZC1 = -2.02, XL = 0.7, PAV = 0.5, APRE = 1.0;     // il bagagliaio: cerniera a z = ZC0, bordo dietro a ZC1, largo 2·XL, fondo a PAV; di quanto si apre (radianti)
const ZR = 1.32, RR = 0.33;                                                 // dove stanno le ruote lungo l'auto e il loro raggio
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const pianta = (z) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(z) / L, 5.5)), 1 / 5.5);      // quanto è larga lungo l'auto (1 al centro, tonda a muso e coda)
const testata = (z) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(z) / L, 8)), 1 / 8);          // quanto è alta alle due estremità
const cima = (z) => (z > 0 ? 0.935 - 0.15 * sm(0.9, 2.1, z) : 0.935 - 0.015 * sm(-1.3, -2.1, z));   // cofano del motore che scende verso il muso; coda quasi piana
const tetto = (z) => YBELT + 0.5 * Math.min(sm(-1.32, -0.6, z), sm(1.02, 0.22, z));            // lunotto, tetto, parabrezza
const largoAbit = (z) => 0.8 * Math.min(1, pianta(z) + 0.01);
function dentro(x, y, z) {
  const w = WB * pianta(z); if (w < 1e-5) return false;
  const T = cima(z), cy = (YB0 + T) / 2, h = ((T - YB0) / 2) * testata(z), ax = Math.abs(x);
  if (h > 1e-5 && Math.pow(ax / w, 4.5) + Math.pow(Math.abs(y - cy) / h, 4.5) <= 1) return true;                 // la scocca
  const yr = tetto(z); if (yr - YBELT < 0.012 || y < YBELT - 0.25 || y > yr) return false;                     // l'abitacolo, più stretto in alto
  const t = Math.max(0, (y - YBELT) / (yr - YBELT)), wc = largoAbit(z) * (1 - 0.22 * t);
  return Math.pow(ax / wc, 5) + Math.pow(t, 6) <= 1;
}

// ---- la maglia: NS sezioni lungo z, ognuna un giro di 2·J + 1 punti (da sotto al centro, su per il fianco destro, tetto, giù per il sinistro)
const J1 = 40, J2 = 14, J = J1 + J2, NJ = 2 * J + 1, CY = 0.58;
let DATI = null;
function dati() {
  if (DATI) return DATI;
  const zs = []; const NS0 = 74;
  for (let i = 0; i < NS0; i++) zs.push(L * 0.9996 * Math.sin((Math.PI / 2) * (-1 + (2 * i) / (NS0 - 1))));
  const metti = (z0) => { let k = 0; for (let i = 1; i < zs.length; i++) if (Math.abs(zs[i] - z0) < Math.abs(zs[k] - z0)) k = i; zs[k] = z0; return k; };
  const iC1 = metti(ZC1), iC0 = metti(ZC0), NS = zs.length;
  const P = new Float32Array(NS * NJ * 3), UV = new Float32Array(NS * NJ * 2), K = 260;
  for (let i = 0; i < NS; i++) {
    const z = zs[i], px = [], py = [];
    for (let k = 0; k <= K; k++) { const th = -Math.PI / 2 + (Math.PI * k) / K, cs = Math.cos(th), sn = Math.sin(th); let a = 0, b = 2.4;
      for (let it = 0; it < 26; it++) { const m = (a + b) / 2; if (dentro(m * cs, CY + m * sn, z)) a = m; else b = m; }
      px.push(a * cs); py.push(CY + a * sn); }
    // la colonna J1 passa dove la parte alta è larga XL (il bordo del cofano del bagagliaio): si cerca dall'alto
    const xt = XL * pianta(z); let kl = K;
    while (kl > 0 && px[kl] < xt) kl--;
    kl = Math.max(J1 > 0 ? 6 : 0, Math.min(K - 4, kl));
    const pezzo = (k0, k1, n, fine) => { const s = [0]; for (let k = k0 + 1; k <= k1; k++) s.push(s[s.length - 1] + Math.hypot(px[k] - px[k - 1], py[k] - py[k - 1])); const out = [];
      for (let q = 0; q < n + (fine ? 1 : 0); q++) { const d = (s[s.length - 1] * q) / n; let k = 1; while (k < s.length - 1 && s[k] < d) k++; const f = (d - s[k - 1]) / Math.max(1e-9, s[k] - s[k - 1]);
        out.push([px[k0 + k - 1] + (px[k0 + k] - px[k0 + k - 1]) * f, py[k0 + k - 1] + (py[k0 + k] - py[k0 + k - 1]) * f]); }
      return out; };
    const meta = [...pezzo(0, kl, J1, false), ...pezzo(kl, K, J2, true)];                      // J + 1 punti: metà destra (x >= 0)
    for (let j = 0; j < NJ; j++) { const q = j <= J ? meta[j] : meta[2 * J - j], o = (i * NJ + j) * 3;
      P[o] = j <= J ? q[0] : -q[0]; P[o + 1] = q[1]; P[o + 2] = z; UV[(i * NJ + j) * 2] = i / (NS - 1); UV[(i * NJ + j) * 2 + 1] = j / (NJ - 1); }
  }
  // triangoli di tutta la carrozzeria (per le normali), poi divisi tra scocca e cofano del bagagliaio
  const tutti = [], scocca = [], cofano = [], nelCofano = (i, j) => i >= iC1 && i < iC0 && j >= J1 && j < 2 * J - J1;
  for (let i = 0; i < NS - 1; i++) for (let j = 0; j < NJ - 1; j++) { const a = i * NJ + j, b = a + NJ, c = b + 1, d = a + 1, q = [a, d, c, a, c, b]; tutti.push(...q); (nelCofano(i, j) ? cofano : scocca).push(...q); }
  const gt = new THREE.BufferGeometry(); gt.setAttribute('position', new THREE.BufferAttribute(P, 3)); gt.setIndex(tutti); gt.computeVertexNormals();
  const N = gt.attributes.normal.array;
  { const o = (Math.floor(NS / 2) * NJ + J) * 3; if (N[o + 1] < 0) { for (const arr of [tutti, scocca, cofano]) for (let q = 0; q < arr.length; q += 3) { const t = arr[q + 1]; arr[q + 1] = arr[q + 2]; arr[q + 2] = t; } for (let q = 0; q < N.length; q++) N[q] = -N[q]; } }
  for (let i = 0; i < NS; i++) { const a = (i * NJ) * 3, b = (i * NJ + NJ - 1) * 3; for (let q = 0; q < 3; q++) { const m = (N[a + q] + N[b + q]) / 2; N[a + q] = N[b + q] = m; } }      // la cucitura sotto
  const geoDi = (idx) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); g.setIndex(idx); return g; };
  // il tappo delle due estremità (un ventaglio)
  for (const i of [0, NS - 1]) for (let j = 1; j < NJ - 2; j++) { const a = i * NJ, b = a + j, c = b + 1; if (i === 0) scocca.push(a, c, b); else scocca.push(a, b, c); }
  // ---- il cofano del bagagliaio: la pelle di fuori (gli stessi punti), quella di dentro 3 cm sotto, e il bordo che le unisce. Tutto riferito alla cerniera.
  const yCern = P[(iC0 * NJ + J) * 3 + 1], perno = V(0, yCern, ZC0), jA = J1, jB = 2 * J - J1, ni = iC0 - iC1 + 1, nj = jB - jA + 1, SP = 0.032;
  const cp = [], cn = [], cu = [], ci = [], id = (l, a, b) => l * ni * nj + a * nj + b;
  for (let l = 0; l < 2; l++) for (let a = 0; a < ni; a++) for (let b = 0; b < nj; b++) { const o = ((iC1 + a) * NJ + jA + b) * 3, s = l ? -SP : 0, sg = l ? -1 : 1;
    cp.push(P[o] + N[o] * s - perno.x, P[o + 1] + N[o + 1] * s - perno.y, P[o + 2] + N[o + 2] * s - perno.z); cn.push(N[o] * sg, N[o + 1] * sg, N[o + 2] * sg);
    cu.push(l ? 0.985 : UV[((iC1 + a) * NJ + jA + b) * 2], l ? 0.5 : UV[((iC1 + a) * NJ + jA + b) * 2 + 1]); }
  const verso = cofano.length ? (() => { const a = cofano[0], b = cofano[1], c = cofano[2]; const e1 = V(P[b * 3] - P[a * 3], P[b * 3 + 1] - P[a * 3 + 1], P[b * 3 + 2] - P[a * 3 + 2]), e2 = V(P[c * 3] - P[a * 3], P[c * 3 + 1] - P[a * 3 + 1], P[c * 3 + 2] - P[a * 3 + 2]); return e1.cross(e2).y > 0; })() : true;
  for (let a = 0; a < ni - 1; a++) for (let b = 0; b < nj - 1; b++) { const q0 = id(0, a, b), q1 = id(0, a + 1, b), q2 = id(0, a + 1, b + 1), q3 = id(0, a, b + 1); const t = [q0, q3, q2, q0, q2, q1];
    const g1 = V(cp[q3 * 3] - cp[q0 * 3], cp[q3 * 3 + 1] - cp[q0 * 3 + 1], cp[q3 * 3 + 2] - cp[q0 * 3 + 2]).cross(V(cp[q2 * 3] - cp[q0 * 3], cp[q2 * 3 + 1] - cp[q0 * 3 + 1], cp[q2 * 3 + 2] - cp[q0 * 3 + 2])).y > 0;
    const f = g1 ? t : [q0, q2, q3, q0, q1, q2]; ci.push(...f); const w = (v) => v + ni * nj; ci.push(w(f[0]), w(f[2]), w(f[1]), w(f[3]), w(f[5]), w(f[4])); }
  const giro = []; for (let b = 0; b < nj - 1; b++) giro.push([0, b]); for (let a = 0; a < ni - 1; a++) giro.push([a, nj - 1]); for (let b = nj - 1; b > 0; b--) giro.push([ni - 1, b]); for (let a = ni - 1; a > 0; a--) giro.push([a, 0]);
  for (let q = 0; q < giro.length; q++) { const [a0, b0] = giro[q], [a1, b1] = giro[(q + 1) % giro.length]; const u0 = id(0, a0, b0), u1 = id(0, a1, b1), d0 = id(1, a0, b0), d1 = id(1, a1, b1); ci.push(u0, u1, d1, u0, d1, d0); }
  const gc = new THREE.BufferGeometry(); gc.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); gc.setAttribute('normal', new THREE.Float32BufferAttribute(cn, 3)); gc.setAttribute('uv', new THREE.Float32BufferAttribute(cu, 2)); gc.setIndex(ci);
  // ---- il vano: pareti dritte dal bordo dell'apertura (gli stessi punti) fino al fondo, e il fondo
  const vp = [], vi = [], bordo = giro.map(([a, b]) => ((iC1 + a) * NJ + jA + b) * 3);
  bordo.forEach((o) => { vp.push(P[o], P[o + 1] - 0.004, P[o + 2], P[o], PAV, P[o + 2]); });
  for (let q = 0; q < bordo.length; q++) { const a = q * 2, b = ((q + 1) % bordo.length) * 2; vi.push(a, b, b + 1, a, b + 1, a + 1); }
  const cz = (ZC0 + ZC1) / 2, c0 = vp.length / 3; vp.push(0, PAV, cz); for (let q = 0; q < bordo.length; q++) vi.push(c0, q * 2 + 1, ((q + 1) % bordo.length) * 2 + 1);
  const gv = new THREE.BufferGeometry(); gv.setAttribute('position', new THREE.Float32BufferAttribute(vp, 3)); gv.setIndex(vi); gv.computeVertexNormals();
  // ---- le ruote: gomma (profilo tondo girato attorno all'asse) e cerchio a razze dipinto
  const prof = []; for (let k = 0; k <= 14; k++) { const a = (-Math.PI / 2) + (Math.PI * k) / 14; prof.push(new THREE.Vector2(RR - 0.075 + 0.075 * Math.cos(a) ** 0.6, 0.115 * Math.sin(a))); }
  const gomma = new THREE.LatheGeometry([new THREE.Vector2(0.2, -0.105), ...prof, new THREE.Vector2(0.2, 0.105)], 56), cerchio = new THREE.CylinderGeometry(0.205, 0.205, 0.2, 48);
  return (DATI = { P, N, UV, NS, zs, iC0, iC1, scocca: geoDi(scocca), cofano: gc, vano: gv, perno, gomma, cerchio, lungo: Math.hypot(ZC0 - ZC1, yCern - P[(iC1 * NJ + J) * 3 + 1]), yCern, yDietro: P[(iC1 * NJ + J) * 3 + 1] });
}

// ---- la pittura. Per ogni punto della texture si prende la posizione vera sulla carrozzeria e si decide cos'è: lamiera, vetro, fanale, gomma…
// Torna due tele: i dettagli (trasparenti dove c'è la lamiera) e la sfumatura della lamiera (più scura in basso).
let TELE = null;
function tele() {
  if (TELE) return TELE;
  const D = dati(), TW = 2048, TH = 1024, det = document.createElement('canvas'), sf = document.createElement('canvas'); det.width = sf.width = TW; det.height = sf.height = TH;
  const cd = det.getContext('2d'), cs = sf.getContext('2d'), id = cd.createImageData(TW, TH), is = cs.createImageData(TW, TH), { P, NS, zs } = D;
  const vetro = [16, 21, 29], nero = [11, 12, 14], plast = [34, 37, 43], rosso = [122, 22, 18], rossoCh = [168, 44, 34], faro = [205, 210, 218], targa = [228, 228, 222], riga = [20, 22, 26];
  for (let py = 0; py < TH; py++) for (let px = 0; px < TW; px++) {
    const fi = (px / (TW - 1)) * (NS - 1), fj = (py / (TH - 1)) * (NJ - 1), i = Math.min(NS - 2, Math.floor(fi)), j = Math.min(NJ - 2, Math.floor(fj)), a = fi - i, b = fj - j;
    const q = (ii, jj, k) => P[(ii * NJ + jj) * 3 + k], bl = (k) => (q(i, j, k) * (1 - a) + q(i + 1, j, k) * a) * (1 - b) + (q(i, j + 1, k) * (1 - a) + q(i + 1, j + 1, k) * a) * b;
    const x = bl(0), y = bl(1), z = bl(2), ax = Math.abs(x), yr = tetto(z), o = (py * TW + px) * 4; let c = null;
    const t = yr - YBELT > 0.03 ? (y - YBELT) / (yr - YBELT) : -1, wc = largoAbit(z) * (1 - 0.22 * Math.max(0, t));
    if (t > 0.1 && yr - YBELT > 0.06) {                                                         // sull'abitacolo
      const lato = ax > wc * 0.955 - 0.012 * 0 && t < 0.86, alto = yr > YBELT + 0.47;
      if (alto) { if (ax > wc * 0.9 && t > 0.16 && t < 0.82 && !(z > -0.2 && z < -0.13) && z > -0.6 && z < 0.2) c = vetro; }             // finestrini (montante al centro)
      else if (t > 0.72 ? ax < wc - 0.07 : false) c = vetro;                                     // parabrezza e lunotto: la parte che guarda in su
      else if (!lato && t > 0.3 && ax < wc - 0.075 && !alto) c = vetro;
    }
    if (!c && y < YBELT + 0.02) {                                                               // sulla scocca
      const w = WB * pianta(z), fianco = ax > w * 0.8;
      for (const zr of [-ZR, ZR]) { const d = Math.hypot(z - zr, y - RR); if (fianco && d < RR + 0.085) c = nero; }                                    // passaruota
      if (!c && y < 0.275) c = plast;                                                                                                            // sottoporta
      if (!c && z < -L * 0.958 && y > 0.66 && y < 0.81 && ax > 0.36 && ax < 0.8) c = y > 0.7 && y < 0.77 && ax > 0.4 && ax < 0.76 ? rossoCh : rosso;      // fanali dietro
      if (!c && z > L * 0.95 && y > 0.6 && y < 0.72 && ax > 0.4 && ax < 0.8) c = faro;                                                              // fari
      if (!c && z < -L * 0.975 && ax < 0.26 && y > 0.43 && y < 0.56) c = (y > 0.47 && y < 0.52 && ax < 0.2 && Math.floor((x + 0.2) / 0.045) % 2 === 0) ? riga : targa;   // targa
      if (!c && Math.abs(z) > L * 0.9 && y > 0.3 && y < 0.36) c = plast;                                                                           // fascia dei paraurti
      if (!c && fianco && y > 0.3 && y < YBELT - 0.02) { for (const zp of [0.34, -0.16, -0.7]) if (Math.abs(z - zp) < 0.006) c = riga;                  // porte
        if (!c && y > 0.83 && y < 0.855) for (const zm of [0.2, -0.3]) if (z > zm - 0.11 && z < zm) c = riga; }                                           // maniglie
    }
    let al = 255;
    if (!c && y > 0.8 && z < ZC0 + 0.02 && z > ZC1 - 0.02 && ax < XL + 0.02) {                    // la fessura attorno al cofano (solo sul piano di sopra), sfumata
      const d = Math.min(ax < XL + 0.004 ? Math.abs(z - ZC0) : 9, ax < XL + 0.004 ? Math.abs(z - ZC1) : 9, z < ZC0 + 0.004 && z > ZC1 - 0.004 ? Math.abs(ax - XL) : 9);
      if (d < 0.009) { c = riga; al = Math.round(255 * Math.min(1, (0.009 - d) / 0.004)); } }
    if (c) { id.data[o] = c[0]; id.data[o + 1] = c[1]; id.data[o + 2] = c[2]; id.data[o + 3] = al; }
    const s = Math.round(255 * (0.86 + 0.14 * Math.min(1, Math.max(0, (y - 0.25) / 0.6)))); is.data[o] = is.data[o + 1] = is.data[o + 2] = s; is.data[o + 3] = 255;
  }
  cd.putImageData(id, 0, 0); cs.putImageData(is, 0, 0);
  const razze = tex(256, 256, (c, w, h) => { c.fillStyle = '#16171B'; c.fillRect(0, 0, w, h); c.translate(w / 2, h / 2); c.fillStyle = '#A7ACB3'; c.beginPath(); c.arc(0, 0, 118, 0, 7); c.fill();
    c.fillStyle = '#1B1D22'; for (let k = 0; k < 5; k++) { c.save(); c.rotate((k * Math.PI * 2) / 5); c.beginPath(); c.moveTo(18, -40); c.quadraticCurveTo(64, -104, 34, -104); c.arc(0, 0, 104, -Math.PI / 2 + 0.33, -Math.PI / 2 + 0.33 + 0.6); c.lineTo(46, -22); c.closePath(); c.fill(); c.restore(); }
    c.fillStyle = '#7C8189'; c.beginPath(); c.arc(0, 0, 26, 0, 7); c.fill(); });
  return (TELE = { det, sf, razze });
}

const CARB = new Map();
function pelle(colore) {                                                                        // la texture della carrozzeria di un colore
  if (CARB.has(colore)) return CARB.get(colore);
  const { det, sf } = tele(), t = tex(det.width, det.height, (c, w, h) => { c.fillStyle = colore; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'multiply'; c.drawImage(sf, 0, 0); c.globalCompositeOperation = 'source-over'; c.drawImage(det, 0, 0); });
  CARB.set(colore, t); return t;
}
// un punto sulla pelle del cofano del bagagliaio aperto di k (0..1): quanto dietro la cerniera (metri lungo il cofano) e quanto di lato (x).
// In coordinate dell'auto. Serve alle scene per appoggiarci le mani.
export function suCofano(k, dietro, lato = 0, sopra = 0) {
  const D = dati(), th = APRE * M.clamp(k), yr = (D.yDietro - D.yCern) * (dietro / (ZC0 - ZC1)), y0 = yr + sopra, z0 = -dietro;
  return [lato, D.yCern + y0 * Math.cos(th) - z0 * Math.sin(th), ZC0 + y0 * Math.sin(th) + z0 * Math.cos(th)];
}

export function auto(colore = '#8C9096') {
  const D = dati(), g = new THREE.Group(), carr = mat(0xffffff, { map: pelle(colore) });
  g.add(new THREE.Mesh(D.scocca, carr));
  const dentroCof = mat('#3B3F47'), perno = new THREE.Group(); perno.position.copy(D.perno); g.add(perno);
  const cof = new THREE.Mesh(D.cofano, carr); perno.add(cof);
  const vano = new THREE.Mesh(D.vano, mat('#30333A', { side: THREE.DoubleSide })); g.add(vano);
  const { razze } = tele(), gommaM = mat('#131418'), cerM = [mat('#1B1D22'), mat(0xffffff, { map: razze }), mat(0xffffff, { map: razze })];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const r = new THREE.Group(); r.position.set(sx * 0.795, RR, sz * ZR); r.rotation.z = Math.PI / 2; g.add(r); r.add(new THREE.Mesh(D.gomma, gommaM), new THREE.Mesh(D.cerchio, cerM)); }
  ombre(g, { fa: true, riceve: false }); vano.castShadow = false; vano.receiveShadow = true;
  return { group: g, vano, cofano(k) { perno.rotation.x = APRE * M.clamp(k); }, suCofano };
}
