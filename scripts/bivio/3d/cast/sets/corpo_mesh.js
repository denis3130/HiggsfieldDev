// Corpo, vestiti e scarpe MODELLATI (25/11, dopo «migliora scarpe e vestiti corpo dei pg come con la mano»): non più tubi e palline
// ma un corpo umano vero con vestiti e scarpe veri, presi da MakeHuman (licenza CC0, corpi/LICENZE.md) e convertiti da corpi/converti_corpo.py.
// La pelle e i vestiti seguono le ossa del pupazzo (pupazzi.js / adulti.js): stesse pose e stessi comandi di prima.
import { THREE, V } from './stile.js';
import { manoMesh, matriceMano, posaDaPupazzo, avvolgiPollice, CATENE, QUATTRO } from './mano_mesh.js';
import { raggioTesta } from './pupazzi.js';

const QUI = new URL('./corpi/', import.meta.url);
async function leggi(nome) {
  try {
    const j = await (await fetch(new URL(nome + '.json', QUI))).json(), b = await (await fetch(new URL(nome + '.bin', QUI))).arrayBuffer();
    let o = 0; const pezzo = (T, n) => { const a = new T(b, o, n); o += n * T.BYTES_PER_ELEMENT; return a; };
    const d = { ...j, pos: pezzo(Float32Array, j.punti * 3), uv: pezzo(Float32Array, j.vertici * 2), rv: pezzo(Uint32Array, j.vertici), idx: pezzo(Uint32Array, j.indici), ji: pezzo(Uint8Array, j.punti * 4), jw: pezzo(Uint8Array, j.punti * 4) };
    d.K = Object.fromEntries(j.ossa.map((n, i) => [n, i])); return d;
  } catch (e) { console.error(`corpo «${nome}» non caricato: ${e.message}`); return null; }
}
async function immagine(file) { try { const im = new Image(); im.src = new URL('tex/' + file, QUI).href; await im.decode(); return im; } catch { console.error(`texture «${file}» non caricata`); return null; } }
export const CORPI = {}; for (const n of ['testimone', 'ispettore']) CORPI[n] = await leggi(n);
const FILE_TEX = [...new Set(Object.values(CORPI).filter(Boolean).flatMap((d) => d.parti.flatMap((p) => [p.texture, p.pieghe])).filter(Boolean))];
const IMG = Object.fromEntries(await Promise.all(FILE_TEX.map(async (f) => [f, await immagine(f)])));
const _tex = {};
export function texture(file, { colore = true } = {}) {
  if (!IMG[file]) return null;
  if (!_tex[file]) { const t = new THREE.Texture(IMG[file]); t.colorSpace = colore ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; _tex[file] = t; }
  return _tex[file];
}

// Il corpo pronto: un gruppo con una maglia per parte (pelle, ogni vestito, scarpe). posa(matrici) = una matrice per osso (già «posa × inversa del riposo»).
// materiali: { nomeParte | tipo: materiale }.
// il materiale di una parte: pelle a tinta unita; vestiti e scarpe con la loro texture dipinta (e la mappa delle pieghe, se c'è)
function materialeDi(p, { skin = '#D9A583', pieghe = 0.7 } = {}) {
  if (p.tipo === 'pelle') return new THREE.MeshLambertMaterial({ color: skin });
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, map: texture(p.texture), side: THREE.DoubleSide });
  if (p.pieghe && pieghe) { m.normalMap = texture(p.pieghe, { colore: false }); m.normalScale = new THREE.Vector2(pieghe, pieghe); }
  return m;
}
export function corpoMesh(nome, { materiali = {}, skin = '#D9A583', pieghe = 0.7 } = {}) {
  const D = CORPI[nome]; if (!D) throw new Error(`manca il corpo «${nome}» (corpi/${nome}.json)`);
  const np = D.punti, nb = D.ossa.length, g = new THREE.Group(), riposo = Float32Array.from(D.pos), ora = new Float32Array(np * 3), nor = new Float32Array(np * 3), jw = Float32Array.from(D.jw, (x) => x / 255), ji = D.ji;
  const parti = D.parti.map((p) => {
    const geo = new THREE.BufferGeometry(), pos = new THREE.BufferAttribute(new Float32Array(p.nr * 3), 3), nrm = new THREE.BufferAttribute(new Float32Array(p.nr * 3), 3);
    geo.setAttribute('position', pos); geo.setAttribute('normal', nrm); geo.setAttribute('uv', new THREE.BufferAttribute(D.uv.slice(p.r0 * 2, (p.r0 + p.nr) * 2), 2));
    const idx = D.idx.slice(p.i0, p.i0 + p.ni), tri = new Uint32Array(p.ni); for (let i = 0; i < p.ni; i++) { tri[i] = D.rv[idx[i]]; idx[i] -= p.r0; }
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    const m = new THREE.Mesh(geo, materiali[p.nome] || materiali[p.tipo] || materialeDi(p, { skin, pieghe })); m.frustumCulled = false; m.name = p.nome; g.add(m);
    return { ...p, mesh: m, pos, nrm, tri, rv: D.rv.subarray(p.r0, p.r0 + p.nr) };
  });
  const E = new Float32Array(nb * 16);
  function posa(matrici) {
    if (matrici) for (let b = 0; b < nb; b++) E.set(matrici[b].elements, b * 16); else for (let b = 0; b < nb; b++) E.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], b * 16);
    for (let v = 0; v < np; v++) { const x = riposo[v * 3], y = riposo[v * 3 + 1], z = riposo[v * 3 + 2]; let X = 0, Y = 0, Z = 0;
      for (let j = 0; j < 4; j++) { const w = jw[v * 4 + j]; if (!w) continue; const e = ji[v * 4 + j] * 16; X += w * (E[e] * x + E[e + 4] * y + E[e + 8] * z + E[e + 12]); Y += w * (E[e + 1] * x + E[e + 5] * y + E[e + 9] * z + E[e + 13]); Z += w * (E[e + 2] * x + E[e + 6] * y + E[e + 10] * z + E[e + 14]); }
      ora[v * 3] = X; ora[v * 3 + 1] = Y; ora[v * 3 + 2] = Z; }
    normali();
  }
  // le normali si calcolano sui punti (una per posizione): così le cuciture degli uv non si vedono
  function normali() {
    nor.fill(0);
    for (const p of parti) { const t = p.tri;
      for (let i = 0; i < t.length; i += 3) { const a = t[i] * 3, b = t[i + 1] * 3, c = t[i + 2] * 3, ux = ora[b] - ora[a], uy = ora[b + 1] - ora[a + 1], uz = ora[b + 2] - ora[a + 2], vx = ora[c] - ora[a], vy = ora[c + 1] - ora[a + 1], vz = ora[c + 2] - ora[a + 2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; nor[a] += nx; nor[a + 1] += ny; nor[a + 2] += nz; nor[b] += nx; nor[b + 1] += ny; nor[b + 2] += nz; nor[c] += nx; nor[c + 1] += ny; nor[c + 2] += nz; } }
    for (let v = 0; v < np; v++) { const l = Math.hypot(nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2]) || 1; nor[v * 3] /= l; nor[v * 3 + 1] /= l; nor[v * 3 + 2] /= l; }
    for (const p of parti) { const P = p.pos.array, N = p.nrm.array, rv = p.rv; for (let i = 0; i < rv.length; i++) { const s = rv[i] * 3; P[i * 3] = ora[s]; P[i * 3 + 1] = ora[s + 1]; P[i * 3 + 2] = ora[s + 2]; N[i * 3] = nor[s]; N[i * 3 + 1] = nor[s + 1]; N[i * 3 + 2] = nor[s + 2]; }
      p.pos.needsUpdate = true; p.nrm.needsUpdate = true; }
  }
  posa(null);
  return { group: g, D, parti, riposo, ora, nor, posa, normali };
}

// ------------------------------------------------------------------ il corpo sul pupazzo
// Misure del corpo modellato portate alla statura del personaggio: u = scala (le spalle del modello all'altezza delle spalle del pupazzo).
// Le gambe del pupazzo prendono le misure del modello (anche, cosce, stinchi, caviglie); braccia, busto e testa restano quelli del pupazzo.
export function misure(nome, spalleY) {
  const D = CORPI[nome], J = D.giunti, u = spalleY / ((J.brac1D[1] + J.brac1S[1]) / 2), P = (n) => V(...J[n]).multiplyScalar(u), d = (a, b) => P(a).distanceTo(P(b));
  return { u, P, hx: P('coscia1S').x, T1: d('coscia1S', 'gamba1S'), T2: d('gamba1S', 'piedeS'), caviglia: P('piedeS').y, spallaZ: P('brac1S').z,
    colloZ: (y) => { const a = P('collo1'), b = P('testa'), t = THREE.MathUtils.clamp((y - a.y) / (b.y - a.y), 0, 1); return a.z + (b.z - a.z) * t; } };
}
const RX = (a) => new THREE.Matrix4().makeRotationX(a), RZ = (a) => new THREE.Matrix4().makeRotationZ(a), TR = (v) => new THREE.Matrix4().makeTranslation(v.x, v.y, v.z);
const base3 = (x, y, z) => new THREE.Matrix4().makeBasis(x, y, z);
// l'anca del pupazzo ruota Rx(-avanti)·Rz(lato·apri) e la coscia va lungo -y: gli angoli che la mettono sulla direzione d
function angoliCoscia(d, lato) { const th = Math.asin(THREE.MathUtils.clamp(d.x, -1, 1)), c = Math.cos(th) || 1e-6, phi = Math.atan2(-d.z / c, -d.y / c); return { avanti: -phi, apri: lato * th, R: RX(phi).multiply(RZ(th)) }; }
// i telai del braccio (nello spazio in cui sono dati i punti): S spalla, E gomito, W polso, h asse del gomito
function telaiBraccio(S, E, W, h) {
  const y1 = S.clone().sub(E).normalize(), y2 = E.clone().sub(W).normalize();
  const x1 = h.clone().addScaledVector(y1, -h.dot(y1)).normalize(), x2 = h.clone().addScaledVector(y2, -h.dot(y2)).normalize();
  return { brac: base3(x1, y1, x1.clone().cross(y1)), ava: base3(x2, y2, x2.clone().cross(y2)) };
}
// Veste il pupazzo: parti = { root, fianchi, upper, collo, AL, AR, GL, GR, k } (da uomo() in adulti.js). Torna { corpo, aggiorna() }: aggiorna va chiamata dopo ogni posa.
export function vesti(parti, nome, { materiali = {}, raggioBraccio = 1.04, mani = true, livelliMano = 2, skin = '#D9A583', unghia = '#EBC6B3', pelleMani = null } = {}) {
  const { root, upper, collo, AL, AR, GL, GR, k = 1 } = parti, C = corpoMesh(nome, { materiali, skin }), D = C.D, K = D.K, mis = misure(nome, upper.position.y + AL.S.y), u = mis.u, P = mis.P;
  for (let i = 0; i < C.riposo.length; i++) C.riposo[i] *= u;
  root.add(C.group);
  // ---- il collo entra nella testa disegnata: quel che della testa modellata sporgerebbe (mento, mascella) viene tirato dentro, e i triangoli
  // che finiscono tutti dentro la testa si tolgono. Così il collo finisce esattamente sulla pelle della testa, da qualunque lato.
  if (parti.T) { root.updateMatrixWorld(true); const Th = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(parti.T.head.matrixWorld), Ti = Th.clone().invert(), p = V(0, 0, 0), pelle = C.parti.find((q) => q.tipo === 'pelle');
    const kt = K.testa, k3 = K.collo3, rho = new Float32Array(pelle.np).fill(9), sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    for (let v = 0; v < pelle.np; v++) { const g = pelle.p0 + v; let w = 0; for (let j = 0; j < 4; j++) { const b = D.ji[g * 4 + j]; if (b === kt) w += D.jw[g * 4 + j] / 255; else if (b === k3) w += 0.5 * D.jw[g * 4 + j] / 255; }
      if (!w) continue; p.set(C.riposo[g * 3], C.riposo[g * 3 + 1], C.riposo[g * 3 + 2]).applyMatrix4(Ti); let r = raggioTesta(parti.T, p.x, p.y, p.z); const f = sm(0.3, 0.7, w), dentro = 0.88;
      if (f > 0 && r > dentro) { p.multiplyScalar(1 + f * (dentro / r - 1)); r = raggioTesta(parti.T, p.x, p.y, p.z); p.applyMatrix4(Th); C.riposo[g * 3] = p.x; C.riposo[g * 3 + 1] = p.y; C.riposo[g * 3 + 2] = p.z; }
      rho[v] = r; }
    const geo = pelle.mesh.geometry, ix = geo.index.array, tieni = [], tri = [];
    for (let t = 0; t < ix.length; t += 3) { const a = pelle.tri[t] - pelle.p0, b = pelle.tri[t + 1] - pelle.p0, c = pelle.tri[t + 2] - pelle.p0; if (rho[a] < 0.96 && rho[b] < 0.96 && rho[c] < 0.96) continue; tieni.push(ix[t], ix[t + 1], ix[t + 2]); tri.push(pelle.tri[t], pelle.tri[t + 1], pelle.tri[t + 2]); }
    geo.setIndex(tieni); pelle.tri = Uint32Array.from(tri); }
  const nb = D.ossa.length, INV = D.ossa.map(() => new THREE.Matrix4()), SK = D.ossa.map(() => new THREE.Matrix4()), I4 = new THREE.Matrix4();
  const lega = (n, B) => INV[K[n]].copy(B).invert();
  // ---- riposo: i telai delle ossa nel corpo modellato (spazio della radice, personaggio in piedi nell'origine)
  const perno = upper.position.clone(), pernoCollo = perno.clone().add(collo.position), lati = [['D', -1, AL, GL], ['S', 1, AR, GR]], R0 = {};
  for (const n of ['bacino', 'spina5', 'spina4', 'spina3', 'spina2', 'spina1', 'collo1', 'collo2', 'collo3', 'testa']) lega(n, I4);
  for (const [s, lato, A, Gm] of lati) {
    lega('clav' + s, I4); lega('spalla' + s, I4);
    const S = P('brac1' + s), E = P('ava1' + s), W = P('mano' + s), h = E.clone().sub(S).cross(W.clone().sub(E)).normalize(), T = telaiBraccio(S, E, W, h);
    const l1 = S.distanceTo(E), l2 = E.distanceTo(W), sc1 = new THREE.Matrix4().makeScale(raggioBraccio, A.L1 / l1, raggioBraccio), sc2 = new THREE.Matrix4().makeScale(1, A.L2 / l2, 1);
    const B1 = TR(S).multiply(T.brac), B2 = TR(E).multiply(T.ava);
    // l'avambraccio verso il polso gira con la mano: z = dorso della mano (dal lato opposto al palmo), y verso il gomito
    const dita = P('nocca3' + s).sub(W).normalize(), tra = P('nocca2' + s).sub(P('nocca5' + s)), dorso = dita.clone().cross(tra).normalize(); if (dorso.y < 0) dorso.negate();
    const y2 = E.clone().sub(W).normalize(), zf = dorso.clone().addScaledVector(y2, -dorso.dot(y2)).normalize(), yh = dita.clone().negate(), zh = dorso.clone().addScaledVector(yh, -dorso.dot(yh)).normalize();
    const B3 = TR(E).multiply(base3(y2.clone().cross(zf), y2, zf)), B4 = TR(W).multiply(base3(yh.clone().cross(zh), yh, zh));
    lega('brac1' + s, B1); lega('brac2' + s, B1); lega('ava1' + s, B2); lega('ava2' + s, B3); lega('mano' + s, B4);
    const Jh = P('coscia1' + s), Jk = P('gamba1' + s), Ja = P('piede' + s), ac = angoliCoscia(Jk.clone().sub(Jh).normalize(), lato), loc = Ja.clone().sub(Jk).normalize().applyMatrix4(ac.R.clone().invert()), gin = Math.atan2(-loc.z, -loc.y);
    const Bc = TR(Jh).multiply(ac.R), Bg = TR(Jk).multiply(ac.R).multiply(RX(gin)), Bp = TR(Ja);
    lega('coscia1' + s, Bc); lega('coscia2' + s, Bc); lega('gamba1' + s, Bg); lega('gamba2' + s, Bg); lega('piede' + s, Bp);
    R0[s] = { S, d0: E.clone().sub(S).normalize(), brac: T.brac, sc1, sc2, A, Gm, lato, riposo: { avanti: ac.avanti, apri: ac.apri, ginocchio: gin } };
  }
  // ---- a ogni posa: i telai delle ossa dal pupazzo
  const ri = new THREE.Matrix4(), U = new THREE.Matrix4(), M = new THREE.Matrix4(), M2 = new THREE.Matrix4(), q = new THREE.Quaternion(), q0 = new THREE.Quaternion(), qs = new THREE.Quaternion(), Tp = TR(perno), Tpi = TR(perno.clone().negate()), Tc = TR(pernoCollo.clone().negate());
  const FR = { spina5: 0.15, spina4: 0.45, spina3: 0.8, collo1: 0.2, collo2: 0.5, collo3: 0.8 }, s3 = V(0, 0, 0), e3 = V(0, 0, 0), w3 = V(0, 0, 0), h3 = V(0, 0, 0), d3 = V(0, 0, 0);
  function aggiorna() {
    root.updateMatrixWorld(true); ri.copy(root.matrixWorld).invert(); U.multiplyMatrices(ri, upper.matrixWorld);
    SK[K.bacino].identity();
    for (const n of ['spina5', 'spina4', 'spina3']) SK[K[n]].copy(Tp).multiply(M.makeRotationFromQuaternion(q.copy(q0).slerp(upper.quaternion, FR[n]))).multiply(Tpi);
    M.copy(U).multiply(Tpi); for (const n of ['spina2', 'spina1', 'clavD', 'clavS']) SK[K[n]].copy(M);
    // collo e testa: attorno al perno del collo, sempre di più verso la testa
    for (const n of ['collo1', 'collo2', 'collo3']) SK[K[n]].copy(U).multiply(M.makeTranslation(collo.position.x, collo.position.y, collo.position.z)).multiply(M2.makeRotationFromQuaternion(q.copy(q0).slerp(collo.quaternion, FR[n]))).multiply(Tc);
    SK[K.testa].multiplyMatrices(ri, collo.matrixWorld).multiply(Tc);
    for (const [s] of lati) { const r = R0[s], A = r.A;
      s3.copy(A.S); e3.copy(A.gF.position); w3.copy(A.gH.position); d3.subVectors(w3, s3).normalize(); h3.crossVectors(A.polo, d3).normalize();
      const T = telaiBraccio(s3, e3, w3, h3);
      // braccio in alto (vicino alla spalla): senza torsione rispetto al riposo; in basso: allineato al gomito. La spalla fa mezza strada.
      qs.setFromUnitVectors(r.d0, d3.subVectors(e3, s3).normalize());
      SK[K['brac1' + s]].copy(U).multiply(M.makeTranslation(s3.x, s3.y, s3.z)).multiply(M2.makeRotationFromQuaternion(qs)).multiply(r.brac).multiply(r.sc1).multiply(INV[K['brac1' + s]]);
      SK[K['brac2' + s]].copy(U).multiply(M.makeTranslation(s3.x, s3.y, s3.z)).multiply(T.brac).multiply(r.sc1).multiply(INV[K['brac2' + s]]);
      SK[K['spalla' + s]].copy(U).multiply(M.makeTranslation(s3.x, s3.y, s3.z)).multiply(M2.makeRotationFromQuaternion(q.copy(q0).slerp(qs, 0.5))).multiply(M.makeTranslation(-r.S.x, -r.S.y, -r.S.z));
      SK[K['ava1' + s]].copy(U).multiply(M.makeTranslation(e3.x, e3.y, e3.z)).multiply(T.ava).multiply(r.sc2).multiply(INV[K['ava1' + s]]);
      SK[K['ava2' + s]].copy(U).multiply(M.makeTranslation(e3.x, e3.y, e3.z)).multiply(M2.makeRotationFromQuaternion(A.gF.quaternion)).multiply(r.sc2).multiply(INV[K['ava2' + s]]);
      SK[K['mano' + s]].copy(U).multiply(M.makeTranslation(w3.x, w3.y, w3.z)).multiply(M2.makeRotationFromQuaternion(A.gH.quaternion)).multiply(INV[K['mano' + s]]);
      const G = r.Gm;
      M.multiplyMatrices(ri, G.hip.matrixWorld); SK[K['coscia1' + s]].copy(M).multiply(INV[K['coscia1' + s]]); SK[K['coscia2' + s]].copy(SK[K['coscia1' + s]]);
      M.multiplyMatrices(ri, G.knee.matrixWorld); SK[K['gamba1' + s]].copy(M).multiply(INV[K['gamba1' + s]]); SK[K['gamba2' + s]].copy(SK[K['gamba1' + s]]);
      M.multiplyMatrices(ri, G.foot.matrixWorld); SK[K['piede' + s]].copy(M).multiply(INV[K['piede' + s]]);
    }
    C.posa(SK);
    for (const f of fasce) f();
  }
  // ---- le mani modellate ai polsi e il raccordo di pelle tra la mano e l'avambraccio (una superficie che parte dal bordo dell'una e arriva al bordo dell'altro)
  const fasce = [], MANI = {};
  if (mani) for (const [s, lato, A] of lati) {
    const m = manoMesh({ skin: pelleMani || skin, unghia: pelleMani || unghia, livelli: livelliMano, taglio: true, pittura: pelleMani ? { lati: 0.25, pieghe: 0.15, nocche: 0 } : {} }); m.matrixAutoUpdate = false; m.matrix.copy(matriceMano(lato, 1.1 * k)); m.userData.scalaMano = 1.1 * k; A.gH.add(m); MANI[s] = m; A.manoMesh = m;
    const bm = m.userData.bordoPolso, nbm = bm.length, hp = m.userData.mesh.geometry.attributes.position, pelle = C.parti.find((p) => p.tipo === 'pelle'), Wj = P('mano' + s), Ej = P('ava1' + s);
    // il giro di bordo della pelle più vicino al polso
    let giro = null, dmin = 1e9; const c = V(0, 0, 0), pt = (i) => V(C.riposo[i * 3], C.riposo[i * 3 + 1], C.riposo[i * 3 + 2]);
    for (const g of pelle.bordi) { c.set(0, 0, 0); for (const v of g) c.add(pt(pelle.p0 + v)); c.multiplyScalar(1 / g.length); const d = c.distanceTo(Wj); if (d < dmin) { dmin = d; giro = g.map((v) => pelle.p0 + v); } }
    // a riposo: l'angolo di ogni punto attorno all'avambraccio, per far combaciare i due giri
    const Bm = INV[K['mano' + s]].clone().invert().multiply(m.matrix), asse = Ej.clone().sub(Wj).normalize(), zr = V(0, 1, 0).applyMatrix4(new THREE.Matrix4().extractRotation(INV[K['ava2' + s]].clone().invert())), ref = V(0, 0, 1).applyMatrix4(new THREE.Matrix4().extractRotation(INV[K['ava2' + s]].clone().invert()));
    const xr = asse.clone().cross(ref).normalize(), ang = (p) => { const d = p.clone().sub(Wj); return Math.atan2(d.dot(xr), d.dot(ref)); }, avv = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const ag = giro.map((v) => ang(pt(v))), lega2 = [];
    for (let i = 0; i < nbm; i++) { const a = ang(V(hp.getX(bm[i]), hp.getY(bm[i]), hp.getZ(bm[i])).applyMatrix4(Bm)); let best = null;
      for (let j = 0; j < giro.length; j++) { const j2 = (j + 1) % giro.length, d1 = avv(a - ag[j]), d2 = avv(ag[j2] - ag[j]); if (Math.abs(d2) < 1e-9 || Math.abs(d2) > 2) continue; const t = d1 / d2; if (t >= -1e-6 && t <= 1 + 1e-6) { best = [giro[j], giro[j2], Math.min(1, Math.max(0, t))]; break; } }
      if (!best) { let jm = 0; for (let j = 1; j < giro.length; j++) if (Math.abs(avv(a - ag[j])) < Math.abs(avv(a - ag[jm]))) jm = j; best = [giro[jm], giro[jm], 0]; }
      lega2.push(best); }
    const NR = 8, righe = NR + 2, geo = new THREE.BufferGeometry(), pa = new THREE.BufferAttribute(new Float32Array(righe * nbm * 3), 3), na = new THREE.BufferAttribute(new Float32Array(righe * nbm * 3), 3), idx = [];
    for (let r = 0; r < righe - 1; r++) for (let i = 0; i < nbm; i++) { const a = r * nbm + i, b = r * nbm + (i + 1) % nbm, cc = (r + 1) * nbm + (i + 1) % nbm, d = (r + 1) * nbm + i; idx.push(a, b, cc, a, cc, d); }
    geo.setAttribute('position', pa); geo.setAttribute('normal', na); geo.setIndex(idx);
    const fm = new THREE.Mesh(geo, C.parti.find((q) => q.tipo === 'pelle').mesh.material); fm.frustumCulled = false; fm.name = 'polso' + s; C.group.add(fm);
    const Mh = new THREE.Matrix4(), p0 = V(0, 0, 0), p1 = V(0, 0, 0), n0 = V(0, 0, 0), n1 = V(0, 0, 0), t0 = V(0, 0, 0), t1 = V(0, 0, 0), x = V(0, 0, 0), ee = V(0, 0, 0), ww = V(0, 0, 0); let verso = 0, chiave = null;
    fasce.push(() => {
      const ch = JSON.stringify(A.posaMano); if (ch !== chiave || m.userData.sporca) { chiave = ch; m.userData.sporca = false; m.userData.posa(posaDaPupazzo((typeof A.posaMano === 'string' && A.poseProprie && A.poseProprie[A.posaMano]) || A.posaMano)); }
      const hn = m.userData.mesh.geometry.attributes.normal, P_ = pa.array, N_ = na.array, ora = C.ora, nor = C.nor;
      Mh.multiplyMatrices(ri, m.matrixWorld); t0.set(0, 1, 0).transformDirection(Mh); ee.copy(A.gF.position).applyMatrix4(U); ww.copy(A.gH.position).applyMatrix4(U); t1.subVectors(ee, ww).normalize();
      for (let i = 0; i < nbm; i++) { const [a, b, t] = lega2[i]; p0.fromBufferAttribute(hp, bm[i]).applyMatrix4(Mh); n0.fromBufferAttribute(hn, bm[i]).transformDirection(Mh);
        p1.set(ora[a * 3] + (ora[b * 3] - ora[a * 3]) * t, ora[a * 3 + 1] + (ora[b * 3 + 1] - ora[a * 3 + 1]) * t, ora[a * 3 + 2] + (ora[b * 3 + 2] - ora[a * 3 + 2]) * t);
        n1.set(nor[a * 3] + (nor[b * 3] - nor[a * 3]) * t, nor[a * 3 + 1] + (nor[b * 3 + 1] - nor[a * 3 + 1]) * t, nor[a * 3 + 2] + (nor[b * 3 + 2] - nor[a * 3 + 2]) * t).normalize();
        const L = p0.distanceTo(p1);
        for (let r = 0; r < righe; r++) { const o = (r * nbm + i) * 3;
          if (r <= NR) { const u2 = r / NR, u3 = u2 * u2 * u2, uu = u2 * u2, h00 = 2 * u3 - 3 * uu + 1, h10 = u3 - 2 * uu + u2, h01 = -2 * u3 + 3 * uu, h11 = u3 - uu;
            x.set(0, 0, 0).addScaledVector(p0, h00).addScaledVector(t0, h10 * L).addScaledVector(p1, h01).addScaledVector(t1, h11 * L); }
          else x.copy(p1).addScaledVector(t1, 0.004).addScaledVector(n1, -0.0012);
          P_[o] = x.x; P_[o + 1] = x.y; P_[o + 2] = x.z; } }
      pa.needsUpdate = true; geo.computeVertexNormals();
      if (!verso) { p0.fromBufferAttribute(na, 3 * nbm); n0.fromBufferAttribute(hn, bm[0]).transformDirection(Mh); verso = p0.dot(n0) < 0 ? -1 : 1; if (verso < 0) { const ix = geo.index.array; for (let q = 0; q < ix.length; q += 3) { const tq = ix[q + 1]; ix[q + 1] = ix[q + 2]; ix[q + 2] = tq; } geo.index.needsUpdate = true; geo.computeVertexNormals(); } }
      for (let i = 0; i < nbm; i++) { const [a, b, t] = lega2[i]; n0.fromBufferAttribute(hn, bm[i]).transformDirection(Mh);
        n1.set(nor[a * 3] + (nor[b * 3] - nor[a * 3]) * t, nor[a * 3 + 1] + (nor[b * 3 + 1] - nor[a * 3 + 1]) * t, nor[a * 3 + 2] + (nor[b * 3 + 2] - nor[a * 3 + 2]) * t).normalize();
        N_[i * 3] = n0.x; N_[i * 3 + 1] = n0.y; N_[i * 3 + 2] = n0.z; for (const r of [NR, NR + 1]) { const o = (r * nbm + i) * 3; N_[o] = n1.x; N_[o + 1] = n1.y; N_[o + 2] = n1.z; } }
      na.needsUpdate = true;
    });
  }
  return { corpo: C, aggiorna, misure: mis, riposo: R0, SK, mani: MANI };
}

// ---- gli oggetti in mano. Dove sta il lato del palmo delle quattro dita della mano modellata m, nello spazio del gruppo della mano del braccio
// (lì il palmo guarda -z e le dita vanno verso -y): centro (a metà dita), asse (verso le punte), normale (fuori dal palmo), raggio di un dito.
export function pianoDita(m) {
  const O = m.userData.ossa, a = V(0, 0, 0), b = V(0, 0, 0), centro = V(0, 0, 0), asse = V(0, 0, 0), medi = [];
  for (const f of QUATTRO) { const c = CATENE[f]; a.setFromMatrixPosition(O[c[1]]).applyMatrix4(m.matrix); b.setFromMatrixPosition(O[c[4]]).applyMatrix4(m.matrix); medi.push(a.clone().lerp(b, 0.5)); centro.add(medi[medi.length - 1]); asse.add(b.clone().sub(a)); }
  centro.multiplyScalar(0.25); asse.normalize(); const lato = medi[3].clone().sub(medi[0]); lato.addScaledVector(asse, -lato.dot(asse)).normalize();
  const normale = asse.clone().cross(lato).normalize(); if (normale.z > 0) normale.negate();
  return { centro, asse, lato, normale, raggio: 0.0098 * (m.userData.scalaMano || 1.1) };
}
// Appoggia un oggetto piatto (gruppo g: il suo -y va verso le punte delle dita, il suo -z è la faccia che si vede dal lato del palmo) contro le dita,
// dal lato del palmo: spessore = mezzo spessore dell'oggetto, verso = di quanto scende verso il polso rispetto a metà dita.
// inclina (radianti) + alto: l'oggetto resta appoggiato dal lato delle punte e si stacca dal palmo dal lato del polso (il palmo non è piatto).
export function appoggiaSulleDita(g, m, { spessore = 0.004, verso = 0.02, gioco = 0.001, inclina = 0, alto = 0.12 } = {}) {
  const p = pianoDita(m), y = p.asse.clone().negate(), z = p.normale.clone().negate(), x = y.clone().cross(z).normalize();
  g.position.copy(p.centro).addScaledVector(p.asse, -verso).addScaledVector(p.normale, p.raggio + spessore + gioco); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  if (inclina) { const q = new THREE.Quaternion().setFromAxisAngle(x, -inclina), perno = g.position.clone().addScaledVector(p.asse, alto / 2); g.position.sub(perno).applyQuaternion(q).add(perno); g.quaternion.premultiply(q); }
}

// La presa di un oggetto piatto tra le dita distese (dietro) e il pollice (davanti): mette la mano nella posa data, appoggia l'oggetto alle dita
// e chiude il pollice sulla sua faccia davanti, in basso. Torna la posa completa della mano modellata (da dare come posa «propria» al braccio).
// g = gruppo dell'oggetto (vedi appoggiaSulleDita); largo, alto = misure dell'oggetto; dove = a che altezza preme il pollice (0 = centro, 1 = bordo verso il polso).
export function presaPiatta(g, m, posa, { spessore = 0.004, verso = 0.0, largo = 0.084, alto = 0.125, dove = 0.6, rollio = 60, inclina = 0 } = {}) {
  const P0 = posaDaPupazzo(posa); m.userData.posa(P0); appoggiaSulleDita(g, m, { spessore, verso, gioco: 0.002, inclina, alto });
  g.updateMatrix(); const mi = m.matrix.clone().invert(), nel = (x, y, z) => V(x, y, z).applyMatrix4(g.matrix).applyMatrix4(mi).toArray(), sc = m.userData.scalaMano || 1.1;
  const og = { a: nel(-largo / 2, dove * alto / 2, -spessore), b: nel(largo / 2, dove * alto / 2, -spessore), r: 0.002 / sc };
  const P1 = avvolgiPollice(P0, og, { rollio, passo: 5, fine: 1 }); m.userData.posa(P1); m.userData.sporca = true; return P1;
}
